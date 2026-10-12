import type { WizardData } from "./SetupPage";

interface StepProps { data: WizardData; update: (p: Partial<WizardData>) => void; }

const FORMATS = [
  { value: "in_person", label: "In person", desc: "On-site venue" },
  { value: "hybrid", label: "Hybrid", desc: "Adds a streaming workstream" },
  { value: "virtual", label: "Virtual", desc: "Fully online" },
];
const TYPES = [
  { value: "hackathon", label: "Hackathon" },
  { value: "workshop", label: "Workshop" },
  { value: "bootcamp", label: "Bootcamp" },
  { value: "webinar_series", label: "Webinar series" },
];

export function Step1Format({ data, update }: StepProps) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Format and event type</h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 10 }}>Event name</label>
        <input
          placeholder="e.g. Hackingly Build Sprint"
          value={data.name ?? ""}
          onChange={(e) => update({ name: e.target.value })}
          maxLength={200}
          aria-label="Event name"
          required
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 10 }}>Format</label>
        <div style={{ display: "flex", gap: 12 }}>
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => update({ format: f.value as WizardData["format"] })}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: 8, border: "2px solid",
                borderColor: data.format === f.value ? "var(--blue-600)" : "var(--slate-300)",
                background: data.format === f.value ? "var(--blue-50)" : "#fff",
                cursor: "pointer", textAlign: "center",
              }}
              aria-pressed={data.format === f.value}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: "var(--slate-500)" }}>{f.desc}</div>
            </button>
          ))}
        </div>
        {data.format === "hybrid" && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--blue-600)" }}>
            ℹ Hybrid events will include a Streaming workstream in the plan.
          </div>
        )}
      </div>

      <div>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 10 }}>Event type</label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update({ type: t.value as WizardData["type"] })}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "2px solid",
                borderColor: data.type === t.value ? "var(--blue-600)" : "var(--slate-300)",
                background: data.type === t.value ? "var(--blue-50)" : "#fff",
                cursor: "pointer", fontWeight: 500,
              }}
              aria-pressed={data.type === t.value}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
