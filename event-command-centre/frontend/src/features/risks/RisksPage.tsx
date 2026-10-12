import { useParams } from "react-router-dom";
import { useState } from "react";
import { useRisks, useRecommendations, useAcceptRecommendation, useDismissRecommendation, useSnoozeRecommendation } from "../../api/hooks";
import { SeverityBadge } from "../../components/Badge";
import { SkeletonCard } from "../../components/Skeleton";
import { Toast } from "../../components/Toast";

export function RisksPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [includeResolved, setIncludeResolved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: risksData, isLoading: risksLoading } = useRisks(eventId ?? null, includeResolved);
  const { data: recsData, isLoading: recsLoading } = useRecommendations(eventId ?? null);
  const accept = useAcceptRecommendation(eventId!);
  const dismiss = useDismissRecommendation(eventId!);
  const snooze = useSnoozeRecommendation(eventId!);

  if (risksLoading || recsLoading) return <div className="page"><SkeletonCard rows={6} /></div>;

  const risks = risksData?.risks ?? [];
  const recommendations = recsData?.recommendations ?? [];
  const evaluatedAt = risksData?.evaluated_at
    ? new Date(risksData.evaluated_at).toLocaleString()
    : null;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="section-title" style={{ margin: 0 }}>Risks &amp; Recommendations</h1>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(e) => setIncludeResolved(e.target.checked)}
            style={{ width: "auto" }}
          />
          Show resolved
        </label>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Active risks */}
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Active risks ({risks.filter(r => !r.resolved_at).length})</h2>
          {risks.length === 0 ? (
            <div className="card" style={{ color: "var(--green-600)", fontWeight: 500 }}>✓ No active risks</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {risks.map((risk) => (
                <div
                  key={risk.id}
                  className="card"
                  style={{
                    padding: 14, opacity: risk.resolved_at ? 0.6 : 1,
                    borderLeft: `4px solid var(--${risk.severity === "critical" ? "red" : risk.severity === "high" ? "orange" : risk.severity === "medium" ? "amber" : "slate"}-${risk.severity === "medium" ? 500 : 600})`,
                  }}
                  aria-label={`Risk: ${risk.type}`}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <SeverityBadge severity={risk.severity} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{risk.type.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 12, color: "var(--slate-400)" }}>
                        {risk.owner_role} · Detected {new Date(risk.detected_at).toLocaleDateString()}
                      </div>
                    </div>
                    {risk.resolved_at && (
                      <span style={{ fontSize: 11, color: "var(--green-600)", fontWeight: 600 }}>Resolved</span>
                    )}
                  </div>
                  {/* Evidence */}
                  <div style={{ background: "var(--slate-50)", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontFamily: "var(--mono)" }}>
                    {Object.entries(risk.evidence).map(([k, v]) => (
                      <div key={k} style={{ color: "var(--slate-600)" }}>
                        <span style={{ color: "var(--slate-400)" }}>{k}: </span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  {risk.resolution_note && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--green-600)" }}>
                      ✓ {risk.resolution_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recommendations */}
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recommendations ({recommendations.length})</h2>
          {recommendations.length === 0 ? (
            <div className="card" style={{ color: "var(--slate-500)" }}>No active recommendations.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommendations.map((rec) => (
                <div key={rec.id} className="card" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{rec.title}</div>
                  <div style={{ fontSize: 12, color: "var(--slate-500)", marginBottom: 8 }}>{rec.rationale}</div>
                  <div style={{ fontSize: 12, color: "var(--slate-400)", marginBottom: 10 }}>
                    {rec.owner_role} · {rec.expected_impact} impact · {rec.effort} effort
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-primary"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                      disabled={accept.isPending}
                      onClick={() => accept.mutate({ actionId: rec.id }, { onSuccess: () => setToast("Action accepted!") })}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                      onClick={() => snooze.mutate({ actionId: rec.id, days: 3 }, {
                        onSuccess: () => setToast("Recommendation snoozed for 3 days"),
                      })}
                    >
                      Snooze 3 days
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                      onClick={() => {
                        const reason = window.prompt("Reason for dismissing this recommendation:");
                        if (reason) {
                          dismiss.mutate({ actionId: rec.id, reason }, {
                            onSuccess: () => setToast("Recommendation dismissed"),
                          });
                        }
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {evaluatedAt && (
        <footer style={{ marginTop: 20, fontSize: 12, color: "var(--slate-400)", textAlign: "right" }}>
          Evaluated {evaluatedAt}
        </footer>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
