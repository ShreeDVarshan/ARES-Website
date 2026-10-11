from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine construction
# ---------------------------------------------------------------------------
# Pool tuning (pool_size / max_overflow) is only valid for the QueuePool used
# by PostgreSQL.  SQLite uses SingletonThreadPool and rejects those kwargs.
# We therefore only set them when the dialect is PostgreSQL.
# This also allows tests to override DATABASE_URL with an SQLite URL without
# breaking anything.
# ---------------------------------------------------------------------------

_url = settings.DATABASE_URL
_connect_args = {}

# SSL arguments are only relevant for PostgreSQL/Railway deployments
if _url.startswith("postgresql") and "sslmode" not in _url:
    if "railway.internal" in _url:
        # Internal Railway networking — TLS not needed
        _connect_args = {"sslmode": "disable"}
    elif "proxy.rlwy.net" in _url or "up.railway.app" in _url:
        # External Railway proxy — requires TLS
        _connect_args = {"sslmode": "require"}

# Build engine kwargs conditionally so SQLite works in tests
_engine_kwargs: dict = {"pool_pre_ping": True, "connect_args": _connect_args}
if _url.startswith("postgresql"):
    # PostgreSQL-specific QueuePool settings for production concurrency
    _engine_kwargs.update({"pool_size": 5, "max_overflow": 10})

engine = create_engine(_url, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a SQLAlchemy session, closes on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
