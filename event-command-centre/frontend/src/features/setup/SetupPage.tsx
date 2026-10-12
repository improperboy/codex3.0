import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateEvent } from "../../api/hooks";
import { previewPlan } from "../../api/client";
import type { Brief, PlanPreviewOut } from "../../api/types";
import { Step1Format } from "./Step1Format";
import { Step2Dates } from "./Step2Dates";
import { Step3Audience } from "./Step3Audience";
import { Step4Venue } from "./Step4Venue";
import { Step5Objectives } from "./Step5Objectives";
import { Step6Review } from "./Step6Review";

const STEPS = ["Format & type", "Dates", "Audience & scale", "Venue & logistics", "Objectives", "Review"];

export type WizardData = Partial<Brief>;

export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ objectives: [], format: "in_person", type: "hackathon" });
  const [preview, setPreview] = useState<PlanPreviewOut | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const createEvent = useCreateEvent();

  const update = async (patch: Partial<WizardData>) => {
    const next = { ...data, ...patch };
    setData(next);
    // Fetch preview when we have enough data
    if (next.name && next.type && next.format && next.start_date && next.end_date &&
        next.scale_seats && next.target_registrations && (next.objectives?.length ?? 0) > 0) {
      try {
        setPreviewLoading(true);
        const p = await previewPlan(next as Brief);
        setPreview(p);
      } catch { /* ignore preview errors */ }
      finally { setPreviewLoading(false); }
    }
  };

  const handleSubmit = async () => {
    const result = await createEvent.mutateAsync(data as Brief);
    navigate(`/events/${result.id}`);
  };

  const stepProps = { data, update };

  return (
    <div style={{ minHeight: "100vh", background: "var(--slate-100)" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid var(--slate-200)", padding: "16px 24px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Set up your event</h1>
      </header>

      <div style={{ display: "flex", maxWidth: 1100, margin: "32px auto", gap: 24, padding: "0 24px" }}>
        {/* Main form */}
        <div style={{ flex: 1 }}>
          {/* Step progress */}
          <nav aria-label="Setup steps" style={{ display: "flex", gap: 4, marginBottom: 28 }}>
            {STEPS.map((label, i) => (
              <div
                key={label}
                style={{
                  flex: 1, textAlign: "center", fontSize: 12,
                  fontWeight: i === step ? 700 : 400,
                  color: i < step ? "var(--blue-600)" : i === step ? "var(--slate-900)" : "var(--slate-400)",
                  borderBottom: `2px solid ${i <= step ? "var(--blue-600)" : "var(--slate-200)"}`,
                  paddingBottom: 6,
                }}
                aria-current={i === step ? "step" : undefined}
              >
                {i + 1}. {label}
              </div>
            ))}
          </nav>

          <div className="card">
            {step === 0 && <Step1Format {...stepProps} />}
            {step === 1 && <Step2Dates {...stepProps} />}
            {step === 2 && <Step3Audience {...stepProps} />}
            {step === 3 && <Step4Venue {...stepProps} />}
            {step === 4 && <Step5Objectives {...stepProps} />}
            {step === 5 && (
              <Step6Review
                data={data}
                preview={preview}
                onSubmit={handleSubmit}
                isSubmitting={createEvent.isPending}
                error={createEvent.error as Error | null}
              />
            )}

            {step < 5 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                >
                  ← Back
                </button>
                <button className="btn-primary" onClick={() => setStep(step + 1)}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live preview sidebar */}
        <aside
          aria-label="Plan preview"
          style={{ width: 260, flexShrink: 0 }}
        >
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Live preview</h2>
            {previewLoading ? (
              <div style={{ color: "var(--slate-400)", fontSize: 13 }}>Updating…</div>
            ) : preview ? (
              <>
                <div style={{ fontSize: 13, color: "var(--slate-600)", marginBottom: 8 }}>
                  <strong>{preview.task_count}</strong> tasks across <strong>{preview.workstream_names.length}</strong> workstreams
                </div>
                <div style={{ fontSize: 12, color: "var(--slate-500)", marginBottom: 8 }}>
                  {preview.milestone_count} milestones · {preview.content_items} content items
                </div>
                {preview.warnings.length > 0 && (
                  <div style={{ background: "var(--amber-50)", padding: 10, borderRadius: 6, fontSize: 12, color: "var(--amber-500)" }}>
                    {preview.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                )}
                {preview.rules_applied.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--slate-400)" }}>
                    Rules: {preview.rules_applied.join(", ")}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--slate-400)" }}>
                Fill in the form to see the plan preview.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
