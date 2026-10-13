# Auth Service

Handles user authentication and token lifecycle for HackMate. Issues JWT access and refresh tokens, manages registration, and supports password changes.

## Structure

```
auth-service/
├── main.py               # FastAPI app setup
├── config.py             # Environment config
├── dependencies.py       # JWT dependency injection
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   └── user.py           # User ORM model
├── routers/
│   └── auth.py           # All auth endpoints
├── schemas/
│   └── auth.py           # Pydantic request/response models
├── services/
│   ├── jwt_service.py    # Token creation & decoding
│   └── password_service.py  # bcrypt hashing & verification
└── tests/
    ├── conftest.py
    ├── test_auth.py
    └── __init__.py
```

## Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/login` | Login with email & password, returns tokens | Public |
| `POST` | `/auth/register` | Register as participant, mentor, or volunteer | Public |
| `POST` | `/auth/refresh` | Exchange refresh token for new access token | Public |
| `POST` | `/auth/change-password` | Change own password | Required |
| `GET` | `/auth/me` | Get current user info from token | Required |
| `GET` | `/health` | Health check | Public |

## Token Model

- **Access token** — short-lived JWT, carries `user_id`, `role`, `name`
- **Refresh token** — longer-lived JWT, used only to re-issue access tokens
- Registration respects the `registration_open` system setting

## Tech Stack

- **FastAPI** 0.111.0
- **python-jose** — JWT signing/verification
- **bcrypt** — password hashing
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```
