import pytest
from unittest.mock import patch, MagicMock
from db.database import get_db
from main import app


# ── Health ─────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── Analytics — updated with new fields ───────────────────────────────────

def test_analytics_as_admin(admin_client):
    stats = {
        "total_users": 10, "total_teams": 5, "pending_teams": 2,
        "approved_teams": 3, "total_submissions": 4,
        "open_support_requests": 1, "total_mentors": 2,
        "total_volunteers": 1, "total_participants": 7,
        "assigned_mentors": 2, "assigned_volunteers": 1,
    }
    with patch("services.analytics_service.get_dashboard_stats", return_value=stats), \
         patch("services.analytics_service.get_daily_activity", return_value=[]), \
         patch("services.analytics_service.get_role_distribution", return_value={"admin": 1}), \
         patch("services.analytics_service.get_team_status_distribution", return_value={"approved": 3}), \
         patch("services.analytics_service.get_avg_scores_per_round", return_value=[]), \
         patch("services.analytics_service.get_top_tech_stacks", return_value=[]), \
         patch("services.analytics_service.get_teams_per_location", return_value=[]):
        resp = admin_client.get("/admin/analytics/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["stats"]["total_users"] == 10
    assert data["stats"]["assigned_mentors"] == 2
    assert "avg_scores_per_round" in data
    assert "top_tech_stacks" in data
    assert "teams_per_location" in data


def test_analytics_forbidden_for_participant(participant_client):
    resp = participant_client.get("/admin/analytics/")
    assert resp.status_code == 403


# ── Settings ───────────────────────────────────────────────────────────────

def test_list_settings_as_admin(admin_client, mock_setting):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.order_by.return_value.all.return_value = [mock_setting]
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.get("/admin/settings/")
    assert resp.status_code == 200


def test_list_settings_forbidden(participant_client):
    resp = participant_client.get("/admin/settings/")
    assert resp.status_code == 403


def test_get_public_settings(client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.all.return_value = []
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = client.get("/admin/settings/public")
    assert resp.status_code == 200


def test_update_setting_as_admin(admin_client, mock_setting):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = mock_setting
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.put("/admin/settings/hackathon_name", json={"setting_value": "NewName"})
    assert resp.status_code == 200


def test_update_setting_not_found(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = None
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.put("/admin/settings/nonexistent", json={"setting_value": "x"})
    assert resp.status_code == 404


# ── Venue — Floors ─────────────────────────────────────────────────────────

def test_list_floors(admin_client, mock_floor):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.order_by.return_value.all.return_value = [mock_floor]
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.get("/admin/venue/floors")
    assert resp.status_code == 200


def test_create_floor_as_admin(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = None
        db_mock.refresh.side_effect = lambda obj: (
            setattr(obj, "id", 1) or setattr(obj, "created_at", None)
        )
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.post("/admin/venue/floors", json={"floor_number": "F3"})
    assert resp.status_code == 201


def test_create_floor_duplicate(admin_client, mock_floor):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = mock_floor
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.post("/admin/venue/floors", json={"floor_number": "F1"})
    assert resp.status_code == 409


def test_create_floor_forbidden(participant_client):
    resp = participant_client.post("/admin/venue/floors", json={"floor_number": "F9"})
    assert resp.status_code == 403


# ── Venue — Rooms ──────────────────────────────────────────────────────────

def test_list_rooms(admin_client, mock_room):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.order_by.return_value.all.return_value = [mock_room]
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.get("/admin/venue/rooms")
    assert resp.status_code == 200


def test_create_room_floor_not_found(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = None
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.post("/admin/venue/rooms", json={
        "floor_id": 999, "room_number": "R999", "capacity": 4
    })
    assert resp.status_code == 404


# ── Volunteer self-assignment view ─────────────────────────────────────────

def test_volunteer_my_assignments(client):
    from dependencies import get_current_user, CurrentUser
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(user_id=5, role="volunteer", name="Vol")

    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.all.return_value = []
        yield db_mock
    app.dependency_overrides[get_db] = _db

    resp = client.get("/admin/venue/volunteer-assignments/mine")
    assert resp.status_code == 200
    app.dependency_overrides.pop(get_current_user, None)


def test_volunteer_my_assignments_forbidden_for_participant(participant_client):
    resp = participant_client.get("/admin/venue/volunteer-assignments/mine")
    assert resp.status_code == 403


# ── Export ─────────────────────────────────────────────────────────────────

def test_export_users_as_admin(admin_client):
    with patch("services.export_service.export_users_csv", return_value="id,name\n1,Admin\n"):
        resp = admin_client.get("/admin/export/users")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]


def test_export_teams_as_admin(admin_client):
    with patch("services.export_service.export_teams_csv", return_value="id,name\n1,Team\n"):
        resp = admin_client.get("/admin/export/teams")
    assert resp.status_code == 200


def test_export_scores_as_admin(admin_client):
    with patch("services.export_service.export_scores_csv", return_value="id,score\n1,90\n"):
        resp = admin_client.get("/admin/export/scores")
    assert resp.status_code == 200


def test_export_forbidden_for_participant(participant_client):
    resp = participant_client.get("/admin/export/users")
    assert resp.status_code == 403


def test_export_team_pdf_not_found(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.execute.return_value.fetchone.return_value = None
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.get("/admin/export/teams/999/pdf")
    assert resp.status_code == 404


def test_export_team_pdf_success(admin_client):
    fake_row = ("Team Alpha", "Cool idea", "Solve problems", "Python", "approved",
                "Leader", "leader@test.com", "AI", "F1", "R101")
    with patch("services.export_service.generate_team_pdf", return_value=b"%PDF-fake"):
        def _db():
            db_mock = MagicMock()
            db_mock.execute.return_value.fetchone.return_value = fake_row
            db_mock.execute.return_value.fetchall.return_value = []
            yield db_mock
        app.dependency_overrides[get_db] = _db
        resp = admin_client.get("/admin/export/teams/1/pdf")
    assert resp.status_code == 200
    assert "application/pdf" in resp.headers["content-type"]


# ── Recommendations ────────────────────────────────────────────────────────

def test_list_recommendations_as_admin(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        db_mock.query.return_value.order_by.return_value.all.return_value = []
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.get("/admin/recommendations/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_recommendations_forbidden(participant_client):
    resp = participant_client.get("/admin/recommendations/")
    assert resp.status_code == 403


# ── Activity logs ──────────────────────────────────────────────────────────

def test_list_activity_logs_as_admin(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.get("/admin/activity-logs/")
    assert resp.status_code == 200


def test_list_activity_logs_forbidden(participant_client):
    resp = participant_client.get("/admin/activity-logs/")
    assert resp.status_code == 403
