"""add user totp secret

Revision ID: 0002_user_totp
Revises: 0001_init
Create Date: 2026-04-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_user_totp"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("totp_secret", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "totp_secret")
