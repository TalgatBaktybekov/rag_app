from datetime import timedelta, datetime
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status, Depends, Response
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import os

import os
import secrets
from datetime import timedelta, datetime
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status, Depends, Response
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

# Generate a secure random secret key if not provided
def get_secret_key():
    secret = os.getenv("SECRET_KEY")
    if not secret:
        if os.getenv("ENVIRONMENT") == "production":
            raise ValueError("SECRET_KEY must be set in production environment")
        # Generate a random key for development
        secret = secrets.token_urlsafe(32)
        print(f"WARNING: Using generated secret key for development: {secret}")
    return secret

SECRET_KEY = get_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Increased from 10 minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

class TokenData(BaseModel):
    user_id: int = None
    email: str = None

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_password_hash(password):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password, hashed_password):
    print(f"Verifying password: {plain_password} against {hashed_password}")
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_current_user(response: Response, token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        email: str = payload.get("email")
        if user_id is None or email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        new_token = create_access_token({"user_id": user_id, "email": email})
        response.headers["X-Refresh-Token"] = new_token
        return TokenData(user_id=user_id, email=email)
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"JWT decode error: {str(e)}")
