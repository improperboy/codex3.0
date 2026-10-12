import { useParams, Link } from "react-router-dom";
import { usePlan } from "../../api/hooks";
import { SkeletonCard } from "../../components/Skeleton";
import { StatusBadge } from "../../components/Badge";

export function PlanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: plan, isLoading, error } = usePlan(eventId ?? null);

  if (isLoading) {
    return (
      <div className="page">
        <SkeletonCard rows={6} />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="page">
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--slate-800)" }}>Plan Not Found</h2>
          <p style={{ color: "var(--slate-500)", fontSize: 14, marginTop: 4 }}>
            No active plan found for this event. Try re-generating or creating a new event.
          </p>
        </div>
      </div>
    );
  }

  const generatedDate = plan.generated_at
    ? new Date(plan.generated_at).toLocaleString()
    : "Recently";

  // Sort milestones chronologically
  const sortedMilestones = [...(plan.milestones || [])].sort((a, b) =>
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>Generated Plan &amp; Timeline</h1>
          <p style={{ color: "var(--slate-500)", fontSize: 13, marginTop: 4 }}>
            Engine {plan.engine_version} · Generated {generatedDate}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            to={`/events/${eventId}/tasks`}
            className="btn-secondary"
            style={{ fontSize: 13, padding: "7px 14px", textDecoration: "none" }}
          >
            View Task Board ({plan.task_count})
          </Link>
          <Link
            to={`/events/${eventId}/content`}
            className="btn-secondary"
            style={{ fontSize: 13, padding: "7px 14px", textDecoration: "none" }}
          >
            Content Calendar
          </Link>
        </div>
      </div>

      {/* Plan stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500, marginBottom: 4 }}>Total Tasks</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--slate-900)" }}>{plan.task_count}</div>
          <div style={{ fontSize: 12, color: "var(--slate-500)" }}>Across all workstreams</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500, marginBottom: 4 }}>Workstreams</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--slate-900)" }}>{plan.workstreams.length}</div>
          <div style={{ fontSize: 12, color: "var(--slate-500)" }}>Operational tracks</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500, marginBottom: 4 }}>Key Milestones</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--slate-900)" }}>{plan.milestones.length}</div>
          <div style={{ fontSize: 12, color: "var(--slate-500)" }}>Critical checkpoints</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500, marginBottom: 4 }}>Rules Applied</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--blue-600)" }}>{plan.rules_applied.length}</div>
          <div style={{ fontSize: 12, color: "var(--slate-500)" }}>Decision engine rules</div>
        </div>
      </div>

      {/* Rules Applied */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--slate-900)", marginBottom: 12 }}>
          Decision Rules Applied
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {plan.rules_applied.map((rule, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "var(--blue-50)",
                color: "var(--blue-700)",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid var(--blue-200)",
              }}
            >
              ⚙️ {rule.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Milestones timeline */}
        <section aria-label="Milestones timeline">
          <h2 className="section-title">Timeline &amp; Milestones</h2>
          <div className="card" style={{ padding: "16px 20px" }}>
            {sortedMilestones.length === 0 ? (
              <p style={{ color: "var(--slate-500)", fontSize: 13 }}>No milestones scheduled.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
                {sortedMilestones.map((ms, index) => {
                  const isDone = ms.status === "done" || ms.status === "completed";
                  const dueDate = new Date(ms.due_date);
                  const isPast = dueDate < new Date() && !isDone;

                  return (
                    <div
                      key={ms.id || index}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        paddingBottom: index < sortedMilestones.length - 1 ? 14 : 0,
                        borderBottom: index < sortedMilestones.length - 1 ? "1px solid var(--slate-100)" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: isDone ? "var(--green-600)" : isPast ? "var(--orange-600)" : "var(--blue-500)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {isDone ? "✓" : index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--slate-800)" }}>
                            {ms.title}
                          </span>
                          <StatusBadge status={ms.status} />
                        </div>
                        <div style={{ fontSize: 12, color: isPast ? "var(--orange-600)" : "var(--slate-400)", marginTop: 4 }}>
                          Due: {dueDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          {isPast && " · Past due"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Workstreams */}
        <section aria-label="Workstreams">
          <h2 className="section-title">Workstreams ({plan.workstreams.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan.workstreams.map((ws) => (
              <div
                key={ws.id}
                className="card"
                style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--slate-900)" }}>
                    {ws.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2 }}>
                    Lead: <span style={{ textTransform: "capitalize" }}>{ws.owner_role}</span>
                  </div>
                </div>
                <Link
                  to={`/events/${eventId}/tasks?workstream_id=${ws.id}`}
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: "5px 10px", textDecoration: "none" }}
                >
                  Tasks →
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
