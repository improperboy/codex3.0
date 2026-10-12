# Intelligent Event Command Centre

Turn an event brief into a live operating plan with decision support.

Built for **Hackingly** (PS1): helps event teams track registrations, manage partners, assign tasks, detect risks, and act on ranked recommendations — all from one dashboard that updates in real time.

---

## Quick start (Docker)

```bash
git clone <repository-url> event-command-centre
cd event-command-centre
cp .env.example .env
docker compose up --build
```

- Web app: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

When all three services are healthy, open the app and select **Load demo event** to seed the **Hackingly Build Sprint** scenario (300-seat hackathon, 45 days out, deliberate registration gap).

---

## Running without Docker

### Backend

Requirements: Python 3.12, a running PostgreSQL 16 instance.

```bash
cd backend
python3.12 -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -e ".[dev]"

export DATABASE_URL=postgresql+psycopg://app:change-me@localhost:5432/command_centre
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

Requirements: Node.js 20 LTS or newer.

```bash
cd frontend
npm install
export VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
```

The frontend runs on http://localhost:5173 in this mode. Add that origin to `CORS_ORIGINS` in your `.env`.

---

## Demo walkthrough (7 minutes)

| Time | Screen | What to say |
|---|---|---|
| 0:00 | Empty dashboard → wizard | "We start from an event brief, not a blank board." |
| 1:00 | Plan preview and rules applied | "The plan follows from the answers. Each rule is recorded." |
| 2:00 | Dashboard | "Health is At risk. Registrations are 47% of target with 45 days left." |
| 3:00 | Registrations gap panel | "At today's pace we finish near 210 of 300." |
| 4:00 | Top recommendations and rationale | "Each one shows the number that caused it." |
| 4:45 | Accept → tick → close with 38 | "Closing the loop updates the gap, severity and next recommendation." |
| 6:00 | Second browser window on leadership dashboard | "Anyone viewing the event sees the change without refreshing." |
| 6:45 | Risks screen | "Everything that changed is in the audit trail." |

### Reset the demo

```bash
curl -X POST http://localhost:8000/api/demo/reset \
  -H "Content-Type: application/json" \
  -d '{"confirm": "<event-id>"}'
```

Or use the **Reset demo** control in the app (visible only when `DEMO_ENABLED=true`).

---

## Changing a threshold

All thresholds live in one file:

```
backend/app/engines/constants.py
```

Example — change conversion threshold from 9% to 8%:

```python
CONVERSION_THRESHOLD = 0.08  # was 0.09
```

After changing a threshold:

1. Run `pytest tests/engines` and update any boundary tests.
2. Check the demo still produces the intended risks: `pytest tests/integration`.
3. Note the change here in the README so the demo narrative stays accurate.

---

## Running the tests

```bash
# Backend — engine unit tests (no database needed)
cd backend
pytest tests/engines

# Backend — all tests (requires PostgreSQL)
pytest tests/

# Frontend — unit tests
cd frontend
npm run test

# Frontend — end-to-end (requires the full stack running)
npm run test:e2e
```

Or run everything inside Compose:

```bash
docker compose run --rm api pytest
```

---

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `APP_ENV` | Yes | `development` | `production` disables debug details |
| `DATABASE_URL` | Yes | — | API connection string |
| `MIGRATION_DATABASE_URL` | For migrations | — | Alembic connection |
| `DEMO_ENABLED` | No | `false` | Enables seed and reset routes |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated |
| `LOG_LEVEL` | No | `INFO` | |
| `SSE_IDLE_TIMEOUT_SECONDS` | No | `300` | |
| `POSTGRES_PASSWORD` | Compose only | — | Local use only |

> `DEMO_ENABLED` defaults to **false** in production. The startup check fails if `APP_ENV=production` and the flag is true.

---

## Architecture

See [`architecture.md`](.kiro/architecture.md) for the full system design, ADRs and scaling path.

Key points:
- **Engines are pure Python** — no database imports, testable with fixed clocks.
- **Services own transactions** — plan creation, action acceptance and task closure each run in one transaction.
- **SSE for live updates** — dashboard refreshes across open browser windows within 2 seconds.
- **Append-only audit trail** — every write produces an `audit_events` row in the same transaction.

---

## Security

See [`security.md`](.kiro/security.md). The `X-Role` header is a **demo convenience**, not an access control. Replace it with OIDC authentication before any hosted or shared use with real data.

---

## Project layout

```
event-command-centre/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   └── app/
│       ├── main.py
│       ├── core/         config, clock, auth stub
│       ├── api/routers/  HTTP endpoints
│       ├── schemas/      Pydantic models
│       ├── engines/      plan, risk, recommendation, simulator
│       ├── services/     transactions and orchestration
│       ├── db/           ORM models and session
│       └── seed/         demo data
└── frontend/
    └── src/
        ├── api/          typed client + TanStack Query hooks
        ├── state/        UI-only Zustand store
        ├── features/     setup, dashboard, workstreams, tasks, risks
        └── components/   shared UI
```
