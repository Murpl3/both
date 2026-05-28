from __future__ import annotations

from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    # Phone is the canonical identifier for passenger auth (E.164 format recommended).
    phone_number = Column(String, unique=True, index=True, nullable=True)
    # Email is optional (kept for compatibility / admin display).
    email = Column(String, unique=True, index=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    nickname = Column(String, unique=True, nullable=True)
    is_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expires = Column(DateTime, nullable=True)
    mpin_hash = Column(String, nullable=True)  # Hashed MPIN (6 digits)
    mpin_set = Column(Boolean, default=False)  # Whether MPIN has been set
    # Base32-encoded shared secret for TOTP authenticator-app verification.
    totp_secret = Column(String(64), nullable=True)
    # NOTE: balance is maintained by the backend. Eventually we can derive it from ledger entries.
    balance = Column(Numeric(10, 2), default=0.00)  # Wallet balance
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationship to topups
    topups = relationship("TopUp", back_populates="user")
    ledger_entries = relationship("LedgerEntry", back_populates="user")
    tickets = relationship("Ticket", back_populates="user")
    push_devices = relationship("PushDevice", back_populates="user")

class TopUp(Base):
    __tablename__ = "topups"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="completed")
    payment_method = Column(String(50), nullable=True)
    transaction_ref = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    
    # Relationship to user
    user = relationship("User", back_populates="topups")
    ledger_entries = relationship("LedgerEntry", back_populates="topup")

class Conductor(Base):
    __tablename__ = "conductors"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)  # Hashed password using bcrypt
    full_name = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    birthdate = Column(String, nullable=True)  # stored as YYYY-MM-DD string for now
    vehicle_no = Column(Integer, nullable=True)
    driver_no = Column(Integer, nullable=True)
    mpin_hash = Column(String, nullable=True)  # Hashed MPIN (6 digits)
    mpin_set = Column(Boolean, default=False)  # Whether MPIN has been set
    is_verified = Column(Boolean, default=False)  # Admin verification flag
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    ledger_entries = relationship("LedgerEntry", back_populates="conductor")


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    operator = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    landmarks = relationship("RouteLandmark", back_populates="route", cascade="all, delete-orphan")
    schedules = relationship("DepartureSchedule", back_populates="route", cascade="all, delete-orphan")


class RouteLandmark(Base):
    __tablename__ = "route_landmarks"
    __table_args__ = (
        UniqueConstraint("route_id", "sequence", name="uq_landmark_route_sequence"),
        UniqueConstraint("route_id", "name", name="uq_landmark_route_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)  # 1..N
    name = Column(String, nullable=False)
    distance_km = Column(Numeric(10, 2), nullable=True)
    fare_from_origin = Column(Numeric(10, 2), nullable=True)

    route = relationship("Route", back_populates="landmarks")


class DepartureSchedule(Base):
    __tablename__ = "departure_schedules"
    __table_args__ = (UniqueConstraint("route_id", "departure_time", name="uq_schedule_route_time"),)

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    departure_time = Column(Time, nullable=False)  # local time-of-day
    capacity = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, default=True)

    route = relationship("Route", back_populates="schedules")
    inventories = relationship("ScheduleInventory", back_populates="schedule", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="schedule")


class ScheduleInventory(Base):
    """
    Remaining seats per schedule per service date.
    This replaces client-side AsyncStorage seat tracking so admin reporting is accurate.
    """

    __tablename__ = "schedule_inventories"
    __table_args__ = (UniqueConstraint("schedule_id", "service_date", name="uq_inventory_schedule_date"),)

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("departure_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    service_date = Column(Date, nullable=False, index=True)
    remaining_seats = Column(Integer, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    schedule = relationship("DepartureSchedule", back_populates="inventories")


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (UniqueConstraint("ref_no", name="uq_ticket_ref_no"),)

    id = Column(Integer, primary_key=True, index=True)
    ref_no = Column(String, nullable=False, index=True)  # human-friendly reference used in QR payloads

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="RESTRICT"), nullable=False, index=True)
    schedule_id = Column(Integer, ForeignKey("departure_schedules.id", ondelete="RESTRICT"), nullable=False, index=True)

    service_date = Column(Date, nullable=False, index=True)
    departure_time = Column(Time, nullable=False)
    passengers = Column(Integer, nullable=False, default=1)
    fare_amount = Column(Numeric(10, 2), nullable=False)

    status = Column(String(20), default="ACTIVE")  # ACTIVE, USED, REJECTED, EXPIRED
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    # Extra payload fields (optional; used for QR validation / audit)
    origin = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    passenger_details_json = Column(Text, nullable=True)

    user = relationship("User", back_populates="tickets")
    schedule = relationship("DepartureSchedule", back_populates="tickets")

    ledger_entries = relationship("LedgerEntry", back_populates="ticket")


class LedgerEntry(Base):
    """
    Append-only accounting/transaction ledger.
    - TOPUP: +amount
    - FARE_DEDUCTION: -amount
    - TICKET_PURCHASE: -amount (if you charge on purchase)
    """

    __tablename__ = "ledger_entries"
    __table_args__ = (
        UniqueConstraint("ref_no", name="uq_ledger_ref_no"),
    )

    id = Column(Integer, primary_key=True, index=True)
    ref_no = Column(String, nullable=False, index=True)  # unique reference for idempotency
    entry_type = Column(String(30), nullable=False)  # TOPUP, FARE_DEDUCTION, TICKET_PURCHASE
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="PHP")

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    conductor_id = Column(Integer, ForeignKey("conductors.id", ondelete="SET NULL"), nullable=True, index=True)
    topup_id = Column(Integer, ForeignKey("topups.id", ondelete="SET NULL"), nullable=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True, index=True)

    meta_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="ledger_entries")
    conductor = relationship("Conductor", back_populates="ledger_entries")
    topup = relationship("TopUp", back_populates="ledger_entries")
    ticket = relationship("Ticket", back_populates="ledger_entries")


class PushDevice(Base):
    __tablename__ = "push_devices"
    __table_args__ = (UniqueConstraint("expo_token", name="uq_push_expo_token"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expo_token = Column(String, nullable=False)
    platform = Column(String(20), nullable=True)  # ios/android/web
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    user = relationship("User", back_populates="push_devices")