# Admin Service

Provides admin-only functionality for HackMate: analytics, system settings, venue management, support tickets, data exports, activity logs, and hackathon theme management.

## Structure

```
admin-service/
├── main.py               # FastAPI app setup
├── config.py             # Environment config
├── dependencies.py       # JWT dependency injection
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   ├── announcement.py   # Post model
│   ├── setting.py        # SystemSetting model
│   ├── theme.py          # Theme model
│   └── venue.py          # Floor, Room, Assignment models
├── routers/
│   ├── announcements.py  # Announcement CRUD
│   ├── analytics.py      # Dashboard analytics
│   ├── settings.py       # System settings management
│   ├── venue.py          # Floor/room/assignment management
│   ├── export.py         # Data export (PDF/Excel)
│   ├── support.py        # Support ticket management
│   ├── recommendations.py  # Team/mentor recommendations
│   ├── activity_logs.py  # Audit activity logs
│   └── themes.py         # Hackathon theme management
├── schemas/
│   └── admin.py          # All Pydantic schemas
└── services/
    ├── analytics_service.py  # Analytics aggregation logic
    ├── export_service.py     # PDF & Excel generation
    └── support_service.py    # Support ticket logic
```

## Endpoints

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/analytics/dashboard` | Overall hackathon stats |
| `GET` | `/admin/analytics/teams` | Team breakdown stats |
| `GET` | `/admin/analytics/users` | User registration stats |

### System Settings

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/settings/` | List all system settings |
| `GET` | `/admin/settings/{key}` | Get a setting by key |
| `PUT` | `/admin/settings/{key}` | Update a setting value |

### Venue Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/venue/floors` | List all floors |
| `POST` | `/admin/venue/floors` | Create a floor |
| `GET` | `/admin/venue/rooms` | List all rooms |
| `POST` | `/admin/venue/rooms` | Create a room |
| `POST` | `/admin/venue/assignments` | Assign mentor to floor/room |
| `GET` | `/admin/venue/assignments` | List mentor assignments |
| `DELETE` | `/admin/venue/assignments/{id}` | Remove assignment |
| `POST` | `/admin/venue/volunteer-assignments` | Assign volunteer to floor/room |

### Export

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/export/teams` | Export teams as PDF or Excel |
| `GET` | `/admin/export/users` | Export users as PDF or Excel |
| `GET` | `/admin/export/scores` | Export scores as PDF or Excel |

### Support Tickets

| Method | Path | Description |
|---|---|---|
| `GET` | `/support/` | List support tickets |
| `POST` | `/support/` | Create a support ticket |
| `GET` | `/support/{id}` | Get ticket by ID |
| `PUT` | `/support/{id}` | Update ticket status/assignment |

### Themes

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/themes/` | List hackathon themes |
| `POST` | `/admin/themes/` | Create a theme |
| `PUT` | `/admin/themes/{id}` | Update a theme |
| `DELETE` | `/admin/themes/{id}` | Delete a theme |

### Other

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/recommendations/` | Team-mentor match recommendations |
| `GET` | `/admin/activity-logs/` | Audit log of admin actions |
| `GET` | `/announcements/` | List announcements |
| `POST` | `/announcements/` | Create announcement |
| `GET` | `/health` | Health check |

## Key System Settings

| Key | Description |
|---|---|
| `registration_open` | Toggle user registration |
| `rankings_visible` | Show/hide rankings to participants |
| `maintenance_mode` | Enable maintenance mode |
| `submission_open` | Toggle submission window |

## Tech Stack

- **FastAPI** 0.111.0
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM
- **reportlab** — PDF generation
- **openpyxl** — Excel export

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for verifying tokens |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8008
```
