import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from db.database import get_db
from dependencies import get_current_user, CurrentUser


def make_user_override(user_id=1, role="participant", name="Test"):
    def _override():
        return CurrentUser(user_id=user_id, role=role, name=name)
    return _override


@pytest.fixture
def participant_client():
    app.dependency_overrides[get_current_user] = make_user_override(user_id=1, role="participant")
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mentor_client():
    app.dependency_overrides[get_current_user] = make_user_override(user_id=5, role="mentor")
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_client():
    app.dependency_overrides[get_current_user] = make_user_override(user_id=99, role="admin")
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_msg():
    m = MagicMock()
    m.id = 1
    m.from_id = 1
    m.from_role = "participant"
    m.to_role = "mentor"
    m.subject = "Need help"
    m.message = "Please assist"
    m.priority = "medium"
    m.status = "open"
    m.floor_id = None
    m.room_id = None
    m.created_at = None
    m.resolved_at = None
    m.resolved_by = None
    m.resolution_notes = None
    return m


# ── Send message ───────────────────────────────────────────────────────────

def test_send_message_success(participant_client, mock_msg):
    with patch("services.support_service.create_message", return_value=mock_msg):
        resp = participant_client.post("/support/", json={
            "to_role": "mentor",
            "message": "Please assist",
            "priority": "medium",
        })
    assert resp.status_code == 201
    assert resp.json()["status"] == "open"


def test_send_message_invalid_to_role(participant_client):
    resp = participant_client.post("/support/", json={
        "to_role": "participant",
        "message": "Bad target",
        "priority": "medium",
    })
    assert resp.status_code == 400


def test_send_message_invalid_priority(participant_client):
    resp = participant_client.post("/support/", json={
        "to_role": "mentor",
        "message": "Help",
        "priority": "critical",
    })
    assert resp.status_code == 400


def test_send_message_admin_forbidden(admin_client):
    resp = admin_client.post("/support/", json={
        "to_role": "mentor",
        "message": "Admins can't send",
        "priority": "low",
    })
    assert resp.status_code == 403


# ── My messages ────────────────────────────────────────────────────────────

def test_my_messages(participant_client, mock_msg):
    with patch("services.support_service.get_messages_for_user", return_value=[mock_msg]):
        resp = participant_client.get("/support/mine")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ── List messages ──────────────────────────────────────────────────────────

def test_list_messages_as_admin(admin_client, mock_msg):
    with patch("services.support_service.get_all_messages", return_value=(1, [mock_msg])):
        resp = admin_client.get("/support/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_list_messages_as_mentor(mentor_client, mock_msg):
    with patch("services.support_service.get_all_messages", return_value=(1, [mock_msg])):
        resp = mentor_client.get("/support/")
    assert resp.status_code == 200


def test_list_messages_forbidden_for_participant(participant_client):
    resp = participant_client.get("/support/")
    assert resp.status_code == 403


# ── Get single message ─────────────────────────────────────────────────────

def test_get_message_as_sender(participant_client, mock_msg):
    with patch("services.support_service.get_message_by_id", return_value=mock_msg):
        resp = participant_client.get("/support/1")
    assert resp.status_code == 200


def test_get_message_not_found(participant_client):
    with patch("services.support_service.get_message_by_id", return_value=None):
        resp = participant_client.get("/support/999")
    assert resp.status_code == 404


def test_get_message_access_denied(participant_client, mock_msg):
    # participant user_id=1, but mock_msg.from_id=99 (different user) and to_role=admin
    mock_msg.from_id = 99
    mock_msg.to_role = "admin"
    with patch("services.support_service.get_message_by_id", return_value=mock_msg):
        resp = participant_client.get("/support/1")
    assert resp.status_code == 403


# ── Update status ──────────────────────────────────────────────────────────

def test_update_status_as_mentor(mentor_client, mock_msg):
    mock_msg.to_role = "mentor"
    updated = MagicMock()
    updated.id = 1
    updated.from_id = 1
    updated.from_role = "participant"
    updated.to_role = "mentor"
    updated.subject = "Need help"
    updated.message = "Please assist"
    updated.priority = "medium"
    updated.status = "in_progress"
    updated.floor_id = None
    updated.room_id = None
    updated.created_at = None
    updated.resolved_at = None
    updated.resolved_by = None
    updated.resolution_notes = None

    with patch("services.support_service.get_message_by_id", return_value=mock_msg), \
         patch("services.support_service.update_status", return_value=updated):
        resp = mentor_client.put("/support/1/status?new_status=in_progress")
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


def test_update_status_invalid(admin_client, mock_msg):
    with patch("services.support_service.get_message_by_id", return_value=mock_msg):
        resp = admin_client.put("/support/1/status?new_status=flying")
    assert resp.status_code == 400


# ── Delete message ─────────────────────────────────────────────────────────

def test_delete_message_as_admin(admin_client, mock_msg):
    with patch("services.support_service.get_message_by_id", return_value=mock_msg), \
         patch("services.support_service.delete_message", return_value=None):
        resp = admin_client.delete("/support/1")
    assert resp.status_code == 204


def test_delete_message_forbidden(participant_client, mock_msg):
    with patch("services.support_service.get_message_by_id", return_value=mock_msg):
        resp = participant_client.delete("/support/1")
    assert resp.status_code == 403
