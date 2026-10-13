# User Service

Manages user profiles, skills catalog, and user-skill associations for HackMate participants, mentors, volunteers, and admins.

## Structure

```
user-service/
├── main.py               # FastAPI app setup
├── config.py             # Environment config
├── dependencies.py       # JWT dependency injection
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   └── user.py           # User, Skill, UserSkill ORM models
├── routers/
│   └── users.py          # All user endpoints
├── schemas/
│   └── user.py           # Pydantic request/response models
├── services/
│   └── user_service.py   # Business logic
└── tests/
    ├── conftest.py
    ├── test_users.py
    └── __init__.py
```

## Endpoints

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/users/` | List all users with filters | Admin |
| `GET` | `/users/me` | Get own profile | Any |
| `GET` | `/users/search` | Search users by name, email, or tech stack | Any |
| `GET` | `/users/{id}` | Get user by ID | Any |
| `PUT` | `/users/me` | Update own profile | Any |
| `PUT` | `/users/{id}/role` | Change a user's role | Admin |
| `POST` | `/users/{id}/reset-password` | Admin password reset | Admin |
| `DELETE` | `/users/{id}` | Delete user | Admin |
| `GET` | `/users/skills` | List all available skills | Any |
| `GET` | `/users/me/skills` | Get own skill list | Any |
| `POST` | `/users/me/skills` | Add a skill to own profile | Any |
| `DELETE` | `/users/me/skills/{skill_id}` | Remove a skill | Any |
| `GET` | `/health` | Health check | Public |

## Data Models

- **User** — id, name, email, password (hashed), role, tech_stack, floor, room
- **Skill** — id, name, category
- **UserSkill** — user_id, skill_id, proficiency_level (beginner/intermediate/advanced/expert)

## Tech Stack

- **FastAPI** 0.111.0
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM
- **python-jose** — JWT decoding for auth dependency

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for verifying tokens |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8002
```
