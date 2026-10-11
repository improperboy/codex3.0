# Security: Intelligent Event Command Centre

This document sets out how the prototype protects event data, what is deliberately out of scope for v1, and what must change before the system is used with real participant or partner data.

The prototype handles operational data about events: plans, metrics, partner names, vendor contacts and team tasks. It does not hold payment data, government ID numbers or health data. Registrant records are out of scope for v1; if they are added later, the controls in section 9 apply in full.

---

## 1. Scope and assumptions

- v1 is a demo system running on a single machine or small VM via Docker Compose.
- Users are a small known group (the event team). The prototype is not open to the public.
- Authentication is a stub: the role is supplied in an `X-Role` header. This is **not** an access control and must not be relied on outside a trusted demo network.
- Real participant personal data is not loaded. The seed data uses fictional names and figures.
- Applicable law for future production use includes India's Digital Personal Data Protection Act, 2023 (DPDP Act), and any contractual obligations to partners.

---

## 2. Assets to protect

| Asset | Sensitivity | Why it matters |
|---|---|---|
| Event plans and targets | Medium | Competitive and planning information |
| Partner names, status and contacts | Medium | Commercial relationships; contact details are personal data of the partner's staff |
| Team task and closure records | Low to medium | Accountability record; internal |
| Audit log | Medium | Integrity matters more than secrecy; must not be altered |
| Registration and reach metrics | Medium | Aggregate figures; becomes sensitive if linked to individuals |
| Database credentials and API configuration | High | Compromise gives full access to all data |
| Demo reset and seed endpoints | High if exposed | Can wipe data if reachable in a non-demo environment |

---

## 3. Threat model (summary)

| # | Threat | Likelihood (v1) | Impact | Primary control |
|---|---|---|---|---|
| T1 | Unauthorised person reaches the dashboard on a shared network | Medium | Medium | Bind to private network; TLS and login before any hosted use (section 6) |
| T2 | A user impersonates another role with the `X-Role` header | High in v1 | Low to medium | Accepted for demo; must be replaced before real use (section 5) |
| T3 | SQL injection through filters or search | Low | High | ORM with bound parameters only; no raw SQL with interpolation (section 7) |
| T4 | Mass or abusive writes to close tasks or record metrics | Low | Medium | Rate limits; request size limits; audit trail (section 8) |
| T5 | Concurrent closes corrupt risk state | Medium | Medium | Row lock and idempotent close (architecture section 5) |
| T6 | Demo reset wipes real data | Low if flag off | High | `DEMO_ENABLED` defaults to false; reset requires explicit confirmation token (section 6.4) |
| T7 | Secrets committed to the repository | Medium | High | Environment variables; secret scanning in CI (section 10) |
| T8 | Vulnerable dependencies | Medium | Medium | Dependency audit in CI; pinned versions (section 10) |
| T9 | Information leakage through error messages or logs | Medium | Medium | Generic error bodies; no stack traces outside development; no personal data in logs (section 8) |
| T10 | Cross-site scripting through partner or action text | Medium | Medium | Output escaping in React; no `dangerouslySetInnerHTML`; text length limits (section 7) |
| T11 | Tampering with audit history | Low | High | Append-only table; no update or delete routes; DB role without update rights on audit (section 6.3) |
| T12 | Live stream leaks data to unauthorised viewers | Low in v1 | Medium | Stream requires the same access check as the dashboard; events carry ids only (section 6.5) |

---

## 4. Trust boundaries

```
 Browser (untrusted input)
    │  HTTPS (production) / HTTP on localhost (demo only)
    ▼
 Nginx (TLS termination, security headers, request size limit)
    │  internal Compose network
    ▼
 FastAPI (validates all input, enforces role checks, rate limits)
    │  internal Compose network, least-privilege DB role
    ▼
 PostgreSQL (not exposed to host in production)
```

Every arrow crossing a boundary is a validation point. The browser is never trusted for role, ownership or state transitions; the server recomputes them.

---

## 5. Identity and access

### v1 (demo)

- The `X-Role` header selects the default queue and filters. It is a convenience for the demo.
- It is **not** used to decide whether a request is allowed to write. In the demo, any caller that can reach the API can act as any role.
- Access is therefore controlled by network placement: the API must not be reachable from outside the trusted network.

### Required before any shared or hosted use

- Replace the stub with OpenID Connect sign-in (for example, Google Workspace or Microsoft Entra ID for the team).
- Role comes from a signed token claim, not a header.
- Each user is mapped to one or more roles and, where relevant, to one or more workstreams.
- Authorisation checks run in one dependency and cover: who can read an event, who can accept or close a task, who can dismiss a recommendation, who can change partner status, who can run demo endpoints (nobody outside demo mode).
- Session cookies are `HttpOnly`, `Secure` and `SameSite=Lax`, with a sensible idle timeout.

### Authorisation matrix (target)

| Action | Leadership | Marketing | Partnerships | Operations | Programme |
|---|---|---|---|---|---|
| Read dashboard and risks | Yes | Yes | Yes | Yes | Yes |
| Create event | Yes | No | No | No | No |
| Accept and close marketing tasks | Yes | Yes | No | No | No |
| Change partner status | Yes | No | Yes | No | No |
| Update logistics items | Yes | No | No | Yes | No |
| Dismiss a recommendation | Yes | Own queue | Own queue | Own queue | Own queue |
| Run demo seed or reset | Only when `DEMO_ENABLED` | Same | Same | Same | Same |

---

## 6. Platform and network controls

### 6.1 Network

- In Compose, only `web` (and `api` in development) publish ports. `db` has no published port.
- In hosted use, a single public entry point (reverse proxy) terminates TLS. The API and database are on an internal network.
- Restrict inbound access to known IP ranges or a VPN if the team is not on a single office network.

### 6.2 Transport

- TLS 1.2 or higher for all external traffic. HSTS enabled on the public host.
- HTTP on localhost is acceptable only for local development.

### 6.3 Database

- Two database roles:
  - `migrator`: owns the schema, used only by Alembic.
  - `app`: used by the API; has `SELECT`, `INSERT`, `UPDATE`, `DELETE` on application tables, and `SELECT`, `INSERT` only on `audit_events` and `metric_snapshots`.
- No superuser connections from the application.
- Passwords are generated per environment and stored in environment variables or a secrets manager, never in the repository.
- Backups: nightly `pg_dump` (or managed snapshots) encrypted at rest, with a tested restore once per month.
- Enable `log_connections` and `log_disconnections` in Postgres for the demo environment.

### 6.4 Demo mode

- `DEMO_ENABLED` defaults to `false`. When false, the seed and reset routes are not registered at all (404), so they cannot be probed.
- When true, reset requires a confirmation field equal to the event id and a server-side flag, and the reset is written to the audit log.
- Production deployments must set `DEMO_ENABLED=false`. The startup check fails if `APP_ENV=production` and the flag is true.

### 6.5 Live stream

- The SSE endpoint applies the same access check as the dashboard read for that event.
- Events carry only identifiers and event types. Clients refetch through authorised endpoints to get data.
- Connections are closed after an idle timeout and when the user's session expires.

---

## 7. Application security

### 7.1 Input validation

- Every request body and query parameter is validated by a Pydantic model. Unknown fields are rejected.
- Enumerations (formats, statuses, roles, categories) are closed sets; values outside them return 422.
- Numeric ranges are enforced: seats, targets, metric values, snooze days.
- String lengths are capped: names 200 characters, outcome notes 2,000, dismiss reasons 500, checklist labels 200.
- Dates are validated for order (start before end) and plausible range.
- Request body size is capped at 64 KB at the reverse proxy and in the application.

### 7.2 Persistence

- All database access goes through SQLAlchemy with bound parameters.
- No raw SQL built from strings. If raw SQL is ever needed, it uses bound parameters and is reviewed.
- Enum-like columns have check constraints as a second line of defence.

### 7.3 Output and XSS

- React escapes text by default. `dangerouslySetInnerHTML` is banned by a lint rule.
- Partner names, action titles and outcome notes are rendered as text only.
- Markdown is not rendered in v1. If it is added later, it must be sanitised with an allowlist.
- Content-Security-Policy header restricts scripts to the application origin.

### 7.4 Business logic integrity

- Role and ownership checks happen on the server for every write.
- State transitions are validated on the server (for example, a task cannot go from done to blocked without reopening).
- Metric values are checked against plausibility rules (no negative registrations; no value above seats times ten without a confirmation flag).
- The server recomputes risk and recommendation outputs; the client never submits them.

### 7.5 Errors

- Error responses use the shared shape `{ "error": { "code", "message", "fields"? } }`.
- Stack traces and internal exception text are returned only when `APP_ENV=development`.
- Database errors are mapped to generic messages; the detail goes to the server log with a request id.

### 7.6 Frontend

- No secrets or environment-specific URLs are embedded in the built bundle beyond the public API path.
- Local storage is not used for business data or tokens in v1.
- Third-party scripts are not loaded. Fonts are self-hosted or loaded from a trusted origin allowed by CSP.

---

## 8. Logging, audit and privacy

### 8.1 Application logs

- Structured JSON logs with timestamp, level, request id, route, status code and duration.
- Logs must not contain: passwords, tokens, full request bodies, partner contact details, or any personal data beyond user role names.
- Log retention for the demo: 30 days. Production retention to be set with the data protection policy.

### 8.2 Audit log

- Every write endpoint produces an `audit_events` row in the same transaction as the change.
- Each row records: event id, actor role (and user id once auth exists), action, entity type and id, timestamp, and a minimal payload (for example, old and new status, not full notes).
- `audit_events` has no update or delete routes. The `app` database role cannot update or delete it.
- A CI test iterates all write routes and fails if one does not produce an audit entry.

### 8.3 Personal data

- v1 holds no registrant personal data.
- Partner staff contact details, if stored, are limited to name and work email. Notes are not to contain personal information.
- A data inventory lists each table and whether it holds personal data before any production use.
- Retention and deletion: an event can be deleted by a leadership role, which removes its child rows and writes a deletion record that contains no personal data.

---

## 9. Requirements before handling real registrant or partner personal data

These are not needed for the demo but are mandatory before live use with real people's data.

| # | Requirement | Reason |
|---|---|---|
| R1 | Real authentication (OIDC) with MFA for leadership | Replace `X-Role` stub; the header is not a control |
| R2 | Authorisation enforced server-side on every route | Current stub does not restrict writes |
| R3 | Data processing record and lawful basis documented under the DPDP Act | Required for personal data processing in India |
| R4 | Consent or notice for any registrant data collected through partner channels | Transparency to individuals |
| R5 | Data minimisation review: store aggregates where individual records are not needed | Reduces exposure |
| R6 | Encryption at rest for the database volume and backups | Protects stored data |
| R7 | Retention schedule and automated deletion | Avoids keeping data longer than needed |
| R8 | Incident response plan with contact points and a 72-hour notification path | Required practice for personal data breaches |
| R9 | Penetration test of the hosted instance before launch | Independent check of controls |
| R10 | Vendor review for any hosting or analytics provider | Sub-processor obligations |

---

## 10. Secure development and operations

- **Secrets:** environment variables from a non-committed `.env`; `.env.example` lists names with placeholder values. CI runs a secret scanner (for example, gitleaks) on every push.
- **Dependencies:** pinned versions in `pyproject.toml` and `package-lock.json`; `pip-audit` and `npm audit` in CI; Dependabot or Renovate for updates.
- **Static analysis:** ruff with security rules (bandit subset) for the backend; ESLint with security plugins for the frontend.
- **Containers:** minimal base images (`python:3.12-slim`, `nginx:alpine`, `postgres:16`); non-root user in the API container; read-only root filesystem where possible; no `--privileged`.
- **Images:** scanned for known vulnerabilities in CI before publishing.
- **Code review:** every change to `engines/`, `services/` and authorisation code requires a second reviewer.
- **Testing:** tests for authorisation, input validation, audit coverage and the close-task concurrency behaviour (see `task.md` B6.4 and B7.7).
- **Logging and monitoring:** failed logins (after auth exists), 5xx rate, and unusual write volume raise alerts in the hosted environment.

---

## 11. Security headers (reverse proxy)

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (hosted only) |
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

`style-src 'unsafe-inline'` is included only because the charting library requires it; revisit if the chart library changes.

---

## 12. Rate limits and abuse controls

| Route group | Limit (per client, per minute) |
|---|---|
| Read endpoints | 120 |
| Write endpoints | 30 |
| Close and accept | 10 |
| SSE connections | 5 open per client |
| Demo seed and reset | 2 (demo mode only) |

Limits return 429 with a `Retry-After` header. Limits are per authenticated user once auth exists, and per IP address before then.

---

## 13. Incident handling (demo stage)

1. Stop the affected containers (`docker compose stop api`).
2. Preserve the database volume and the logs; do not delete them.
3. Rotate the database password and any tokens the incident could have exposed.
4. Review `audit_events` and access logs for the affected period.
5. Restore from the last known good backup if data integrity is in doubt, after confirming the backup predates the incident.
6. Record what happened, what was affected and what changed.

For a live deployment with personal data, follow the incident response plan in requirement R8.

---

## 14. Known gaps accepted for v1

| Gap | Accepted because | Revisit when |
|---|---|---|
| `X-Role` header is not an access control | Demo on a trusted network with a known group | Before any hosted or shared use |
| No MFA | No real data and no external access | Before live use |
| Single API instance and in-memory SSE broker | Demo scale | More than one API instance is deployed |
| No field-level encryption | No sensitive personal fields in v1 | Personal data is added |
| Metrics are entered by hand or seeded | No registration integration yet | Integration is added; then validate source |

---

## 15. Security checklist for the demo

- [ ] `DEMO_ENABLED` is set only on the demo environment
- [ ] `.env` is not committed; `.env.example` has no real values
- [ ] Database port is not published to the host
- [ ] API is reachable only from the trusted network
- [ ] Security headers present on the web response
- [ ] Rate limiting active on write routes
- [ ] Audit entry produced for every write (CI test passing)
- [ ] Dependency audit and secret scan passing in CI
- [ ] No real personal data loaded
- [ ] Backup and restore of the database tested once
