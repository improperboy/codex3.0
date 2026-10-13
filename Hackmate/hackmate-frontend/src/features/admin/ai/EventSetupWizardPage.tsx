import { useState, useCallback } from 'react'
import { aiApi, EventWizardInput, EventPlan } from '@/api/ai'

// ── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Event Basics' },
  { label: 'Logistics & Goals' },
  { label: 'Generated Plan' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => (
        <div key={idx} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                idx < current
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : idx === current
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              {idx < current ? '✓' : idx + 1}
            </div>
            <span
              className={`text-xs mt-1 font-medium whitespace-nowrap ${
                idx <= current ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                idx < current ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Skeleton loader ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
          <div className="h-3 bg-gray-100 rounded w-4/6" />
        </div>
      ))}
    </div>
  )
}

// ── Plan display ─────────────────────────────────────────────────────────────
function PlanDisplay({ plan }: { plan: EventPlan }) {
  const handleCopyToClipboard = useCallback(() => {
    const lines: string[] = [
      'EVENT OPERATING PLAN',
      '====================',
      '',
      'OVERVIEW',
      plan.overview,
      '',
      'TIMELINE',
      ...plan.timeline.map(
        (m) =>
          `- ${m.name} (${m.date_offset_days <= 0 ? Math.abs(m.date_offset_days) + ' days before' : m.date_offset_days + ' days after'}) | ${m.responsible_team}: ${m.description}`
      ),
      '',
      'STAFFING',
      ...plan.staffing.map((s) => `- ${s.role} (x${s.count}): ${s.responsibilities}`),
      '',
      'MARKETING',
      ...plan.marketing.map(
        (m) =>
          `- ${m.channel} (${Math.abs(m.deadline_offset_days)} days before): ${m.target}`
      ),
      '',
      'BUDGET BREAKDOWN',
      ...plan.budget_breakdown.map(
        (b) => `- ${b.category}: ${b.estimated_amount}${b.percentage != null ? ` (${b.percentage}%)` : ''}`
      ),
      '',
      'KEY RISKS',
      ...plan.key_risks.map((r) => `- ${r.risk} → Mitigation: ${r.mitigation}`),
      '',
      'SUCCESS METRICS',
      ...plan.success_metrics.map((m, i) => `${i + 1}. ${m}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }, [plan])

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-2">📋 Overview</h3>
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{plan.overview}</p>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">🗓 Timeline</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500 pr-4">Milestone</th>
                <th className="pb-2 font-medium text-gray-500 pr-4 whitespace-nowrap">Days Out</th>
                <th className="pb-2 font-medium text-gray-500 pr-4 whitespace-nowrap">Responsible Team</th>
                <th className="pb-2 font-medium text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody>
              {plan.timeline.map((m, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-800">{m.name}</td>
                  <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                    {m.date_offset_days === 0
                      ? 'Event day'
                      : m.date_offset_days < 0
                      ? `${Math.abs(m.date_offset_days)}d before`
                      : `+${m.date_offset_days}d after`}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{m.responsible_team}</td>
                  <td className="py-2 text-gray-600">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staffing */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">👥 Staffing Requirements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plan.staffing.map((s, i) => (
            <div key={i} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-800 text-sm">{s.role}</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  ×{s.count}
                </span>
              </div>
              <p className="text-xs text-gray-500">{s.responsibilities}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">📣 Marketing Plan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500 pr-4">Channel</th>
                <th className="pb-2 font-medium text-gray-500 pr-4">Target</th>
                <th className="pb-2 font-medium text-gray-500 whitespace-nowrap">Days Out</th>
              </tr>
            </thead>
            <tbody>
              {plan.marketing.map((m, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-800">{m.channel}</td>
                  <td className="py-2 pr-4 text-gray-600">{m.target}</td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">
                    {m.deadline_offset_days === 0
                      ? 'Event day'
                      : m.deadline_offset_days < 0
                      ? `${Math.abs(m.deadline_offset_days)}d before`
                      : `+${m.deadline_offset_days}d after`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">💰 Budget Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500 pr-4">Category</th>
                <th className="pb-2 font-medium text-gray-500 pr-4">Estimated Amount</th>
                <th className="pb-2 font-medium text-gray-500">%</th>
              </tr>
            </thead>
            <tbody>
              {plan.budget_breakdown.map((b, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-800">{b.category}</td>
                  <td className="py-2 pr-4 text-gray-600">{b.estimated_amount}</td>
                  <td className="py-2 text-gray-600">{b.percentage != null ? `${b.percentage}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Risks */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">⚠️ Key Risks</h3>
        <ul className="space-y-2">
          {plan.key_risks.map((r, i) => (
            <li key={i} className="text-sm">
              <span className="font-semibold text-gray-800">{r.risk}</span>
              <span className="text-gray-500"> — </span>
              <span className="text-gray-600">{r.mitigation}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Success Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">🎯 Success Metrics</h3>
        <ol className="list-decimal list-inside space-y-1">
          {plan.success_metrics.map((m, i) => (
            <li key={i} className="text-sm text-gray-700">{m}</li>
          ))}
        </ol>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleCopyToClipboard}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          📋 Copy to Clipboard
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          🖨️ Download as PDF
        </button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
const EMPTY_FORM: EventWizardInput = {
  event_format: 'In-person Hackathon',
  event_date: '',
  duration_days: 2,
  expected_participants: 100,
  theme: '',
  venue: '',
  budget: '',
  audience: '',
  goals: '',
}

export default function EventSetupWizardPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<EventWizardInput>(EMPTY_FORM)
  const [plan, setPlan] = useState<EventPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof EventWizardInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const raw = e.target.value
    const val =
      field === 'expected_participants' || field === 'duration_days'
        ? Number(raw)
        : raw
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const generatePlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload: EventWizardInput = {
        ...form,
        theme: form.theme?.trim() || undefined,
      }
      const result = await aiApi.generateEventPlan(payload)
      setPlan(result)
      setStep(2)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Unknown error'
          : 'Unknown error'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [form])

  const handleNext = async () => {
    if (step === 0) {
      setStep(1)
    } else if (step === 1) {
      setStep(2)
      await generatePlan()
    }
  }

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const handleRegenerate = async () => {
    setStep(2)
    await generatePlan()
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI Event Setup Wizard</h1>
        <p className="text-gray-500 mt-0.5 text-sm">
          Enter your event details and let AI generate a complete operating plan.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <StepIndicator current={step} />

        {/* ── Step 1: Event Basics ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Event Format</label>
                <select className={inputClass} value={form.event_format} onChange={update('event_format')}>
                  <option>In-person Hackathon</option>
                  <option>Online Hackathon</option>
                  <option>Hybrid Hackathon</option>
                  <option>Conference</option>
                  <option>Workshop</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Event Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.event_date}
                  onChange={update('event_date')}
                />
              </div>
              <div>
                <label className={labelClass}>Duration (days)</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.duration_days}
                  onChange={update('duration_days')}
                />
              </div>
              <div>
                <label className={labelClass}>Expected Participants</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.expected_participants}
                  onChange={update('expected_participants')}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Theme / Track{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Optional theme or track"
                value={form.theme ?? ''}
                onChange={update('theme')}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Logistics & Goals ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Venue</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. City Convention Center"
                  value={form.venue}
                  onChange={update('venue')}
                />
              </div>
              <div>
                <label className={labelClass}>Budget</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. $5,000 or Limited"
                  value={form.budget}
                  onChange={update('budget')}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. University students, early-career developers"
                value={form.audience}
                onChange={update('audience')}
              />
            </div>
            <div>
              <label className={labelClass}>Goals</label>
              <textarea
                rows={4}
                className={inputClass}
                placeholder="Describe the key goals and outcomes you want to achieve with this event"
                value={form.goals}
                onChange={update('goals')}
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Generated Plan ── */}
        {step === 2 && (
          <div>
            {loading && (
              <div>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Generating your event plan…
                </p>
                <LoadingSkeleton />
              </div>
            )}

            {!loading && error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h4 className="font-semibold text-red-800 mb-1">Failed to generate plan</h4>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <button
                  onClick={handleRegenerate}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && plan && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-700 font-medium">✅ Plan generated successfully</p>
                  <button
                    onClick={handleRegenerate}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    🔄 Regenerate Plan
                  </button>
                </div>
                <PlanDisplay plan={plan} />
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {step < 2 && (
            <button
              onClick={handleNext}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {step === 1 ? '✨ Generate Plan' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
