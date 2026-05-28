from __future__ import annotations

import os
import random
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import pyotp
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User

TOTP_ISSUER = os.getenv("TOTP_ISSUER", "EzSakay")

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Auth / OTP helpers
# ---------------------------------------------------------------------------

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))


def _require_secret():
    if not SECRET_KEY:
        raise HTTPException(status_code=500, detail="Server auth not configured (SECRET_KEY missing).")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    _require_secret()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def normalize_phone(phone_number: str) -> str:
    """
    Normalize PH phone numbers into E.164-ish format:
    - '09xxxxxxxxx' -> '+639xxxxxxxxx'
    - '9xxxxxxxxx'  -> '+639xxxxxxxxx'
    - '+63...' kept
    """
    raw = (phone_number or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Phone number is required.")

    # Remove spaces, dashes, parentheses
    cleaned = re.sub(r"[^\d+]", "", raw)

    if cleaned.startswith("+"):
        if not re.fullmatch(r"\+\d{10,15}", cleaned):
            raise HTTPException(status_code=400, detail="Invalid phone number format.")
        return cleaned

    # PH local formats
    digits = re.sub(r"\D", "", cleaned)
    if digits.startswith("09") and len(digits) == 11:
        return "+63" + digits[1:]
    if digits.startswith("9") and len(digits) == 10:
        return "+63" + digits
    if digits.startswith("63") and 12 <= len(digits) <= 15:
        return "+" + digits

    raise HTTPException(status_code=400, detail="Invalid phone number format.")


def _send_otp_sms(to_phone: str, otp: str) -> None:
    """
    Best-effort SMS sender. For capstone/demo, printing OTP is acceptable when SMS isn't configured.
    """
    debug = os.getenv("DEBUG", "false").lower() == "true"
    print(f"*** OTP for {to_phone}: {otp} (Expires in 5 minutes) ***")

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")
    if not account_sid or not auth_token or not from_number:
        if not debug:
            # In production, you likely want SMS configured; but don't hard-fail for capstone.
            pass
        return

    try:
        from twilio.rest import Client  # type: ignore

        client = Client(account_sid, auth_token)
        client.messages.create(
            body=f"EzSakay verification code: {otp}",
            from_=from_number,
            to=to_phone,
        )
    except Exception as exc:
        if not debug:
            # Keep flow working even if SMS fails; OTP is stored in DB.
            print(f"*** SMS send failed: {exc} ***")


def hash_mpin(mpin: str) -> str:
    return bcrypt.hashpw(mpin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_mpin(mpin: str, mpin_hash: str) -> bool:
    return bcrypt.checkpw(mpin.encode("utf-8"), mpin_hash.encode("utf-8"))


# ---------------------------------------------------------------------------
# Simple in-memory rate limiting (single-process)
# ---------------------------------------------------------------------------

_OTP_VERIFY_ATTEMPTS: dict[str, list[datetime]] = {}
_MPIN_LOGIN_ATTEMPTS: dict[str, list[datetime]] = {}

_OTP_MAX_TRIES = int(os.getenv("OTP_MAX_TRIES", "3"))
_OTP_WINDOW_SECONDS = int(os.getenv("OTP_WINDOW_SECONDS", "300"))  # 5 minutes

_MPIN_MAX_TRIES = int(os.getenv("MPIN_MAX_TRIES", "5"))
_MPIN_WINDOW_SECONDS = int(os.getenv("MPIN_WINDOW_SECONDS", "300"))  # 5 minutes


def _attempt_ok(bucket: dict[str, list[datetime]], key: str, max_tries: int, window_seconds: int) -> bool:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=window_seconds)
    rows = bucket.get(key, [])
    rows = [t for t in rows if t > window_start]
    if len(rows) >= max_tries:
        bucket[key] = rows
        return False
    rows.append(now)
    bucket[key] = rows
    return True


# ---------------------------------------------------------------------------
# Request models (phone-only)
# ---------------------------------------------------------------------------

class SendOTPRequest(BaseModel):
    phone_number: str


class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str


class CreateAccountRequest(BaseModel):
    phone_number: str
    first_name: str
    last_name: str
    email: Optional[str] = None


class CreateMPINRequest(BaseModel):
    phone_number: str
    mpin: str  # 6 digits


class LoginMPINRequest(BaseModel):
    phone_number: str
    mpin: str


class ForgotMPINRequest(BaseModel):
    phone_number: str


class TOTPSetupRequest(BaseModel):
    phone_number: str


class TOTPVerifyRequest(BaseModel):
    phone_number: str
    code: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/send-otp/")
def send_otp_endpoint(request: SendOTPRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone_number)
    otp = f"{secrets.randbelow(10000):04d}"

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        user = User(phone_number=phone)
        db.add(user)
        db.commit()
        db.refresh(user)

    user.otp_code = otp
    user.otp_expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    user.is_verified = False
    db.commit()

    _send_otp_sms(phone, otp)
    return {"message": "OTP sent.", "phone_number": phone}


@router.post("/verify-otp/")
def verify_otp_endpoint(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone_number)
    otp = (request.otp or "").strip()

    if not re.fullmatch(r"\d{4}", otp):
        raise HTTPException(status_code=400, detail="OTP must be 4 digits.")

    if not _attempt_ok(_OTP_VERIFY_ATTEMPTS, phone, _OTP_MAX_TRIES, _OTP_WINDOW_SECONDS):
        raise HTTPException(status_code=429, detail="Too many OTP attempts. Please wait and try again.")

    user = (
        db.query(User)
        .filter(
            User.phone_number == phone,
            User.otp_code == otp,
            User.otp_expires.is_not(None),
            User.otp_expires > datetime.now(timezone.utc),
        )
        .first()
    )
    if not user:
        expired_user = db.query(User).filter(User.phone_number == phone).first()
        if expired_user and expired_user.otp_expires and expired_user.otp_expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="OTP expired. Resend a new one.")
        raise HTTPException(status_code=400, detail="Invalid OTP or phone number.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires = None
    db.commit()

    return {
        "message": "OTP verified successfully!",
        "phone_number": phone,
        "account_exists": bool(user.mpin_set),
        "needs_account_details": not (user.first_name and user.last_name),
        "needs_mpin": not bool(user.mpin_set),
    }


@router.post("/totp/setup")
def totp_setup_endpoint(request: TOTPSetupRequest, db: Session = Depends(get_db)):
    """
    Generate (or rotate) a TOTP secret for the given phone number and return
    the otpauth URI that the mobile app encodes as a QR for the user's
    authenticator app. Existing accounts that already have an MPIN cannot
    rotate their secret here without first re-authenticating.
    """
    phone = normalize_phone(request.phone_number)

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        user = User(phone_number=phone)
        db.add(user)
        db.commit()
        db.refresh(user)

    if user.mpin_set and user.totp_secret:
        # Already enrolled; return the existing provisioning URI so the user
        # can re-add their device, but do not rotate the secret here.
        secret = user.totp_secret
    else:
        secret = pyotp.random_base32()
        user.totp_secret = secret
        # Re-enrolling resets verification until the user proves possession again.
        user.is_verified = False
        db.commit()

    totp = pyotp.TOTP(secret)
    otpauth_uri = totp.provisioning_uri(name=phone, issuer_name=TOTP_ISSUER)

    return {
        "otpauth_uri": otpauth_uri,
        "secret": secret,
        "issuer": TOTP_ISSUER,
        "account": phone,
        "digits": 6,
        "period": 30,
        "algorithm": "SHA1",
    }


@router.post("/totp/verify")
def totp_verify_endpoint(request: TOTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify a 6-digit TOTP code from the user's authenticator app. Mirrors the
    response shape of /auth/verify-otp/ so the rest of the sign-up flow
    (`/create-account`, `/create-mpin`) is unchanged.
    """
    phone = normalize_phone(request.phone_number)
    code = (request.code or "").strip().replace(" ", "")

    if not re.fullmatch(r"\d{6}", code):
        raise HTTPException(status_code=400, detail="Code must be 6 digits.")

    if not _attempt_ok(_OTP_VERIFY_ATTEMPTS, phone, _OTP_MAX_TRIES, _OTP_WINDOW_SECONDS):
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait and try again.")

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="No TOTP secret on file. Please set up your authenticator first.")

    totp = pyotp.TOTP(user.totp_secret)
    # `valid_window=1` accepts the current 30-second step plus one before/after
    # to tolerate small clock skew between device and server.
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code. Make sure your device clock is correct and try again.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires = None
    db.commit()

    return {
        "message": "TOTP verified successfully!",
        "phone_number": phone,
        "account_exists": bool(user.mpin_set),
        "needs_account_details": not (user.first_name and user.last_name),
        "needs_mpin": not bool(user.mpin_set),
    }


@router.post("/create-account/")
def create_account_endpoint(request: CreateAccountRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone_number)
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone not verified. Please verify OTP first.")
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Phone not verified. Please verify OTP first.")

    user.first_name = request.first_name.strip()
    user.last_name = request.last_name.strip()
    if request.email:
        user.email = request.email.strip().lower()

    if not user.nickname and user.first_name:
        base = re.sub(r"\s+", "", user.first_name.lower())
        if not base:
            base = "user"
        nick = base
        counter = 1
        while db.query(User).filter(User.nickname == nick, User.id != user.id).first():
            nick = f"{base}{counter}"
            counter += 1
        user.nickname = nick

    db.commit()
    db.refresh(user)

    return {
        "message": "Account saved.",
        "user": {
            "id": user.id,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "nickname": user.nickname,
        },
    }


@router.post("/create-mpin/")
def create_mpin_endpoint(request: CreateMPINRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone_number)
    if len(request.mpin) != 6 or not request.mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be 6 digits.")

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Phone not verified.")

    user.mpin_hash = hash_mpin(request.mpin)
    user.mpin_set = True
    db.commit()

    token = create_access_token({"sub": phone, "role": "passenger"})
    return {
        "message": "MPIN created successfully!",
        "user": {
            "id": user.id,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "nickname": user.nickname,
            "mpin_set": True,
        },
        "access_token": token,
    }


@router.post("/login-mpin/")
def login_mpin_endpoint(request: LoginMPINRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone_number)
    if len(request.mpin) != 6 or not request.mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be 6 digits.")

    if not _attempt_ok(_MPIN_LOGIN_ATTEMPTS, phone, _MPIN_MAX_TRIES, _MPIN_WINDOW_SECONDS):
        raise HTTPException(status_code=429, detail="Too many MPIN attempts. Please wait and try again.")

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone not registered.")
    if not user.mpin_set or not user.mpin_hash:
        raise HTTPException(status_code=400, detail="MPIN not set. Please create an account first.")
    if not verify_mpin(request.mpin, user.mpin_hash):
        raise HTTPException(status_code=401, detail="Invalid MPIN.")

    token = create_access_token({"sub": phone, "role": "passenger"})
    return {
        "message": f"Welcome back, {user.first_name or 'Byahero'}!",
        "user": {
            "id": user.id,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "nickname": user.nickname,
        },
        "access_token": token,
    }


@router.post("/forgot-mpin/")
def forgot_mpin_endpoint(request: ForgotMPINRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone_number)
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone not registered.")
    if not user.mpin_set:
        raise HTTPException(status_code=400, detail="MPIN not set. Please create an account first.")

    # Send OTP for reset
    otp = f"{secrets.randbelow(10000):04d}"
    user.otp_code = otp
    user.otp_expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    user.is_verified = False
    db.commit()
    _send_otp_sms(phone, otp)
    return {"message": "OTP sent to reset MPIN.", "phone_number": phone}


@router.post("/reset-mpin/")
def reset_mpin_endpoint(request: CreateMPINRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone_number)
    if len(request.mpin) != 6 or not request.mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be 6 digits.")

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Please verify OTP first.")

    user.mpin_hash = hash_mpin(request.mpin)
    user.mpin_set = True
    db.commit()

    token = create_access_token({"sub": phone, "role": "passenger"})
    return {"message": "MPIN reset successfully!", "access_token": token}

