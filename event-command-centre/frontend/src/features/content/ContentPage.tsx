import { useParams } from "react-router-dom";
import { useContent } from "../../api/hooks";
import { SkeletonCard } from "../../components/Skeleton";

export function ContentPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: items, isLoading } = useContent(eventId ?? null);

  if (isLoading) return <div className="page"><SkeletonCard rows={5} /></div>;
  if (!items?.length) return <div className="page"><p style={{ color: "var(--slate-500)" }}>No content items in the plan yet.</p></div>;

  const behind = items.filter((i) => i.is_behind_plan).length;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="section-title" style={{ margin: 0 }}>Content Calendar</h1>
        {behind > 0 && (
          <span style={{ color: "var(--orange-600)", fontWeight: 600, fontSize: 14 }}>
            ⚠ {behind} {behind === 1 ? "post" : "posts"} behind plan
          </span>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "var(--slate-50)" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 500, color: "var(--slate-500)" }}>Date</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 500, color: "var(--slate-500)" }}>Type</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 500, color: "var(--slate-500)" }}>Title</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 500, color: "var(--slate-500)" }}>Owner</th>
              <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 500, color: "var(--slate-500)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                <td style={{ padding: "10px 16px", color: "var(--slate-600)" }}>
                  {new Date(item.planned_date).toLocaleDateString()}
                </td>
                <td style={{ padding: "10px 12px" }}>{item.type}</td>
                <td style={{ padding: "10px 12px", color: "var(--slate-700)" }}>{item.title ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "var(--slate-500)" }}>{item.owner_role}</td>
                <td style={{ padding: "10px 16px", textAlign: "center" }}>
                  {item.published_at ? (
                    <span style={{ color: "var(--green-600)", fontWeight: 600, fontSize: 12 }}>✓ Published</span>
                  ) : item.is_behind_plan ? (
                    <span style={{ color: "var(--orange-600)", fontWeight: 600, fontSize: 12 }}>⚠ Behind</span>
                  ) : (
                    <span style={{ color: "var(--slate-400)", fontSize: 12 }}>Planned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
