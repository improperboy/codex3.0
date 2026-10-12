import type { WizardData } from "./SetupPage";

interface StepProps { data: WizardData; update: (p: Partial<WizardData>) => void; }

export function Step4Venue({ data, update }: StepProps) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Venue and logistics</h2>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div>
          <label htmlFor="venue-type" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>Venue type</label>
          <select
            id="venue-type"
            value={data.venue_type ?? ""}
            onChange={(e) => update({ venue_type: e.target.value || undefined })}
          >
            <option value="">— Select —</option>
            <option value="university_campus">University campus</option>
            <option value="co_working">Co-working space</option>
            <option value="conference_centre">Conference centre</option>
            <option value="company_office">Company office</option>
            <option value="online">Online platform</option>
          </select>
        </div>
        <div>
          <label htmlFor="city" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>City</label>
          <input
            id="city"
            placeholder="e.g. Bengaluru"
            value={data.city ?? ""}
            onChange={(e) => update({ city: e.target.value || undefined })}
            maxLength={200}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 12 }}>Logistics needed</label>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { key: "needs_catering", label: "Catering", hint: "Adds a lock-date task" },
            { key: "needs_av", label: "AV equipment", hint: "Adds a lock-date task" },
          ].map(({ key, label, hint }) => (
            <label
              key={key}
              style={{
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                padding: "10px 16px", border: "2px solid",
                borderColor: data[key as keyof WizardData] ? "var(--blue-600)" : "var(--slate-300)",
                borderRadius: 8, background: data[key as keyof WizardData] ? "var(--blue-50)" : "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={!!(data[key as keyof WizardData])}
                onChange={(e) => update({ [key]: e.target.checked })}
                style={{ width: "auto" }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--slate-400)" }}>{hint}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
