import os
import json
import time
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import asynccontextmanager
import models

from dotenv import load_dotenv
load_dotenv()

from database import engine, get_db
from auth_mpin import router as auth_router
from topup import router as topup_router
from conductor_auth import router as conductor_router
from admin_panel import router as admin_router
from auth_utils import require_role
from routes_api import router as routes_router
from tickets_api import router as tickets_router
from push_api import router as push_router
from reports_api import router as reports_router

_DEBUG_SESSION_ID = os.getenv("DEBUG_SESSION_ID", "6227d8")
# Disabled by default. Set DEBUG_LOG_FILE to an absolute path to enable
# NDJSON tracing. Relative paths are resolved against the backend directory
# so we never write outside the project tree by accident.
_DEBUG_LOG_PATH = os.getenv("DEBUG_LOG_FILE")
if _DEBUG_LOG_PATH and not os.path.isabs(_DEBUG_LOG_PATH):
    _DEBUG_LOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), _DEBUG_LOG_PATH))


def _dbg(hypothesis_id: str, location: str, message: str, data: dict | None = None, run_id: str = "pre-fix") -> None:
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
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _dbg("H0", "backend/main.py:lifespan", "Backend lifespan start", data={"databaseUrlSet": bool(os.getenv("DATABASE_URL"))})
        models.Base.metadata.create_all(bind=engine)
        # Ensure newly-added columns exist in local SQLite fallback DB.
        # SQLAlchemy's create_all does not alter existing tables.
        try:
            # Use an explicit transaction so SQLite DDL persists.
            with engine.begin() as conn:
                # Conductor table additions (SQLite only; Postgres uses Alembic)
                for ddl in [
                    "ALTER TABLE conductors ADD COLUMN is_verified BOOLEAN DEFAULT FALSE",
                    "ALTER TABLE conductors ADD COLUMN contact VARCHAR",
                    "ALTER TABLE conductors ADD COLUMN email VARCHAR",
                    "ALTER TABLE conductors ADD COLUMN address VARCHAR",
                    "ALTER TABLE conductors ADD COLUMN birthdate VARCHAR",
                    "ALTER TABLE conductors ADD COLUMN vehicle_no INTEGER",
                    "ALTER TABLE conductors ADD COLUMN driver_no INTEGER",
                ]:
                    try:
                        conn.execute(text(ddl))
                    except Exception:
                        pass

                # User table additions (SQLite only; Postgres uses Alembic)
                # Keep in sync with models.User. Ignore errors if column already exists.
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
                    "ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64)",
                ]:
                    try:
                        conn.execute(text(ddl))
                    except Exception:
                        pass
        except Exception:
            pass
        print("*** Tables created/verified! ***")
        print("*** Database connected successfully! (URL: ", os.getenv("DATABASE_URL", "Not set"), ") ***")
        _dbg("H0", "backend/main.py:lifespan", "Backend lifespan ready")
    except Exception as e:
        print(f"*** Startup failed: {e} ***")
        _dbg("H0", "backend/main.py:lifespan", "Backend lifespan failed", data={"error": str(e)})
        raise

    yield

    print("*** Server shutdown. Goodbye! ***")
    _dbg("H0", "backend/main.py:lifespan", "Backend lifespan shutdown")

app = FastAPI(
    title="EzSAKAY API",
    description="Backend for EzSAKAY: Ride-sharing with Vonage OTP verification",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(topup_router)
app.include_router(conductor_router)
app.include_router(admin_router)
app.include_router(routes_router)
app.include_router(tickets_router)
app.include_router(push_router)
app.include_router(reports_router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to EzSAKAY API! 🚀",
        "docs": "/docs",
        "endpoints": ["/auth/send-otp/", "/auth/verify-otp/", "/health", "/users/me", "/topup/", "/topup/balance", "/conductor/login", "/conductor/create-mpin", "/conductor/verify-mpin"]
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()
        _dbg("H1", "backend/main.py:health_check", "Health OK", data={"ping": int(result) if result is not None else None})
        return {"status": "healthy", "db_connected": True, "ping": result}
    except Exception as e:
        _dbg("H1", "backend/main.py:health_check", "Health FAIL", data={"error": str(e)})
        return {"status": "unhealthy", "error": str(e)}

@app.get("/users/me")
def read_users_me(auth: dict = Depends(require_role("passenger")), db: Session = Depends(get_db)):
    phone = auth["sub"]
    user = db.query(models.User).filter(models.User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    balance = float(user.balance) if user.balance else 0.00
    return {
        "user": {
            "id": user.id,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "nickname": user.nickname,
            "is_verified": user.is_verified,
            "mpin_set": user.mpin_set,
            "balance": balance
        }
    }

if __name__ == "__main__":
    import uvicorn
    import socket
    
    # Get local IP address for display
    def get_local_ip():
        try:
            # Connect to a remote address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "localhost"
    
    local_ip = get_local_ip()
    print("\n" + "="*50)
    print("EzSAKAY Backend Server Starting...")
    print("="*50)
    print(f"Local URL:    http://localhost:8000")
    print(f"Network URL:  http://{local_ip}:8000")
    print(f"API Docs:     http://{local_ip}:8000/docs")
    print("="*50)
    print("Update config.js with the Network URL above")
    print("="*50 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)