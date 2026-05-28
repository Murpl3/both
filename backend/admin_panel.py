"""
Admin REST API for the EZSakay Admin (Vite) dashboard.

Postgres is the single source of truth.
"""

from __future__ import annotations

import hmac
import json
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from auth_mpin import create_access_token
from auth_utils import SECRET_KEY, ALGORITHM
from conductor_auth import hash_password as _hash_conductor_password
from database import get_db, engine
from models import Conductor, LedgerEntry, Ticket, TopUp, User

router = APIRouter(tags=["admin"])
security = HTTPBearer()

_DEBUG_SESSION_ID = os.getenv("DEBUG_SESSION_ID", "6227d8")
# Disabled by default; set DEBUG_LOG_FILE to enable. Relative paths are
# resolved against the backend directory so we never write outside the repo.
_DEBUG_LOG_PATH = os.getenv("DEBUG_LOG_FILE")
if _DEBUG_LOG_PATH and not os.path.isabs(_DEBUG_LOG_PATH):
    _DEBUG_LOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), _DEBUG_LOG_PATH))


def _dbg(hypothesis_id: str, location: str, message: str, data: dict[str, Any] | None = None, run_id: str = "pre-fix") -> None:
    if not _DEBUG_LOG_PATH:
        return
    try:
        payload = {
            "sessionId": _DEBUG_SESSION_ID,
            "runId": run_id,
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data or {},
            "timestamp": int(time.time() * 1000),
        }
        with open(_DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        # Never break API due to logging
        pass


def _sqlite_ensure_user_columns() -> None:
    """
    Runtime guard for local SQLite fallback DB.
    If the local `users` table is older than `models.User`, Admin pages can 500.
    This tries to add missing columns and is safe to run repeatedly.
    """
    try:
        url = str(getattr(engine, "url", "") or "")
        if not url.startswith("sqlite"):
            return
        with engine.begin() as conn:
            for ddl in [
                "ALTER TABLE users ADD COLUMN email VARCHAR",
                "ALTER TABLE users ADD COLUMN first_name VARCHAR",
                "ALTER TABLE users ADD COLUMN last_name VARCHAR",
                "ALTER TABLE users ADD COLUMN nickname VARCHAR",
                "ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN otp_code VARCHAR",
                "ALTER TABLE users ADD COLUMN otp_expires DATETIME",
                "ALTER TABLE users ADD COLUMN mpin_hash VARCHAR",
                "ALTER TABLE users ADD COLUMN mpin_set BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN balance NUMERIC(10,2) DEFAULT 0.00",
                "ALTER TABLE users ADD COLUMN created_at DATETIME",
            ]:
                try:
                    conn.execute(text(ddl))
                except Exception:
                    pass
    except Exception:
        pass


def _user_to_admin_dict(u: User) -> dict[str, Any]:
    name = " ".join(
        p for p in [u.first_name or "", u.last_name or ""] if p
    ).strip() or (u.nickname or u.email.split("@")[0])
    ts = u.created_at.isoformat() if u.created_at else datetime.now(timezone.utc).isoformat()
    return {
        "id": str(u.id),
        "name": name,
        "email": u.email or "",
        "phone": u.phone_number or "",
        "verified": bool(u.is_verified),
        "balance": float(u.balance or 0),
        "createdAt": ts,
        "updatedAt": ts,
    }


def _conductor_to_admin_dict(c: Conductor) -> dict[str, Any]:
    ts = c.created_at.isoformat() if c.created_at else datetime.now(timezone.utc).isoformat()
    ts_u = c.updated_at.isoformat() if c.updated_at else ts
    # Verification must be explicit (admin-approved), not implied by MPIN setup.
    verified = bool(getattr(c, "is_verified", False))
    return {
        "id": str(c.id),
        "name": c.full_name or c.username,
        "email": c.email or f"{c.username}@conductor.local",
        "phone": c.contact or "",
        "verified": verified,
        "licenseNumber": "N/A",
        "vehicle": c.vehicle_no,
        "status": "active" if verified else "inactive",
        "createdAt": ts,
        "updatedAt": ts_u,
    }


def _topup_to_admin_dict(t: TopUp) -> dict[str, Any]:
    ts = t.created_at.isoformat() if t.created_at else datetime.now(timezone.utc).isoformat()
    ts_u = t.updated_at.isoformat() if t.updated_at else ts
    st = (t.status or "completed").lower()
    status_map = {"completed": "completed", "pending": "pending", "failed": "failed"}
    ui_status = status_map.get(st, "pending" if st != "completed" else "completed")
    return {
        "id": str(t.id),
        "userId": str(t.user_id),
        "amount": float(t.amount),
        "status": ui_status,
        "paymentMethod": t.payment_method or "WALLET",
        "transactionId": t.transaction_ref or str(t.id),
        "createdAt": ts,
        "updatedAt": ts_u,
    }


def _ticket_to_admin_tx(t: Ticket) -> dict[str, Any]:
    ts = t.created_at.isoformat() if t.created_at else datetime.now(timezone.utc).isoformat()
    schedule_str = t.departure_time.strftime("%I:%M %p").lstrip("0") if t.departure_time else ""
    return {
        "id": str(t.id),
        "refNo": t.ref_no,
        "userPhone": t.user.phone_number if t.user else "",
        "type": "TICKET",
        "amount": float(t.fare_amount or 0),
        "origin": t.origin or "",
        "destination": t.destination or "",
        "passengers": int(t.passengers or 1),
        "schedule": schedule_str,
        "operator": "DASUTRANSCO",
        "status": t.status or "ACTIVE",
        "createdAt": ts,
    }


# ---------------------------------------------------------------------------
# Pagination helper for in-memory lists
# ---------------------------------------------------------------------------

def _paginate_and_search(
    items: list[dict[str, Any]],
    search: Optional[str],
    search_keys: list[str],
    page: int,
    limit: int,
) -> dict[str, Any]:
    if search:
        term = search.strip().lower()
        items = [
            r for r in items
            if any(term in str(r.get(k, "")).lower() for k in search_keys)
        ]
    total = len(items)
    start = (page - 1) * limit
    page_items = items[start:start + limit]
    total_pages = max(1, (total + limit - 1) // limit)
    return {
        "data": page_items,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
    }


# ---------------------------------------------------------------------------
# Ride stats (unchanged logic, uses shared helper)
# ---------------------------------------------------------------------------

def _parse_tx_date(created_at: Any) -> Optional[date]:
    if not created_at:
        return None
    if isinstance(created_at, str):
        try:
            return date.fromisoformat(created_at[:10])
        except ValueError:
            return None
    return None


def _compute_ride_stats(rows: Optional[list[dict[str, Any]]]) -> dict[str, Any]:
    if not rows:
        return {
            "source": "empty" if rows is not None else "unconfigured",
            "todayTicketRevenue": 0.0,
            "todayPassengers": 0,
            "todayTripCount": 0,
            "totalTicketRevenue": 0.0,
            "totalPassengersAllTime": 0,
            "dailyRideStats": [],
        }
    today = datetime.now(timezone.utc).date()
    by_day: dict[date, dict[str, Any]] = {}
    total_rev = 0.0
    total_pax = 0
    skip_status = {"REJECTED", "rejected"}

    for row in rows:
        st = (row.get("status") or "").upper()
        if st in skip_status:
            continue
        d = _parse_tx_date(row.get("created_at"))
        if not d:
            continue
        amt = float(row.get("amount") or 0)
        pax = int(row.get("passengers") or 1)
        total_rev += amt
        total_pax += pax
        bucket = by_day.setdefault(d, {"revenue": 0.0, "passengers": 0, "trips": 0})
        bucket["revenue"] += amt
        bucket["passengers"] += pax
        bucket["trips"] += 1

    daily_sorted = sorted(by_day.keys(), reverse=True)[:14]
    daily_ride_stats = [
        {
            "date": d.isoformat(),
            "revenue": round(by_day[d]["revenue"], 2),
            "passengerCount": by_day[d]["passengers"],
            "tripCount": by_day[d]["trips"],
        }
        for d in reversed(daily_sorted)
    ]

    today_bucket = by_day.get(today, {"revenue": 0.0, "passengers": 0, "trips": 0})

    return {
        "source": "postgres",
        "todayTicketRevenue": round(today_bucket["revenue"], 2),
        "todayPassengers": today_bucket["passengers"],
        "todayTripCount": today_bucket["trips"],
        "totalTicketRevenue": round(total_rev, 2),
        "totalPassengersAllTime": total_pax,
        "dailyRideStats": daily_ride_stats,
    }


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        _dbg("H3", "backend/admin_panel.py:verify_admin_token", "Verify admin token start", data={"hasCredentials": bool(credentials and credentials.credentials)})
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        if payload.get("role") != "admin":
            _dbg("H3", "backend/admin_panel.py:verify_admin_token", "Token role not admin", data={"role": str(payload.get("role") or "")})
            raise HTTPException(status_code=403, detail="Admin access required")
        sub = payload.get("sub")
        if not sub:
            _dbg("H3", "backend/admin_panel.py:verify_admin_token", "Token missing sub")
            raise HTTPException(status_code=401, detail="Invalid token")
        _dbg("H3", "backend/admin_panel.py:verify_admin_token", "Verify admin token OK", data={"sub": str(sub)})
        return sub
    except JWTError:
        _dbg("H3", "backend/admin_panel.py:verify_admin_token", "JWT decode failed")
        raise HTTPException(status_code=401, detail="Invalid token")


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


def _admin_credentials() -> tuple[str, str]:
    username = (os.getenv("ADMIN_USERNAME") or "admin").strip()
    password = os.getenv("ADMIN_PASSWORD")
    if password is None:
        password = "admin123"
    return username, password


@router.post("/auth/login")
def admin_login(body: AdminLoginRequest):
    _dbg("H4", "backend/admin_panel.py:admin_login", "Admin login attempt", data={"usernameProvided": bool(body.username and body.username.strip()), "passwordProvided": bool(body.password)})
    configured_username, configured_password = _admin_credentials()
    if body.username.strip() != configured_username:
        _dbg("H4", "backend/admin_panel.py:admin_login", "Admin login failed: bad username")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    effective_password = _password_override.get(configured_username, configured_password)
    try:
        pwd_ok = hmac.compare_digest(
            body.password.encode("utf-8"), effective_password.encode("utf-8")
        )
    except (TypeError, ValueError):
        pwd_ok = False
    if not pwd_ok:
        _dbg("H4", "backend/admin_panel.py:admin_login", "Admin login failed: bad password")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(
        {"sub": configured_username, "role": "admin"},
        expires_delta=timedelta(days=1),
    )
    display_email = os.getenv("ADMIN_EMAIL") or f"{configured_username}@admin.local"
    _dbg("H4", "backend/admin_panel.py:admin_login", "Admin login success", data={"userId": "admin"})
    return {
        "token": token,
        "user": {
            "id": "admin",
            "email": display_email,
            "role": "admin",
        },
    }


# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------

_password_override: dict[str, str] = {}


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


@router.put("/auth/change-password")
def admin_change_password(
    body: ChangePasswordRequest,
    admin_user: str = Depends(verify_admin_token),
):
    _, configured_password = _admin_credentials()
    effective_password = _password_override.get(admin_user, configured_password)

    try:
        pwd_ok = hmac.compare_digest(
            body.current_password.encode("utf-8"),
            effective_password.encode("utf-8"),
        )
    except (TypeError, ValueError):
        pwd_ok = False
    if not pwd_ok:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current password.",
        )

    _password_override[admin_user] = body.new_password
    return {"ok": True, "detail": "Password updated. Change persists until server restart."}


# ---------------------------------------------------------------------------
# Users endpoints
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}")
def admin_get_user(
    user_id: str,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if user_id == "admin":
        admin_username, _ = _admin_credentials()
        admin_email = os.getenv("ADMIN_EMAIL") or f"{admin_username}@admin.local"
        now = datetime.now(timezone.utc).isoformat()
        return {
            "id": "admin",
            "name": "Administrator",
            "email": admin_email,
            "phone": "",
            "verified": True,
            "createdAt": now,
            "updatedAt": now,
        }
    if user_id.isdigit():
        u = db.query(User).filter(User.id == int(user_id)).first()
        if u:
            return _user_to_admin_dict(u)
    raise HTTPException(status_code=404, detail="User not found")


@router.get("/users")
def admin_list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    _dbg("H2", "backend/admin_panel.py:admin_list_users", "List users called", data={"page": int(page), "limit": int(limit), "hasSearch": bool(search and search.strip())})
    def _run_query():
        q = db.query(User)
        if search:
            term = f"%{search.strip()}%"
            q = q.filter(
                or_(
                    User.email.ilike(term),
                    User.first_name.ilike(term),
                    User.last_name.ilike(term),
                    User.nickname.ilike(term),
                    User.phone_number.ilike(term),
                )
            )
        total = q.count()
        items_db = (
            q.order_by(User.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        total_pages = max(1, (total + limit - 1) // limit)
        return {
            "data": [_user_to_admin_dict(u) for u in items_db],
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        }

    try:
        return _run_query()
    except OperationalError as exc:
        msg = str(exc.orig) if getattr(exc, "orig", None) else str(exc)
        _dbg("H2", "backend/admin_panel.py:admin_list_users", "OperationalError on users list", data={"error": msg})
        if "no such column" in msg and "users." in msg:
            _sqlite_ensure_user_columns()
            return _run_query()
        raise


@router.post("/users/{user_id}/verify")
def admin_verify_user(
    user_id: str,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if not user_id.isdigit():
        raise HTTPException(status_code=404, detail="User not found")
    u = db.query(User).filter(User.id == int(user_id)).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_verified = True
    db.commit()
    db.refresh(u)
    return _user_to_admin_dict(u)


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


def _split_name(full_name: str) -> tuple[str, str]:
    """Split a display name into first_name, last_name."""
    parts = full_name.strip().split(None, 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    return first, last


@router.put("/users/{user_id}")
def admin_update_user(
    user_id: str,
    body: UpdateUserRequest,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if not user_id.isdigit():
        raise HTTPException(status_code=404, detail="User not found")
    u = db.query(User).filter(User.id == int(user_id)).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        fn, ln = _split_name(body.name)
        u.first_name = fn
        u.last_name = ln
    if body.email is not None:
        u.email = body.email.strip()
    if body.phone is not None:
        u.phone_number = body.phone.strip()
    db.commit()
    db.refresh(u)
    return _user_to_admin_dict(u)


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if not user_id.isdigit():
        raise HTTPException(status_code=404, detail="User not found")
    u = db.query(User).filter(User.id == int(user_id)).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(u)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Topups (local DB only -- topups go through the FastAPI backend)
# ---------------------------------------------------------------------------

@router.get("/topups")
def admin_list_topups(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    q = db.query(TopUp)
    if search and search.strip().isdigit():
        q = q.filter(TopUp.user_id == int(search.strip()))
    total = q.count()
    items = (
        q.order_by(TopUp.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    total_pages = max(1, (total + limit - 1) // limit)
    return {
        "data": [_topup_to_admin_dict(t) for t in items],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
    }


@router.post("/topups/{topup_id}/process")
def admin_process_topup(
    topup_id: str,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if not topup_id.isdigit():
        raise HTTPException(status_code=404, detail="Not found")
    t = db.query(TopUp).filter(TopUp.id == int(topup_id)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    t.status = "completed"
    db.commit()
    db.refresh(t)
    return _topup_to_admin_dict(t)


@router.get("/wallets/{user_id}")
def admin_get_wallet(
    user_id: str,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if not user_id.isdigit():
        raise HTTPException(status_code=404, detail="User not found")
    u = db.query(User).filter(User.id == int(user_id)).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    bal = float(u.balance or 0)
    spent = (
        db.query(func.coalesce(func.sum(TopUp.amount), 0))
        .filter(TopUp.user_id == u.id, TopUp.status == "completed")
        .scalar()
    )
    return {
        "id": f"w-{u.id}",
        "userId": str(u.id),
        "balance": bal,
        "totalSpent": float(spent or 0),
        "totalTopups": float(spent or 0),
        "lastTransaction": None,
    }


# ---------------------------------------------------------------------------
# Conductors
# ---------------------------------------------------------------------------

class CreateConductorRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    full_name: str = Field("", min_length=0)
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    birthdate: Optional[str] = None


@router.post("/conductors")
def admin_create_conductor(
    body: CreateConductorRequest,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    username = body.username.strip().lower()
    password_hash = _hash_conductor_password(body.password)

    existing = db.query(Conductor).filter(Conductor.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Conductor '{username}' already exists.")

    new_conductor = Conductor(
        username=username,
        password_hash=password_hash,
        full_name=body.full_name.strip(),
        contact=body.contact.strip() if body.contact else None,
        email=body.email.strip() if body.email else None,
        address=body.address.strip() if body.address else None,
        birthdate=body.birthdate.strip() if body.birthdate else None,
        mpin_set=False,
        is_verified=False,
    )
    db.add(new_conductor)
    db.commit()
    db.refresh(new_conductor)
    return _conductor_to_admin_dict(new_conductor)


@router.get("/conductors")
def admin_list_conductors(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    _dbg("H2", "backend/admin_panel.py:admin_list_conductors", "List conductors called", data={"page": int(page), "limit": int(limit), "hasSearch": bool(search and search.strip())})
    q = db.query(Conductor)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(Conductor.username.ilike(term), Conductor.full_name.ilike(term))
        )
    total = q.count()
    items_db = (
        q.order_by(Conductor.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    total_pages = max(1, (total + limit - 1) // limit)
    return {
        "data": [_conductor_to_admin_dict(c) for c in items_db],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
    }


@router.post("/conductors/{conductor_id}/verify")
def admin_verify_conductor(
    conductor_id: str,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if not conductor_id.isdigit():
        raise HTTPException(status_code=404, detail="Not found")
    c = db.query(Conductor).filter(Conductor.id == int(conductor_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    c.is_verified = True
    db.commit()
    db.refresh(c)
    return _conductor_to_admin_dict(c)


@router.delete("/conductors/{conductor_id}")
def admin_delete_conductor(
    conductor_id: str,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    if conductor_id.isdigit():
        c = db.query(Conductor).filter(Conductor.id == int(conductor_id)).first()
        if c:
            db.delete(c)
            db.commit()
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Not found")


# ---------------------------------------------------------------------------
# Transactions (Postgres)
# ---------------------------------------------------------------------------

@router.get("/transactions")
def admin_list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    q = db.query(Ticket).order_by(Ticket.created_at.desc())
    if status:
        q = q.filter(Ticket.status == status.strip().upper())
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Ticket.ref_no.ilike(term), Ticket.origin.ilike(term), Ticket.destination.ilike(term)))

    total = q.count()
    rows = q.offset((page - 1) * limit).limit(limit).all()
    items = [_ticket_to_admin_tx(t) for t in rows]
    total_pages = max(1, (total + limit - 1) // limit)
    return {"data": items, "total": total, "page": page, "limit": limit, "totalPages": total_pages, "source": "postgres"}


# ---------------------------------------------------------------------------
# Dashboard stats (Postgres)
# ---------------------------------------------------------------------------

_dashboard_cache: dict[str, Any] = {}
_dashboard_cache_ts: float = 0.0
_DASHBOARD_CACHE_TTL = 15  # seconds


def _compute_ticket_stats(db: Session) -> dict[str, Any]:
    today = datetime.now(timezone.utc).date()
    # Use tickets as the canonical “ride” unit for now.
    total_ticket_revenue = float(db.query(func.coalesce(func.sum(Ticket.fare_amount), 0)).scalar() or 0)
    total_pax = int(db.query(func.coalesce(func.sum(Ticket.passengers), 0)).scalar() or 0)

    today_rev = (
        db.query(func.coalesce(func.sum(Ticket.fare_amount), 0))
        .filter(func.date(Ticket.created_at) == today)
        .scalar()
    )
    today_pax = (
        db.query(func.coalesce(func.sum(Ticket.passengers), 0))
        .filter(func.date(Ticket.created_at) == today)
        .scalar()
    )
    today_trips = int(db.query(func.count(Ticket.id)).filter(func.date(Ticket.created_at) == today).scalar() or 0)

    return {
        "todayTicketRevenue": float(today_rev or 0),
        "todayPassengers": int(today_pax or 0),
        "todayTripCount": today_trips,
        "totalTicketRevenue": total_ticket_revenue,
        "totalPassengersAllTime": total_pax,
        "dailyRideStats": [],
        "rideStatsSource": "postgres",
    }


def _fetch_dashboard_counts(db: Session) -> dict[str, Any]:
    total_users = int(db.query(func.count(User.id)).scalar() or 0)
    active_users = int(db.query(func.count(User.id)).filter(User.is_verified.is_(True)).scalar() or 0)
    total_conductors = int(db.query(func.count(Conductor.id)).scalar() or 0)
    active_conductors = int(db.query(func.count(Conductor.id)).filter(Conductor.mpin_set.is_(True)).scalar() or 0)

    total_topups = int(db.query(func.count(TopUp.id)).scalar() or 0)
    revenue = float(
        db.query(func.coalesce(func.sum(TopUp.amount), 0))
        .filter(TopUp.status == "completed")
        .scalar()
        or 0
    )

    ride = _compute_ticket_stats(db)

    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "totalTopups": total_topups,
        "totalRevenue": revenue,
        "totalConductors": total_conductors,
        "activeConductors": active_conductors,
        **ride,
    }


@router.get("/stats/dashboard")
def admin_dashboard_stats(
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    _dbg("H2", "backend/admin_panel.py:admin_dashboard_stats", "Dashboard stats called")
    global _dashboard_cache, _dashboard_cache_ts

    now = time.monotonic()
    if _dashboard_cache and (now - _dashboard_cache_ts) < _DASHBOARD_CACHE_TTL:
        return _dashboard_cache

    result = _fetch_dashboard_counts(db)
    _dashboard_cache = result
    _dashboard_cache_ts = now
    return result
