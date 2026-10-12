import { useParams } from "react-router-dom";
import { useRegistrations } from "../../api/hooks";
import { SkeletonCard } from "../../components/Skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function RegistrationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data, isLoading } = useRegistrations(eventId ?? null);

  if (isLoading) return <div className="page"><SkeletonCard rows={6} /></div>;
  if (!data) return <div className="page"><p>No data available.</p></div>;

  const { funnel, gap, channels } = data;
  const funnelSteps = [
    { name: "Visits", value: Math.round(funnel.visits) },
    { name: "Form starts", value: Math.round(funnel.form_starts) },
    { name: "Registrations", value: Math.round(funnel.registrations) },
    { name: "Confirmed", value: Math.round(funnel.confirmed_attendees) },
  ];

  const projectionShort = gap.projected_finish < gap.target * 0.9;

  return (
    <div className="page">
      <h1 className="section-title">Registrations &amp; Reach</h1>

      {/* Gap panel */}
      <div className="card" style={{ marginBottom: 20, borderLeft: `4px solid ${projectionShort ? "var(--orange-600)" : "var(--green-600)"}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Registration gap</h2>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[
            { label: "Target", value: gap.target.toLocaleString() },
            { label: "Actual", value: Math.round(gap.actual).toLocaleString() },
            { label: "Required pace", value: `${gap.required_pace.toFixed(1)}/day` },
            { label: "Current pace", value: `${gap.current_pace.toFixed(1)}/day` },
            { label: "Projected finish", value: Math.round(gap.projected_finish).toLocaleString(), highlight: projectionShort },
            { label: "Days remaining", value: gap.days_remaining.toString() },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ minWidth: 120 }}>
              <div style={{ fontSize: 12, color: "var(--slate-500)", marginBottom: 2 }}>{label}</div>
              <div style={{
                fontSize: 22, fontWeight: 700,
                color: highlight ? "var(--orange-600)" : "var(--slate-900)",
                fontVariantNumeric: "tabular-nums",
              }}>{value}</div>
            </div>
          ))}
        </div>
        {projectionShort && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--orange-600)", fontWeight: 500 }}>
            ⚠ At current pace, projected finish ({Math.round(gap.projected_finish)}) is below target ({gap.target}).
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--slate-500)" }}>
          Visit-to-registration conversion: <strong>{(funnel.visit_to_registration * 100).toFixed(1)}%</strong>
          {funnel.visit_to_registration < 0.09 && (
            <span style={{ color: "var(--orange-600)", marginLeft: 8 }}>below 9% threshold</span>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20, alignItems: "start" }}>
        {/* Funnel chart */}
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Registration funnel</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelSteps} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Bar dataKey="value" fill="var(--blue-500)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="sr-only">
            Funnel: {funnelSteps.map(s => `${s.name}: ${s.value}`).join(", ")}
          </p>
        </div>

        {/* Channel breakdown */}
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Channel breakdown</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--slate-200)" }}>
                <th style={{ textAlign: "left", padding: "6px 0", color: "var(--slate-500)", fontWeight: 500 }}>Channel</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--slate-500)", fontWeight: 500 }}>Visits</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--slate-500)", fontWeight: 500 }}>Regs</th>
                <th style={{ textAlign: "right", padding: "6px 0", color: "var(--slate-500)", fontWeight: 500 }}>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.channel_id} style={{ borderBottom: "1px solid var(--slate-100)" }}>
                  <td style={{ padding: "8px 0" }}>
                    {ch.name}
                    {ch.is_top_converting && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "var(--blue-600)", background: "var(--blue-50)", padding: "1px 6px", borderRadius: 10 }}>
                        top
                      </span>
                    )}
                    {ch.is_campus && (
                      <span style={{ marginLeft: 4, fontSize: 11, color: "var(--green-600)", background: "var(--green-50)", padding: "1px 6px", borderRadius: 10 }}>
                        campus
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 8px" }}>{ch.visits.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "8px 8px" }}>{ch.registrations.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 600, color: ch.conversion >= 0.09 ? "var(--green-600)" : "var(--orange-600)" }}>
                    {(ch.conversion * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
