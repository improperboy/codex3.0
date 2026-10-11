# Architecture: Intelligent Event Command Centre

This document describes how the prototype is put together: the parts, how they talk, where data lives, and why the main decisions were made. The implementation plan says what to build; this says how the pieces fit.

---

## 1. System context

```
   Event team members (Marketing, Partnerships, Operations, Programme, Leadership)
                │  browser
                ▼
   ┌─────────────────────────────────────┐
   │  Event Command Centre               │
   │  (web app + API + database)         │
   └─────────────────────────────────────┘
                ▲                  │
   Future:      │                  ▼
   registration platform,     notifications (email/SMS, not in v1),
   CRM, partner portal        calendar / vendor systems (not in v1)
```

v1 has no external integrations. Registration and reach figures are entered as metric snapshots or seeded. The API is designed so that a registration-platform webhook or CSV import can write the same snapshots later without changing the engines.

---

## 2. Containers

| Container | Technology | Responsibility | Port |
|---|---|---|---|
| `web` | React, TypeScript, Vite (served as static files by Nginx in Compose) | Renders the wizard, dashboard, role views and close flow | 3000 |
| `api` | FastAPI on Python 3.12, Uvicorn | REST endpoints, SSE stream, orchestration, rule engines | 8000 |
| `db` | PostgreSQL 16 | System of record for all event data, plans, risks, actions and audit | 5432 (internal) |

Only `web` and `api` are exposed to the host in development. `db` is reachable only inside the Compose network.

```
                  ┌──────────────┐
   Browser ──────▶│ web (Nginx)  │
                  └──────┬───────┘
                         │ /api/*  (reverse proxy)
                         ▼
                  ┌──────────────┐        ┌──────────────┐
                  │ api (FastAPI)│───────▶│ db (Postgres)│
                  └──────────────┘  SQL   └──────────────┘
                         ▲
   Browser (EventSource)─┘  /api/events/{id}/stream (SSE)
```

Nginx serves the built frontend and proxies `/api` to the API container. This keeps the browser on a single origin, which removes most CORS concerns in the demo.

---

## 3. Backend components

The API is one Python package with clear layers. Dependencies point downward only.

```
 routers (HTTP)
     │
 schemas (Pydantic request/response models)
     │
 services (transactions, orchestration, audit)
     │            │
 engines       db (SQLAlchemy models, session)
 (pure logic)
```

| Layer | Contains | May import | Must not import |
|---|---|---|---|
| `api/routers` | Endpoint functions, dependency wiring | schemas, services, core | db models directly (except through services) |
| `schemas` | Pydantic models for requests and responses | core | db, engines |
| `services` | Use cases: create event, close task, evaluate risks, record metric | engines, db, core | FastAPI request objects |
| `engines` | `plan_engine`, `risk_engine`, `recommendation_engine`, `simulator`, `constants` | Python standard library and dataclasses only | db, FastAPI, any I/O |
| `db` | ORM models, session factory, migrations | core | services, routers |
| `core` | Settings, clock, auth stub, logging | standard library | everything else |

The engine layer is the most important boundary. Because engines are pure functions over plain data, they are tested without a database and their outputs are reproducible for a fixed clock and a fixed snapshot.

### Key services

| Service | Responsibility |
|---|---|
| `event_service` | Create event from a brief; generate and persist the plan in one transaction |
| `snapshot_service` | Load everything the engines need for one event in a fixed number of queries |
| `risk_service` | Run all rules, diff against open risks, open and resolve risks, write audit entries |
| `task_service` | Accept an action into a task; update status and checklist; close and reopen tasks |
| `metrics_service` | Record metric snapshots and channel statistics; trigger risk evaluation |
| `dashboard_service` | Assemble the dashboard and role queues from the database |
| `audit_service` | Append audit entries; the only writer to `audit_events` |

### Engine pipeline

```
 snapshot (plain data) + now
        │
        ▼
 risk_engine.evaluate_all  ──▶  [Risk ...]   (severity, evidence, owner_role)
        │
        ▼
 recommendation_engine.recommend  ──▶  [Action ...]   (rationale, ranking)
```

Rules are a list of small classes or functions, each returning a risk or nothing. Adding a rule means adding one entry to the list and one test file.

---

## 4. Repository layout

This is the reference layout used by `task.md` and `guide.md`.

```
event-command-centre/
├── docker-compose.yml
├── README.md
├── guide.md
├── architecture.md
├── security.md
├── design.md
├── implementation plan.md
├── task.md
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          config.py, clock.py, auth_stub.py, logging.py
│   │   ├── api/routers/   events.py, risks.py, recommendations.py, tasks.py,
│   │   │                  workstreams.py, queues.py, demo.py, stream.py, health.py
│   │   ├── schemas/       brief.py, plan.py, dashboard.py, risk.py, action.py, task.py, errors.py
│   │   ├── engines/       plan_engine.py, risk_engine.py, recommendation_engine.py,
│   │   │                  simulator.py, constants.py
│   │   ├── services/      event_service.py, snapshot_service.py, risk_service.py,
│   │   │                  task_service.py, metrics_service.py, dashboard_service.py,
│   │   │                  audit_service.py
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   └── models/    base.py, event.py, plan.py, task.py, metric.py, channel.py,
│   │   │                  partner.py, logistics.py, content.py, risk.py, action.py,
│   │   │                  closure.py, audit.py
│   │   └── seed/          demo_brief.json, demo_event.py
│   ├── migrations/        Alembic revisions
│   └── tests/
│       ├── engines/       pure unit tests with fixed clocks
│       ├── services/      service tests against Postgres
│       ├── api/           endpoint tests
│       └── integration/   full demo flow
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── api/           generated client and TanStack Query hooks
    │   ├── state/         UI-only Zustand store
    │   ├── features/      setup, dashboard, registrations, outreach, partners,
    │   │                  tasks, content, operations, risks, roles
    │   └── components/    shared UI
    └── tests/             Vitest component tests and Playwright demo script
```

---

## 5. Data architecture

### Storage

PostgreSQL 16 holds all state. There is no client-side persistence of business data; the browser caches API responses only for the duration of the session.

### Entity overview

```
events ──┬── plans ──┬── workstreams ── tasks ── checklist_items
         │           └── milestones
         ├── tasks ── closures
         ├── metric_snapshots
         ├── channels ── channel_daily_stats
         ├── partners
         ├── logistics_items
         ├── content_items
         ├── risks ── actions ── tasks (source link)
         └── audit_events
```

### Principles

- **Append-only where history matters.** `metric_snapshots`, `closures` and `audit_events` are never updated. Corrections are new rows.
- **Derived values are computed, not stored.** Pace, conversion and projections come from snapshots at read time, so they cannot drift from the source data.
- **Risks are state with history.** An open risk has no `resolved_at`. Resolving it sets `resolved_at` and a note; the row stays for the audit trail.
- **JSONB for evidence and rules.** Evidence and rule logs vary by rule, so they are stored as JSONB rather than many nullable columns.
- **Brief kept verbatim.** The original wizard answers are stored, so a plan can always be explained against what the user entered.

### Concurrency

- Writes that change risk state (close, metric record, plan creation) lock the `events` row with `SELECT ... FOR UPDATE` for the duration of the transaction.
- A partial unique index on open risks prevents duplicates even if two requests race.
- Closing a task is idempotent by task id: a second close returns 409 with the existing closure.

---

## 6. Key flows

### 6.1 Create an event

1. Browser posts the brief to `POST /api/events`.
2. Router validates with the `Brief` schema; failures return field-level errors.
3. `event_service` opens a transaction, inserts the event, calls `plan_engine.create_plan(brief, now)`, writes plan rows.
4. `risk_service.evaluate_event` runs once to produce the initial risk view (usually empty for a new event).
5. Transaction commits; response returns the event id and plan summary.

### 6.2 Dashboard read

1. `GET /api/events/{id}/dashboard`.
2. `dashboard_service` loads the snapshot in a fixed number of queries.
3. KPIs, health label and summaries are computed from the snapshot; the response includes `evaluated_at` from the latest risk evaluation.
4. No writes happen on read.

### 6.3 Accept, work and close (centrepiece flow)

```
Browser          API                     Services                 DB
  │ POST accept    │                        │                      │
  ├───────────────▶│ accept_action          │                      │
  │                ├───────────────────────▶│ BEGIN                │
  │                │                        ├─────────────────────▶│ insert task, checklist
  │                │                        │ COMMIT               │
  │◀───────────────┤ 201 task               │                      │
  │ PATCH checklist│                        │                      │
  │ POST close     │ close_task             │                      │
  ├───────────────▶├───────────────────────▶│ BEGIN                │
  │                │                        ├─────────────────────▶│ lock event row
  │                │                        ├─────────────────────▶│ insert closure, metric
  │                │                        ├─ risk_service ───────▶│ update risks
  │                │                        ├─ recommendation ─────▶│ insert actions
  │                │                        ├─────────────────────▶│ audit entries
  │                │                        │ COMMIT               │
  │◀───────────────┤ 200 before/after       │                      │
  │                │ publish event          │                      │
  │                ├──── SSE ────▶ other browsers refetch
```

### 6.4 Live updates

- After every committed write that changes dashboard or risk state, the service publishes a small event to an in-process broker keyed by event id.
- The SSE endpoint subscribes per connection and forwards events such as `dashboard.updated` and `risks.updated`.
- Clients refetch only the affected queries. Events carry ids and types, not full payloads, so the stream stays small.
- v1 uses an in-memory broker, which is correct for one API instance. Multiple instances need a broker such as Postgres `LISTEN/NOTIFY` (see section 9).

### 6.5 Scheduled re-evaluation

- APScheduler runs `risk_service.evaluate_all_open_events` once a day at a configured time and whenever the simulator advances a day in demo mode.
- Time-based risks (lock dates, overdue tasks) change even when no one writes, so this job keeps them current.

---

## 7. Deployment

### Development and demo (Docker Compose)

```
docker compose up --build
  db   : postgres:16, volume for data, health check
  api  : builds from backend/, runs migrations on start, then uvicorn
  web  : builds frontend, served by Nginx with /api proxied to api
```

- Environment variables come from a local `.env` file that is not committed. `.env.example` lists every variable.
- `DEMO_ENABLED=true` exposes the seed and reset endpoints and the reset control.

### Demo hosting (single machine or small VM)

- Same Compose file, with TLS terminated by a reverse proxy in front of `web`.
- Database volume backed up nightly with `pg_dump`.
- See `security.md` for hardening that applies to any hosted environment.

### Not in v1

- Multi-region hosting, managed Kubernetes, horizontal autoscaling. The design keeps these possible (stateless API, database as the only shared state, SSE broker swappable).

---

## 8. Architecture decision records

| ID | Decision | Alternatives considered | Reason |
|---|---|---|---|
| ADR-1 | FastAPI on Python for the backend | Node/Express, Django REST | Typed models, async, automatic OpenAPI, fast to build for a data-heavy engine |
| ADR-2 | PostgreSQL as the system of record | SQLite, MongoDB | Relational data with transactions and constraints; JSONB covers the flexible parts |
| ADR-3 | Rules engine as pure Python functions | Rules in SQL, rules in the frontend | Testable with fixed clocks, no I/O, same logic runs in the demo and tests |
| ADR-4 | Server-side intelligence, thin frontend | Browser-only engines (earlier plan) | Shared state across roles, auditable writes, one source of truth |
| ADR-5 | SSE for live updates | WebSockets, polling | One-way updates are enough for v1; simpler to run behind a proxy |
| ADR-6 | TanStack Query on the frontend | Redux, hand-rolled fetch | Caching, refetch on focus and on live events, minimal boilerplate |
| ADR-7 | Append-only audit and metric history | Mutable rows only | Traceability of every number that drove a recommendation |
| ADR-8 | Derived metrics computed at read time | Stored pace and conversion | Prevents drift between stored values and source snapshots |
| ADR-9 | Single origin via Nginx reverse proxy | Separate origins with CORS | Simpler security model and fewer moving parts in the demo |
| ADR-10 | Alembic migrations run on API start in development | Manual migration step | One command to a working demo; production will run migrations as a separate job |
| ADR-11 | Simple `X-Role` header as auth stub | Full auth in v1 | Keeps the demo focused on decision support; isolated behind one dependency for replacement |

---

## 9. Non-functional requirements and how they are met

| Requirement | Target for v1 | How it is met |
|---|---|---|
| Dashboard read latency | Under 300 ms for one event with 500 tasks | Fixed number of snapshot queries; indexes on `(event_id, status)` and metric keys |
| Write latency (close task) | Under 500 ms | Single transaction; no external calls |
| Live update delay | Under 2 seconds to other open browsers | SSE publish after commit |
| Correctness of risk state | No duplicate open risks | Partial unique index; event row lock on writes |
| Reproducibility | Same inputs and clock give same risks and recommendations | Pure engines; clock injected |
| Recoverability | Demo reset in under 5 seconds | Reset endpoint replays seed through normal services |
| Test coverage of engines | Every rule and boundary tested | pytest suite in `tests/engines` |
| Observability | Request id on every log line; audit trail for every write | Logging middleware; `audit_events` |

---

## 10. Scaling path (beyond v1)

| Concern | Next step |
|---|---|
| More than one API instance | Move the SSE broker to Postgres `LISTEN/NOTIFY` or Redis pub/sub |
| Heavy metric volume | Partition `metric_snapshots` and `channel_daily_stats` by month |
| Background recalculation for many events | Move the daily job to a worker process with a queue |
| Real registration data | Add an ingestion endpoint or worker that writes snapshots; engines unchanged |
| Real authentication | Replace `auth_stub` with OIDC login; role comes from the token, not the header |
| Notifications | Add a notification service consuming `risks.updated` events |

---

## 11. Quality attributes checklist

- Single source of truth: PostgreSQL.
- Business logic in one layer: services and engines; routers stay thin.
- Every write is auditable and transactional.
- Every intelligence output (risk, recommendation) carries its evidence and rationale.
- Demo and tests use the same code paths as production.
