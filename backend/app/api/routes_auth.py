from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from fastapi.security import OAuth2PasswordRequestForm
import re

from ..db import crud
from ..db.session import get_db
from ..core.security import create_access_token, get_password_hash, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Add password validation
def validate_password(password: str) -> str:
    """Validate password strength"""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+=\-\[\]{};':\"\\|,.<>?]", password):
        raise ValueError("Password must contain at least one special character")
    return password

class AuthRequest(BaseModel):
    email: EmailStr
    name: str = None
    password: str

    @validator('password')
    def validate_password_strength(cls, v):
        return validate_password(v)

    @validator('email')
    def validate_email_format(cls, v):
        if not v or '@' not in v:
            raise ValueError("Invalid email format")
        return v.lower().strip()

class AuthResponse(BaseModel):
    user_id: int
    email: EmailStr
    access_token: str
    token_type: str = "bearer"


@router.post("/signup", response_model=AuthResponse)
def signup(data: AuthRequest, db: Session = Depends(get_db)):

    existing = crud.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_pw = get_password_hash(data.password)
    user = crud.create_user(db, name=data.name or data.email, email=data.email, password=hashed_pw)
    access_token = create_access_token({"user_id": user.user_id, "email": user.email})
    return AuthResponse(user_id=user.user_id, email=user.email, access_token=access_token)

@router.post("/login", response_model=AuthResponse)
def login(data: AuthRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token({"user_id": user.user_id, "email": user.email})
    return AuthResponse(user_id=user.user_id, email=user.email, access_token=access_token)

@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token({"user_id": user.user_id, "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
