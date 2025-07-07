# backend/app/core/rate_limiter.py

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException

# Create rate limiter instance
limiter = Limiter(key_func=get_remote_address)

# Custom rate limit handler
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    response = HTTPException(
        status_code=429,
        detail=f"Rate limit exceeded: {exc.detail}"
    )
    return response

# Rate limiting decorators
def auth_rate_limit():
    """Rate limit for authentication endpoints"""
    return limiter.limit("5/minute")

def api_rate_limit():
    """Rate limit for general API endpoints"""
    return limiter.limit("100/minute")
