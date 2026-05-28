import os
from jose import JWTError, jwt
from fastapi import HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        if not SECRET_KEY:
            raise HTTPException(status_code=500, detail="Server auth not configured (SECRET_KEY missing).")
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str | None = payload.get("sub")
        role: str | None = payload.get("role") or payload.get("type") or "passenger"
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"sub": sub, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(required_role: str):
    def _dep(payload: dict = Depends(verify_token)) -> dict:
        role = (payload.get("role") or "").lower()
        if role != required_role.lower():
            raise HTTPException(status_code=403, detail=f"{required_role} access required")
        return payload

    return _dep

