import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from db.database import get_db
from main import app
from dependencies import check_team_management_enabled


def make_db_override(db_mock):
    def _override():
        yield db_mock
    return _override


# ── Health ─────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_team_management_defaults_enabled_when_system_settings_missing():
    db_mock = MagicMock()
    db_mock.execute.side_effect = SQLAlchemyError("missing table")
    check_team_management_enabled(db_mock)
    assert db_mock.rollback.called


def test_team_management_disabled_when_setting_false():
    db_mock = MagicMock()
    db_mock.execute.return_value.fetchone.return_value = ("false",)

    with pytest.raises(HTTPException) as exc:
        check_team_management_enabled(db_mock)

    assert exc.value.status_code == 403


# ── Themes ─────────────────────────────────────────────────────────────────

def test_list_themes(participant_client):
    with patch("services.team_service.get_themes", return_value=[]):
        resp = participant_client.get("/teams/themes")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── List teams ─────────────────────────────────────────────────────────────

def test_list_teams_participant_sees_approved(participant_client, mock_team):
    with patch("services.team_service.get_teams", return_value=(1, [mock_team])), \
         patch("services.team_service.get_member_count", return_value=2):
        resp = participant_client.get("/teams/")
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_list_teams_admin_can_filter(admin_client, mock_team):
    with patch("services.team_service.get_teams", return_value=(1, [mock_team])), \
         patch("services.team_service.get_member_count", return_value=2):
        resp = admin_client.get("/teams/?status=pending")
    assert resp.status_code == 200


# ── Get team ───────────────────────────────────────────────────────────────

def test_get_team_found(participant_client, mock_team):
    with patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.get_member_count", return_value=2):
        resp = participant_client.get("/teams/1")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Team Alpha"


def test_get_team_not_found(participant_client):
    with patch("services.team_service.get_team_by_id", return_value=None):
        resp = participant_client.get("/teams/999")
    assert resp.status_code == 404


# ── Create team — new validations ──────────────────────────────────────────

def test_create_team_success(participant_client, mock_team):
    with patch("services.team_service.get_user_team", return_value=None), \
         patch("services.team_service.has_any_team_as_leader", return_value=False), \
         patch("services.team_service.has_pending_join_requests", return_value=False), \
         patch("services.team_service.create_team", return_value=mock_team):
        resp = participant_client.post("/teams/", json={
            "name": "Team Alpha",
            "idea": "Build something cool",
        })
    assert resp.status_code == 201


def test_create_team_already_in_team(participant_client, mock_team):
    with patch("services.team_service.get_user_team", return_value=mock_team):
        resp = participant_client.post("/teams/", json={"name": "Another Team"})
    assert resp.status_code == 409


def test_create_team_already_created_one(participant_client):
    """Blocks creation even if previous team was rejected."""
    with patch("services.team_service.get_user_team", return_value=None), \
         patch("services.team_service.has_any_team_as_leader", return_value=True):
        resp = participant_client.post("/teams/", json={"name": "Second Team"})
    assert resp.status_code == 409


def test_create_team_has_pending_requests(participant_client):
    """Blocks creation if user has pending join requests."""
    with patch("services.team_service.get_user_team", return_value=None), \
         patch("services.team_service.has_any_team_as_leader", return_value=False), \
         patch("services.team_service.has_pending_join_requests", return_value=True):
        resp = participant_client.post("/teams/", json={"name": "New Team"})
    assert resp.status_code == 409


def test_create_team_invalid_theme(participant_client):
    """Blocks creation if theme is inactive."""
    with patch("services.team_service.get_user_team", return_value=None), \
         patch("services.team_service.has_any_team_as_leader", return_value=False), \
         patch("services.team_service.has_pending_join_requests", return_value=False), \
         patch("services.team_service.create_team", side_effect=ValueError("Selected theme is not active")):
        resp = participant_client.post("/teams/", json={"name": "Bad Theme Team", "theme_id": 999})
    assert resp.status_code == 400


def test_create_team_forbidden_for_admin(admin_client):
    resp = admin_client.post("/teams/", json={"name": "Admin Team"})
    assert resp.status_code == 403


# ── Update team ────────────────────────────────────────────────────────────

def test_update_team_as_leader(participant_client, mock_team):
    db_mock = MagicMock()
    db_mock.execute.return_value.fetchone.return_value = None
    app.dependency_overrides[get_db] = make_db_override(db_mock)
    with patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.update_team", return_value=mock_team), \
         patch("services.team_service.get_member_count", return_value=2):
        resp = participant_client.put("/teams/1", json={"name": "Updated Name"})
    app.dependency_overrides.pop(get_db, None)
    assert resp.status_code == 200


def test_update_team_as_admin(admin_client, mock_team):
    db_mock = MagicMock()
    db_mock.execute.return_value.fetchone.return_value = None
    app.dependency_overrides[get_db] = make_db_override(db_mock)
    with patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.update_team", return_value=mock_team), \
         patch("services.team_service.get_member_count", return_value=2):
        resp = admin_client.put("/teams/1", json={"name": "Admin Update"})
    app.dependency_overrides.pop(get_db, None)
    assert resp.status_code == 200


# ── Status update ──────────────────────────────────────────────────────────

def test_approve_team_as_admin(admin_client, mock_team):
    mock_team.status = "approved"
    db_mock = MagicMock()
    db_mock.execute.return_value.fetchone.return_value = None
    app.dependency_overrides[get_db] = make_db_override(db_mock)
    with patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.update_team_status", return_value=mock_team), \
         patch("services.team_service.get_member_count", return_value=2):
        resp = admin_client.put("/teams/1/status", json={"status": "approved"})
    app.dependency_overrides.pop(get_db, None)
    assert resp.status_code == 200


def test_approve_team_forbidden_for_participant(participant_client, mock_team):
    with patch("services.team_service.get_team_by_id", return_value=mock_team):
        resp = participant_client.put("/teams/1/status", json={"status": "approved"})
    assert resp.status_code == 403


# ── Members ────────────────────────────────────────────────────────────────

def test_get_members(participant_client, mock_team):
    with patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.get_team_members", return_value=[]):
        resp = participant_client.get("/teams/1/members")
    assert resp.status_code == 200


# ── Join requests ──────────────────────────────────────────────────────────

def test_send_join_request_success(participant_client, mock_team, mock_join_request):
    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.count.return_value = 0
    db_mock.execute.return_value.fetchall.return_value = []
    app.dependency_overrides[get_db] = make_db_override(db_mock)
    with patch("services.team_service.get_user_team", return_value=None), \
         patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.get_member_count", return_value=2), \
         patch("services.team_service.get_pending_request", return_value=None), \
         patch("services.team_service.create_join_request", return_value=mock_join_request):
        resp = participant_client.post("/teams/join-requests", json={"team_id": 1})
    app.dependency_overrides.pop(get_db, None)
    assert resp.status_code == 201


def test_send_join_request_already_in_team(participant_client, mock_team):
    with patch("services.team_service.get_user_team", return_value=mock_team):
        resp = participant_client.post("/teams/join-requests", json={"team_id": 1})
    assert resp.status_code == 409


def test_respond_join_request_approve(participant_client, mock_join_request, mock_team):
    mock_join_request.status = "pending"
    mock_join_request.team_id = 1
    with patch("services.team_service.get_join_request", return_value=mock_join_request), \
         patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.get_member_count", return_value=2), \
         patch("services.team_service.respond_join_request", return_value=mock_join_request):
        resp = participant_client.put("/teams/join-requests/1", json={"status": "approved"})
    assert resp.status_code == 200


def test_my_join_requests_enriched(participant_client):
    """my join requests should include team_name and leader_name."""
    db_mock = MagicMock()
    db_mock.execute.return_value.fetchall.return_value = [
        (1, 1, 1, "pending", "Please let me join", None, None, "Team Alpha", "Leader Name")
    ]
    app.dependency_overrides[get_db] = make_db_override(db_mock)

    resp = participant_client.get("/teams/join-requests/mine")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["team_name"] == "Team Alpha"
    assert data[0]["leader_name"] == "Leader Name"


# ── Invitations ────────────────────────────────────────────────────────────

def test_send_invitation_success(participant_client, mock_team, mock_invitation):
    with patch("services.team_service.get_team_by_id", return_value=mock_team), \
         patch("services.team_service.get_member_count", return_value=2), \
         patch("services.team_service.get_pending_invitation", return_value=None), \
         patch("services.team_service.create_invitation", return_value=mock_invitation):
        resp = participant_client.post("/teams/1/invitations", json={"to_user_id": 5})
    assert resp.status_code == 201


def test_send_invitation_not_leader(admin_client, mock_team):
    with patch("services.team_service.get_team_by_id", return_value=mock_team):
        resp = admin_client.post("/teams/1/invitations", json={"to_user_id": 5})
    assert resp.status_code == 403


def test_my_invitations(participant_client):
    with patch("services.team_service.get_user_invitations", return_value=[]):
        resp = participant_client.get("/teams/invitations/mine")
    assert resp.status_code == 200
