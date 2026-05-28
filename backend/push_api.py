from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth_utils import require_role
from database import get_db
from models import PushDevice, User

router = APIRouter(prefix="/push", tags=["push"])


class RegisterDeviceRequest(BaseModel):
    expo_token: str = Field(..., min_length=10)
    platform: str | None = None
    enabled: bool = True


@router.post("/devices")
def register_device(
    body: RegisterDeviceRequest,
    auth: dict = Depends(require_role("passenger")),
    db: Session = Depends(get_db),
):
    phone = auth["sub"]
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = body.expo_token.strip()
    existing = db.query(PushDevice).filter(PushDevice.expo_token == token).first()
    if existing:
        existing.user_id = user.id
        existing.platform = body.platform
        existing.enabled = bool(body.enabled)
        db.commit()
        return {"ok": True, "id": existing.id}

    d = PushDevice(
        user_id=user.id,
        expo_token=token,
        platform=body.platform,
        enabled=bool(body.enabled),
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"ok": True, "id": d.id}

