# Design: Intelligent Event Command Centre

## 1. Design intent

The product should feel like an operations room, not a form or a checklist. Each screen answers one of three questions:

1. **What is at risk?**
2. **What should I do next, and why?**
3. **Who owns it, and is it closed?**

If a screen does not answer one of these, it does not belong in the prototype.

---

## 2. Principles

- **Decisions first.** Lead with the gap or the next action, then the supporting data.
- **Explain the recommendation.** Every suggested action shows the numbers that produced it and the reason it is ranked where it is.
- **Time is a first-class signal.** Days remaining change urgency. The UI shows countdowns and pace, not only totals.
- **Plan vs actual everywhere.** Every workstream, metric and milestone shows what was planned and what happened.
- **Role-shaped views.** Each role opens to its own queue, not a shared wall of everything.
- **Closing the loop is part of the feature.** A recommendation is not finished until its outcome is recorded and the dashboard reflects it.
- **Calm under pressure.** Severity is communicated with a small set of colours and labels, never with alarm-style full-screen treatment.

---

## 3. Users and roles

| Role | Primary question | Home view |
|---|---|---|
| Leadership | Are we on track, and what needs my decision? | Command summary and escalations |
| Marketing | Are we reaching enough people, through which channels? | Registrations, channels, content calendar |
| Partnerships | Who has confirmed, who is late, who needs a call? | Partner pipeline and confirmations due |
| Operations | What is unconfirmed and when must it lock? | Logistics checklist and vendor lead times |
| Programme | Is the experience ready for participants? | Agenda, mentors, registration experience, readiness |

Role switching is a top-bar control. It changes the default view and filters the task and recommendation queues. It does not hide data from leadership.

---

## 4. Information architecture

```
Command Centre (app)
├── Setup (guided wizard, shown when no event exists, or via New Event)
│   ├── 1. Format and type
│   ├── 2. Dates and duration
│   ├── 3. Audience and scale
│   ├── 4. Venue and logistics
│   ├── 5. Objectives and targets
│   └── 6. Review generated plan
├── Dashboard (default)
│   ├── Header: event name, days remaining, overall health
│   ├── Headline KPIs
│   ├── Risk and escalation strip
│   ├── Recommended actions
│   └── Workstream panels
├── Registrations and Reach
├── Outreach and Channels
├── Partners
├── Tasks (team board)
├── Content calendar
├── Operations
├── Risks (full list with evidence)
├── Action detail (task close flow)
└── Plan (timeline, milestones, rules applied)
```

---

## 5. Key screens

### 5.1 Setup wizard

- One question group per step, progress shown as six labelled steps.
- Each field has a one-line purpose note explaining how it changes the plan (for example, "Hybrid events add a streaming workstream and a second content track").
- Live preview panel on the right updates as the user answers: estimated tasks, workstreams, and a warning if the timeline is compressed.
- The final step shows the generated plan summary and the rules that were applied, with a single "Create command centre" action.
- Validation is inline and specific. Example: "Event is 9 days away. Plan will be compressed. Confirm venue and catering this week."

### 5.2 Command dashboard

Layout is a three-zone grid on desktop, stacked on mobile.

- **Header band:** event name, type, dates, a countdown ("45 days to go"), and an overall health label (On track, At risk, Off track) derived from risk severity.
- **Headline KPIs (top row):** Registrations (actual vs target with a progress bar and pace indicator), Reach (visits and unique reach), Partners (activated of target), Open tasks (overdue count highlighted), Content (published vs planned).
- **Left column, Recommended actions:** ranked cards. Each card shows title, owner role, expected impact, effort, urgency, and a one-line rationale such as "Top two campus channels drive 70% of visits but convert 2.1x better than the rest. Referral push targets them directly."
- **Right column, Risk strip:** severity-ordered list of active risks with evidence chips (for example, "Pace 1.6/day vs 4.0 required").
- **Lower band, workstream panels:** one card per workstream showing plan vs actual, next milestone, and overdue count. Clicking opens the workstream view.
- **Freshness footer:** shows "Evaluated 14:06" from the `evaluated_at` value the API returns, so users know when the risk view was computed. The dashboard refreshes when the live stream reports a change, and the footer shows a subtle "Updated just now" note.

### 5.3 Registrations and reach

- Funnel: visits → form starts → registrations → confirmed attendees, with conversion between each step.
- Gap panel: target, actual, required pace, current pace, projected finish at current pace. The projected finish is shown as a line on a small chart against the target line.
- Breakdown by channel, device and week.
- The gap panel is the visual anchor for the demo: the projected finish visibly falls short of target.

### 5.4 Outreach and channels

- Table of channels with visits, registrations, conversion, and spend (if provided), sorted by conversion.
- Badge on channels that drive a disproportionate share of visits or conversions.
- Campaign list with planned vs sent and next send date.

### 5.5 Partners

- Pipeline view with four columns: Prospect, Contacted, Confirmed, Activated.
- Each card shows tier, confirmation due date, and days late where relevant.
- Late confirmations use the warning colour and show the suggested fallback partner from the recommendation engine.

### 5.6 Team tasks

- Board with columns: To do, In progress, Blocked, Done.
- Filter by workstream and owner. Default filter is the current user's role.
- Overdue tasks are marked with a clock icon and the number of days overdue.
- Tasks created from recommendations show a small "From recommendation" tag with a link to the originating risk.

### 5.7 Content calendar

- Week-by-week grid across channels.
- Planned vs published markers. Gaps are highlighted with the number of posts behind.
- Clicking a slot opens the content item with status and owner.

### 5.8 Operations

- Checklist grouped by category: venue, catering, AV, travel, swag.
- Each item shows status, lead time required, and lock date (the date by which it must be confirmed).
- Items inside their lock window with no confirmation are marked as escalation candidates.

### 5.9 Risks

- Full list with severity, owner role, detected date, and evidence.
- Each risk links to the actions created for it and to the metric it is based on.
- Resolved risks stay visible in a collapsed section with the resolution note, so leadership can see what was closed.

### 5.10 Action detail and close flow

This is the centrepiece of the demo.

1. **Context:** the recommendation title, rationale, and the numbers behind it.
2. **Plan:** a short checklist generated for the action (for example, "Draft referral message", "Pick three campus leads", "Set up tracking link", "Launch on Thursday").
3. **Accept:** the owner accepts the task. It moves to In progress with the owner name and due date.
4. **Work:** the owner ticks checklist items. Progress is visible on the dashboard.
5. **Close:** the close form asks for an outcome note and an updated metric (for example, new registrations from the push). The form does not allow closing without the metric, so the outcome feeds the gap calculation. The server saves the closure, the metric and the re-evaluated risks in one step. If someone else closed the task first, the form shows "This task was already closed by Priya at 15:02" and offers to view the result.
6. **Feedback:** after closing, the screen shows the before and after numbers from the server response, the new severity of the linked risk, and any follow-up recommendation the engine has created. Other people viewing the event see the same change without reloading.

---

## 6. Recommendation display rules

- Show at most five recommendations on the dashboard. The full list is on the Risks screen.
- Rank order: urgency first (based on days to the relevant lock or event date), then expected impact per unit effort.
- Each card shows:
  - Title (verb-first, for example "Activate campus referrals")
  - Owner role
  - Impact: High, Medium, Low
  - Effort: Low, Medium, High
  - Urgency: with the date it becomes critical
  - One-line rationale with the number that triggered it
- A recommendation can be accepted (becomes a task), dismissed (requires a reason, which is logged), or snoozed (returns after a chosen number of days).
- Dismissed recommendations do not reappear unless the underlying numbers change materially.

---

## 7. Severity and status language

| Severity | Colour token | Meaning | Example |
|---|---|---|---|
| Critical | red-600 | Will miss a hard date or target unless acted on today | Vendor lock date in 2 days, unconfirmed |
| High | orange-600 | Projected to miss target or deadline | Projected finish 210 of 300 |
| Medium | amber-500 | Drifting from plan, recoverable | Content 2 posts behind |
| Low | slate-500 | Watch item | Partner response slightly slow |
| On track | green-600 | Within plan | Pace meets required rate |

Colour is never the only signal. Every severity has a text label and an icon.

Status tokens for tasks: To do (slate), In progress (blue), Blocked (red outline), Done (green).

---

## 8. Visual language

- **Type:** a neutral sans-serif for UI (Inter or system UI), with tabular numerals for all metrics so columns align.
- **Layout density:** medium. Dashboards are dense enough to scan, with generous spacing around KPIs.
- **Colour:** neutral base (white and slate), one brand accent for primary actions, and the severity palette above. Dark mode is optional for v1; tokens are defined so it can be added.
- **Iconography:** one icon set, outline style, used consistently for status, role and category.
- **Charts:** minimal. One gridline colour, one target line style (dashed), one actual line style (solid). Projections are shown as a dotted extension.
- **Motion:** only to confirm state changes (a card moving columns, a KPI updating). No decorative animation.

---

## 9. Components (shared)

- `KpiCard`: label, value, target, progress bar, pace indicator
- `RecommendationCard`: title, owner, impact, effort, urgency, rationale, actions
- `RiskRow`: severity badge, title, evidence chips, owner
- `WorkstreamCard`: plan vs actual, next milestone, overdue count
- `FunnelChart`: stepped conversion view
- `GapPanel`: target, actual, pace, projection line
- `TaskCard`: title, owner, due date, status, source tag
- `Checklist`: items with completion state
- `CloseTaskForm`: outcome note, metric input, submit
- `RoleSwitcher`: top-bar control
- `EmptyState`: message, reason, one next action
- `ConnectionBanner`: shows offline or retrying state and the time of the last good data
- `LiveNote`: small line naming who changed a card and when
- `EvaluatedAt`: freshness footer showing when risks were last evaluated
- `Badge`, `Tag`, `Tooltip`, `Modal`, `Toast`

---

## 10. Interaction and state rules

- Accepting a recommendation or closing a task is saved on the server before the screen confirms it. The button shows a short pending state, then a toast confirms the change. Undo is offered for five seconds and sends a compensating request (reopen the task or remove the accepted action); it does not roll back silently.
- Checklist ticks are optimistic: they appear immediately and are reverted with a message if the server rejects them.
- Loading: skeleton placeholders match the final layout so the dashboard does not jump when data arrives.
- Server unavailable: a top banner reads "Can't reach the command centre. Showing data from 14:06. Retrying…". Read-only data stays visible; write actions are disabled until the connection returns.
- Conflicts: when the server returns a conflict (for example, a task already closed), the screen shows what changed and refreshes the affected card instead of overwriting it.
- Live updates: when the live stream reports a change made by someone else, the affected card updates in place and a small note names the person and the time. Focus and any open form are not disturbed.
- Destructive actions (dismiss recommendation, delete event) require a reason or confirmation.
- Empty states always say why the section is empty and offer one next action.
- Error states in the wizard keep user input; nothing is lost on validation failure.
- Keyboard: all wizard steps, board cards, and close forms are reachable by keyboard; focus returns to the trigger when modals close.

---

## 11. Demo narrative (for the presenter)

1. **Setup (60 seconds):** Create the Build Sprint event in the wizard. Show the live preview of the plan and the rules applied.
2. **Plan (30 seconds):** Show the generated workstreams, milestones and the content calendar.
3. **Dashboard (45 seconds):** Show the 45-day window, the KPIs, and the amber/red signals. Point out that registrations are 47% of target with 45 days left.
4. **Gap (45 seconds):** Open the Registrations gap panel. Show required pace (4.0/day), actual pace (1.6/day), and projected finish (about 210).
5. **Recommendations (45 seconds):** Walk through the top two recommendations and their rationale lines.
6. **Close the loop (90 seconds):** Switch to the Marketing role, accept "Activate campus referrals", tick the checklist, enter 38 new registrations, and close it. Show the gap narrowing, the risk severity dropping, and the new follow-up recommendation appearing. Keep a second browser window open on the leadership dashboard so the audience sees the update arrive live.

---

## 12. Accessibility

- WCAG 2.1 AA contrast for all text and severity badges.
- Severity conveyed by label and icon as well as colour.
- Semantic headings per screen; landmark regions for header, main, and risk strip.
- Charts have text summaries and data tables available on focus or toggle.
- Minimum touch target 44px on mobile.
- Respect reduced-motion preference.

---

## 13. Responsive behaviour

- **Desktop (1280px+):** three-zone dashboard as described.
- **Tablet (768–1279px):** two columns; risk strip moves below recommendations.
- **Mobile (below 768px):** single column, KPIs as horizontal scroll, recommendations as the first section, role switcher in a menu.

---

## 14. Content and copy guidelines

- Use plain, decision-oriented language. Prefer "Pace is 1.6/day, 4.0 needed" over "Registration velocity is suboptimal".
- Recommendation titles start with a verb.
- Every number has its unit and its comparison (vs target, vs last week, vs plan).
- Avoid the word "AI" in the interface. The product explains its logic through rules and evidence, not through branding.
