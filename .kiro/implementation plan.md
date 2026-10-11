# Implementation Plan: Intelligent Event Command Centre

Reference platform: Hackingly
Problem statement: PS1, turn an event brief into a live operating plan with decision support.

---

## 1. Goal of the prototype

Demonstrate, end to end, on one simulated event:

1. A guided setup flow that captures the event brief.
2. A system-generated operating plan (workstreams, milestones, tasks, owners, content calendar).
3. A command dashboard showing registrations, outreach, partners, tasks, content, operations and escalations.
4. A registration/reach gap detected by the risk engine.
5. Recommended recovery actions, ranked by impact and time remaining.
6. A team member taking one recommended action and closing the task, with the dashboard updating for everyone viewing the event.

Out of scope: real registration integrations, production authentication (a simple role header or login stub is enough), real email/SMS sending, multi-tenant isolation. These are stubbed behind interfaces so they can be wired later.

---

## 2. Technical approach

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast to build, strong typing for API contracts |
| Frontend data | TanStack Query for server state, Zustand only for UI state (wizard step, selected role) | Dashboard data lives on the server; the client caches and refetches it |
| Styling | CSS modules or Tailwind | Small surface, quick iteration |
| Charts | Lightweight SVG or Recharts | Funnel, gap bars, projection line |
| Backend framework | FastAPI on Python 3.12 | Typed request and response models, async support, automatic OpenAPI docs for the demo |
| Validation and schemas | Pydantic v2 | Shared request, response and engine input types in one place |
| ORM | SQLAlchemy 2.0 (typed ORM) | Mature Postgres support, explicit transactions for the close-the-loop flow |
| Migrations | Alembic | Versioned schema changes, repeatable demo setup |
| Database | PostgreSQL 16 | Relational model for events, tasks and risks; JSONB for evidence, rules applied and wizard brief |
| Live updates | Server-Sent Events (SSE) on `/events/{id}/stream` | Dashboard refreshes when a task closes, without the complexity of WebSockets |
| Background work | FastAPI background tasks for v1; a scheduled job (APScheduler) to re-run risk evaluation daily and on simulated day advance | Keeps risks current without a separate worker service |
| Local environment | Docker Compose with `api`, `web` and `db` services | One command to run the full demo |
| Backend tests | pytest for engines and services, httpx TestClient for API tests, testcontainers (or a dedicated test database) for Postgres integration tests | Engines hold the intelligence, so they get the most coverage |
| Frontend tests | Vitest for components, Playwright for the demo script | Confirms the closure loop works end to end |

### Where the intelligence lives

The planning, risk and recommendation logic runs on the backend as pure Python modules with no database or HTTP imports. Services load data, call the engines, and persist results. This keeps the rules testable with fixed clocks and plain fixtures, and keeps the frontend thin.

- `plan_engine`: brief → operating plan
- `risk_engine`: event state → risk list with severity and evidence
- `recommendation_engine`: event state + risks + time remaining → ranked actions
- `simulator`: generates the seeded demo data and advances the simulated event day by day

### Why a backend now

- Several roles update the same event at once; the source of truth must be shared, not browser-local.
- Closing a task must write an audit trail and recompute risks in one transaction.
- Recommendations and risks need to be reproducible for a given database state, which is easier to verify on the server.

---

## 3. Architecture

```
Browser (React)
  │  REST (JSON) + SSE stream
  ▼
FastAPI (api)
  ├── routers/          HTTP endpoints, auth stub, request validation
  ├── schemas/          Pydantic request and response models
  ├── services/         transactions, orchestration, audit log
  ├── engines/          pure functions: plan, risk, recommendation, simulator
  └── db/
      ├── models/       SQLAlchemy ORM models
      ├── session.py    engine and session factory
      └── migrations/   Alembic revisions
  ▼
PostgreSQL 16 (db)
```

### Repository layout

```
event-command-centre/
  docker-compose.yml
  backend/
    pyproject.toml
    alembic.ini
    app/
      main.py                 FastAPI app factory, router registration, CORS
      core/
        config.py             settings (DATABASE_URL, thresholds file path, demo flag)
        clock.py              injectable now() dependency
        auth_stub.py          reads role from header for the demo
      api/
        routers/
          events.py           create, get, dashboard, plan
          risks.py            risks and risk detail
          recommendations.py  list, accept, dismiss, snooze
          tasks.py            board, update, close
          workstreams.py      registrations, outreach, partners, content, operations
          demo.py             seed and reset
          stream.py           SSE endpoint
      schemas/                Pydantic models (Brief, Plan, DashboardResponse, RiskOut, ActionOut, TaskClose, ...)
      engines/
        plan_engine.py
        risk_engine.py        one class per rule, registered in a list
        recommendation_engine.py
        simulator.py
        constants.py          event type templates, role definitions, named thresholds
      services/
        event_service.py      create event, generate plan, persist
        metrics_service.py    record daily snapshots, recompute derived values
        task_service.py       accept action, update task, close with closure record
        risk_service.py       run evaluation, diff against prior risks, write risk events
        audit_service.py      append-only audit log entries
      db/
        models/               events, plans, workstreams, tasks, checklist_items,
                              metric_snapshots, channels, channel_daily_stats,
                              partners, logistics_items, content_items,
                              risks, actions, closures, audit_events
        session.py
        migrations/
      seed/
        demo_brief.json
        demo_event.py         loads the Build Sprint scenario
    tests/
      engines/                unit tests with fixed clocks
      services/               service tests against Postgres
      api/                    endpoint tests (happy path and error cases)
      integration/            full demo flow against a real database
  frontend/
    src/
      api/                    typed client generated from OpenAPI, TanStack Query hooks
      state/                  UI-only Zustand store (role, wizard step)
      features/
        setup/                guided wizard
        dashboard/            command centre overview
        registrations/        funnel + gap panel
        outreach/             channel performance, campaigns
        partners/             partner pipeline
        tasks/                team board, action detail, close flow
        content/              content calendar
        operations/           logistics checklist
        risks/                risk view and escalation panel
        roles/                role switcher and role home views
      components/             shared UI
```

### API surface (v1)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events` | Create an event from the wizard brief; generates and stores the plan |
| GET | `/api/events/{id}` | Event details and targets |
| GET | `/api/events/{id}/plan` | Workstreams, milestones, tasks, rules applied |
| GET | `/api/events/{id}/dashboard` | KPIs, health label, workstream summaries, top risks, top actions |
| GET | `/api/events/{id}/risks` | Active and resolved risks with evidence |
| GET | `/api/events/{id}/recommendations` | Ranked actions |
| POST | `/api/recommendations/{id}/accept` | Creates a task from the action with its checklist |
| POST | `/api/recommendations/{id}/dismiss` | Dismiss with a required reason |
| POST | `/api/recommendations/{id}/snooze` | Snooze for N days |
| GET | `/api/events/{id}/tasks` | Task board, filterable by workstream and owner |
| PATCH | `/api/tasks/{id}` | Status changes, checklist ticks, blocked reason |
| POST | `/api/tasks/{id}/close` | Outcome note and metric update in one transaction; re-runs risks and recommendations |
| GET | `/api/events/{id}/registrations` | Funnel, channel and device breakdown, gap calculation |
| POST | `/api/events/{id}/metrics` | Record a daily metric snapshot |
| PATCH | `/api/partners/{id}` | Move a partner through the pipeline |
| PATCH | `/api/logistics/{id}` | Update a logistics item status |
| GET | `/api/events/{id}/stream` | SSE: emits `dashboard.updated` and `risks.updated` events |
| POST | `/api/demo/seed` | Create the seeded Build Sprint event |
| POST | `/api/demo/reset` | Restore the seeded state, clearing closures and actions |

Errors use one shape: `{ "error": { "code", "message", "fields"? } }`. Responses carry `evaluated_at` so the UI can show when the risk view was computed.

### Role handling

For the prototype the role is sent in an `X-Role` header and checked only for task ownership and default filters. The auth stub sits behind one dependency so real authentication can replace it without changing routes.

---

## 4. Build phases

### Phase 0: Foundations (Day 1)
- Scaffold the monorepo: `backend/` (FastAPI, Python 3.12, pyproject with ruff and pytest) and `frontend/` (Vite, React, TypeScript).
- Docker Compose with `db` (Postgres 16), `api` and `web` services and a health check.
- Configure Alembic and create the first migration for events and plans.
- Set up the settings module, injectable clock, and the auth stub.
- Health endpoint returns database connectivity status.

### Phase 1: Schema and setup flow (Day 2)
- Migrations for all core tables (section 5).
- `POST /api/events` accepts the wizard brief, validates it with Pydantic, and stores it as JSONB alongside normalised columns for the fields used in queries.
- Wizard in the frontend: format, dates, audience, scale, venue, objectives, with inline validation mirrored from the backend rules.
- Validation rules (hybrid events add a streaming workstream; a date under 14 days out triggers a compressed plan).
- `plan_engine` generates workstreams, milestones, tasks with due dates relative to event date, owner roles, and a content calendar. The service persists the plan in one transaction.
- Unit tests for plan generation across four event types; integration test that a valid brief produces a stored plan.

### Phase 2: Command dashboard API and UI (Day 3)
- `GET /api/events/{id}/dashboard` assembles KPIs, health label, workstream summaries and top items from the database.
- Dashboard UI with headline KPIs, workstream panels and plan-vs-actual indicators, using TanStack Query.
- Endpoint tests for empty event, event with no snapshots, and event past its date.

### Phase 3: Risk and recommendation engines (Day 4)
- `risk_engine` rules, each a class with `evaluate(snapshot, now) -> Risk | None`:
  - Registration pace below required pace for the remaining days.
  - Conversion from visits to registrations below threshold.
  - Partner confirmations pending past their due date.
  - Logistics items not confirmed within the lead time for their category.
  - Content not published before its planned date.
  - Overdue tasks grouped by owner and workstream.
- Each risk carries severity (low, medium, high, critical), evidence (the numbers used, stored as JSONB), and an owning role.
- `risk_service` runs evaluation after every write that can change a risk, diffs against the previous run, and records opened and resolved risks in the audit log.
- `recommendation_engine` maps risks and event type to action templates, ranks by expected impact divided by effort, and scales urgency by time remaining.
- Every recommendation stores a one-line rationale built from the evidence values.
- Unit tests with fixed clocks for every rule at its boundaries.

### Phase 4: Role workflows and workstream endpoints (Day 5)
- Workstream endpoints for registrations, outreach, partners, content and operations.
- Role switcher sends `X-Role`; task board and recommendation queues filter by role.
- Role home views: Marketing, Partnerships, Operations, Programme, Leadership.
- Leadership sees the escalation view and a one-screen summary.

### Phase 5: Task closure loop and live updates (Day 6)
- `POST /api/recommendations/{id}/accept` creates a task, its checklist, and a link to the source risk, in one transaction.
- `PATCH /api/tasks/{id}` updates status and checklist; blocked requires a reason.
- `POST /api/tasks/{id}/close` requires an outcome note and a metric value. In one transaction it writes a closure record, applies the metric snapshot, re-runs risk evaluation and recommendations, and writes audit entries.
- SSE endpoint publishes `dashboard.updated` after any committed change so open browsers refresh.
- Integration test: accept, close, and assert the gap, severity and recommendation list changed as expected.

### Phase 6: Demo, polish and deployment (Day 7)
- `POST /api/demo/seed` loads the Build Sprint scenario (section 6) using the same services the wizard uses, so the demo exercises real code paths.
- `POST /api/demo/reset` restores the seeded state.
- Guided tour overlay in the frontend for the demo narrative.
- Accessibility pass, empty and error states, responsive check.
- Playwright demo script against the Compose stack.
- README with run, reset and threshold instructions; record a short demo video.

---

## 5. Data model (PostgreSQL)

Conventions: UUID primary keys, `created_at` and `updated_at` timestamps in UTC, `event_id` foreign keys with cascade delete on child tables, JSONB for evidence, rule logs and free-form brief data. Enum types are stored as text with check constraints so migrations stay simple.

| Table | Key columns | Notes |
|---|---|---|
| `events` | id, name, type, format, start_date, end_date, audience, scale_seats, venue_type, city, objectives (text[]), target_registrations, target_reach, target_partners, brief (jsonb), created_at | One row per event; the brief is kept verbatim for audit |
| `plans` | id, event_id, generated_at, rules_applied (jsonb), engine_version | One plan per event; re-generation creates a new row and marks the old one superseded |
| `workstreams` | id, plan_id, name, owner_role | Marketing, Partnerships, Operations, Programme, Content, Leadership |
| `milestones` | id, plan_id, title, due_date, status | Shown on the timeline |
| `tasks` | id, event_id, workstream_id, title, owner_role, owner_name, due_date, status, source_action_id?, success_criterion, blocked_reason?, created_at, updated_at | Status check: todo, in_progress, blocked, done |
| `checklist_items` | id, task_id, label, done, position | Ticked independently |
| `metric_snapshots` | id, event_id, metric_key, value, recorded_at, source | Append-only; the latest value per key is the current value. Keys: registrations, visits, reach, partners_activated, content_published |
| `channels` | id, event_id, name, is_campus, is_top_converting | Reference data |
| `channel_daily_stats` | id, channel_id, day, visits, registrations | Drives conversion and the top-channel highlight |
| `partners` | id, event_id, name, tier, status, confirmation_due_date, fallback_partner_id? | Status check: prospect, contacted, confirmed, activated |
| `logistics_items` | id, event_id, category, title, status, lead_time_days, lock_date | Categories: venue, catering, av, travel, swag |
| `content_items` | id, event_id, channel_id?, type, planned_date, published_at?, owner_role | Used for the content-behind-plan rule |
| `risks` | id, event_id, rule_key, type, severity, owner_role, evidence (jsonb), detected_at, resolved_at?, resolution_note? | One open risk per rule and subject at a time, enforced by a partial unique index |
| `actions` | id, event_id, risk_id?, template_key, title, rationale, owner_role, expected_impact, effort, urgency, status, snoozed_until?, dismiss_reason? | Status check: suggested, accepted, dismissed, snoozed |
| `closures` | id, task_id, outcome_note, metric_key, metric_value, closed_by, closed_at | One closure per task |
| `audit_events` | id, event_id, actor_role, action, entity_type, entity_id, payload (jsonb), created_at | Append-only; written by services, never by engines |

### Indexes and constraints (selected)
- `tasks (event_id, status, owner_role)` for the board and role queues.
- `metric_snapshots (event_id, metric_key, recorded_at desc)` for latest-value lookups.
- `channel_daily_stats (channel_id, day)` unique.
- `risks (event_id) where resolved_at is null` partial index for the open-risk view.
- `risks (event_id, rule_key, subject_key) where resolved_at is null` unique partial index, so a rule cannot open duplicate risks.

### Transactions
- Plan creation, action acceptance and task closure each run in a single transaction.
- Closure uses `SELECT ... FOR UPDATE` on the event row so two users closing tasks at once do not produce conflicting risk states.

---

## 6. Simulated demo event

**Event:** Hackingly Build Sprint, a 2-day in-person hackathon in Bengaluru, 300 seats, audience of final-year engineering students.

**Timing:** Set to 45 days before the event. The dashboard shows a 45-day window with milestones.

**Plan generated:** Roughly 60 tasks across six workstreams, six milestones, a 4-week content calendar (3 posts per week across LinkedIn, Instagram and campus newsletters), and 12 partner activation steps.

**Seeded state (intentional gap):**
- Registrations: 140 of 300 target (47%) with 45 days left.
- Required pace is about 4 per day; actual pace over the last 14 days is 1.6 per day. Pace is computed from `metric_snapshots` and `channel_daily_stats`, not stored.
- Visit-to-registration conversion is 6.1%, below the 9% threshold.
- Two of five campus channels are generating 70% of visits, with the top channel underperforming.
- Three partner confirmations pending, one past due by 6 days.
- Venue confirmed, catering and AV not confirmed with 30 days to event (lead time threshold 21 days).
- Content calendar 2 posts behind plan.

**Recommended recovery actions (examples):**
1. Activate the two top-converting campus communities with a referral push. Expected impact high, effort low, owner Marketing.
2. Re-run the registration form on mobile; abandonment is high on the phone step. Owner Programme, effort medium.
3. Chase the overdue partner confirmation with a named contact and a fallback partner. Owner Partnerships.
4. Lock catering and AV vendors within 5 days. Owner Operations.
5. Publish two backlog posts this week and schedule the rest. Owner Marketing.

**Closure demo:** A marketing user opens action 1, reviews the numbers behind it, accepts the task (creating a row in `tasks` and `checklist_items`), completes the checklist, enters the outcome (for example, 38 registrations from the referral push), and closes it. The closure writes a `closures` row and a new `metric_snapshots` row. Risk evaluation runs, the registration risk severity drops from high to medium, a new recommendation appears, and the SSE stream refreshes the dashboard in any other open browser.

---

## 7. Testing strategy

- **Engine unit tests (pytest):** plan generation across event types, risk thresholds at boundaries, recommendation ranking stability, time-based urgency with fixed clocks. No database required.
- **Service tests (pytest + Postgres):** plan persistence, accept action creates task and checklist, closing a task writes closure, metric, risk diff and audit entries atomically; a failed step rolls back everything.
- **API tests (httpx TestClient):** request validation errors use the shared error shape; role header filters the task board; dismiss requires a reason.
- **Concurrency test:** two close requests on the same task result in one closure and a 409 for the second.
- **Migration test:** `alembic upgrade head` and `downgrade base` both succeed on an empty database.
- **Demo flow integration test:** seed, read dashboard, accept action 1, close with 38 registrations, assert severity and gap changes.
- **Demo script test (Playwright):** setup → plan → dashboard → risk → action → closure, run against the Compose stack.
- **Manual checks:** keyboard navigation through the wizard, mobile width, empty states, SSE refresh across two browser windows.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Recommendations feel generic | Tie every recommendation to specific numbers and store the rationale line with the action |
| Rules become a black box | Keep rules in one package with named thresholds in `constants.py`; store rules applied and evidence with every risk |
| Scope creep into a generic to-do app | Every screen must answer a decision question: what is at risk, what to do next, who owns it |
| Demo fragility | Seed through the real services, provide a reset endpoint, and keep the demo path in an integration test |
| Time-dependent logic makes tests flaky | Inject a clock into engines and services through a dependency; tests never call the system clock |
| Concurrent edits corrupt risk state | Lock the event row during closure and enforce one open risk per rule and subject with a partial unique index |
| Database and API drift | Generate the frontend client from the FastAPI OpenAPI schema and fail CI when it changes unexpectedly |
| Local setup friction | Docker Compose with health checks; a single `make demo` target |

---

## 9. Definition of done

- The Compose stack starts with `docker compose up`, and migrations run on API startup.
- A new event can be created through the wizard and produces a stored plan without manual edits.
- The dashboard API and UI show plan-vs-actual for every workstream.
- The seeded demo shows a registration gap, at least three ranked recovery actions with reasoning, and a working close-the-loop flow that persists to Postgres.
- A second browser window receives the update over SSE after a task is closed.
- Backend tests (engines, services, API, integration) and the Playwright demo script pass.
- OpenAPI docs are available at `/docs` for the demo.
- README explains how to run the demo, reset the seed, and change thresholds.
