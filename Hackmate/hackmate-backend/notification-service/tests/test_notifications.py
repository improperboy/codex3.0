import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from db.database import get_db
from main import app


# ── Health ─────────────────────────────────────────────────────────────────

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── Announcements ──────────────────────────────────────────────────────────

def test_list_announcements(participant_client, mock_post):
    with patch("routers.announcements.get_announcements", return_value=(1, [mock_post])):
        resp = participant_client.get("/announcements/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["title"] == "Welcome!"


def test_get_announcement_found(participant_client, mock_post):
    with patch("routers.announcements.get_announcement_by_id", return_value=mock_post):
        resp = participant_client.get("/announcements/1")
    assert resp.status_code == 200


def test_get_announcement_not_found(participant_client):
    with patch("routers.announcements.get_announcement_by_id", return_value=None):
        resp = participant_client.get("/announcements/999")
    assert resp.status_code == 404


def test_create_announcement_as_admin(admin_client, mock_post):
    with patch("routers.announcements.create_announcement", return_value=mock_post):
        resp = admin_client.post("/announcements/", json={
            "title": "New Post",
            "content": "Some content",
        })
    assert resp.status_code == 201
    # mock returns mock_post fixture, title is whatever the mock has
    assert resp.json()["title"] == mock_post.title


def test_create_announcement_forbidden(participant_client):
    resp = participant_client.post("/announcements/", json={
        "title": "Hack",
        "content": "Not allowed",
    })
    assert resp.status_code == 403


def test_update_announcement_as_admin(admin_client, mock_post):
    with patch("routers.announcements.get_announcement_by_id", return_value=mock_post), \
         patch("routers.announcements.update_announcement", return_value=mock_post):
        resp = admin_client.put("/announcements/1", json={"title": "Updated"})
    assert resp.status_code == 200


def test_delete_announcement_as_admin(admin_client, mock_post):
    with patch("routers.announcements.get_announcement_by_id", return_value=mock_post), \
         patch("routers.announcements.delete_announcement", return_value=None):
        resp = admin_client.delete("/announcements/1")
    assert resp.status_code == 204


def test_delete_announcement_forbidden(participant_client, mock_post):
    with patch("routers.announcements.get_announcement_by_id", return_value=mock_post):
        resp = participant_client.delete("/announcements/1")
    assert resp.status_code == 403


# ── Push subscriptions ─────────────────────────────────────────────────────

def test_subscribe(participant_client, mock_subscription):
    with patch("services.push_service.subscribe", return_value=mock_subscription):
        resp = participant_client.post("/notifications/subscribe", json={
            "endpoint": "https://push.example.com/sub/abc",
            "p256dh_key": "key123",
            "auth_key": "auth123",
        })
    assert resp.status_code == 201
    assert resp.json()["is_active"] == 1


def test_unsubscribe_success(participant_client):
    with patch("services.push_service.unsubscribe", return_value=True):
        resp = participant_client.post("/notifications/unsubscribe", json={
            "endpoint": "https://push.example.com/sub/abc",
        })
    assert resp.status_code == 200


def test_unsubscribe_not_found(participant_client):
    with patch("services.push_service.unsubscribe", return_value=False):
        resp = participant_client.post("/notifications/unsubscribe", json={
            "endpoint": "https://push.example.com/sub/notexist",
        })
    assert resp.status_code == 404


# ── Send notification ──────────────────────────────────────────────────────

def test_send_notification_as_admin(admin_client, mock_notif_log):
    db_mock = MagicMock()
    db_mock.query.return_value.filter_by.return_value.all.return_value = []

    def _db():
        yield db_mock
    app.dependency_overrides[get_db] = _db

    with patch("services.push_service.log_notification", return_value=mock_notif_log), \
         patch("services.push_service.send_push_to_subscriptions",
               new_callable=AsyncMock,
               return_value={"sent": 0, "failed": 0}):
        resp = admin_client.post("/notifications/send", json={
            "title": "Alert",
            "body": "Something happened",
            "type": "general",
        })
    assert resp.status_code == 200
    assert "notification_id" in resp.json()


def test_send_notification_forbidden(participant_client):
    resp = participant_client.post("/notifications/send", json={
        "title": "Hack",
        "body": "Not allowed",
    })
    assert resp.status_code == 403


# ── Notification logs ──────────────────────────────────────────────────────

def test_get_logs_as_admin(admin_client, mock_notif_log):
    with patch("services.push_service.get_notification_logs", return_value=(1, [mock_notif_log])):
        resp = admin_client.get("/notifications/logs")
    assert resp.status_code == 200


def test_get_logs_forbidden(participant_client):
    resp = participant_client.get("/notifications/logs")
    assert resp.status_code == 403


# ── User notifications ─────────────────────────────────────────────────────

def test_my_notifications(participant_client):
    with patch("services.push_service.get_user_notifications", return_value=[]):
        resp = participant_client.get("/notifications/mine")
    assert resp.status_code == 200


def test_unread_count(participant_client):
    with patch("services.push_service.get_unread_count", return_value=3):
        resp = participant_client.get("/notifications/unread-count")
    assert resp.status_code == 200
    assert resp.json()["unread"] == 3


def test_mark_read_success(participant_client):
    with patch("services.push_service.mark_notification_read", return_value=True):
        resp = participant_client.put("/notifications/mark-read/1")
    assert resp.status_code == 200


def test_mark_read_not_found(participant_client):
    with patch("services.push_service.mark_notification_read", return_value=False):
        resp = participant_client.put("/notifications/mark-read/999")
    assert resp.status_code == 404


# ── Preferences ────────────────────────────────────────────────────────────

def test_get_preferences(participant_client, mock_preference):
    with patch("services.push_service.get_or_create_preferences", return_value=mock_preference):
        resp = participant_client.get("/notifications/preferences")
    assert resp.status_code == 200
    assert resp.json()["push_notifications"] == 1


def test_update_preferences(participant_client, mock_preference):
    with patch("services.push_service.get_or_create_preferences", return_value=mock_preference), \
         patch("services.push_service.update_preferences", return_value=mock_preference):
        resp = participant_client.put("/notifications/preferences", json={
            "push_notifications": 0
        })
    assert resp.status_code == 200
