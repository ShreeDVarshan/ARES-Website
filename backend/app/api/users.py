from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.database import get_db
from app.core.deps import require_admin
from app.core.security import get_password_hash
from app.models.user import User, UserRole

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    role: UserRole = UserRole.OPERATOR


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    factory_id: int

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserOut])
def list_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).filter(User.factory_id == current_user.factory_id).all()


@router.post("", response_model=UserOut)
def create_user(data: UserCreate, current_user: User = Depends(require_admin),
                db: Session = Depends(get_db)):
    if db.query(User).filter((User.username == data.username) |
                              (User.email == data.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already exists")
    user = User(
        factory_id=current_user.factory_id,
        hashed_password=get_password_hash(data.password),
        username=data.username, email=data.email,
        full_name=data.full_name, role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate")
def deactivate_user(user_id: int, current_user: User = Depends(require_admin),
                    db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id,
                                  User.factory_id == current_user.factory_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = False
    db.commit()
    return {"status": "deactivated"}
