from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import User, TopUp
from datetime import datetime, timezone
from auth_utils import require_role
from decimal import Decimal

router = APIRouter(prefix="/topup", tags=["topup"])

class TopUpRequest(BaseModel):
    amount: float
    payment_method: Optional[str] = "CASHLESS"
    transaction_ref: Optional[str] = None

class TopUpResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    status: str
    payment_method: Optional[str]
    transaction_ref: Optional[str]
    created_at: datetime
    new_balance: float

class TopUpListResponse(BaseModel):
    topups: List[dict]
    total: int

@router.post("/", response_model=TopUpResponse)
def create_topup(
    request: TopUpRequest,
    auth: dict = Depends(require_role("passenger")),
    db: Session = Depends(get_db)
):
    """
    Create a new top-up transaction and update user balance
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    if request.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum top-up amount is ₱10.00")
    
    # Get user
    phone = auth["sub"]
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Create top-up record
        topup = TopUp(
            user_id=user.id,
            amount=Decimal(str(request.amount)),
            status="completed",
            payment_method=request.payment_method,
            transaction_ref=request.transaction_ref
        )
        db.add(topup)
        
        # Update user balance
        if user.balance is None:
            user.balance = Decimal('0.00')
        user.balance += Decimal(str(request.amount))
        
        db.commit()
        db.refresh(topup)
        db.refresh(user)
        
        return {
            "id": topup.id,
            "user_id": topup.user_id,
            "amount": float(topup.amount),
            "status": topup.status,
            "payment_method": topup.payment_method,
            "transaction_ref": topup.transaction_ref,
            "created_at": topup.created_at,
            "new_balance": float(user.balance)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process top-up: {str(e)}")

@router.get("/", response_model=TopUpListResponse)
def get_topups(
    auth: dict = Depends(require_role("passenger")),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """
    Get all top-up transactions for the current user
    """
    phone = auth["sub"]
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    topups = db.query(TopUp)\
        .filter(TopUp.user_id == user.id)\
        .order_by(TopUp.created_at.desc())\
        .limit(limit)\
        .offset(offset)\
        .all()
    
    total = db.query(TopUp).filter(TopUp.user_id == user.id).count()
    
    topup_list = [
        {
            "id": topup.id,
            "amount": float(topup.amount),
            "status": topup.status,
            "payment_method": topup.payment_method,
            "transaction_ref": topup.transaction_ref,
            "created_at": topup.created_at.isoformat()
        }
        for topup in topups
    ]
    
    return {
        "topups": topup_list,
        "total": total
    }

@router.get("/balance")
def get_balance(
    auth: dict = Depends(require_role("passenger")),
    db: Session = Depends(get_db)
):
    """
    Get current user balance
    """
    phone = auth["sub"]
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    balance = float(user.balance) if user.balance else 0.00
    
    return {
        "balance": balance,
        "user_id": user.id
    }

