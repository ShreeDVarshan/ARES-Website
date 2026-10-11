"""
conftest.py — shared fixtures for the ARES backend test suite.

Uses an in-memory SQLite database so tests run without a real
PostgreSQL instance and without touching production data.

Strategy:
  1. Set DATABASE_URL env var to SQLite *before* any app module loads.
  2. Monkey-patch app.db.database so the app uses a SQLite-compatible engine.
  3. Override the get_db FastAPI dependency to use the per-test session.
  4. Roll back after each test to keep tests fully isolated.
"""

import os

# ── MUST come before any app import so config.py reads the test URL ──────────
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"
os.environ["TESTING"] = "true"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# ── Build a SQLite engine with StaticPool so all connections share the memory DB ──
_TEST_DB_URL = "sqlite:///:memory:"
_test_engine = create_engine(
    _TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False,
                                  bind=_test_engine)


@pytest.fixture(scope="session", autouse=True)
def _patch_app_db():
    """
    Monkey-patch app.db.database before any test runs so that every ORM
    call inside the FastAPI application hits the in-memory SQLite engine
    rather than trying to connect to PostgreSQL.
    """
    import app.db.database as db_module

    # Replace the module-level engine and session factory
    db_module.engine = _test_engine
    db_module.SessionLocal = _TestSessionLocal

    # Import all models so their metadata is registered on Base
    import app.models  # noqa: F401


@pytest.fixture()
def db(_patch_app_db):
    """
    Provide a fresh SQLAlchemy session for each test.
    Tables are created before each test and dropped afterwards,
    guaranteeing complete test isolation without transaction deassociation issues.
    """
    from app.db.database import Base
    Base.metadata.create_all(bind=_test_engine)
    session = _TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture()
def client(db):
    """
    Return a FastAPI TestClient whose get_db dependency is wired to the
    per-test SQLite session.
    """
    from app.main import app
    from app.db.database import get_db

    def _override_get_db():
        try:
            yield db
        finally:
            pass  # rollback handled by the db fixture above

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ── Reusable helper functions (not fixtures) ──────────────────────────────────

def make_factory(db, name: str = "Test Factory"):
    """Insert a Factory row and return the ORM instance."""
    from app.models.factory import Factory

    factory = Factory(name=name, location="Test", timezone="UTC", currency="GBP")
    db.add(factory)
    db.commit()
    db.refresh(factory)
    return factory


def make_user(db, factory_id: int, username: str, password: str,
              role: str = "operator", email: str = None):
    """Insert a User and return the ORM instance."""
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    user = User(
        factory_id=factory_id,
        email=email or f"{username}@test.local",
        username=username,
        full_name=username.title(),
        hashed_password=get_password_hash(password),
        role=UserRole(role),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_header(client, username: str, password: str) -> dict:
    """Log in via the API and return an Authorization header dict."""
    resp = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed ({resp.status_code}): {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
