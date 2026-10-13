import { useParams } from "react-router-dom";
import { usePlan } from "../../api/hooks";
import { SkeletonCard } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";

export function PlanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: plan, isLoading } = usePlan(eventId ?? null);

  if (isLoading) return <div className="page"><SkeletonCard rows={6} /></div>;
  if (!plan) return (
    <div className="page">
      <EmptyState
        title="No plan generated yet"
        description="Create an event through the setup wizard to generate a plan with workstreams and milestones."
      />
    </div>
  );

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="section-title" style={{ margin: 0 }}>Operating Plan</h1>
        <div style={{ fontSize: 13, color: "var(--slate-400)" }}>
          Engine v{plan.engine_version} · Generated {new Date(plan.generated_at).toLocaleDateString()}
        </div>
      </div>

      {/* Rules applied */}
      {plan.rules_applied.length > 0 && (
        <div style={{ marginBottom: 20, background: "var(--blue-50)", borderRadius: 8, padding: 12 }}>
          <span style={{ fontSize: 12, color: "var(--blue-600)", fontWeight: 600 }}>Rules applied: </span>
          <span style={{ fontSize: 12, color: "var(--slate-600)" }}>{plan.rules_applied.join(" · ")}</span>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Workstreams */}
        <section aria-label="Workstreams">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            Workstreams ({plan.workstreams.length})
          </h2>
          <div className="card" style={{ padding: 0 }}>
            {plan.workstreams.map((ws, i) => (
              <div
                key={ws.id}
                style={{
                  display: "flex", justifyContent: "space-between", padding: "11px 16px",
                  borderBottom: i < plan.workstreams.length - 1 ? "1px solid var(--slate-100)" : "none",
                }}
              >
                <span style={{ fontWeight: 500, fontSize: 13 }}>{ws.name}</span>
                <span style={{ fontSize: 12, color: "var(--slate-400)" }}>{ws.owner_role}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--slate-500)" }}>
            {plan.task_count} tasks total
          </div>
        </section>

        {/* Milestones */}
        <section aria-label="Milestones">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            Milestones ({plan.milestones.length})
          </h2>
          <div className="card" style={{ padding: 0 }}>
            {plan.milestones
              .slice()
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .map((ms, i, arr) => {
                const isPast = new Date(ms.due_date) < new Date();
                return (
                  <div
                    key={ms.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "11px 16px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--slate-100)" : "none",
                      opacity: isPast ? 0.55 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{ms.status === "done" ? "✅" : isPast ? "⏰" : "🔲"}</span>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{ms.title}</span>
                    </div>
                    <span style={{ fontSize: 12, color: isPast ? "var(--orange-600)" : "var(--slate-400)" }}>
                      {new Date(ms.due_date).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
}
