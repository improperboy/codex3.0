import { useQuery } from '@tanstack/react-query'
import { mentorApi } from '@/api/mentor'
import { Star, Clock } from 'lucide-react'

export default function ScoringHistoryPage() {
  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['mentor-my-scores'],
    queryFn: mentorApi.getMyScores,
  })
  const { data: allRounds = [] } = useQuery({
    queryKey: ['mentor-all-rounds'],
    queryFn: mentorApi.getAllRounds,
  })
  const { data: teamsData } = useQuery({
    queryKey: ['mentor-assigned-teams'],
    queryFn: () => mentorApi.getAssignedTeams(),
  })

  const roundMap = Object.fromEntries(allRounds.map((r) => [r.id, r]))
  const teamMap = Object.fromEntries((teamsData?.teams ?? []).map((t) => [t.id, t]))

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scoring History</h1>
        <p className="text-gray-500 text-sm mt-0.5">All scores you have submitted</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Scores', value: scores.length, icon: '📋', gradient: 'from-blue-500 to-indigo-600' },
          { label: 'Teams Scored', value: new Set(scores.map((s) => s.team_id)).size, icon: '👥', gradient: 'from-green-500 to-teal-600' },
          { label: 'Rounds Participated', value: new Set(scores.map((s) => s.round_id)).size, icon: '🏆', gradient: 'from-purple-500 to-pink-600' },
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

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Score History</h3>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : scores.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No scores submitted yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {scores.map((s) => {
              const round = roundMap[s.round_id]
              const team = teamMap[s.team_id]
              const pct = round ? Math.round((s.score / round.max_score) * 100) : null
              return (
                <div key={s.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                      <Star className="text-white w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {team?.name ?? 'Unnamed Team'}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-lg font-bold text-gray-900">{s.score}</span>
                          {round && <span className="text-xs text-gray-400">/ {round.max_score}</span>}
                          {pct !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              pct >= 80 ? 'bg-green-100 text-green-700'
                              : pct >= 60 ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                            }`}>{pct}%</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        Round: {round?.round_name ?? 'Previous Round'}
                      </p>
                      {s.comment && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1 mt-1 line-clamp-2">
                          💬 {s.comment}
                        </p>
                      )}
                      {s.created_at && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeAgo(s.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
