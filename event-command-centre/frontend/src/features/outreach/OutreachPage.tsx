import { useParams } from "react-router-dom";
import { useOutreach } from "../../api/hooks";
import { SkeletonCard } from "../../components/Skeleton";

export function OutreachPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: campaigns, isLoading } = useOutreach(eventId ?? null);

  if (isLoading) return <div className="page"><SkeletonCard rows={6} /></div>;
  if (!campaigns?.length) return <div className="page"><p style={{ color: "var(--slate-500)" }}>No outreach data yet.</p></div>;

  return (
    <div className="page">
      <h1 className="section-title">Outreach &amp; Channels</h1>
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--slate-200)" }}>
              <th style={{ textAlign: "left", padding: "8px 0", color: "var(--slate-600)" }}>Channel</th>
              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--slate-600)" }}>Visits</th>
              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--slate-600)" }}>Registrations</th>
              <th style={{ textAlign: "right", padding: "8px 0", color: "var(--slate-600)" }}>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.channel_id} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                <td style={{ padding: "10px 0" }}>
                  {c.channel_name}
                  {c.is_top_converting && (
                    <span className="badge" style={{ marginLeft: 8, background: "var(--blue-50)", color: "var(--blue-600)" }}>
                      top converting
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right", padding: "10px 12px", fontVariantNumeric: "tabular-nums" }}>
                  {c.total_visits.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", padding: "10px 12px", fontVariantNumeric: "tabular-nums" }}>
                  {c.total_registrations.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", padding: "10px 0", fontWeight: 700,
                  color: c.conversion >= 0.09 ? "var(--green-600)" : "var(--orange-600)" }}>
                  {(c.conversion * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
