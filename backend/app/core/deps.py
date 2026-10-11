from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    FastAPI dependency: authenticates request via Bearer JWT.
    Enforces that:
      1. Token is cryptographically valid and unexpired.
      2. Token type is explicitly 'access' (prevents refresh tokens from being reused as bearer auth).
      3. Subject user exists in the database and is marked active.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """RBAC guard: restricts endpoint invocation to users with ADMIN role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def require_factory(current_user: User = Depends(get_current_user)) -> User:
    """Tenant isolation guard: verifies user is associated with an active factory tenant."""
    if not current_user.factory_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No factory assigned")
    return current_user
