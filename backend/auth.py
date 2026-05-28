from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User
import random, os, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
import bcrypt

router = APIRouter(prefix="/auth", tags=["auth"])

class SendOTPRequest(BaseModel):
    phone_number: str

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str

class CreateAccountRequest(BaseModel):
    phone_number: str
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None

class CreateMPINRequest(BaseModel):
    phone_number: str
    mpin: str  # 6-digit MPIN

class LoginMPINRequest(BaseModel):
    phone_number: str
    mpin: str

class ForgotMPINRequest(BaseModel):
    phone_number: str

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def send_otp_email(email: str, db: Session):
    """Send OTP verification code via email"""
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))

    # Email configuration from .env
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", smtp_username)
    app_name = os.getenv("APP_NAME", "EzSAKAY")

    if not smtp_username or not smtp_password:
        # For development: just print OTP if email not configured
        debug_otp = otp if os.getenv("DEBUG") == "true" else None
        print(f"*** Email not configured. OTP for {email}: {otp} ***")
        print(f"*** Add SMTP settings to .env to send real emails ***")
    else:
        try:
            # Create email message
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = email
            msg['Subject'] = f"{app_name} - Verification Code"

            # Email body
            body = f"""
            <html>
              <body>
                <h2>Welcome to {app_name}!</h2>
                <p>Your verification code is:</p>
                <h1 style="color: #ff5722; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
                <p>This code will expire in 5 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">© {app_name} - Ride Sharing App</p>
              </body>
            </html>
            """
            msg.attach(MIMEText(body, 'html'))

            # Send email
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)

            debug_otp = otp if os.getenv("DEBUG") == "true" else None
            print(f"*** Email sent to {email}! DEBUG OTP: {debug_otp} ***")
        except Exception as e:
            print(f"*** Email sending failed: {e} ***")
            # Still save OTP for development
            debug_otp = otp if os.getenv("DEBUG") == "true" else None
            if os.getenv("DEBUG") != "true":
                raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    # Save or update user in database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    user.otp_code = otp
    user.otp_expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    db.commit()

    return debug_otp if os.getenv("DEBUG") == "true" else None

@router.post("/signup/")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    # Check if email or nickname already exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    if db.query(User).filter(User.nickname == request.nickname).first():
        raise HTTPException(status_code=400, detail="Nickname already taken.")

    # Create user with is_verified=False
    user = User(email=request.email, nickname=request.nickname, is_verified=False)
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send OTP via email
    send_otp_email(request.email, db)

    return {"message": "User created and OTP sent. Please check your email."}

@router.post("/send-otp/")
def send_otp_endpoint(request: SendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered. Please sign up first.")
    send_otp_email(request.email, db)
    return {"message": "OTP sent successfully! Check your email."}

@router.post("/verify-otp/")
def verify_otp_endpoint(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == request.email,
        User.otp_code == request.otp,
        User.otp_expires > datetime.now(timezone.utc)
    ).first()

    if not user:
        expired_user = db.query(User).filter(User.email == request.email).first()
        if expired_user and expired_user.otp_expires and expired_user.otp_expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="OTP expired. Resend a new one.")
        raise HTTPException(status_code=400, detail="Invalid OTP or email address.")

    # For signup, check nickname uniqueness and assign if provided
    if request.nickname:
        existing_nick = db.query(User).filter(User.nickname == request.nickname).first()
        if existing_nick and existing_nick.id != user.id:
            raise HTTPException(status_code=400, detail="Nickname already taken.")
        user.nickname = request.nickname

    user.is_verified = True
    user.otp_code = None
    user.otp_expires = None
    db.commit()

    access_token = create_access_token(data={"sub": user.email})

    return {
        "message": f"OTP verified! Welcome, {user.nickname or 'User'}.",
        "user": {
            "id": user.id,
            "email": user.email,
            "nickname": user.nickname,
            "is_verified": True
        },
        "access_token": access_token
    }