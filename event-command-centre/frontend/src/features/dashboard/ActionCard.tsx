import { useState } from "react";
import { useAcceptRecommendation, useDismissRecommendation } from "../../api/hooks";
import { Toast } from "../../components/Toast";
import type { ActionSummary } from "../../api/types";

interface ActionCardProps {
  action: ActionSummary;
  eventId: string;
}

export function ActionCard({ action, eventId }: ActionCardProps) {
  const accept = useAcceptRecommendation(eventId);
  const dismiss = useDismissRecommendation(eventId);
  const [showDismiss, setShowDismiss] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const impactColor: Record<string, string> = {
    high: "var(--green-600)", medium: "var(--amber-500)", low: "var(--slate-400)",
  };

  return (
    <article
      className="card"
      style={{ padding: "16px", borderLeft: `4px solid ${impactColor[action.expected_impact] ?? "var(--slate-300)"}` }}
      aria-label={`Action: ${action.title}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)", marginBottom: 4 }}>
            {action.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--slate-500)", marginBottom: 8 }}>{action.rationale}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
            <span style={{ color: "var(--slate-600)" }}>👤 {action.owner_role}</span>
            <span style={{ color: impactColor[action.expected_impact] }}>↑ {action.expected_impact} impact</span>
            <span style={{ color: "var(--slate-500)" }}>⚡ {action.effort} effort</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          className="btn-primary"
          style={{ fontSize: 13, padding: "6px 14px" }}
          disabled={accept.isPending}
          onClick={() => {
            accept.mutate({ actionId: action.id }, {
              onSuccess: () => setToast("Action accepted — task created"),
            });
          }}
        >
          {accept.isPending ? "Accepting…" : "Accept"}
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 13, padding: "6px 14px" }}
          onClick={() => setShowDismiss(!showDismiss)}
        >
          Dismiss
        </button>
      </div>

      {showDismiss && (
        <div style={{ marginTop: 10 }}>
          <input
            placeholder="Reason for dismissing…"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            aria-label="Dismiss reason"
            maxLength={500}
            style={{ marginBottom: 8 }}
          />
          <button
            className="btn-danger"
            style={{ fontSize: 13, padding: "6px 14px" }}
            disabled={!dismissReason.trim() || dismiss.isPending}
            onClick={() => {
              dismiss.mutate({ actionId: action.id, reason: dismissReason }, {
                onSuccess: () => { setShowDismiss(false); setDismissReason(""); },
              });
            }}
          >
            Confirm dismiss
          </button>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </article>
  );
}
