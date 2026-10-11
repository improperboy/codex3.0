# Task List: Intelligent Event Command Centre

Status key: [ ] not started · [~] in progress · [x] done
Each task lists its acceptance check. Phases follow the implementation plan.
Backend tasks are prefixed **B**, frontend tasks **F**, cross-cutting tasks **X**.

---

## Phase 0: Foundations

- [ ] **X0.1** Create monorepo layout: `backend/`, `frontend/`, `docker-compose.yml`, root `README.md`
  - Check: folder structure matches `architecture.md` section 4
- [ ] **B0.1** Scaffold FastAPI app with `pyproject.toml`, ruff, pytest, and an app factory in `app/main.py`
  - Check: `uvicorn app.main:app` starts; `/docs` loads
- [ ] **B0.2** Settings module (`core/config.py`) reading `DATABASE_URL`, `APP_ENV`, `DEMO_ENABLED`, thresholds file path
  - Check: missing required variables fail fast with a readable message
- [ ] **B0.3** Injectable clock dependency (`core/clock.py`); tests override it
  - Check: no engine or service calls `datetime.now()` directly (grep check in CI)
- [ ] **B0.4** Database session factory and base model (`db/session.py`, `db/models/base.py`) with UUID keys and UTC timestamps
  - Check: session opens and closes per request; test session fixture rolls back
- [ ] **B0.5** Alembic setup with an empty initial revision
  - Check: `alembic upgrade head` and `alembic downgrade base` both succeed
- [ ] **B0.6** Health endpoint `GET /api/health` reporting app version and database connectivity
  - Check: returns 503 with a clear message when the database is unreachable
- [ ] **X0.2** Docker Compose with `db` (Postgres 16, health check), `api` and `web` services
  - Check: `docker compose up` brings all services healthy on a clean machine
- [ ] **F0.1** Scaffold React + TypeScript + Vite with lint, formatting, and typed API client placeholder
  - Check: `npm run dev` serves a blank app; `npm run lint` passes
- [ ] **F0.2** Set up TanStack Query provider and the UI-only Zustand store (role, wizard step)
  - Check: store has no server data; query client default options set retry and stale time
- [ ] **F0.3** Set up Vitest and Playwright
  - Check: placeholder tests pass in each runner

---

## Phase 1: Schema and setup flow

- [ ] **B1.1** Migration for `events`, `plans`, `workstreams`, `milestones`
  - Check: migration applies on an empty database; columns and check constraints match `implementation plan.md` section 5
- [ ] **B1.2** Migration for `tasks`, `checklist_items`, `metric_snapshots`
  - Check: status check constraint rejects unknown values
- [ ] **B1.3** Migration for `channels`, `channel_daily_stats`, `partners`, `logistics_items`, `content_items`
  - Check: unique constraint on `(channel_id, day)` enforced
- [ ] **B1.4** Migration for `risks`, `actions`, `closures`, `audit_events`
  - Check: partial unique index prevents two open risks with the same rule and subject
- [ ] **B1.5** Pydantic schemas for `Brief`, with validators for date order, seats, and objective count
  - Check: invalid briefs return field-level errors in the shared error shape
- [ ] **B1.6** `POST /api/events` creates the event from a brief and stores the raw brief as JSONB
  - Check: returns 201 with event id; repeated identical requests create separate events
- [ ] **B1.7** `plan_engine.create_plan(brief, now)` returns workstreams, milestones, tasks, content calendar, rules applied
  - Check: deterministic output for a given brief and clock
- [ ] **B1.8** Plan rules: hybrid adds streaming workstream; under 14 days compresses lead times; catering and AV add lock-date tasks
  - Check: each applied rule appears in `plans.rules_applied`
- [ ] **B1.9** `event_service.create_event` persists event and plan in one transaction
  - Check: a failure while writing tasks rolls back the event row too
- [ ] **B1.10** `GET /api/events/{id}` and `GET /api/events/{id}/plan`
  - Check: 404 uses the shared error shape; plan includes workstreams and milestones
- [ ] **B1.11** pytest unit tests for `plan_engine` across hackathon, workshop, bootcamp and webinar series
  - Check: task counts and workstream names match snapshots
- [ ] **B1.12** Integration test: valid brief through the API produces a stored plan that reads back identically
  - Check: round-trip test passes against Postgres
- [ ] **F1.1** Wizard shell with six steps, progress indicator, and back/next navigation
  - Check: step state survives going back and forth; keyboard navigable
- [ ] **F1.2** Step 1 (format and type): format (in-person, hybrid, virtual), event type (hackathon, workshop, bootcamp, webinar series)
  - Check: selecting hybrid reveals streaming questions
- [ ] **F1.3** Step 2 (dates and duration): start date, end date, derived days remaining
  - Check: end before start rejected inline; under 14 days shows compressed-plan warning
- [ ] **F1.4** Step 3 (audience and scale): audience segment, expected seats, target registrations
  - Check: target cannot exceed seats
- [ ] **F1.5** Step 4 (venue and logistics): venue type, city, catering and AV needs
  - Check: selecting catering shows that a lock-date task will be created
- [ ] **F1.6** Step 5 (objectives and targets): objectives (multi-select), reach target, partner count target
  - Check: at least one objective required
- [ ] **F1.7** Step 6 (review): plan summary and rules applied, with "Create command centre" action
  - Check: the review reflects every earlier answer; submit shows pending state and handles server errors without losing input
- [ ] **F1.8** Live preview panel showing estimated tasks and warnings from a `POST /api/plans/preview` endpoint
  - Check: preview updates after each answer and does not write to the database
- [ ] **B1.13** `POST /api/plans/preview` returns plan counts and warnings without persisting
  - Check: no rows written; same output as the real plan for the same brief

---

## Phase 2: Command dashboard

- [ ] **B2.1** `dashboard_service` assembles KPIs, health label, workstream summaries and top items from the database
  - Check: query count stays constant as the number of tasks grows (no N+1)
- [ ] **B2.2** Health label derived from highest open risk severity
  - Check: On track / At risk / Off track for fixture risks
- [ ] **B2.3** `GET /api/events/{id}/dashboard` includes `evaluated_at`
  - Check: field present and matches the last evaluation time
- [ ] **B2.4** Endpoint tests for empty event, event with no snapshots, and event past its date
  - Check: all return the documented shape
- [ ] **F2.1** App shell with top bar (event name, days remaining, role switcher) and main grid
  - Check: layout renders at 1280px, 768px and 375px without horizontal page scroll
- [ ] **F2.2** `KpiCard` and headline KPI row (registrations, reach, partners, open tasks, content)
  - Check: each card shows value, target, progress bar and pace where applicable
- [ ] **F2.3** `WorkstreamCard` panels with plan vs actual, next milestone, overdue count
  - Check: clicking a card navigates to the workstream view
- [ ] **F2.4** Countdown in header computed from the server's current date
  - Check: after the event date, copy changes to "Event ended N days ago"
- [ ] **F2.5** Skeleton loading states and `ConnectionBanner` for server-unavailable state
  - Check: banner appears when the health check fails and clears on recovery
- [ ] **F2.6** Empty state for dashboard when no event exists, with one action to start setup
  - Check: empty state explains why and links to setup

---

## Phase 3: Risk and recommendation engines

- [ ] **B3.1** Risk rule interface in `engines/risk_engine.py`: `evaluate(snapshot, now) -> Risk | None`, pure function
  - Check: rules registered in one list; no database imports in the engine package
- [ ] **B3.2** Snapshot builder in `services/snapshot_service.py` that loads the data an engine needs in one pass
  - Check: engines receive plain dataclasses, not ORM objects
- [ ] **B3.3** Rule: registration pace below required pace for remaining days
  - Check: boundary test at exactly required pace (no risk) and one below (risk)
- [ ] **B3.4** Rule: visit-to-registration conversion below threshold
  - Check: threshold read from `constants.py`; evidence holds the actual rate
- [ ] **B3.5** Rule: partner confirmation pending past due date
  - Check: days late from the injected clock; severity rises with days late
- [ ] **B3.6** Rule: logistics item not confirmed inside its lead-time window
  - Check: lock window per category; each category tested
- [ ] **B3.7** Rule: content behind plan by more than the threshold
  - Check: counts planned vs published up to the clock's date only
- [ ] **B3.8** Rule: overdue tasks grouped by owner and workstream
  - Check: one risk per owner and workstream, not one per task
- [ ] **B3.9** `risk_service.evaluate_event` runs all rules, diffs against open risks, opens and resolves risks, writes audit entries
  - Check: rerunning with no change writes no audit entries
- [ ] **B3.10** Action templates in `engines/constants.py` keyed by risk type and event type
  - Check: each risk type has at least one template for each applicable event type
- [ ] **B3.11** `recommendation_engine.recommend(risks, event, now)`: rank by urgency, then impact divided by effort; ties broken by title
  - Check: ranking stable for identical inputs
- [ ] **B3.12** Rationale line built from evidence values and stored with the action
  - Check: rationale contains the actual number from the triggering risk
- [ ] **B3.13** `POST /api/recommendations/{id}/dismiss` (requires reason), `/snooze`, `/accept`
  - Check: dismissed recommendations are not recreated unless evidence changes materially
- [ ] **B3.14** `GET /api/events/{id}/risks` and `GET /api/events/{id}/recommendations`
  - Check: responses include evidence and `evaluated_at`
- [ ] **B3.15** pytest unit tests for each rule and ranking with fixed clocks
  - Check: all pass with no database
- [ ] **F3.1** Action card and risk row components consuming the API
  - Check: rationale and evidence render from API fields without client-side calculation

---

## Phase 4: Workstream endpoints and pages

- [ ] **B4.1** `GET /api/events/{id}/registrations` with funnel, channel and device breakdown and gap calculation
  - Check: totals reconcile with headline registrations
- [ ] **B4.2** `POST /api/events/{id}/metrics` records a snapshot and triggers risk evaluation
  - Check: latest-value lookup returns the new value
- [ ] **B4.3** `GET /api/events/{id}/outreach` with channel table and campaign list
  - Check: top-converting channel flagged
- [ ] **B4.4** `GET` and `PATCH /api/partners` for the pipeline; status changes write audit entries
  - Check: invalid transitions are rejected
- [ ] **B4.5** `GET /api/events/{id}/content` and content item updates
  - Check: behind-plan count matches the content rule
- [ ] **B4.6** `GET /api/events/{id}/logistics` and `PATCH /api/logistics/{id}`
  - Check: items inside the lock window without confirmation are flagged
- [ ] **F4.1** Registrations page: funnel chart and `GapPanel` with projection line
  - Check: projected finish equals the value returned by the API
- [ ] **F4.2** Outreach page: channel table with highlight badges
  - Check: badge appears for the top-converting channel
- [ ] **F4.3** Partners page: four-column pipeline; moving a card calls the PATCH endpoint
  - Check: card returns to its old column with a message if the server rejects the move
- [ ] **F4.4** Content calendar grid with planned vs published markers
  - Check: clicking a slot opens the content item
- [ ] **F4.5** Operations checklist grouped by category with lock dates and escalation markers
  - Check: escalation marker matches the API flag

---

## Phase 5: Role workflows and task board

- [ ] **B5.1** Auth stub dependency reading `X-Role`; invalid roles return 400
  - Check: a single dependency used by every router; swappable for real auth
- [ ] **B5.2** `GET /api/events/{id}/tasks` with filters for workstream, owner and role
  - Check: default role filter applied when the header is present
- [ ] **B5.3** Role-specific queues: `GET /api/events/{id}/queue` returning tasks, risks and actions for the role
  - Check: marketing queue excludes partnership-only items
- [ ] **B5.4** Leadership summary endpoint returning top risks across all roles
  - Check: ordering by severity then deadline
- [ ] **F5.1** Role switcher in top bar; sends `X-Role` on every request
  - Check: switching role refetches queues and changes default filters
- [ ] **F5.2** Marketing, Partnerships, Operations, Programme and Leadership home views
  - Check: each view calls only its role queue endpoint
- [ ] **F5.3** Team task board with four columns and filters
  - Check: default filter is the current role; overdue tasks show days overdue
- [ ] **F5.4** Task card tag "From recommendation" linking to the source risk
  - Check: link opens the risk detail with its evidence

---

## Phase 6: Task closure loop and live updates

- [ ] **B6.1** `task_service.accept_action` creates task, checklist items and source link in one transaction
  - Check: accepting the same action twice returns the existing task (idempotent)
- [ ] **B6.2** `PATCH /api/tasks/{id}` for status, checklist ticks and blocked reason (reason required for blocked)
  - Check: invalid status transitions return 409
- [ ] **B6.3** `POST /api/tasks/{id}/close` in one transaction: lock event row, write closure, write metric snapshot, re-run risks and recommendations, write audit entries
  - Check: a failure at any step rolls back all changes
- [ ] **B6.4** Concurrency control: second close on the same task returns 409 with the existing closure
  - Check: concurrent-request test passes against Postgres
- [ ] **B6.5** Outcome note and metric value required by the close request schema
  - Check: missing fields return field-level errors
- [ ] **B6.6** Undo endpoints: `POST /api/tasks/{id}/reopen` and `POST /api/recommendations/{id}/restore`
  - Check: reopening removes the closure's effect on risks via re-evaluation, and audit records both steps
- [ ] **B6.7** SSE endpoint `GET /api/events/{id}/stream` emitting `dashboard.updated` and `risks.updated` after commit
  - Check: a client connected before a close receives the event within two seconds
- [ ] **B6.8** Integration test: accept, close, assert gap, severity and recommendation list changed as expected
  - Check: test passes on the seeded scenario
- [ ] **F6.1** Action detail view: context, triggering numbers and rationale
  - Check: all evidence values from the risk are shown
- [ ] **F6.2** Accept action → pending state → new task on the board in To do
  - Check: task appears with source tag after the response
- [ ] **F6.3** Checklist with optimistic ticks and revert-on-error
  - Check: a rejected tick reverts with a message
- [ ] **F6.4** In progress and Blocked transitions (blocked requires a reason)
  - Check: blocked tasks show the reason
- [ ] **F6.5** Close form: outcome note and metric required; submit disabled until both are present
  - Check: 409 from the server shows the "already closed" message and refreshes the card
- [ ] **F6.6** Post-close feedback panel using before and after values from the server response
  - Check: values match the API response, not local calculations
- [ ] **F6.7** Live stream client (`EventSource`) that refetches affected queries on each event
  - Check: a change made in a second browser appears within two seconds
- [ ] **F6.8** Five-second undo toast on accept and close, calling the reopen or restore endpoint
  - Check: undo restores the previous state as confirmed by the next fetch

---

## Phase 7: Demo, security, polish and documentation

- [ ] **B7.1** `engines/simulator.py` and `seed/demo_brief.json` for the Build Sprint hackathon
  - Check: seeding through the normal services produces roughly 60 tasks, 6 workstreams, 6 milestones
- [ ] **B7.2** `seed/demo_event.py` loading the registration gap, partner delay, logistics lock risk and content lag
  - Check: exactly the expected risks are detected with the severities in the design doc
- [ ] **B7.3** Seed three campus channels driving 70% of visits, with the top channel highest-converting
  - Check: outreach endpoint flags the expected channel
- [ ] **B7.4** `POST /api/demo/seed` and `POST /api/demo/reset`, available only when `DEMO_ENABLED=true`
  - Check: both return 404 when the flag is off
- [ ] **B7.5** Reset clears closures, actions and snapshots and restores the seeded gap
  - Check: reset then dashboard read matches the seeded baseline exactly
- [ ] **B7.6** Security hardening per `security.md`: security headers, CORS allowlist, rate limiting on writes, request size limit, dependency audit in CI
  - Check: each control has a test or CI step
- [ ] **B7.7** Audit log coverage check: every write endpoint produces an audit entry
  - Check: test iterates write routes and asserts an entry is created
- [ ] **F7.1** Guided tour overlay for the six-step demo narrative
  - Check: each step highlights the correct element and can be skipped
- [ ] **F7.2** Reset demo control in the UI (visible only when demo is enabled)
  - Check: reset restores the seeded state and the UI refetches all queries
- [ ] **F7.3** Accessibility pass: contrast, keyboard navigation, focus management, reduced motion
  - Check: no contrast failures on severity badges; modals trap and restore focus
- [ ] **F7.4** Responsive pass at 1280px, 768px and 375px
  - Check: no horizontal scroll on the dashboard or close form
- [ ] **F7.5** Empty, error and loading states reviewed on every screen
  - Check: each empty state includes a reason and one next action
- [ ] **X7.1** Playwright demo script against the Compose stack: setup → plan → dashboard → gap → recommendations → accept → close → gap narrows
  - Check: script passes on a clean seed in CI
- [ ] **X7.2** Two-window SSE test in Playwright: closing in one window updates the other
  - Check: second window reflects the change without reload
- [ ] **X7.3** Migration round-trip and OpenAPI diff checks in CI
  - Check: CI fails on unexpected OpenAPI changes; the frontend client is regenerated from the spec
- [ ] **X7.4** `guide.md` and `architecture.md` reviewed against the running system
  - Check: every command in the guide runs as written on a clean machine
- [ ] **X7.5** Demo video recorded following the narrative in the design doc
  - Check: video shows the closure loop, the live second window and the gap narrowing
- [ ] **X7.6** Final review against the definition of done in the implementation plan
  - Check: every item ticked with evidence

---

## Open questions to resolve early

- [ ] **Q1** Confirm the event type list for v1 (hackathon, workshop, bootcamp, webinar series) with the Hackingly brief owner
- [ ] **Q2** Confirm the pace and conversion thresholds used in the seed data are acceptable for the demo narrative
- [ ] **Q3** Decide whether dark mode is in scope for v1 or deferred
- [ ] **Q4** Confirm the role list (Marketing, Partnerships, Operations, Programme, Leadership) matches Hackingly's team structure
- [ ] **Q5** Decide whether SSE is sufficient for the demo or whether WebSockets are needed for two-way updates later
- [ ] **Q6** Confirm the demo will be hosted on a single machine (Compose) or on a shared server, which changes the security defaults in `security.md`
