# Guide: Intelligent Event Command Centre

This guide takes you from a clean machine to a running demo, then walks through the product as a user would. It is written for three readers:

- **Presenters** who need to run the demo for stakeholders.
- **Team members** who will use the command centre for a live event.
- **Developers** who will set up, test and extend the system.

Sections 1 to 4 are for everyone. Sections 5 to 7 are for presenters and team members. Sections 8 to 11 are for developers.

---

## 1. What this product does

The Command Centre turns an event brief into a working plan and then keeps that plan honest.

- You describe the event once: format, dates, audience, scale, venue and objectives.
- The system generates workstreams, milestones, tasks, a content calendar and a list of logistics items with lock dates.
- As numbers come in (registrations, visits, partner confirmations, content published), the system checks them against the plan and raises risks.
- For each risk it recommends actions, ranked by urgency and impact, with the reasoning shown.
- A team member accepts an action, works through its checklist, and closes it with an outcome. The dashboard, risks and recommendations update immediately and for everyone else viewing the event.

It is a decision-support tool, not a to-do list. Every screen answers one of three questions: what is at risk, what should I do next, and who owns it and is it closed?

---

## 2. Before you start

### Requirements

| Tool | Version | Used for |
|---|---|---|
| Docker Desktop (or Docker Engine and Compose) | Recent stable (Compose v2) | Running the full stack |
| Git | Any recent | Getting the code |
| Python | 3.12 | Only if running the backend without Docker, or running tests |
| Node.js | 20 LTS or newer | Only if running the frontend without Docker, or running frontend tests |
| A web browser | Recent Chrome, Edge, Firefox or Safari | Using the product |

### Ports used

| Port | Service | Notes |
|---|---|---|
| 3000 | Web app | Open this in your browser |
| 8000 | API | Interactive API docs at `/docs` (in development) |
| 5432 | Database | Internal to Docker; not published by default |

If a port is in use, change it in `docker-compose.yml` and in `.env`.

---

## 3. Quick start (Docker)

This is the fastest route to a working demo.

### Step 1: Get the code

```bash
git clone <repository-url> event-command-centre
cd event-command-centre
```

### Step 2: Create your environment file

```bash
cp .env.example .env
```

Open `.env` and check these values:

| Variable | Default in example | What it does |
|---|---|---|
| `APP_ENV` | `development` | Controls error detail and some startup checks |
| `DATABASE_URL` | Points to the `db` service | Connection string for the API |
| `POSTGRES_PASSWORD` | `change-me-locally` | Database password for local use only |
| `DEMO_ENABLED` | `true` | Shows the demo seed and reset controls |
| `CORS_ORIGINS` | `http://localhost:3000` | Origins allowed to call the API directly |

Change `POSTGRES_PASSWORD` if the machine is shared. Never commit `.env`.

### Step 3: Start the stack

```bash
docker compose up --build
```

The first build takes a few minutes. You are ready when the logs show:

- `db` reports healthy.
- `api` runs migrations and then `Application startup complete`.
- `web` is serving on port 3000.

### Step 4: Check that it works

- Open `http://localhost:3000` in your browser. You should see the empty command centre with a "Start setup" action.
- Open `http://localhost:8000/api/health`. You should see `"database": "ok"`.

### Step 5: Load the demo event

Choose one:

- **In the app:** on the empty dashboard, select **Load demo event**.
- **From the terminal:**

```bash
curl -X POST http://localhost:8000/api/demo/seed -H "Content-Type: application/json" -d '{}'
```

The demo event is the **Hackingly Build Sprint**: a 2-day hackathon in Bengaluru, 300 seats, 45 days away, with a deliberate registration gap.

### Step 6: Stop and restart

```bash
docker compose stop          # pause, keep data
docker compose start         # resume
docker compose down          # stop and remove containers, keep data volume
docker compose down -v       # stop and delete all data, including the database
```

---

## 4. Running without Docker (developers)

Use this only if you want to run services directly on your machine. You will need a running PostgreSQL 16 instance.

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
export DATABASE_URL=postgresql+psycopg://app:change-me@localhost:5432/command_centre
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
export VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

The frontend runs on `http://localhost:5173` in this mode. Add that origin to `CORS_ORIGINS`.

---

## 5. Using the command centre

This section follows the demo narrative. Use it as a walkthrough for presenting, or as a tour for a new team member.

### 5.1 Set up a new event

1. Select **New event**.
2. Work through the six steps. Each step explains how the answer changes the plan.

| Step | What to enter | What changes |
|---|---|---|
| 1. Format and type | In-person, hybrid or virtual; event type | Hybrid adds a streaming workstream |
| 2. Dates and duration | Start and end dates | Under 14 days out triggers a compressed plan and shorter lead times |
| 3. Audience and scale | Audience, seats, target registrations | Sets the registration target the gap is measured against |
| 4. Venue and logistics | Venue type, city, catering, AV | Catering and AV add lock-date tasks |
| 5. Objectives and targets | At least one objective; reach and partner targets | Sets reach and partner goals on the dashboard |
| 6. Review | Check the summary and the rules applied | Creates the command centre |

3. The live preview on the right shows estimated tasks, workstreams and any warnings. Use it to check your answers before you reach the review step.
4. Select **Create command centre**. The plan is saved and you land on the dashboard.

Tip: if a field is marked as compressing the timeline, the warning tells you what to confirm first. Confirm venue and catering early.

### 5.2 Read the dashboard

The dashboard is the operating room. Read it top to bottom.

- **Header:** event name, days to go, and the overall health label (On track, At risk or Off track). Health comes from the most severe open risk.
- **Headline numbers:** registrations against target with pace, reach, partners activated, open and overdue tasks, and content published against plan.
- **Recommended actions (left):** up to five ranked actions. Each shows its owner role, impact, effort, urgency and the one-line reason behind it.
- **Risk strip (right):** open risks, most severe first, with the evidence that triggered each one.
- **Workstream panels (bottom):** plan vs actual for each workstream, with the next milestone and the overdue count.
- **Freshness footer:** when the risk view was last evaluated.

Reading the health label: On track means every open risk is low or below. At risk means at least one high risk is open. Off track means at least one critical risk is open.

### 5.3 Investigate a gap

Using the demo event:

1. Open **Registrations** from the navigation.
2. Read the gap panel:
   - **Target:** 300.
   - **Actual:** 140 (47%).
   - **Required pace:** about 4.0 per day for the remaining 45 days.
   - **Current pace:** about 1.6 per day over the last 14 days.
   - **Projected finish at current pace:** about 210.
3. Look at the funnel. Visit-to-registration conversion is 6.1%, below the 9% threshold.
4. Look at the channel breakdown. Two of five campus channels generate 70% of visits, and the top channel converts well but is under-used.

The projection line on the chart is the quickest way to explain the gap: it sits below the dashed target line.

### 5.4 Act on a recommendation

1. On the dashboard, open **Activate campus referrals** (the top recommendation in the demo).
2. Read the context: the rationale, the numbers that triggered it and the expected impact.
3. Select **Accept**. A task is created with its checklist and an owner. The task moves to In progress.
4. Work through the checklist. Tick items as you complete them. Ticks save immediately.
5. When the work is done, select **Close task**.
6. Enter:
   - **Outcome note:** what you did and what happened, in one or two sentences.
   - **Updated metric:** the new registrations from the push (for example, 38).
7. Select **Close**. The result screen shows:
   - Before and after numbers.
   - The new severity of the linked risk.
   - Any follow-up recommendation the system has created.

If someone else closes the same task first, you will see a message saying so and the card will refresh. Nothing is lost; check the closure record on the task.

### 5.5 Use role views

Use the role switcher in the top bar to change your view.

| Role | Start here | Typical actions |
|---|---|---|
| Leadership | Command summary and escalations | Review top risks; dismiss or escalate recommendations |
| Marketing | Registrations, channels, content calendar | Accept and close outreach actions; record metrics |
| Partnerships | Partner pipeline and confirmations due | Move partners through the pipeline; chase late confirmations |
| Operations | Logistics checklist by lock date | Confirm vendors; update logistics status |
| Programme | Readiness checklist | Track agenda, mentor and experience items |

Switching roles changes the default filters and the queue of tasks and recommendations. It does not hide information from leadership.

Note: in this prototype the role is a convenience setting, not a security control. See `security.md` before using the system with real data.

### 5.6 Work the task board

- The board has four columns: To do, In progress, Blocked and Done.
- The default filter is your current role. Change the filter to see another workstream or owner.
- An overdue task shows a clock icon and the number of days overdue.
- A task created from a recommendation shows a "From recommendation" tag. Select it to see the risk that caused it.
- To mark a task blocked, you must give a reason. Blocked tasks with a deadline in the past raise a risk for their owner's workstream.

### 5.7 Dismiss, snooze or restore recommendations

- **Dismiss:** requires a short reason. Dismissed recommendations do not come back unless the numbers change materially.
- **Snooze:** choose how many days. The recommendation returns on that day.
- **Restore:** available for five seconds after accepting or closing, through the undo toast. After that, use the **Reopen** action on the task.

### 5.8 Record a metric

Metrics are how the system learns what is happening. In the demo they are seeded. For a live event:

1. Open **Registrations** and select **Record numbers**.
2. Enter the date, registrations, visits and any channel figures you have.
3. Save. The risk view and recommendations update.

Record numbers daily during the active phase. Entering a number more than once on the same day replaces nothing; the latest entry counts as the current value and the history is kept.

### 5.9 Reset the demo

Use the **Reset demo** control (visible only when demo mode is on), or:

```bash
curl -X POST http://localhost:8000/api/demo/reset -H "Content-Type: application/json" -d '{"confirm": "<event-id>"}'
```

The reset clears closures, accepted actions and recorded metrics, and restores the seeded gap. It is written to the audit log.

---

## 6. Presenting the demo

Suggested running order (about seven minutes):

| Time | Show | Say |
|---|---|---|
| 0:00 | Empty dashboard, then wizard | "We start from an event brief, not a blank board." |
| 1:00 | Live plan preview and rules applied | "The plan follows from the answers. Each rule is recorded." |
| 2:00 | Dashboard | "Health is At risk. Registrations are 47% of target with 45 days left." |
| 3:00 | Registrations gap panel | "At today's pace we finish near 210 of 300." |
| 4:00 | Top two recommendations and their rationale | "Each one shows the number that caused it." |
| 4:45 | Switch to Marketing, accept, tick, close with 38 | "Closing the loop updates the gap, the severity and the next recommendation." |
| 6:00 | Second window on the leadership dashboard | "Anyone viewing the event sees the change without refreshing." |
| 6:45 | Risks screen | "Everything that changed is in the audit trail." |

Tips for presenting:

- Keep a second window open on the leadership dashboard before you start.
- Reset the demo beforehand so the numbers match the script.
- If the live update is slow, refresh once and say so. The target is under two seconds.

---

## 7. Troubleshooting for users

| Symptom | What to check |
|---|---|
| Banner says "Can't reach the command centre" | Wait for retry. If it persists, ask a developer to check the API container. |
| Dashboard shows numbers from an earlier time | Look at the freshness footer; reload the page. |
| A button is disabled | Check that the form is complete, or that your role is allowed to take that action. |
| "This task was already closed" | Someone else closed it. Open the task to see the closure record. |
| Recommendation has disappeared | It may have been dismissed, snoozed or resolved by new numbers. Check the Risks screen. |
| Demo controls are missing | Demo mode is off. Ask a developer to set `DEMO_ENABLED=true` on a non-production environment. |

---

## 8. Developer guide

### 8.1 Project map

| Area | Location | Start reading |
|---|---|---|
| Business rules | `backend/app/engines/` | `risk_engine.py`, `recommendation_engine.py` |
| Use cases and transactions | `backend/app/services/` | `task_service.py` (close flow) |
| HTTP routes | `backend/app/api/routers/` | `tasks.py`, `events.py` |
| Data model | `backend/app/db/models/` and `backend/migrations/` | `risk.py`, `action.py` |
| Demo data | `backend/app/seed/` | `demo_event.py` |
| UI features | `frontend/src/features/` | `dashboard/`, `tasks/` |
| Tests | `backend/tests/`, `frontend/tests/` | `engines/` for rule tests |

The architecture document explains the layers and why they are arranged this way.

### 8.2 Running the tests

```bash
# Backend (requires Postgres for service and integration tests)
cd backend
pytest tests/engines                 # fast, no database
pytest tests/services tests/api tests/integration   # needs DATABASE_URL

# Frontend
cd frontend
npm run test                         # Vitest
npm run test:e2e                     # Playwright, needs the stack running
```

Or run everything inside Compose:

```bash
docker compose run --rm api pytest
```

### 8.3 Changing a threshold

Thresholds live in one file: `backend/app/engines/constants.py`.

Example: changing the conversion threshold from 9% to 8%:

```python
# constants.py
CONVERSION_THRESHOLD = 0.08   # was 0.09
```

Then:

1. Run `pytest tests/engines` and update any boundary tests that depend on the old value.
2. Check the seeded demo still produces the intended risks (`pytest tests/integration`).
3. Note the change in the README so the demo narrative stays accurate.

Never hard-code a threshold in a rule or a template. Import it from `constants.py`.

### 8.4 Adding a risk rule

1. Create a rule class in `backend/app/engines/risk_engine.py` that implements `evaluate(snapshot, now)` and returns a risk or `None`.
2. Give it a stable `rule_key` (lowercase, underscores). This key is part of the database uniqueness rule for open risks, so do not rename it later.
3. Add the rule to the list of rules the engine runs.
4. Add at least two tests in `tests/engines/`: one at the boundary where the risk is not raised, and one where it is.
5. If the risk should produce recommendations, add action templates in `constants.py` for each applicable event type (see 8.5).
6. Add a row to the risk table in `design.md` section 7 if it introduces a new severity example.

### 8.5 Adding a recommendation template

1. Add an entry to the template list in `constants.py`, keyed by `rule_key` and event type.
2. Each template needs: title (starting with a verb), owner role, impact, effort, urgency rule, a rationale template with named placeholders filled from the risk's evidence, and a checklist of 3 to 5 steps.
3. Write a test that builds the rationale from a fixture risk and checks the number appears in the text.
4. Check the template does not recommend an action outside the owner role's permissions (see `security.md` section 5).

### 8.6 Adding a database migration

```bash
cd backend
alembic revision -m "describe the change"
# edit the new file in migrations/versions/
alembic upgrade head
alembic downgrade -1      # confirm the downgrade works
alembic upgrade head
```

Migrations must be reversible. Do not edit a migration that has already been applied anywhere; add a new one.

### 8.7 Adding an API endpoint

1. Add the request and response schemas in `app/schemas/`.
2. Put the business logic in a service, not in the router.
3. Add the route in the relevant router, using the auth stub dependency.
4. Make sure the write (if any) produces an audit entry in the same transaction.
5. Add API tests for success, validation errors and forbidden role.
6. Regenerate the OpenAPI spec and the frontend client. CI fails if the spec changes without this step.

### 8.8 Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `APP_ENV` | Yes | `development` | `production` disables debug details and requires `DEMO_ENABLED=false` |
| `DATABASE_URL` | Yes | none | Use the `app` role, never the migration role |
| `MIGRATION_DATABASE_URL` | For migrations | none | Owner role for Alembic |
| `DEMO_ENABLED` | No | `false` | Enables seed and reset routes |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated list |
| `LOG_LEVEL` | No | `INFO` | |
| `SSE_IDLE_TIMEOUT_SECONDS` | No | `300` | |
| `POSTGRES_PASSWORD` | Compose only | none | Local use only |

---

## 9. Operating a live event

Before the event:

- [ ] Event created with the real brief and reviewed by leadership.
- [ ] Each workstream owner has a role in the system and knows their queue.
- [ ] Targets confirmed: registrations, reach, partners.
- [ ] Logistics lock dates entered for venue, catering, AV and travel.
- [ ] Database backup taken and restore tested.
- [ ] `DEMO_ENABLED=false` confirmed.

During the active phase:

- [ ] Record metrics daily, at the same time each day.
- [ ] Review the dashboard at the start of each working day.
- [ ] Clear overdue tasks or blocked items at the daily check-in.
- [ ] Dismiss recommendations only with a reason.

After the event:

- [ ] Close remaining tasks with outcomes.
- [ ] Export the audit trail for the record.
- [ ] Archive the event; personal data (if any was added) follows the retention schedule in `security.md`.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| Event brief | The answers captured by the setup wizard |
| Plan | The generated workstreams, milestones, tasks, content and logistics for an event |
| Workstream | A group of tasks owned by one role (for example, Marketing) |
| Metric snapshot | A recorded number (registrations, visits, reach) at a point in time |
| Risk | A detected gap or blocker, with severity, evidence and an owner role |
| Severity | Low, medium, high or critical; drives the health label |
| Evidence | The numbers a risk or recommendation is based on |
| Action | A recommended next step, created from a risk |
| Accept | Turning an action into a task |
| Closure | The outcome note and metric recorded when a task is completed |
| Health label | On track, At risk or Off track, derived from open risks |
| Lock date | The last date a logistics item can be confirmed without risk |
| Required pace | Registrations per day needed to reach target by the event date |
| Current pace | Registrations per day over the recent window |
| Projected finish | Expected final registrations if the current pace continues |

---

## 11. Getting help

- Product questions: the presenter or product owner for the event.
- Setup or running problems: check section 7 first, then the developer's Compose logs (`docker compose logs api`).
- Security concerns: report them to the project owner before using the system with real data. See `security.md` section 13.
- Rule or threshold questions: see `design.md` (what the user sees) and `backend/app/engines/constants.py` (what the system does).
