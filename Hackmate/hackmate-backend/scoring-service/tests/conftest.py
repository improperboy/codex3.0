import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import datetime, timedelta
from main import app
from db.database import get_db
from dependencies import get_current_user, CurrentUser


def make_db_override(db_mock):
    def _override():
        yield db_mock
    return _override


def make_user_override(user_id=1, role="mentor", name="Mentor"):
    def _override():
        return CurrentUser(user_id=user_id, role=role, name=name)
    return _override


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mentor_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=1, role="mentor")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=99, role="admin")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def participant_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=2, role="participant")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_round():
    now = datetime.utcnow()
    r = MagicMock()
    r.id = 1
    r.round_name = "Round 1"
    r.start_time = now - timedelta(hours=1)
    r.end_time = now + timedelta(hours=1)
    r.max_score = 100
    r.description = "Test round"
    r.is_active = 1
    r.created_at = now
    r.is_ongoing = True
    return r


@pytest.fixture
def mock_score():
    s = MagicMock()
    s.id = 1
    s.mentor_id = 1
    s.team_id = 1
    s.round_id = 1
    s.score = 85
    s.comment = "Good work"
    s.created_at = None
    s.updated_at = None
    return s
