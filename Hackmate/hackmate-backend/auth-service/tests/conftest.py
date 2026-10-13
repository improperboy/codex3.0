import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from main import app
from db.database import get_db


def override_get_db():
    """Return a mock DB session for all tests."""
    db = MagicMock()
    try:
        yield db
    finally:
        pass


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = 1
    user.name = "Test Admin"
    user.email = "admin@hackmate.com"
    user.role = "admin"
    user.password = "$2b$12$JAZeYHHDUJ6rqJgHNryg2..DXF7ZX5RyzIo/inx3oGWvMUc82RP.i"
    return user
