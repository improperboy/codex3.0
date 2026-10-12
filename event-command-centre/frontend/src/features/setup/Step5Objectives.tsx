import type { WizardData } from "./SetupPage";

const PRESET_OBJECTIVES = [
  "Build community", "Surface talent", "Drive registrations",
  "Generate leads", "Brand awareness", "Product feedback",
  "Partner engagement", "Skill development",
];

interface StepProps { data: WizardData; update: (p: Partial<WizardData>) => void; }

export function Step5Objectives({ data, update }: StepProps) {
  const objectives = data.objectives ?? [];
  const toggle = (obj: string) => {
    const next = objectives.includes(obj)
      ? objectives.filter((o) => o !== obj)
      : [...objectives, obj];
    update({ objectives: next });
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Objectives and targets</h2>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 12 }}>
          Objectives <span style={{ fontSize: 12, color: "var(--slate-400)" }}>(select at least one)</span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PRESET_OBJECTIVES.map((obj) => (
            <button
              key={obj}
              type="button"
              onClick={() => toggle(obj)}
              aria-pressed={objectives.includes(obj)}
              style={{
                padding: "8px 14px", borderRadius: 20, border: "2px solid",
                borderColor: objectives.includes(obj) ? "var(--blue-600)" : "var(--slate-300)",
                background: objectives.includes(obj) ? "var(--blue-600)" : "#fff",
                color: objectives.includes(obj) ? "#fff" : "var(--slate-700)",
                fontWeight: 500, cursor: "pointer", fontSize: 13,
              }}
            >
              {obj}
            </button>
          ))}
        </div>
        {objectives.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--red-600)", marginTop: 6 }}>
            At least one objective is required.
          </div>
        )}
      </div>

      <div className="grid-2">
        <div>
          <label htmlFor="target-reach" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Reach target <span style={{ color: "var(--slate-400)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="target-reach"
            type="number"
            min={0}
            placeholder="e.g. 5000"
            value={data.target_reach ?? ""}
            onChange={(e) => update({ target_reach: parseInt(e.target.value) || undefined })}
          />
        </div>
        <div>
          <label htmlFor="target-partners" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Partner count target <span style={{ color: "var(--slate-400)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="target-partners"
            type="number"
            min={0}
            placeholder="e.g. 5"
            value={data.target_partners ?? ""}
            onChange={(e) => update({ target_partners: parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
