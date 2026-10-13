# DB Migrations

Manages the PostgreSQL schema for all HackMate microservices using Alembic. Runs as a one-shot Docker container before the services start.

## Structure

```
db-migrations/
├── alembic.ini           # Alembic configuration
├── env.py                # Migration environment setup
├── entrypoint.sh         # Docker entrypoint (waits for DB, then migrates)
├── migrate.sh            # Manual migration helper script
├── requirements.txt
├── Dockerfile
└── versions/
    ├── 001_initial_schema.py   # Core tables (users, teams, submissions, etc.)
    ├── 002_seed_data.py        # Initial seed data (skills, settings, themes)
    ├── 003_notification_system.py  # Notifications, push subscriptions, preferences
    └── 004_dummy_data.py       # Sample data for development/testing
```

## Migration Versions

| Version | Description |
|---|---|
| `001_initial_schema` | Creates all core tables: users, teams, team_members, team_invitations, submissions, scores, rounds, floors, rooms, assignments, support_tickets, posts, system_settings |
| `002_seed_data` | Seeds skills catalog, default system settings, and hackathon themes |
| `003_notification_system` | Adds notifications, push_subscriptions, notification_preferences, and chatbot_logs tables |
| `004_dummy_data` | Inserts sample users, teams, and scores for development |

## Usage

### Run migrations manually

```bash
alembic upgrade head
```

### Create a new migration

```bash
alembic revision --autogenerate -m "description"
```

### Rollback one step

```bash
alembic downgrade -1
```

### Check current version

```bash
alembic current
```

## Docker

The `Dockerfile` builds a minimal image that runs `entrypoint.sh`, which waits for the database to be ready before applying all pending migrations.

```bash
docker build -t hackmate-migrations .
docker run --env-file ../.env hackmate-migrations
```

## Tech Stack

- **Alembic** 1.13.1 — schema migration framework
- **SQLAlchemy** 2.0.30 — ORM used in migration scripts
- **psycopg2-binary** — PostgreSQL driver

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
