import { useQuery } from '@tanstack/react-query'
import { mentorApi, classifyRound } from '@/api/mentor'
import { Calendar, Clock, CheckCircle } from 'lucide-react'

export default function SchedulePage() {
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ['mentor-all-rounds'],
    queryFn: mentorApi.getAllRounds,
  })

  const active = rounds.filter((r) => classifyRound(r) === 'active')
  const upcoming = rounds.filter((r) => classifyRound(r) === 'upcoming')
  const past = rounds.filter((r) => classifyRound(r) === 'past' || classifyRound(r) === 'inactive')

  const fmt = (d: string) => new Date(d).toLocaleString()

  const RoundCard = ({ r, variant }: { r: typeof rounds[0]; variant: 'active' | 'upcoming' | 'past' }) => {
    const colors = {
      active: 'border-green-500 bg-green-50',
      upcoming: 'border-blue-500 bg-blue-50',
      past: 'border-gray-300 bg-gray-50',
    }
    const badges = {
      active: 'bg-green-100 text-green-700',
      upcoming: 'bg-blue-100 text-blue-700',
      past: 'bg-gray-100 text-gray-600',
    }
    return (
      <div className={`p-4 border-l-4 rounded-xl ${colors[variant]}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{r.round_name}</p>
            {r.description && <p className="text-sm text-gray-600 mt-0.5">{r.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmt(r.start_time)}</span>
              <span>→</span>
              <span>{fmt(r.end_time)}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badges[variant]}`}>
              {variant === 'active' ? '🟢 Active' : variant === 'upcoming' ? '🔵 Upcoming' : '⚫ Past'}
            </span>
            <p className="text-xs text-gray-500 mt-1">Max: {r.max_score} pts</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500 text-sm mt-0.5">All mentoring rounds and their timings</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', value: active.length, icon: '🟢', gradient: 'from-green-500 to-emerald-600' },
          { label: 'Upcoming', value: upcoming.length, icon: '🔵', gradient: 'from-blue-500 to-indigo-600' },
          { label: 'Completed', value: past.length, icon: '⚫', gradient: 'from-gray-400 to-gray-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-11 h-11 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center text-lg`}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading rounds…</div>
      ) : rounds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No mentoring rounds scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" /> Active Rounds
              </h3>
              <div className="space-y-3">
                {active.map((r) => <RoundCard key={r.id} r={r} variant="active" />)}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" /> Upcoming Rounds
              </h3>
              <div className="space-y-3">
                {upcoming.map((r) => <RoundCard key={r.id} r={r} variant="upcoming" />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-400" /> Completed Rounds
              </h3>
              <div className="space-y-3">
                {past.map((r) => <RoundCard key={r.id} r={r} variant="past" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
