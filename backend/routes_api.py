from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth_utils import require_role
from database import get_db
from models import DepartureSchedule, Route, RouteLandmark, ScheduleInventory

router = APIRouter(tags=["routes"])


class RouteOut(BaseModel):
    id: int
    name: str
    operator: str | None = None
    is_active: bool


class LandmarkOut(BaseModel):
    id: int
    sequence: int
    name: str
    distance_km: float | None = None
    fare_from_origin: float | None = None


class ScheduleOut(BaseModel):
    id: int
    route_id: int
    departure_time: str
    capacity: int
    remaining_seats: int


class ScheduleCreateIn(BaseModel):
    route_id: int = Field(..., ge=1)
    departure_time: str = Field(..., description="HH:MM 24-hour time")
    capacity: int = Field(30, ge=1, le=200)


class ScheduleUpdateIn(BaseModel):
    departure_time: str | None = Field(None, description="HH:MM 24-hour time")
    capacity: int | None = Field(None, ge=1, le=200)


@router.get("/routes", response_model=list[RouteOut])
def list_routes(db: Session = Depends(get_db)):
    routes = db.query(Route).filter(Route.is_active.is_(True)).order_by(Route.id.asc()).all()
    return [
        RouteOut(
            id=r.id,
            name=r.name,
            operator=r.operator,
            is_active=bool(r.is_active),
        )
        for r in routes
    ]


@router.get("/routes/{route_id}/landmarks", response_model=list[LandmarkOut])
def list_landmarks(route_id: int, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    rows = (
        db.query(RouteLandmark)
        .filter(RouteLandmark.route_id == route_id)
        .order_by(RouteLandmark.sequence.asc())
        .all()
    )
    return [
        LandmarkOut(
            id=l.id,
            sequence=int(l.sequence),
            name=l.name,
            distance_km=float(l.distance_km) if l.distance_km is not None else None,
            fare_from_origin=float(l.fare_from_origin) if l.fare_from_origin is not None else None,
        )
        for l in rows
    ]


def _ensure_inventory(db: Session, schedule: DepartureSchedule, service_date: date) -> ScheduleInventory:
    inv = (
        db.query(ScheduleInventory)
        .filter(ScheduleInventory.schedule_id == schedule.id, ScheduleInventory.service_date == service_date)
        .first()
    )
    if inv:
        return inv
    inv = ScheduleInventory(
        schedule_id=schedule.id,
        service_date=service_date,
        remaining_seats=int(schedule.capacity or 30),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/schedules", response_model=list[ScheduleOut])
def list_schedules(
    route_id: int = Query(..., ge=1),
    service_date: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    route = db.query(Route).filter(Route.id == route_id, Route.is_active.is_(True)).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    schedules = (
        db.query(DepartureSchedule)
        .filter(DepartureSchedule.route_id == route_id, DepartureSchedule.is_active.is_(True))
        .order_by(DepartureSchedule.departure_time.asc())
        .all()
    )
    out: list[ScheduleOut] = []
    for s in schedules:
        inv = _ensure_inventory(db, s, service_date)
        out.append(
            ScheduleOut(
                id=s.id,
                route_id=s.route_id,
                departure_time=s.departure_time.strftime("%H:%M"),
                capacity=int(s.capacity or 30),
                remaining_seats=int(inv.remaining_seats),
            )
        )
    return out


# ---------------------------------------------------------------------------
# Admin schedule management (CRUD)
# ---------------------------------------------------------------------------


def _parse_hhmm(value: str) -> tuple[int, int]:
    v = (value or "").strip()
    if len(v) != 5 or v[2] != ":":
        raise HTTPException(status_code=422, detail="departure_time must be in HH:MM format")
    try:
        hh = int(v[0:2])
        mm = int(v[3:5])
    except ValueError:
        raise HTTPException(status_code=422, detail="departure_time must be numeric HH:MM")
    if hh < 0 or hh > 23 or mm < 0 or mm > 59:
        raise HTTPException(status_code=422, detail="departure_time must be a valid 24-hour time")
    return hh, mm


@router.post("/admin/schedules", response_model=ScheduleOut, dependencies=[Depends(require_role("admin"))])
def create_schedule(payload: ScheduleCreateIn, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == payload.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    hh, mm = _parse_hhmm(payload.departure_time)
    s = DepartureSchedule(
        route_id=int(payload.route_id),
        departure_time=datetime(2000, 1, 1, hh, mm, tzinfo=timezone.utc).time().replace(tzinfo=None),
        capacity=int(payload.capacity or 30),
        is_active=True,
    )
    try:
        db.add(s)
        db.commit()
        db.refresh(s)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Schedule already exists for this route and time")

    inv = _ensure_inventory(db, s, date.today())
    return ScheduleOut(
        id=s.id,
        route_id=s.route_id,
        departure_time=s.departure_time.strftime("%H:%M"),
        capacity=int(s.capacity or 30),
        remaining_seats=int(inv.remaining_seats),
    )


@router.put("/admin/schedules/{schedule_id}", response_model=ScheduleOut, dependencies=[Depends(require_role("admin"))])
def update_schedule(schedule_id: int, payload: ScheduleUpdateIn, db: Session = Depends(get_db)):
    s = db.query(DepartureSchedule).filter(DepartureSchedule.id == schedule_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if payload.departure_time is not None:
        hh, mm = _parse_hhmm(payload.departure_time)
        s.departure_time = datetime(2000, 1, 1, hh, mm, tzinfo=timezone.utc).time().replace(tzinfo=None)

    if payload.capacity is not None:
        new_cap = int(payload.capacity)
        s.capacity = new_cap
        # Clamp any existing inventories so remaining_seats never exceeds capacity.
        for inv in s.inventories or []:
            if inv.remaining_seats is not None and int(inv.remaining_seats) > new_cap:
                inv.remaining_seats = new_cap

    try:
        db.add(s)
        db.commit()
        db.refresh(s)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Schedule already exists for this route and time")

    inv = _ensure_inventory(db, s, date.today())
    return ScheduleOut(
        id=s.id,
        route_id=s.route_id,
        departure_time=s.departure_time.strftime("%H:%M"),
        capacity=int(s.capacity or 30),
        remaining_seats=int(inv.remaining_seats),
    )


@router.post("/admin/schedules/{schedule_id}/deactivate", response_model=ScheduleOut, dependencies=[Depends(require_role("admin"))])
def deactivate_schedule(schedule_id: int, db: Session = Depends(get_db)):
    s = db.query(DepartureSchedule).filter(DepartureSchedule.id == schedule_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    s.is_active = False
    db.add(s)
    db.commit()
    db.refresh(s)

    inv = _ensure_inventory(db, s, date.today())
    return ScheduleOut(
        id=s.id,
        route_id=s.route_id,
        departure_time=s.departure_time.strftime("%H:%M"),
        capacity=int(s.capacity or 30),
        remaining_seats=int(inv.remaining_seats),
    )

