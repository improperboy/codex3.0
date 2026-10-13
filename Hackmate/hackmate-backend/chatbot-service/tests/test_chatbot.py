import pytest


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_chatbot_root_stub(client):
    resp = client.get("/chatbot/")
    assert resp.status_code == 200


def test_send_message_missing_body(client):
    resp = client.post("/chatbot/message", json={})
    assert resp.status_code in (200, 422)


def test_send_message_stub(client):
    resp = client.post("/chatbot/message", json={"message": "hello", "role": "participant"})
    assert resp.status_code in (200, 401, 422)
