import pytest
import time
from unittest.mock import MagicMock, patch
from services.jwt_service import create_access_token, create_refresh_token, decode_token
from services.password_service import hash_password, verify_password
from db.database import get_db
from main import app


# ── helpers ────────────────────────────────────────────────────────────────

def make_db_override(db_mock):
    def _override():
        yield db_mock
    return _override


# ── Password service tests ─────────────────────────────────────────────────

def test_hash_password_returns_string():
    hashed = hash_password("mysecret")
    assert isinstance(hashed, str)
    assert hashed != "mysecret"


def test_verify_password_correct():
    hashed = hash_password("mysecret")
    assert verify_password("mysecret", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("mysecret")
    assert verify_password("wrongpassword", hashed) is False


# ── JWT service tests ──────────────────────────────────────────────────────

def test_create_and_decode_access_token():
    data = {"sub": "1", "role": "admin", "name": "Test"}
    token = create_access_token(data)
    decoded = decode_token(token)
    assert decoded["sub"] == "1"
    assert decoded["role"] == "admin"
    assert decoded["type"] == "access"


def test_create_and_decode_refresh_token():
    data = {"sub": "1", "role": "participant", "name": "Test"}
    token = create_refresh_token(data)
    decoded = decode_token(token)
    assert decoded["sub"] == "1"
    assert decoded["type"] == "refresh"


def test_decode_invalid_token_returns_none():
    result = decode_token("this.is.invalid")
    assert result is None


# ── Login endpoint tests ───────────────────────────────────────────────────

def test_login_success(client, mock_user):
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = mock_user
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    with patch("routers.auth.verify_password", return_value=True):
        resp = client.post("/auth/login", json={
            "email": "admin@hackmate.com",
            "password": "password"
        })

    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "admin"


def test_login_wrong_password(client, mock_user):
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = mock_user
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    with patch("routers.auth.verify_password", return_value=False):
        resp = client.post("/auth/login", json={
            "email": "admin@hackmate.com",
            "password": "wrongpass"
        })

    assert resp.status_code == 401


def test_login_user_not_found(client):
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = None
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    resp = client.post("/auth/login", json={
        "email": "nobody@hackmate.com",
        "password": "password"
    })
    assert resp.status_code == 401


# ── Register endpoint tests ────────────────────────────────────────────────

def test_register_success(client):
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = None
    # make db.refresh() populate id on the new user object
    def fake_refresh(obj):
        obj.id = 99
        obj.name = "New User"
        obj.role = "participant"
    db_mock.refresh.side_effect = fake_refresh
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    resp = client.post("/auth/register", json={
        "name": "New User",
        "email": "newuser@test.com",
        "password": "secret123",
        "role": "participant"
    })
    assert resp.status_code == 201
    assert "access_token" in resp.json()


def test_register_duplicate_email(client, mock_user):
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = mock_user
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    resp = client.post("/auth/register", json={
        "name": "Dup User",
        "email": "admin@hackmate.com",
        "password": "secret123",
        "role": "participant"
    })
    assert resp.status_code == 409


def test_register_invalid_role(client):
    resp = client.post("/auth/register", json={
        "name": "Hacker",
        "email": "hacker@test.com",
        "password": "secret123",
        "role": "admin"
    })
    assert resp.status_code == 400


# ── Logout endpoint ────────────────────────────────────────────────────────

def test_logout(client):
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = MagicMock(id=1, role="participant")
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    token_payload = {
        "sub": "1",
        "type": "access",
        "jti": "test-jti",
        "exp": int(time.time()) + 60,
    }
    with patch("dependencies.decode_token", return_value=token_payload), patch(
        "routers.auth.decode_token", return_value=token_payload
    ), patch("services.blacklist_service.revoke_token") as revoke_token:
        auth_header = "Bearer " + "test-jwt"
        resp = client.post("/auth/logout", headers={"Authorization": auth_header})

    assert resp.status_code == 200
    assert resp.json()["message"] == "Logged out successfully"
    revoke_token.assert_called_once()


# ── Health check ───────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
