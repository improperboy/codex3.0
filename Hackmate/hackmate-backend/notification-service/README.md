# Notification Service

Delivers in-app notifications and announcements to HackMate users. Consumes events from a Redis stream published by other services and supports Web Push subscriptions.

## Structure

```
notification-service/
├── main.py               # FastAPI app + Redis consumer lifespan
├── config.py             # Environment config
├── dependencies.py       # JWT dependency injection
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   ├── notification.py   # Notification, PushSubscription, NotificationPreference models
│   └── announcement.py   # Post (announcements) model
├── routers/
│   ├── notifications.py  # Notification & push subscription endpoints
│   └── announcements.py  # Announcement CRUD endpoints
├── schemas/
│   └── notification.py   # Pydantic schemas for all models
└── services/
    ├── push_service.py   # DB operations for notifications & announcements
    └── consumer.py       # Redis stream consumer (background task)
```

## Endpoints

### Notifications

| Method | Path | Description | Role |
|---|---|---|---|
| `POST` | `/notifications/subscribe` | Register a Web Push subscription | Any |
| `DELETE` | `/notifications/subscribe` | Remove a push subscription | Any |
| `GET` | `/notifications/` | Get own notifications | Any |
| `GET` | `/notifications/unread-count` | Get unread notification count | Any |
| `POST` | `/notifications/{id}/read` | Mark a notification as read | Any |
| `POST` | `/notifications/mark-all-read` | Mark all notifications as read | Any |
| `GET` | `/notifications/preferences` | Get notification preferences | Any |
| `PUT` | `/notifications/preferences` | Update notification preferences | Any |

### Announcements

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/announcements/` | List announcements (role-filtered) | Any |
| `GET` | `/announcements/{id}` | Get announcement by ID | Any |
| `POST` | `/announcements/` | Create announcement | Admin |
| `PUT` | `/announcements/{id}` | Update announcement | Admin |
| `DELETE` | `/announcements/{id}` | Delete announcement | Admin |

## Notification Types

| Type | Trigger |
|---|---|
| `team_approved` | Team status set to approved |
| `team_rejected` | Team status set to rejected |
| `team_join_request` | New join request sent |
| `mentor_round_assigned` | Mentor assigned to a round |
| `mentor_signup` | New mentor registers |
| `project_submitted` | Team submits a project |
| `support_ticket_assigned` | Support ticket assigned to volunteer |
| `support_ticket_created` | New support ticket created |
| `announcement_posted` | New announcement published |

## Architecture

Other services publish events to a Redis stream. The notification service runs a background consumer task that reads from the stream and persists notifications to the database. Web Push delivery is handled via `pywebpush`.

## Tech Stack

- **FastAPI** 0.111.0
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM
- **Redis** (asyncio) — event stream consumption
- **pywebpush** — Web Push API delivery

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for verifying tokens |
| `REDIS_URL` | Redis URL for stream consumption |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push |
| `VAPID_PUBLIC_KEY` | VAPID public key for Web Push |
| `VAPID_CLAIMS_EMAIL` | Contact email for VAPID claims |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8006
```
