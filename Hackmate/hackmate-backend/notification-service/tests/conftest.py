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
def mentor_client(client):
    app.dependency_overrides[get_current_user] = make_user_override(user_id=3, role="mentor")
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_post():
    p = MagicMock()
    p.id = 1
    p.title = "Welcome!"
    p.content = "Welcome to HackMate"
    p.link_url = None
    p.link_text = None
    p.author_id = 1
    p.is_pinned = 1
    p.target_roles = None
    p.created_at = None
    p.updated_at = None
    return p


@pytest.fixture
def mock_subscription():
    s = MagicMock()
    s.id = 1
    s.user_id = 1
    s.endpoint = "https://push.example.com/sub/abc"
    s.is_active = 1
    s.created_at = None
    return s


@pytest.fixture
def mock_notif_log():
    n = MagicMock()
    n.id = 1
    n.type = "general"
    n.title = "Test"
    n.body = "Test body"
    n.target_roles = None
    n.created_at = None
    return n


@pytest.fixture
def mock_preference():
    p = MagicMock()
    p.id = 1
    p.user_id = 1
    p.receive_announcements = 1
    p.receive_support_notifications = 1
    p.receive_team_updates = 1
    p.receive_score_updates = 1
    p.receive_invitation_notifications = 1
    p.email_notifications = 0
    p.push_notifications = 1
    return p
