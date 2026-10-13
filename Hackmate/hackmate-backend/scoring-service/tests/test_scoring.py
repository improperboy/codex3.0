import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from db.database import get_db
from main import app


# ── Health ─────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── Rounds ─────────────────────────────────────────────────────────────────

def test_list_rounds(mentor_client, mock_round):
    with patch("services.scoring_service.get_all_rounds", return_value=[mock_round]), \
         patch("services.scoring_service.is_round_ongoing", return_value=True):
        resp = mentor_client.get("/rounds/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_active_rounds(mentor_client, mock_round):
    with patch("services.scoring_service.get_active_rounds", return_value=[mock_round]):
        resp = mentor_client.get("/rounds/active")
    assert resp.status_code == 200


def test_get_round_by_id(mentor_client, mock_round):
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.is_round_ongoing", return_value=True):
        resp = mentor_client.get("/rounds/1")
    assert resp.status_code == 200
    assert resp.json()["round_name"] == "Round 1"


def test_get_round_not_found(mentor_client):
    with patch("services.scoring_service.get_round_by_id", return_value=None):
        resp = mentor_client.get("/rounds/999")
    assert resp.status_code == 404


def test_create_round_as_admin(admin_client):
    now = datetime.utcnow()
    mock_r = MagicMock()
    mock_r.id = 2
    mock_r.round_name = "New Round"
    mock_r.start_time = now
    mock_r.end_time = now + timedelta(hours=2)
    mock_r.max_score = 100
    mock_r.description = None
    mock_r.is_active = 1
    mock_r.created_at = now
    mock_r.is_ongoing = None

    with patch("services.scoring_service.create_round", return_value=mock_r):
        resp = admin_client.post("/rounds/", json={
            "round_name": "New Round",
            "start_time": now.isoformat(),
            "end_time": (now + timedelta(hours=2)).isoformat(),
            "max_score": 100,
        })
    assert resp.status_code == 201


def test_create_round_forbidden_for_mentor(mentor_client):
    now = datetime.utcnow()
    resp = mentor_client.post("/rounds/", json={
        "round_name": "Hack",
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "max_score": 50,
    })
    assert resp.status_code == 403


def test_create_round_invalid_time(admin_client):
    now = datetime.utcnow()
    resp = admin_client.post("/rounds/", json={
        "round_name": "Bad Round",
        "start_time": (now + timedelta(hours=2)).isoformat(),
        "end_time": now.isoformat(),
        "max_score": 100,
    })
    assert resp.status_code == 400


def test_update_round_as_admin(admin_client, mock_round):
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.update_round", return_value=mock_round):
        resp = admin_client.put("/rounds/1", json={"round_name": "Updated Round"})
    assert resp.status_code == 200


def test_delete_round_as_admin(admin_client, mock_round):
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.delete_round", return_value=None):
        resp = admin_client.delete("/rounds/1")
    assert resp.status_code == 204


# ── Scores — submit ────────────────────────────────────────────────────────

def test_submit_score_success(mentor_client, mock_round, mock_score):
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.is_round_ongoing", return_value=True), \
         patch("services.scoring_service.is_mentor_assigned_to_team", return_value=True), \
         patch("services.scoring_service.submit_score", return_value=mock_score):
        resp = mentor_client.post("/scores/", json={
            "team_id": 1, "round_id": 1, "score": 85, "comment": "Good work",
        })
    assert resp.status_code == 201
    assert resp.json()["score"] == 85


def test_submit_score_mentor_not_assigned(mentor_client, mock_round):
    """Mentor cannot score a team they are not assigned to."""
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.is_round_ongoing", return_value=True), \
         patch("services.scoring_service.is_mentor_assigned_to_team", return_value=False):
        resp = mentor_client.post("/scores/", json={
            "team_id": 99, "round_id": 1, "score": 85,
        })
    assert resp.status_code == 403


def test_submit_score_admin_bypasses_location_check(admin_client, mock_round, mock_score):
    """Admin can score any team regardless of location assignment."""
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.is_round_ongoing", return_value=True), \
         patch("services.scoring_service.submit_score", return_value=mock_score):
        resp = admin_client.post("/scores/", json={
            "team_id": 1, "round_id": 1, "score": 85,
        })
    assert resp.status_code == 201


def test_submit_score_round_not_active(mentor_client, mock_round):
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.is_round_ongoing", return_value=False):
        resp = mentor_client.post("/scores/", json={
            "team_id": 1, "round_id": 1, "score": 85,
        })
    assert resp.status_code == 409


def test_submit_score_exceeds_max(mentor_client, mock_round):
    mock_round.max_score = 100
    with patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.is_round_ongoing", return_value=True), \
         patch("services.scoring_service.is_mentor_assigned_to_team", return_value=True):
        resp = mentor_client.post("/scores/", json={
            "team_id": 1, "round_id": 1, "score": 150,
        })
    assert resp.status_code == 400


def test_submit_score_forbidden_for_participant(participant_client):
    resp = participant_client.post("/scores/", json={
        "team_id": 1, "round_id": 1, "score": 80,
    })
    assert resp.status_code == 403


# ── Scores — read ──────────────────────────────────────────────────────────

def test_get_scores_for_team(mentor_client, mock_score):
    with patch("services.scoring_service.get_scores_by_team", return_value=[mock_score]):
        resp = mentor_client.get("/scores/team/1")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_my_scores(mentor_client, mock_score):
    with patch("services.scoring_service.get_scores_by_mentor", return_value=[mock_score]):
        resp = mentor_client.get("/scores/mine")
    assert resp.status_code == 200


def test_update_score_success(mentor_client, mock_score, mock_round):
    mock_score.mentor_id = 1
    with patch("services.scoring_service.get_score", return_value=mock_score), \
         patch("services.scoring_service.get_round_by_id", return_value=mock_round), \
         patch("services.scoring_service.is_round_ongoing", return_value=True), \
         patch("services.scoring_service.update_score", return_value=mock_score):
        resp = mentor_client.put("/scores/1", json={"score": 90, "comment": "Updated"})
    assert resp.status_code == 200


def test_delete_score_as_admin(admin_client, mock_score):
    with patch("services.scoring_service.get_score", return_value=mock_score), \
         patch("services.scoring_service.delete_score", return_value=None):
        resp = admin_client.delete("/scores/1")
    assert resp.status_code == 204


def test_get_rankings(mentor_client):
    with patch("services.scoring_service.get_rankings", return_value=[]):
        resp = mentor_client.get("/scores/rankings/all")
    assert resp.status_code == 200
    assert "rankings" in resp.json()


# ── Team progress ──────────────────────────────────────────────────────────

def test_team_score_progress(mentor_client):
    db_mock = MagicMock()
    db_mock.execute.return_value.fetchall.return_value = []

    def _db():
        yield db_mock
    app.dependency_overrides[get_db] = _db

    resp = mentor_client.get("/scores/team/1/progress")
    assert resp.status_code == 200
    data = resp.json()
    assert "team_id" in data
    assert "rounds" in data
    assert "overall_avg" in data
    assert data["team_id"] == 1
    assert data["overall_avg"] == 0
