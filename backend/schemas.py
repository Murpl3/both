from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    nickname: Optional[str] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Conductor schemas
class ConductorLogin(BaseModel):
    username: str
    password: str

class ConductorCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None

class Conductor(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    mpin_set: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConductorResponse(BaseModel):
    message: str
    conductor: Conductor
    access_token: str
