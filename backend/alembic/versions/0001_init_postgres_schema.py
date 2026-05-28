"""init postgres schema

Revision ID: 0001_init
Revises:
Create Date: 2026-04-16

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("operator", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=True),
    )
    op.create_index("ix_routes_id", "routes", ["id"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("nickname", sa.String(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("otp_code", sa.String(), nullable=True),
        sa.Column("otp_expires", sa.DateTime(timezone=False), nullable=True),
        sa.Column("mpin_hash", sa.String(), nullable=True),
        sa.Column("mpin_set", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("balance", sa.Numeric(10, 2), nullable=True, server_default="0.00"),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=True),
        sa.UniqueConstraint("phone_number", name="uq_users_phone_number"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("nickname", name="uq_users_nickname"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_phone_number", "users", ["phone_number"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "conductors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("contact", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("birthdate", sa.String(), nullable=True),
        sa.Column("vehicle_no", sa.Integer(), nullable=True),
        sa.Column("driver_no", sa.Integer(), nullable=True),
        sa.Column("mpin_hash", sa.String(), nullable=True),
        sa.Column("mpin_set", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=True),
        sa.UniqueConstraint("username", name="uq_conductors_username"),
    )
    op.create_index("ix_conductors_id", "conductors", ["id"])
    op.create_index("ix_conductors_username", "conductors", ["username"])

    op.create_table(
        "route_landmarks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("distance_km", sa.Numeric(10, 2), nullable=True),
        sa.Column("fare_from_origin", sa.Numeric(10, 2), nullable=True),
        sa.UniqueConstraint("route_id", "sequence", name="uq_landmark_route_sequence"),
        sa.UniqueConstraint("route_id", "name", name="uq_landmark_route_name"),
    )
    op.create_index("ix_route_landmarks_id", "route_landmarks", ["id"])
    op.create_index("ix_route_landmarks_route_id", "route_landmarks", ["route_id"])

    op.create_table(
        "departure_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("departure_time", sa.Time(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("route_id", "departure_time", name="uq_schedule_route_time"),
    )
    op.create_index("ix_departure_schedules_id", "departure_schedules", ["id"])
    op.create_index("ix_departure_schedules_route_id", "departure_schedules", ["route_id"])

    op.create_table(
        "schedule_inventories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("schedule_id", sa.Integer(), sa.ForeignKey("departure_schedules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("remaining_seats", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=True),
        sa.UniqueConstraint("schedule_id", "service_date", name="uq_inventory_schedule_date"),
    )
    op.create_index("ix_schedule_inventories_id", "schedule_inventories", ["id"])
    op.create_index("ix_schedule_inventories_schedule_id", "schedule_inventories", ["schedule_id"])
    op.create_index("ix_schedule_inventories_service_date", "schedule_inventories", ["service_date"])

    op.create_table(
        "topups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("transaction_ref", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=True),
    )
    op.create_index("ix_topups_id", "topups", ["id"])

    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ref_no", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("schedule_id", sa.Integer(), sa.ForeignKey("departure_schedules.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("departure_time", sa.Time(), nullable=False),
        sa.Column("passengers", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("fare_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("origin", sa.String(), nullable=True),
        sa.Column("destination", sa.String(), nullable=True),
        sa.Column("passenger_details_json", sa.Text(), nullable=True),
        sa.UniqueConstraint("ref_no", name="uq_ticket_ref_no"),
    )
    op.create_index("ix_tickets_id", "tickets", ["id"])
    op.create_index("ix_tickets_ref_no", "tickets", ["ref_no"])
    op.create_index("ix_tickets_user_id", "tickets", ["user_id"])

    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ref_no", sa.String(), nullable=False),
        sa.Column("entry_type", sa.String(30), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("conductor_id", sa.Integer(), sa.ForeignKey("conductors.id", ondelete="SET NULL"), nullable=True),
        sa.Column("topup_id", sa.Integer(), sa.ForeignKey("topups.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=True),
        sa.UniqueConstraint("ref_no", name="uq_ledger_ref_no"),
    )
    op.create_index("ix_ledger_entries_id", "ledger_entries", ["id"])
    op.create_index("ix_ledger_entries_ref_no", "ledger_entries", ["ref_no"])
    op.create_index("ix_ledger_entries_user_id", "ledger_entries", ["user_id"])
    op.create_index("ix_ledger_entries_created_at", "ledger_entries", ["created_at"])

    op.create_table(
        "push_devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expo_token", sa.String(), nullable=False),
        sa.Column("platform", sa.String(20), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=True),
        sa.UniqueConstraint("expo_token", name="uq_push_expo_token"),
    )
    op.create_index("ix_push_devices_id", "push_devices", ["id"])
    op.create_index("ix_push_devices_user_id", "push_devices", ["user_id"])


def downgrade() -> None:
    op.drop_table("push_devices")
    op.drop_table("ledger_entries")
    op.drop_table("tickets")
    op.drop_table("topups")
    op.drop_table("schedule_inventories")
    op.drop_table("departure_schedules")
    op.drop_table("route_landmarks")
    op.drop_table("conductors")
    op.drop_table("users")
    op.drop_table("routes")

