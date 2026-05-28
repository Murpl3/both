from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from auth_utils import require_role
from database import get_db
from models import Conductor
from schemas import ConductorLogin, ConductorResponse
from pydantic import BaseModel
import bcrypt
import os
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional

router = APIRouter(prefix="/conductor", tags=["conductor"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def _find_conductor(username: str, db: Session) -> Optional[Conductor]:
    return db.query(Conductor).filter(Conductor.username == username.strip().lower()).first()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/login", response_model=ConductorResponse)
def login_conductor(login_data: ConductorLogin, db: Session = Depends(get_db)):
    """Login conductor with username and password"""
    conductor = _find_conductor(login_data.username, db)

    if not conductor or not conductor.password_hash:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(login_data.password, conductor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": conductor.username, "role": "conductor"})

    return {
        "message": "Login successful",
        "conductor": {
            "id": conductor.id,
            "username": conductor.username,
            "full_name": conductor.full_name,
            "mpin_set": conductor.mpin_set,
            "created_at": conductor.created_at,
        },
        "access_token": access_token,
    }


class CreateMPINRequest(BaseModel):
    username: str
    mpin: str  # 6-digit MPIN

class VerifyMPINRequest(BaseModel):
    username: str
    mpin: str


@router.post("/create-mpin")
def create_mpin(mpin_data: CreateMPINRequest, db: Session = Depends(get_db)):
    """Create or set MPIN for conductor"""
    if len(mpin_data.mpin) != 6 or not mpin_data.mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be 6 digits")

    conductor = _find_conductor(mpin_data.username, db)
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")

    mpin_hashed = hash_password(mpin_data.mpin)

    conductor.mpin_hash = mpin_hashed
    conductor.mpin_set = True
    db.commit()

    return {
        "message": "MPIN created successfully",
        "mpin_set": True,
    }


@router.post("/verify-mpin")
def verify_mpin(mpin_data: VerifyMPINRequest, db: Session = Depends(get_db)):
    """Verify conductor MPIN"""
    conductor = _find_conductor(mpin_data.username, db)
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")

    if not conductor.mpin_set or not conductor.mpin_hash:
        raise HTTPException(status_code=400, detail="MPIN not set. Please create MPIN first.")

    if not verify_password(mpin_data.mpin, conductor.mpin_hash):
        raise HTTPException(status_code=401, detail="Invalid MPIN")

    access_token = create_access_token(data={"sub": conductor.username, "role": "conductor"})

    return {
        "message": "MPIN verified successfully",
        "conductor": {
            "id": conductor.id,
            "username": conductor.username,
            "full_name": conductor.full_name,
            "created_at": conductor.created_at,
        },
        "access_token": access_token,
    }


@router.get("/me")
def get_conductor_info(
    payload: dict = Depends(require_role("conductor")),
    db: Session = Depends(get_db),
):
    """Return the authenticated conductor's profile."""
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    conductor = _find_conductor(username, db)
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor not found")

    return {
        "id": conductor.id,
        "username": conductor.username,
        "full_name": conductor.full_name,
        "email": getattr(conductor, "email", None),
        "contact": getattr(conductor, "contact", None),
        "address": getattr(conductor, "address", None),
        "birthdate": (
            conductor.birthdate.isoformat()
            if getattr(conductor, "birthdate", None) else None
        ),
        "vehicle_no": getattr(conductor, "vehicle_no", None),
        "mpin_set": bool(conductor.mpin_set),
        "is_verified": bool(getattr(conductor, "is_verified", False)),
        "created_at": (
            conductor.created_at.isoformat() if conductor.created_at else None
        ),
    }
