import type { KpiOut } from "../api/types";

interface KpiCardProps {
  label: string;
  kpi: KpiOut;
  unit?: string;
  showPace?: boolean;
}

export function KpiCard({ label, kpi, unit = "", showPace }: KpiCardProps) {
  const pct = kpi.target && kpi.value != null ? Math.min(100, (kpi.value / kpi.target) * 100) : null;

  return (
    <div className="card" style={{ minWidth: 150 }}>
      <div style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--slate-900)" }}>
        {kpi.value != null ? kpi.value.toLocaleString() : "—"}{unit}
      </div>
      {kpi.target != null && (
        <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2 }}>
          of {kpi.target.toLocaleString()}{unit} target
        </div>
      )}
      {pct != null && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${Math.round(pct)}% of target`}
          style={{
            marginTop: 8, height: 6, borderRadius: 3,
            background: "var(--slate-200)", overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`, height: "100%", borderRadius: 3,
              background: pct >= 80 ? "var(--green-600)" : pct >= 50 ? "var(--amber-500)" : "var(--orange-600)",
              transition: "width .4s ease",
            }}
          />
        </div>
      )}
      {showPace && kpi.pace != null && (
        <div style={{ fontSize: 12, marginTop: 6, color: "var(--slate-600)" }}>
          Pace: <strong>{kpi.pace.toFixed(1)}/day</strong>
          {kpi.required_pace != null && (
            <span style={{ color: kpi.pace >= kpi.required_pace ? "var(--green-600)" : "var(--orange-600)" }}>
              {" "}(need {kpi.required_pace.toFixed(1)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
