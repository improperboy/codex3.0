import { useParams } from "react-router-dom";
import { useLogistics } from "../../api/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLogistics } from "../../api/client";
import { keys } from "../../api/hooks";
import { SkeletonCard } from "../../components/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", in_progress: "In progress", confirmed: "Confirmed", cancelled: "Cancelled",
};
const CATEGORY_ICONS: Record<string, string> = {
  venue: "🏛", catering: "🍽", av: "🎙", travel: "✈️", swag: "👕",
};

export function OperationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: items, isLoading } = useLogistics(eventId ?? null);
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateLogistics(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.logistics(eventId!) }),
  });

  if (isLoading) return <div className="page"><SkeletonCard rows={5} /></div>;
  if (!items?.length) return <div className="page"><p style={{ color: "var(--slate-500)" }}>No logistics items.</p></div>;

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="page">
      <h1 className="section-title">Operations &amp; Logistics</h1>
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, textTransform: "capitalize", color: "var(--slate-700)" }}>
            {CATEGORY_ICONS[cat] ?? "📦"} {cat}
          </h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {items.filter((i) => i.category === cat).map((item, idx, arr) => (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderBottom: idx < arr.length - 1 ? "1px solid var(--slate-100)" : "none",
                  background: item.needs_escalation && item.status !== "confirmed" ? "var(--amber-50)" : "#fff",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{item.title}</div>
                  {item.lock_date && (
                    <div style={{ fontSize: 12, color: "var(--slate-400)" }}>
                      Lock date: {new Date(item.lock_date).toLocaleDateString()} · {item.lead_time_days} days lead time
                    </div>
                  )}
                </div>
                {item.needs_escalation && item.status !== "confirmed" && (
                  <span style={{ fontSize: 12, color: "var(--orange-600)", fontWeight: 600 }}>⚠ Needs action</span>
                )}
                <select
                  value={item.status}
                  onChange={(e) => update.mutate({ id: item.id, status: e.target.value })}
                  style={{ width: "auto", fontSize: 13, padding: "4px 8px" }}
                  aria-label={`Status for ${item.title}`}
                >
                  {Object.keys(STATUS_LABELS).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
