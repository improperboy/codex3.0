import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from main import app
from db.database import get_db
from dependencies import get_current_user, CurrentUser


def make_db_override(db_mock):
    def _override():
        yield db_mock
    return _override


def make_user_override(user_id=1, role="participant", name="Test"):
    def _override():
        return CurrentUser(user_id=user_id, role=role, name=name)
    return _override


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def participant_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=1, role="participant")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=99, role="admin")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_team():
    t = MagicMock()
    t.id = 1
    t.name = "Team Alpha"
    t.idea = "Build something cool"
    t.problem_statement = "Solve a real problem"
    t.tech_skills = "Python, React"
    t.theme_id = 1
    t.leader_id = 1
    t.floor_id = None
    t.room_id = None
    t.status = "approved"
    t.created_at = None
    t.member_count = 2
    t.leader_name = None
    t.floor_number = None
    t.room_number = None
    return t


@pytest.fixture
def mock_join_request():
    jr = MagicMock()
    jr.id = 1
    jr.user_id = 2
    jr.team_id = 1
    jr.status = "pending"
    jr.message = "Please let me join"
    jr.created_at = None
    jr.responded_at = None
    jr.team_name = None
    jr.leader_name = None
    return jr


@pytest.fixture
def mock_invitation():
    inv = MagicMock()
    inv.id = 1
    inv.team_id = 1
    inv.from_user_id = 1
    inv.to_user_id = 2
    inv.to_user_name = None
    inv.status = "pending"
    inv.message = "Join us!"
    inv.created_at = None
    return inv
