from __future__ import annotations

import hmac
import json
import os
import secrets
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from auth_utils import require_role
from database import get_db
from models import DepartureSchedule, LedgerEntry, Route, ScheduleInventory, Ticket, User

router = APIRouter(tags=["tickets"])


def _secret() -> bytes:
    s = os.getenv("SECRET_KEY") or ""
    if not s:
        raise HTTPException(status_code=500, detail="Server auth not configured (SECRET_KEY missing).")
    return s.encode("utf-8")


def _hmac_sign(payload: str) -> str:
    return hmac.new(_secret(), payload.encode("utf-8"), "sha256").hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_hhmm(s: str) -> time:
    hh, mm = s.split(":")
    return time(int(hh), int(mm), 0)


def _generate_ref(prefix: str) -> str:
    return f"{prefix}-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


class BookingRequest(BaseModel):
    route_id: int = Field(..., ge=1)
    schedule_id: int = Field(..., ge=1)
    service_date: date
    origin: str
    destination: str
    passengers: int = Field(..., ge=1, le=10)
    fare_amount: float = Field(..., ge=0)
    payment_mode: str = Field("WALLET")
    passenger_details: Optional[list[dict[str, Any]]] = None


class TicketOut(BaseModel):
    id: int
    ref_no: str
    phone_number: str
    origin: str
    destination: str
    passengers: int
    fare_amount: float
    status: str
    service_date: date
    departure_time: str
    expires_at: datetime | None = None
    created_at: datetime


class QRResponse(BaseModel):
    payload: str
    signature: str


def _ticket_to_out(t: Ticket) -> TicketOut:
    return TicketOut(
        id=t.id,
        ref_no=t.ref_no,
        phone_number=t.user.phone_number if t.user else "",
        origin=t.origin or "",
        destination=t.destination or "",
        passengers=int(t.passengers or 1),
        fare_amount=float(t.fare_amount or 0),
        status=t.status or "ACTIVE",
        service_date=t.service_date,
        departure_time=t.departure_time.strftime("%H:%M") if t.departure_time else "",
        expires_at=t.expires_at,
        created_at=t.created_at or _now(),
    )


def _get_passenger(db: Session, phone: str) -> User:
    u = db.query(User).filter(User.phone_number == phone).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


def _ensure_inventory(db: Session, schedule: DepartureSchedule, svc_date: date) -> ScheduleInventory:
    inv = (
        db.query(ScheduleInventory)
        .filter(ScheduleInventory.schedule_id == schedule.id, ScheduleInventory.service_date == svc_date)
        .first()
    )
    if inv:
        return inv
    inv = ScheduleInventory(
        schedule_id=schedule.id,
        service_date=svc_date,
        remaining_seats=int(schedule.capacity or 30),
        updated_at=_now(),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.post("/bookings", response_model=TicketOut)
def create_booking(
    body: BookingRequest,
    auth: dict = Depends(require_role("passenger")),
    db: Session = Depends(get_db),
):
    phone = auth["sub"]
    user = _get_passenger(db, phone)

    route = db.query(Route).filter(Route.id == body.route_id, Route.is_active.is_(True)).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    schedule = (
        db.query(DepartureSchedule)
        .filter(DepartureSchedule.id == body.schedule_id, DepartureSchedule.route_id == body.route_id)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Wallet charge + seat reservation must be atomic.
    fare_total = Decimal(str(body.fare_amount)) * Decimal(str(body.passengers))
    payment_mode = (body.payment_mode or "WALLET").upper()

    try:
        schedule = (
            db.query(DepartureSchedule)
            .filter(DepartureSchedule.id == body.schedule_id, DepartureSchedule.route_id == body.route_id)
            .with_for_update()
            .first()
        )
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        inv = (
            db.query(ScheduleInventory)
            .filter(ScheduleInventory.schedule_id == schedule.id, ScheduleInventory.service_date == body.service_date)
            .with_for_update()
            .first()
        )
        if not inv:
            inv = ScheduleInventory(
                schedule_id=schedule.id,
                service_date=body.service_date,
                remaining_seats=int(schedule.capacity or 30),
                updated_at=_now(),
            )
            db.add(inv)
            db.flush()

        if int(inv.remaining_seats or 0) < int(body.passengers):
            raise HTTPException(status_code=400, detail="Not enough seats available")

        if payment_mode == "WALLET":
            current = Decimal(str(user.balance or 0))
            if current < fare_total:
                raise HTTPException(status_code=400, detail="Insufficient wallet balance")
            user.balance = current - fare_total

        inv.remaining_seats = int(inv.remaining_seats) - int(body.passengers)
        inv.updated_at = _now()
    except HTTPException:
        raise
    except OperationalError as exc:
        # If the DB doesn't support row locks, fall back to previous behavior.
        # (SQLite has limited concurrency anyway.)
        inv = _ensure_inventory(db, schedule, body.service_date)
        if inv.remaining_seats < body.passengers:
            raise HTTPException(status_code=400, detail="Not enough seats available")
        if payment_mode == "WALLET":
            current = Decimal(str(user.balance or 0))
            if current < fare_total:
                raise HTTPException(status_code=400, detail="Insufficient wallet balance")
            user.balance = current - fare_total
        inv.remaining_seats = int(inv.remaining_seats) - int(body.passengers)

    # Ticket expiry: 5 minutes after scheduled departure (UTC-based record; local interpretation is handled client-side)
    dep_dt = datetime.combine(body.service_date, schedule.departure_time).replace(tzinfo=timezone.utc)
    expires_at = dep_dt + timedelta(minutes=5)

    ref_no = _generate_ref("TICKET")
    t = Ticket(
        ref_no=ref_no,
        user_id=user.id,
        route_id=route.id,
        schedule_id=schedule.id,
        service_date=body.service_date,
        departure_time=schedule.departure_time,
        passengers=int(body.passengers),
        fare_amount=fare_total,
        status="ACTIVE",
        expires_at=expires_at,
        origin=body.origin,
        destination=body.destination,
        passenger_details_json=json.dumps(body.passenger_details) if body.passenger_details else None,
    )
    db.add(t)

    # Ledger entry for the booking (idempotency via unique ref_no).
    ledger_ref = f"LEDGER-{ref_no}"
    db.add(
        LedgerEntry(
            ref_no=ledger_ref,
            entry_type="TICKET_PURCHASE",
            amount=fare_total,
            currency="PHP",
            user_id=user.id,
            meta_json=json.dumps({"payment_mode": payment_mode, "route_id": route.id, "schedule_id": schedule.id}),
        )
    )

    db.commit()
    db.refresh(t)
    db.refresh(user)

    return _ticket_to_out(t)


@router.get("/tickets", response_model=list[TicketOut])
def list_my_tickets(
    auth: dict = Depends(require_role("passenger")),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    phone = auth["sub"]
    user = _get_passenger(db, phone)
    rows = (
        db.query(Ticket)
        .filter(Ticket.user_id == user.id)
        .order_by(Ticket.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_ticket_to_out(t) for t in rows]


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, auth: dict = Depends(require_role("passenger")), db: Session = Depends(get_db)):
    phone = auth["sub"]
    user = _get_passenger(db, phone)
    t = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.user_id == user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ticket_to_out(t)


@router.post("/tickets/{ticket_id}/qr", response_model=QRResponse)
def get_ticket_qr(ticket_id: int, auth: dict = Depends(require_role("passenger")), db: Session = Depends(get_db)):
    phone = auth["sub"]
    user = _get_passenger(db, phone)
    t = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.user_id == user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    payload_obj = {
        "ticketId": t.id,
        "refNo": t.ref_no,
        "phone": user.phone_number,
        "origin": t.origin,
        "destination": t.destination,
        "passengers": int(t.passengers or 1),
        "amount": float(t.fare_amount or 0),
        "schedule": t.departure_time.strftime("%I:%M %p").lstrip("0") if t.departure_time else "",
        "serviceDate": t.service_date.isoformat(),
        "status": t.status,
        "exp": int((t.expires_at or _now()).timestamp()),
    }
    payload = json.dumps(payload_obj, separators=(",", ":"), sort_keys=True)
    sig = _hmac_sign(payload)
    return {"payload": payload, "signature": sig}


class ScanPayload(BaseModel):
    payload: str
    signature: str


class ScanResult(BaseModel):
    valid: bool
    alreadyUsed: bool = False
    status: str | None = None
    ticket: Optional[TicketOut] = None


@router.post("/tickets/scan", response_model=ScanResult)
def scan_ticket(
    body: ScanPayload,
    auth: dict = Depends(require_role("conductor")),
    db: Session = Depends(get_db),
):
    # Verify signature
    expected = _hmac_sign(body.payload)
    if not hmac.compare_digest(expected, body.signature):
        return {"valid": False, "status": "INVALID_SIGNATURE"}

    try:
        obj = json.loads(body.payload)
        ticket_id = int(obj.get("ticketId"))
    except Exception:
        return {"valid": False, "status": "INVALID_PAYLOAD"}

    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        return {"valid": False, "status": "NOT_FOUND"}

    # Auto-expire if past expiry
    if t.expires_at and _now() > t.expires_at and (t.status or "").upper() == "ACTIVE":
        t.status = "EXPIRED"
        db.commit()

    st = (t.status or "ACTIVE").upper()
    if st == "USED":
        return {"valid": True, "alreadyUsed": True, "status": "USED", "ticket": _ticket_to_out(t)}
    if st in {"REJECTED", "EXPIRED"}:
        return {"valid": True, "alreadyUsed": False, "status": st, "ticket": _ticket_to_out(t)}

    return {"valid": True, "alreadyUsed": False, "status": st, "ticket": _ticket_to_out(t)}


class AcceptRequest(BaseModel):
    payload: str
    signature: str


class AcceptResponse(BaseModel):
    ok: bool
    alreadyUsed: bool = False
    ticket: TicketOut | None = None


@router.post("/tickets/accept", response_model=AcceptResponse)
def accept_ticket(
    body: AcceptRequest,
    auth: dict = Depends(require_role("conductor")),
    db: Session = Depends(get_db),
):
    expected = _hmac_sign(body.payload)
    if not hmac.compare_digest(expected, body.signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        obj = json.loads(body.payload)
        ticket_id = int(obj.get("ticketId"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")

    t = db.query(Ticket).filter(Ticket.id == ticket_id).with_for_update().first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    st = (t.status or "ACTIVE").upper()
    if st == "USED":
        return {"ok": True, "alreadyUsed": True, "ticket": _ticket_to_out(t)}
    if st in {"REJECTED", "EXPIRED"}:
        raise HTTPException(status_code=400, detail=f"Ticket is {st}")

    # Mark used
    t.status = "USED"
    db.commit()
    db.refresh(t)
    return {"ok": True, "alreadyUsed": False, "ticket": _ticket_to_out(t)}


class RejectResponse(BaseModel):
    ok: bool
    ticket: TicketOut | None = None


@router.post("/tickets/reject", response_model=RejectResponse)
def reject_ticket(
    body: AcceptRequest,
    auth: dict = Depends(require_role("conductor")),
    db: Session = Depends(get_db),
):
    expected = _hmac_sign(body.payload)
    if not hmac.compare_digest(expected, body.signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        obj = json.loads(body.payload)
        ticket_id = int(obj.get("ticketId"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")

    t = db.query(Ticket).filter(Ticket.id == ticket_id).with_for_update().first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    st = (t.status or "ACTIVE").upper()
    if st in {"USED", "REJECTED"}:
        return {"ok": True, "ticket": _ticket_to_out(t)}

    t.status = "REJECTED"
    db.commit()
    db.refresh(t)
    return {"ok": True, "ticket": _ticket_to_out(t)}


class WalletOut(BaseModel):
    phone_number: str
    balance: float
    last_ledger: list[dict[str, Any]]


@router.get("/wallet/me", response_model=WalletOut)
def wallet_me(auth: dict = Depends(require_role("passenger")), db: Session = Depends(get_db)):
    phone = auth["sub"]
    user = _get_passenger(db, phone)
    entries = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.user_id == user.id)
        .order_by(LedgerEntry.created_at.desc())
        .limit(20)
        .all()
    )
    last = [
        {
            "refNo": e.ref_no,
            "type": e.entry_type,
            "amount": float(e.amount or 0),
            "createdAt": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]
    return {"phone_number": user.phone_number or "", "balance": float(user.balance or 0), "last_ledger": last}

