# Submission Service

Handles project submissions from hackathon teams, including GitHub repository validation, submission window management, and admin review.

## Structure

```
submission-service/
├── main.py               # FastAPI app setup
├── config.py             # Environment config
├── dependencies.py       # JWT dependency injection
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   └── submission.py     # Submission, SubmissionSettings, GithubRepository models
├── routers/
│   └── submissions.py    # All submission endpoints
├── schemas/
│   └── submission.py     # Pydantic request/response models
├── services/
│   ├── submission_service.py  # Business logic
│   └── github_validator.py    # GitHub API validation
└── tests/
    ├── conftest.py
    ├── test_submissions.py
    └── __init__.py
```

## Endpoints

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/submissions/settings` | Get submission window config | Any |
| `PUT` | `/submissions/settings` | Update submission window | Admin |
| `POST` | `/submissions/validate-github` | Validate a GitHub repo URL | Any |
| `GET` | `/submissions/` | List all submissions | Admin/Mentor |
| `GET` | `/submissions/team/{team_id}` | Get submission for a team | Any |
| `GET` | `/submissions/github-repos` | List tracked GitHub repos | Admin/Mentor |
| `POST` | `/submissions/` | Submit a project | Participant |
| `PUT` | `/submissions/{id}` | Update own submission | Participant |
| `DELETE` | `/submissions/{id}` | Delete submission | Admin |
| `GET` | `/health` | Health check | Public |

## Business Rules

- Submissions are only accepted within the configured `start_time` / `end_time` window
- Each team can have only one submission (unique constraint on `team_id`)
- GitHub URLs are validated against the GitHub API before saving
- Admins can toggle the submission window via `is_active`

## Data Models

- **Submission** — team_id, github_link, live_link, tech_stack, demo_video, description
- **SubmissionSettings** — start_time, end_time, is_active, max_file_size, allowed_extensions
- **GithubRepository** — github_url, repository_name, repository_owner, submitted_by, status, github_data

## Tech Stack

- **FastAPI** 0.111.0
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM
- **httpx** — async GitHub API calls

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for verifying tokens |
| `GITHUB_TOKEN` | Optional GitHub PAT for higher API rate limits |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8005
```
