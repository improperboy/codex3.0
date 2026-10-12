import { useParams } from "react-router-dom";
import { useDashboard } from "../../api/hooks";
import { useSSE } from "../../api/useSSE";
import { KpiCard } from "../../components/KpiCard";
import { SeverityBadge } from "../../components/Badge";
import { SkeletonCard } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { ActionCard } from "./ActionCard";
import { WorkstreamCard } from "./WorkstreamCard";

export function DashboardPage() {
  const { eventId } = useParams<{ eventId: string }>();
  useSSE(eventId ?? null);

  const { data: dashboard, isLoading, error } = useDashboard(eventId ?? null);

  if (isLoading) return (
    <div className="page">
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {[1,2,3,4,5].map(i => <SkeletonCard key={i} rows={2} />)}
      </div>
      <SkeletonCard rows={5} />
    </div>
  );

  if (error || !dashboard) return (
    <div className="page">
      <EmptyState
        title="No dashboard data"
        description="Create an event to see the command centre."
        action={{ label: "Set up an event", onClick: () => {} }}
      />
    </div>
  );

  const evaluatedAt = dashboard.evaluated_at
    ? new Date(dashboard.evaluated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="page">
      {/* Headline KPIs */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <KpiCard label="Registrations" kpi={dashboard.registrations} showPace />
        <KpiCard label="Reach" kpi={dashboard.reach} />
        <KpiCard label="Partners" kpi={dashboard.partners} />
        <KpiCard label="Content Published" kpi={dashboard.content_published} />
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500, marginBottom: 4 }}>Tasks</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--slate-900)" }}>{dashboard.open_tasks}</div>
          <div style={{ fontSize: 12, color: "var(--slate-500)" }}>open</div>
          {dashboard.overdue_tasks > 0 && (
            <div style={{ fontSize: 12, color: "var(--orange-600)", fontWeight: 600, marginTop: 4 }}>
              ⏰ {dashboard.overdue_tasks} overdue
            </div>
          )}
        </div>
      </div>

      {/* Main 2-column: actions + risks */}
      <div className="grid-2" style={{ marginBottom: 20, alignItems: "start" }}>
        {/* Recommendations */}
        <section aria-label="Recommended actions">
          <h2 className="section-title">Recommended actions</h2>
          {dashboard.top_recommendations.length === 0 ? (
            <div className="card" style={{ color: "var(--slate-500)", fontSize: 14 }}>
              No recommendations — everything is on track.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dashboard.top_recommendations.map((action) => (
                <ActionCard key={action.id} action={action} eventId={eventId!} />
              ))}
            </div>
          )}
        </section>

        {/* Risk strip */}
        <section aria-label="Active risks">
          <h2 className="section-title">Active risks</h2>
          {dashboard.top_risks.length === 0 ? (
            <div className="card" style={{ color: "var(--green-600)", fontSize: 14, fontWeight: 500 }}>
              ✓ No active risks detected
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {dashboard.top_risks.map((risk, i) => (
                <div
                  key={risk.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < dashboard.top_risks.length - 1 ? "1px solid var(--slate-100)" : "none",
                  }}
                >
                  <SeverityBadge severity={risk.severity} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--slate-800)" }}>
                      {risk.type.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--slate-500)" }}>{risk.evidence_summary}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--slate-400)" }}>{risk.owner_role}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Workstream panels */}
      <section aria-label="Workstream overview">
        <h2 className="section-title">Workstreams</h2>
        <div className="grid-3">
          {dashboard.workstreams.map((ws) => (
            <WorkstreamCard key={ws.workstream_id} ws={ws} eventId={eventId!} />
          ))}
        </div>
      </section>

      {/* Freshness footer */}
      {evaluatedAt && (
        <footer style={{ marginTop: 24, fontSize: 12, color: "var(--slate-400)", textAlign: "right" }}>
          Evaluated {evaluatedAt}
        </footer>
      )}
    </div>
  );
}
