import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { mentorApi } from '@/api/mentor'
import { ArrowLeft, TrendingUp } from 'lucide-react'

export default function TeamProgressPage() {
  const { id } = useParams<{ id: string }>()
  const teamId = Number(id)

  const { data: progress, isLoading } = useQuery({
    queryKey: ['team-progress', teamId],
    queryFn: () => mentorApi.getTeamProgress(teamId),
    enabled: !!teamId,
  })
  const { data: teamsData } = useQuery({
    queryKey: ['mentor-assigned-teams'],
    queryFn: () => mentorApi.getAssignedTeams(),
  })

  const team = teamsData?.teams.find((t) => t.id === teamId)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/mentor/teams" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Progress</h1>
          <p className="text-gray-500 text-sm mt-0.5">{team?.name ?? 'Unnamed Team'}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading progress…</div>
      ) : !progress || progress.rounds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No scoring data available for this team yet</p>
        </div>
      ) : (
        <>
          {/* Overall */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 text-white">
            <p className="text-green-100 text-sm mb-1">Overall Average Score</p>
            <p className="text-4xl font-bold">{progress.overall_avg}</p>
            <p className="text-green-100 text-sm mt-1">across {progress.rounds.length} round{progress.rounds.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Per-round breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Round Breakdown</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {progress.rounds.map((r) => (
                <div key={r.round_id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{r.round_name}</p>
                      <p className="text-xs text-gray-500">{r.mentor_count} mentor{r.mentor_count !== 1 ? 's' : ''} scored</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{r.avg_score} <span className="text-xs text-gray-400 font-normal">/ {r.max_score}</span></p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.percentage >= 80 ? 'bg-green-100 text-green-700'
                        : r.percentage >= 60 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                      }`}>{r.percentage}%</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        r.percentage >= 80 ? 'bg-green-500'
                        : r.percentage >= 60 ? 'bg-yellow-500'
                        : 'bg-red-500'
                      }`}
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
