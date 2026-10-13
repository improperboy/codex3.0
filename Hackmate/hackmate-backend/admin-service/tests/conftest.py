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


def make_user_override(user_id=1, role="admin", name="Admin"):
    def _override():
        return CurrentUser(user_id=user_id, role=role, name=name)
    return _override


@pytest.fixture
def client():
    return TestClient(app)


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


@pytest.fixture
def mock_setting():
    s = MagicMock()
    s.id = 1
    s.setting_key = "hackathon_name"
    s.setting_value = "HackMate"
    s.setting_type = "string"
    s.description = "Name of the hackathon"
    s.is_public = 1
    return s


@pytest.fixture
def mock_floor():
    f = MagicMock()
    f.id = 1
    f.floor_number = "F1"
    f.description = "First Floor"
    f.created_at = None
    return f


@pytest.fixture
def mock_room():
    r = MagicMock()
    r.id = 1
    r.floor_id = 1
    r.room_number = "R101"
    r.capacity = 4
    r.description = "Main Room"
    r.created_at = None
    return r
