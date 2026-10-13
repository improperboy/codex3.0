import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from db.database import get_db
from main import app


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_get_settings(admin_client, mock_settings):
    with patch("services.submission_service.get_submission_settings", return_value=mock_settings):
        resp = admin_client.get("/submissions/settings")
    assert resp.status_code == 200


def test_get_settings_not_found(admin_client):
    with patch("services.submission_service.get_submission_settings", return_value=None):
        resp = admin_client.get("/submissions/settings")
    assert resp.status_code == 404


def test_update_settings_forbidden(participant_client, mock_settings):
    with patch("services.submission_service.get_submission_settings", return_value=mock_settings):
        resp = participant_client.put("/submissions/settings", json={"is_active": 0})
    assert resp.status_code == 403


def test_validate_github_valid(participant_client):
    mock_result = {"valid": True, "owner": "user", "repo": "repo", "stars": 5, "language": "Python", "description": "Test", "error": None}
    with patch("routers.submissions.validate_github_repo", new_callable=AsyncMock, return_value=mock_result):
        resp = participant_client.post("/submissions/validate-github", json={"github_url": "https://github.com/user/repo"})
    assert resp.status_code == 200
    assert resp.json()["valid"] is True


def test_validate_github_invalid(participant_client):
    mock_result = {"valid": False, "error": "Not found"}
    with patch("routers.submissions.validate_github_repo", new_callable=AsyncMock, return_value=mock_result):
        resp = participant_client.post("/submissions/validate-github", json={"github_url": "https://github.com/nobody/fake"})
    assert resp.status_code == 200
    assert resp.json()["valid"] is False


def test_list_submissions_as_admin(admin_client, mock_submission):
    with patch("services.submission_service.get_all_submissions", return_value=(1, [mock_submission])):
        resp = admin_client.get("/submissions/")
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_list_submissions_forbidden_for_participant(participant_client):
    resp = participant_client.get("/submissions/")
    assert resp.status_code == 403


def test_list_submissions_as_mentor(mentor_client, mock_submission):
    with patch("services.submission_service.get_all_submissions", return_value=(1, [mock_submission])):
        resp = mentor_client.get("/submissions/")
    assert resp.status_code == 200


def test_get_submission_by_team(participant_client, mock_submission):
    with patch("services.submission_service.get_submission_by_team", return_value=mock_submission):
        resp = participant_client.get("/submissions/team/1")
    assert resp.status_code == 200
    assert resp.json()["team_id"] == 1


def test_get_submission_by_team_not_found(participant_client):
    with patch("services.submission_service.get_submission_by_team", return_value=None):
        resp = participant_client.get("/submissions/team/999")
    assert resp.status_code == 404


def test_submit_project_success(participant_client, mock_submission):
    github_ok = {"valid": True, "owner": "user", "repo": "repo", "stars": 0, "language": "Python", "description": None, "error": None}
    with patch("services.submission_service.is_submission_open", return_value=True), \
         patch("services.submission_service.get_submission_by_team", return_value=None), \
         patch("routers.submissions.validate_github_repo", new_callable=AsyncMock, return_value=github_ok), \
         patch("services.submission_service.create_submission", return_value=mock_submission), \
         patch("services.submission_service.save_github_repo", return_value=MagicMock()):
        resp = participant_client.post("/submissions/", json={"team_id": 1, "github_link": "https://github.com/user/repo", "tech_stack": "Python"})
    assert resp.status_code == 201


def test_submit_project_window_closed(participant_client):
    with patch("services.submission_service.is_submission_open", return_value=False):
        resp = participant_client.post("/submissions/", json={"team_id": 1, "github_link": "https://github.com/user/repo", "tech_stack": "Python"})
    assert resp.status_code == 409


def test_submit_project_duplicate(participant_client, mock_submission):
    with patch("services.submission_service.is_submission_open", return_value=True), \
         patch("services.submission_service.get_submission_by_team", return_value=mock_submission):
        resp = participant_client.post("/submissions/", json={"team_id": 1, "github_link": "https://github.com/user/repo", "tech_stack": "Python"})
    assert resp.status_code == 409


def test_submit_project_invalid_github(participant_client):
    github_fail = {"valid": False, "error": "Not found"}
    with patch("services.submission_service.is_submission_open", return_value=True), \
         patch("services.submission_service.get_submission_by_team", return_value=None), \
         patch("routers.submissions.validate_github_repo", new_callable=AsyncMock, return_value=github_fail):
        resp = participant_client.post("/submissions/", json={"team_id": 1, "github_link": "https://github.com/nobody/fake", "tech_stack": "Python"})
    assert resp.status_code == 400


def test_delete_submission_as_admin(admin_client, mock_submission):
    with patch("services.submission_service.get_submission_by_id", return_value=mock_submission), \
         patch("services.submission_service.delete_submission", return_value=None):
        resp = admin_client.delete("/submissions/1")
    assert resp.status_code == 204


def test_delete_submission_forbidden(participant_client, mock_submission):
    with patch("services.submission_service.get_submission_by_id", return_value=mock_submission):
        resp = participant_client.delete("/submissions/1")
    assert resp.status_code == 403


# ── GitHub repos admin view ────────────────────────────────────────────────

def test_list_github_repos_as_admin(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.get("/submissions/github-repos")
    assert resp.status_code == 200


def test_list_github_repos_forbidden(participant_client):
    resp = participant_client.get("/submissions/github-repos")
    assert resp.status_code == 403


def test_reverify_repo_not_found(admin_client):
    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = None
        yield db_mock
    app.dependency_overrides[get_db] = _db
    resp = admin_client.put("/submissions/github-repos/999/verify")
    assert resp.status_code == 404


def test_reverify_repo_success(admin_client):
    mock_repo = MagicMock()
    mock_repo.id = 1
    mock_repo.github_url = "https://github.com/user/repo"
    mock_repo.status = "verified"
    github_ok = {"valid": True, "owner": "user", "repo": "repo", "stars": 5, "language": "Python", "description": None, "error": None}

    def _db():
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = mock_repo
        yield db_mock
    app.dependency_overrides[get_db] = _db

    with patch("routers.submissions.validate_github_repo", new_callable=AsyncMock, return_value=github_ok):
        resp = admin_client.put("/submissions/github-repos/1/verify")
    assert resp.status_code == 200
    assert resp.json()["status"] == "verified"
