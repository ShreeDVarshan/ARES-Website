"""
test_auth.py — unit tests for the /api/auth/* endpoints.

Covers:
  - Valid login returns tokens and user metadata
  - Login with wrong password returns 401
  - Login with non-existent user returns 401
  - Login with empty username/password returns 422
  - Inactive account returns 403
  - GET /api/auth/me returns current user (requires valid token)
  - GET /api/auth/me with no token returns 401
  - Token refresh works with a valid refresh token
  - Token refresh with invalid token returns 401
  - Logout requires authentication
"""

import pytest
from tests.conftest import make_factory, make_user, auth_header


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def factory(db):
    return make_factory(db)


@pytest.fixture()
def active_user(db, factory):
    """A normal active operator user."""
    return make_user(db, factory.id, "testop", "SecurePass1!", role="operator")


@pytest.fixture()
def inactive_user(db, factory):
    """A disabled user — login should be refused."""
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    user = User(
        factory_id=factory.id,
        email="inactive@test.local",
        username="inactiveuser",
        hashed_password=get_password_hash("SomePass1!"),
        role=UserRole.OPERATOR,
        is_active=False,  # <- disabled
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_valid_login_returns_tokens(self, client, active_user):
        """Successful login must return both access and refresh tokens."""
        resp = client.post(
            "/api/auth/login",
            data={"username": "testop", "password": "SecurePass1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["token_type"] == "bearer"
        assert body["username"] == "testop"
        assert body["role"] == "operator"

    def test_wrong_password_returns_401(self, client, active_user):
        """Authentication with a bad password must be rejected."""
        resp = client.post(
            "/api/auth/login",
            data={"username": "testop", "password": "WrongPassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 401
        assert "Incorrect" in resp.json()["detail"]

    def test_nonexistent_user_returns_401(self, client):
        """Authentication for a user that does not exist must return 401."""
        resp = client.post(
            "/api/auth/login",
            data={"username": "ghost", "password": "anything"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 401

    def test_empty_credentials_returns_422(self, client):
        """OAuth2 form requires username and password — missing fields → 422."""
        resp = client.post(
            "/api/auth/login",
            data={},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 422

    def test_inactive_user_returns_403(self, client, inactive_user):
        """Disabled accounts must not be able to log in."""
        resp = client.post(
            "/api/auth/login",
            data={"username": "inactiveuser", "password": "SomePass1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 403

    def test_login_by_email_also_works(self, client, active_user):
        """The auth endpoint accepts email address as username field."""
        resp = client.post(
            "/api/auth/login",
            data={"username": "testop@test.local", "password": "SecurePass1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# /me endpoint
# ---------------------------------------------------------------------------

class TestGetMe:
    def test_get_me_authenticated(self, client, active_user):
        """Authenticated user can retrieve their own profile."""
        headers = auth_header(client, "testop", "SecurePass1!")
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "testop"
        assert "hashed_password" not in body  # never expose hashed password

    def test_get_me_unauthenticated_returns_401(self, client):
        """Accessing /me without a token must return 401."""
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_get_me_bad_token_returns_401(self, client):
        """A forged or malformed JWT must be rejected."""
        resp = client.get("/api/auth/me",
                          headers={"Authorization": "Bearer not.a.valid.token"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

class TestTokenRefresh:
    def test_refresh_issues_new_access_token(self, client, active_user):
        """A valid refresh token must yield a new access token."""
        login = client.post(
            "/api/auth/login",
            data={"username": "testop", "password": "SecurePass1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        refresh_tok = login.json()["refresh_token"]
        import time
        time.sleep(1.05)
        resp = client.post("/api/auth/refresh",
                           json={"refresh_token": refresh_tok})
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        # New access token must be a different JWT string (different `exp`)
        assert body["access_token"] != login.json()["access_token"]

    def test_refresh_with_invalid_token_returns_401(self, client):
        """Submitting a garbage refresh token must return 401."""
        resp = client.post("/api/auth/refresh",
                           json={"refresh_token": "garbage.token.value"})
        assert resp.status_code == 401

    def test_refresh_with_access_token_returns_401(self, client, active_user):
        """Passing an *access* token to the refresh endpoint must be rejected
        (the endpoint checks token type == 'refresh')."""
        login = client.post(
            "/api/auth/login",
            data={"username": "testop", "password": "SecurePass1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        access_tok = login.json()["access_token"]
        resp = client.post("/api/auth/refresh",
                           json={"refresh_token": access_tok})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class TestLogout:
    def test_logout_requires_auth(self, client):
        """Calling logout without a token must return 401."""
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 401

    def test_logout_authenticated(self, client, active_user):
        """Authenticated logout must return a success message."""
        headers = auth_header(client, "testop", "SecurePass1!")
        resp = client.post("/api/auth/logout", headers=headers)
        assert resp.status_code == 200
        assert "message" in resp.json()
