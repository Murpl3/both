#!/usr/bin/env python3
"""Quick test script to check if backend can start and connect to database"""

import sys
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 50)
print("Backend Connection Test")
print("=" * 50)

# Check .env file
print("\n1. Checking .env file...")
env_file = ".env"
if os.path.exists(env_file):
    print(f"   ✅ .env file exists")
    with open(env_file, 'r') as f:
        lines = f.readlines()
        has_db = any('DATABASE_URL' in line for line in lines)
        has_secret = any('SECRET_KEY' in line for line in lines)
        print(f"   {'✅' if has_db else '❌'} DATABASE_URL set")
        print(f"   {'✅' if has_secret else '❌'} SECRET_KEY set")
else:
    print(f"   ❌ .env file NOT found!")
    sys.exit(1)

# Check DATABASE_URL
print("\n2. Checking DATABASE_URL...")
db_url = os.getenv("DATABASE_URL")
if db_url:
    # Hide password in output
    safe_url = db_url.split('@')[1] if '@' in db_url else db_url[:20] + "..."
    print(f"   ✅ DATABASE_URL is set: ...@{safe_url}")
    
    # Check if it's Supabase
    if 'supabase.co' in db_url:
        print("   ✅ Using Supabase database")
    elif 'sqlite' in db_url:
        print("   ⚠️  Using SQLite (local database)")
    else:
        print("   ⚠️  Unknown database type")
else:
    print("   ❌ DATABASE_URL not set in .env")
    sys.exit(1)

# Test database connection
print("\n3. Testing database connection...")
try:
    from database import engine, get_db
    from sqlalchemy import text
    
    # Try to connect
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("   ✅ Database connection successful!")
        print(f"   ✅ Query result: {result.scalar()}")
except Exception as e:
    print(f"   ❌ Database connection failed: {e}")
    print("\n   Common issues:")
    print("   - Supabase credentials incorrect")
    print("   - Network/firewall blocking connection")
    print("   - Database not accessible")
    sys.exit(1)

# Test imports
print("\n4. Testing imports...")
try:
    import models
    import auth
    print("   ✅ All modules imported successfully")
except Exception as e:
    print(f"   ❌ Import failed: {e}")
    sys.exit(1)

# Test FastAPI app
print("\n5. Testing FastAPI app...")
try:
    from main import app
    print("   ✅ FastAPI app created successfully")
except Exception as e:
    print(f"   ❌ FastAPI app creation failed: {e}")
    sys.exit(1)

print("\n" + "=" * 50)
print("✅ All checks passed! Backend should work.")
print("=" * 50)
print("\nTo start the server, run:")
print("  python main.py")
print("\nThen test in browser:")
print("  http://localhost:8000")
print("  http://localhost:8000/health")

