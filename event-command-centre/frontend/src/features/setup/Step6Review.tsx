import type { WizardData } from "./SetupPage";
import type { PlanPreviewOut } from "../../api/types";

interface Step6Props {
  data: WizardData;
  preview: PlanPreviewOut | null;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: Error | null;
}

export function Step6Review({ data, preview, onSubmit, isSubmitting, error }: Step6Props) {
  const rows: Array<[string, string]> = [
    ["Name", data.name ?? "—"],
    ["Type", data.type ?? "—"],
    ["Format", data.format ?? "—"],
    ["Start date", data.start_date ?? "—"],
    ["End date", data.end_date ?? "—"],
    ["Audience", data.audience ?? "—"],
    ["Seats", String(data.scale_seats ?? "—")],
    ["Target registrations", String(data.target_registrations ?? "—")],
    ["City", data.city ?? "—"],
    ["Objectives", data.objectives?.join(", ") ?? "—"],
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Review your event</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 14 }}>
        <tbody>
          {rows.map(([key, val]) => (
            <tr key={key} style={{ borderBottom: "1px solid var(--slate-100)" }}>
              <td style={{ padding: "8px 0", color: "var(--slate-500)", width: 180 }}>{key}</td>
              <td style={{ padding: "8px 0", fontWeight: 500 }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {preview && (
        <div style={{ background: "var(--blue-50)", borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "var(--blue-600)" }}>
            Plan summary
          </div>
          <div style={{ fontSize: 13, color: "var(--slate-600)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <span><strong>{preview.task_count}</strong> tasks</span>
            <span><strong>{preview.workstream_names.length}</strong> workstreams</span>
            <span><strong>{preview.milestone_count}</strong> milestones</span>
            <span><strong>{preview.content_items}</strong> content items</span>
          </div>
          {preview.rules_applied.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 8 }}>
              Rules applied: {preview.rules_applied.join(" · ")}
            </div>
          )}
          {preview.warnings.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--amber-500)" }}>
              {preview.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: "var(--red-50)", color: "var(--red-600)", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {(error as Error & { detail?: { error?: { message?: string } } }).detail?.error?.message ?? error.message}
        </div>
      )}

      <button
        className="btn-primary"
        style={{ width: "100%", padding: "14px 0", fontSize: 15 }}
        disabled={isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? "Creating command centre…" : "Create command centre →"}
      </button>
    </div>
  );
}
