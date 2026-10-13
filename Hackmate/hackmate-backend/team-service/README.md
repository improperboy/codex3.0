# Team Service

Manages hackathon teams — creation, membership, join requests, invitations, and admin approval workflows. Publishes notifications to other services via Redis streams.

## Structure

```
team-service/
├── main.py               # FastAPI app setup
├── config.py             # Environment config (max_team_size, etc.)
├── dependencies.py       # JWT dependency injection
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   └── team.py           # Team, TeamMember, TeamInvitation, TeamSkillRequirement, Theme
├── routers/
│   ├── teams.py          # Core team CRUD + admin approval
│   ├── join_requests.py  # Join request flow
│   └── invitations.py    # Invitation flow
├── schemas/
│   ├── team.py           # Team & invitation schemas
│   └── join_request.py   # Join request schemas
├── services/
│   ├── team_service.py   # Business logic
│   └── event_publisher.py  # Redis stream notification publisher
└── tests/
    ├── conftest.py
    ├── test_teams.py
    └── __init__.py
```

## Endpoints

### Teams

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/teams/themes` | List hackathon themes | Any |
| `GET` | `/teams/admin/all` | List all teams with filters | Admin |
| `GET` | `/teams/` | List teams (participant view) | Any |
| `POST` | `/teams/` | Create a new team | Participant |
| `GET` | `/teams/mine` | Get own team | Participant |
| `GET` | `/teams/{id}` | Get team by ID | Any |
| `PUT` | `/teams/{id}` | Update team details | Leader |
| `PUT` | `/teams/{id}/approve` | Approve team + assign floor/room | Admin |
| `PUT` | `/teams/{id}/reject` | Reject team | Admin |
| `DELETE` | `/teams/{id}` | Delete team | Admin |
| `GET` | `/teams/{id}/members` | List team members | Any |
| `DELETE` | `/teams/{id}/members/{user_id}` | Remove member | Leader/Admin |

### Join Requests

| Method | Path | Description | Role |
|---|---|---|---|
| `POST` | `/teams/join-requests` | Send a join request | Participant |
| `GET` | `/teams/join-requests/mine` | My sent join requests | Participant |
| `GET` | `/teams/{id}/join-requests` | Requests for a team | Leader/Admin |
| `PUT` | `/teams/join-requests/{id}` | Accept or reject request | Leader |

### Invitations

| Method | Path | Description | Role |
|---|---|---|---|
| `POST` | `/teams/{id}/invitations` | Invite a user to team | Leader |
| `GET` | `/teams/invitations/mine` | My received invitations | Any |
| `PUT` | `/teams/invitations/{id}` | Accept or reject invitation | Invitee |

## Data Models

- **Team** — name, idea, problem_statement, tech_skills, theme_id, leader_id, floor_id, room_id, status (pending/approved/rejected)
- **TeamMember** — user_id, team_id, status
- **TeamInvitation** — team_id, from_user_id, to_user_id, status, message
- **TeamSkillRequirement** — team_id, skill_id, importance_level

## Tech Stack

- **FastAPI** 0.111.0
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM
- **Redis** — async event publishing for notifications

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for verifying tokens |
| `MAX_TEAM_SIZE` | Maximum members per team |
| `REDIS_URL` | Redis URL for event publishing |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8003
```
