import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import datetime
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
def mentor_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=5, role="mentor")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_submission():
    s = MagicMock()
    s.id = 1
    s.team_id = 1
    s.github_link = "https://github.com/user/repo"
    s.live_link = "https://myapp.com"
    s.tech_stack = "Python, FastAPI"
    s.demo_video = None
    s.ppt_link = None
    s.description = "A cool project"
    s.submitted_at = None
    s.updated_at = None
    return s


@pytest.fixture
def mock_settings():
    s = MagicMock()
    s.id = 1
    s.start_time = datetime(2025, 1, 1)
    s.end_time = datetime(2026, 12, 31)
    s.is_active = 1
    s.max_file_size = 52428800
    s.allowed_extensions = "pdf,doc,docx,zip"
    return s
