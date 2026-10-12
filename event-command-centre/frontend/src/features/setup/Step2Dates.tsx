import type { WizardData } from "./SetupPage";

interface StepProps { data: WizardData; update: (p: Partial<WizardData>) => void; }

export function Step2Dates({ data, update }: StepProps) {
  const today = new Date().toISOString().slice(0, 10);
  const daysRemaining = data.start_date
    ? Math.ceil((new Date(data.start_date).getTime() - Date.now()) / 86400_000)
    : null;
  const isCompressed = daysRemaining != null && daysRemaining < 14;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Dates and duration</h2>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div>
          <label htmlFor="start-date" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            min={today}
            value={data.start_date ?? ""}
            onChange={(e) => update({ start_date: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="end-date" style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>
            End date
          </label>
          <input
            id="end-date"
            type="date"
            min={data.start_date ?? today}
            value={data.end_date ?? ""}
            onChange={(e) => update({ end_date: e.target.value })}
            required
          />
          {data.start_date && data.end_date && data.end_date < data.start_date && (
            <div style={{ fontSize: 12, color: "var(--red-600)", marginTop: 4 }}>
              End date must be on or after start date.
            </div>
          )}
        </div>
      </div>

      {daysRemaining != null && (
        <div style={{
          padding: 12, borderRadius: 8,
          background: isCompressed ? "var(--amber-50)" : "var(--green-50)",
          color: isCompressed ? "var(--amber-500)" : "var(--green-600)",
          fontSize: 13, fontWeight: 500,
        }}>
          {isCompressed
            ? `⚠ Event is ${daysRemaining} days away — plan will be compressed. Confirm venue and catering this week.`
            : `✓ ${daysRemaining} days until the event.`}
        </div>
      )}
    </div>
  );
}
