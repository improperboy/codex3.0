# Scoring Service

Manages mentoring rounds, score submission by mentors, and team rankings for the hackathon.

## Structure

```
scoring-service/
├── main.py               # FastAPI app setup
├── config.py             # Environment config
├── dependencies.py       # JWT dependency injection
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   └── score.py          # Score ORM model
├── routers/
│   ├── rounds.py         # Round management endpoints
│   ├── scores.py         # Score submission & retrieval
│   └── rankings.py       # Team rankings
├── schemas/
│   ├── score.py          # Score & rankings schemas
│   └── round.py          # Round schemas
├── services/
│   └── scoring_service.py  # Business logic
└── tests/
    ├── conftest.py
    ├── test_scoring.py
    └── __init__.py
```

## Endpoints

### Rounds

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/rounds/` | List all rounds | Any |
| `GET` | `/rounds/active` | List currently active rounds | Any |
| `GET` | `/rounds/{id}` | Get round by ID | Any |
| `POST` | `/rounds/` | Create a round | Admin |
| `PUT` | `/rounds/{id}` | Update a round | Admin |
| `DELETE` | `/rounds/{id}` | Delete a round | Admin |

### Scores

| Method | Path | Description | Role |
|---|---|---|---|
| `POST` | `/scores/` | Submit a score for a team | Mentor/Admin |
| `GET` | `/scores/team/{team_id}` | Get all scores for a team | Any |
| `GET` | `/scores/round/{round_id}` | Get all scores in a round | Mentor/Admin |
| `GET` | `/scores/mine` | Get scores submitted by me | Mentor/Admin |
| `GET` | `/scores/{id}` | Get a specific score | Mentor/Admin |
| `PUT` | `/scores/{id}` | Update a score | Score owner/Admin |
| `DELETE` | `/scores/{id}` | Delete a score | Score owner/Admin |

### Rankings

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/rankings/` | Get team rankings | Any (visibility-gated for participants) |

## Business Rules

- Mentors can only score teams assigned to their floor/room
- Scores must be within the round's `max_score`
- Scores can only be submitted during an active (ongoing) round
- Rankings visibility for participants/volunteers is controlled by the `rankings_visible` system setting

## Data Models

- **Score** — mentor_id, team_id, round_id, score, comment
- **Round** — name, start_time, end_time, max_score, is_active

## Tech Stack

- **FastAPI** 0.111.0
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for verifying tokens |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8004
```
