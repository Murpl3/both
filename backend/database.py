import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
load_dotenv()

SQLITE_FALLBACK = "sqlite:///./ezsakay.db"
DATABASE_URL = os.getenv("DATABASE_URL", SQLITE_FALLBACK)
if not DATABASE_URL:
    DATABASE_URL = SQLITE_FALLBACK

sql_echo = os.getenv("SQL_ECHO", "false").lower() == "true"

def _build_engine(url: str):
    kwargs = dict(pool_pre_ping=True, echo=sql_echo)
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_recycle"] = 300
        kwargs["connect_args"] = {"connect_timeout": 5}
    return create_engine(url, **kwargs)

engine = _build_engine(DATABASE_URL)

# Test connection; fall back to SQLite if the primary DB is unreachable
if not DATABASE_URL.startswith("sqlite"):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"*** Connected to PostgreSQL ***")
    except Exception as exc:
        print(f"*** PostgreSQL unreachable ({exc.__class__.__name__}), falling back to local SQLite ***")
        DATABASE_URL = SQLITE_FALLBACK
        engine = _build_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
