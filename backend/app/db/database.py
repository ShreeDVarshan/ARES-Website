from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# Build engine — Railway TCP proxy requires SSL; internal .railway.internal does not.
_url = settings.DATABASE_URL
_connect_args = {}
if "sslmode" not in _url:
    if "railway.internal" in _url:
        _connect_args = {"sslmode": "disable"}
    elif "proxy.rlwy.net" in _url or "up.railway.app" in _url:
        _connect_args = {"sslmode": "require"}

engine = create_engine(
    _url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
