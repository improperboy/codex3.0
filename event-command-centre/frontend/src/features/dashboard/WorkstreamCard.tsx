import { Link } from "react-router-dom";
import type { WorkstreamSummary } from "../../api/types";

interface WorkstreamCardProps {
  ws: WorkstreamSummary;
  eventId: string;
}

export function WorkstreamCard({ ws, eventId }: WorkstreamCardProps) {
  const pct = ws.total_tasks > 0 ? Math.round((ws.done_tasks / ws.total_tasks) * 100) : 0;

  return (
    <Link
      to={`/events/${eventId}/tasks?workstream_id=${ws.workstream_id}`}
      style={{ textDecoration: "none" }}
      aria-label={`${ws.name} workstream — ${pct}% complete`}
    >
      <div
        className="card"
        style={{ cursor: "pointer", transition: "box-shadow .15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow)")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--slate-900)" }}>{ws.name}</span>
          <span style={{ fontSize: 12, color: "var(--slate-500)" }}>{ws.owner_role}</span>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${ws.name}: ${pct}% complete`}
          style={{ height: 6, borderRadius: 3, background: "var(--slate-200)", marginBottom: 8, overflow: "hidden" }}
        >
          <div
            style={{
              width: `${pct}%`, height: "100%", borderRadius: 3,
              background: pct === 100 ? "var(--green-600)" : "var(--blue-500)",
              transition: "width .4s ease",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--slate-500)" }}>
          <span>{ws.done_tasks}/{ws.total_tasks} tasks</span>
          {ws.overdue_tasks > 0 && (
            <span style={{ color: "var(--orange-600)", fontWeight: 600 }}>⏰ {ws.overdue_tasks} overdue</span>
          )}
        </div>

        {ws.next_milestone_title && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--blue-600)" }}>
            Next: {ws.next_milestone_title}
            {ws.next_milestone_date && (
              <span style={{ color: "var(--slate-400)" }}> · {new Date(ws.next_milestone_date).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
