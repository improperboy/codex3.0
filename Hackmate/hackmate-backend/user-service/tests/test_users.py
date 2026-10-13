import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app
from db.database import get_db
from dependencies import get_current_user, CurrentUser


def make_db_override(db_mock):
    def _override():
        yield db_mock
    return _override


def make_user_override(user_id=1, role="admin", name="Admin"):
    def _override():
        return CurrentUser(user_id=user_id, role=role, name=name)
    return _override


@pytest.fixture
def admin_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(role="admin")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def participant_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=2, role="participant")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


# ── Health ─────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── List users ─────────────────────────────────────────────────────────────

def test_list_users_as_admin(admin_client, mock_user):
    with patch("services.user_service.get_all_users", return_value=(1, [mock_user])):
        resp = admin_client.get("/users/")
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_list_users_forbidden_for_participant(participant_client):
    resp = participant_client.get("/users/")
    assert resp.status_code == 403


# ── Get user by ID ─────────────────────────────────────────────────────────

def test_get_own_profile(client, mock_user):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=1, role="participant")
    with patch("services.user_service.get_user_by_id", return_value=mock_user):
        resp = client.get("/users/1")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@hackmate.com"


def test_get_other_user_forbidden(participant_client, mock_user):
    with patch("services.user_service.get_user_by_id", return_value=mock_user):
        resp = participant_client.get("/users/99")
    assert resp.status_code == 403


def test_get_user_not_found(admin_client):
    with patch("services.user_service.get_user_by_id", return_value=None):
        resp = admin_client.get("/users/999")
    assert resp.status_code == 404


# ── Create user ────────────────────────────────────────────────────────────

def test_create_user_as_admin(admin_client, mock_user):
    with patch("services.user_service.get_user_by_email", return_value=None), \
         patch("services.user_service.create_user", return_value=mock_user):
        resp = admin_client.post("/users/", json={
            "name": "New User", "email": "new@test.com",
            "password": "secret123", "role": "participant",
        })
    assert resp.status_code == 201


def test_create_user_duplicate_email(admin_client, mock_user):
    with patch("services.user_service.get_user_by_email", return_value=mock_user):
        resp = admin_client.post("/users/", json={
            "name": "Dup", "email": "test@hackmate.com",
            "password": "secret", "role": "participant",
        })
    assert resp.status_code == 409


def test_create_user_invalid_role(admin_client):
    resp = admin_client.post("/users/", json={
        "name": "Bad", "email": "bad@test.com",
        "password": "secret", "role": "superuser",
    })
    assert resp.status_code == 400


# ── Update user ────────────────────────────────────────────────────────────

def test_update_own_profile(client, mock_user):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=1, role="participant")
    updated = MagicMock()
    updated.id = 1
    updated.name = "Updated Name"
    updated.email = "test@hackmate.com"
    updated.role = "participant"
    updated.tech_stack = "Python"
    updated.floor = None
    updated.room = None
    updated.created_at = None

    with patch("services.user_service.get_user_by_id", return_value=mock_user), \
         patch("services.user_service.update_user", return_value=updated):
        resp = client.put("/users/1", json={"name": "Updated Name"})
    assert resp.status_code == 200


# ── Delete user ────────────────────────────────────────────────────────────

def test_delete_user_as_admin(admin_client, mock_user):
    with patch("services.user_service.get_user_by_id", return_value=mock_user), \
         patch("services.user_service.delete_user", return_value=None):
        resp = admin_client.delete("/users/1")
    assert resp.status_code == 204


def test_delete_user_forbidden(participant_client, mock_user):
    resp = participant_client.delete("/users/1")
    assert resp.status_code == 403


# ── Search users ───────────────────────────────────────────────────────────

def test_search_users(admin_client, mock_user):
    db_mock = MagicMock()
    # MagicMock chains automatically; just set the terminal .all() return value
    db_mock.query.return_value.filter.return_value.filter.return_value \
        .filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_user]
    # also handle 2-filter chain (no q filter) just in case
    db_mock.query.return_value.filter.return_value \
        .order_by.return_value.limit.return_value.all.return_value = [mock_user]
    db_mock.execute.return_value.fetchall.return_value = []
    app.dependency_overrides[get_db] = make_db_override(db_mock)
    resp = admin_client.get("/users/search?q=test")
    app.dependency_overrides.pop(get_db, None)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_search_users_exclude_in_team(admin_client, mock_user):
    """exclude_in_team=true should filter out users already in a team."""
    db_mock = MagicMock()
    db_mock.execute.return_value.fetchall.return_value = [(1,)]  # user_id=1 is in a team
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    with patch("services.user_service.get_all_users", return_value=(1, [mock_user])):
        resp = admin_client.get("/users/search?q=test&exclude_in_team=true")
    assert resp.status_code == 200
    # mock_user.id=1 is in team, so should be filtered out
    assert resp.json()["total"] == 0


def test_search_users_no_exclude(admin_client, mock_user):
    """Without exclude_in_team, all matching users returned."""
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.filter.return_value \
        .filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_user]
    db_mock.query.return_value.filter.return_value \
        .order_by.return_value.limit.return_value.all.return_value = [mock_user]
    db_mock.execute.return_value.fetchall.return_value = []
    app.dependency_overrides[get_db] = make_db_override(db_mock)
    resp = admin_client.get("/users/search?q=test&exclude_in_team=false")
    app.dependency_overrides.pop(get_db, None)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


# ── Skills ─────────────────────────────────────────────────────────────────

def test_list_skills(admin_client):
    with patch("services.user_service.get_all_skills", return_value=[]):
        resp = admin_client.get("/users/skills/all")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_user_skills(admin_client):
    with patch("services.user_service.get_user_skills", return_value=[]):
        resp = admin_client.get("/users/1/skills")
    assert resp.status_code == 200
