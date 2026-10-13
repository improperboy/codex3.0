import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from main import app
from db.database import get_db


def override_get_db():
    db = MagicMock()
    yield db


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_user():
    u = MagicMock()
    u.id = 1
    u.name = "Test User"
    u.email = "test@hackmate.com"
    u.role = "participant"
    u.tech_stack = "Python, React"
    u.floor = None
    u.room = None
    u.created_at = None
    return u
