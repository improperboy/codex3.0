import type { WizardData } from "./SetupPage";

interface StepProps { data: WizardData; update: (p: Partial<WizardData>) => void; }

export function Step3Audience({ data, update }: StepProps) {
  const overTarget = data.scale_seats && data.target_registrations && data.target_registrations > data.scale_seats;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Audience and scale</h2>

      <div style={{ marginBottom: 20 }}>
        <label htmlFor="audience" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
          Audience segment
          <span style={{ fontSize: 12, color: "var(--slate-400)", fontWeight: 400, marginLeft: 6 }}>
            Used to tailor the plan
          </span>
        </label>
        <input
          id="audience"
          placeholder="e.g. Final-year engineering students"
          value={data.audience ?? ""}
          onChange={(e) => update({ audience: e.target.value })}
          maxLength={200}
          required
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div>
          <label htmlFor="seats" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Seats (capacity)
          </label>
          <input
            id="seats"
            type="number"
            min={1}
            max={100000}
            value={data.scale_seats ?? ""}
            onChange={(e) => update({ scale_seats: parseInt(e.target.value) || undefined })}
            required
          />
        </div>
        <div>
          <label htmlFor="target-reg" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Target registrations
          </label>
          <input
            id="target-reg"
            type="number"
            min={1}
            max={data.scale_seats ?? 100000}
            value={data.target_registrations ?? ""}
            onChange={(e) => update({ target_registrations: parseInt(e.target.value) || undefined })}
            required
          />
          {overTarget && (
            <div style={{ fontSize: 12, color: "var(--red-600)", marginTop: 4 }}>
              Target cannot exceed seat capacity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
