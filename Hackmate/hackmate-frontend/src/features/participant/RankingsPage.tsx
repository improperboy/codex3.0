import { useQuery } from '@tanstack/react-query'
import client from '@/api/client'
import { teamsApi } from '@/api/teams'
import { Trophy, Users, Clock } from 'lucide-react'

interface TeamRanking {
  rank: number
  team_id: number
  team_name: string
  leader_name: string
  floor_number?: string
  room_number?: string
  average_score: number
  total_score: number
  rounds_participated: number
  scores_count: number
}

export default function RankingsPage() {
  const { data: rankings = [], isLoading, error: rankingsError } = useQuery<TeamRanking[]>({
    queryKey: ['participant-rankings'],
    queryFn: () => client.get<{ rankings: TeamRanking[] }>('/rankings/').then((r) => r.data.rankings ?? []),
    retry: false,
  })

  const { data: myTeam } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

  const { data: settingsRaw } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => client.get('/admin/settings/public').then((r) => r.data),
    retry: false,
  })

  const settings: { setting_key: string; setting_value: string }[] = Array.isArray(settingsRaw) ? settingsRaw : []
  const rankingsVisible = settings.find((s) => s.setting_key === 'rankings_visible')?.setting_value
  // Also treat a 403 from the rankings endpoint as "not visible"
  const rankingsBlocked = (rankingsError as any)?.response?.status === 403
  const isVisible = !rankingsBlocked && (rankingsVisible === '1' || rankingsVisible === 'true')

  const myTeamRanking = myTeam ? rankings.find((r) => r.team_id === myTeam.id) : null

  const medalColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600'
    if (rank === 2) return 'from-gray-300 to-gray-500'
    if (rank === 3) return 'from-amber-600 to-orange-700'
    return 'from-gray-100 to-gray-200'
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading rankings…</div>
  }

  if (!isVisible) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Rankings</h1>
          <p className="text-gray-500 text-sm mt-0.5">See how teams are performing in the hackathon</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🙈</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Rankings Not Available Yet</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Team rankings are currently hidden. The admin will make them visible when ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Rankings</h1>
        <p className="text-gray-500 text-sm mt-0.5">See how teams are performing in the hackathon</p>
      </div>

      {/* Your Team Status */}
      {myTeam && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Your Team Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Your Team" value={myTeam.name} gradient="from-blue-500 to-purple-600" />
            <StatBox label="Leader" value={myTeam.leader_name ?? '—'} gradient="from-green-500 to-emerald-600" />
            <StatBox
              label="Current Rank"
              value={myTeamRanking ? `#${myTeamRanking.rank}` : 'Not Ranked'}
              gradient="from-yellow-500 to-orange-600"
            />
            <StatBox label="Total Teams" value={String(rankings.length)} gradient="from-purple-500 to-pink-600" />
          </div>
          {!myTeamRanking && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
              Your team hasn't received any scores yet. Rankings will appear once mentors start scoring your team.
            </div>
          )}
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="text-white w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{rankings.length}</div>
            <div className="text-xs text-gray-500">Teams Ranked</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Clock className="text-white w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {rankings.reduce((sum, t) => sum + t.rounds_participated, 0)}
            </div>
            <div className="text-xs text-gray-500">Total Round Participations</div>
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Teams ({rankings.length})</h3>
          <p className="text-xs text-gray-500 mt-0.5">Sorted by average score across all mentoring rounds</p>
        </div>

        {rankings.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No rankings available yet</p>
            <p className="text-gray-400 text-sm mt-1">Rankings appear once teams receive scores from mentors</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Rank</th>
                  <th className="px-5 py-3 text-left">Team</th>
                  <th className="px-5 py-3 text-left">Leader</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-left">Rounds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankings.map((team) => {
                  const isMyTeam = myTeam?.id === team.team_id
                  return (
                    <tr
                      key={team.team_id}
                      className={`transition-colors ${isMyTeam ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 bg-gradient-to-br ${medalColor(team.rank)} rounded-full flex items-center justify-center`}>
                            {team.rank <= 3 ? (
                              <span className="text-white text-sm">🏅</span>
                            ) : (
                              <span className="text-xs font-bold text-gray-600">{team.rank}</span>
                            )}
                          </div>
                          <span className="font-bold text-gray-900">#{team.rank}</span>
                          {isMyTeam && (
                            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900">{team.team_name}</td>
                      <td className="px-5 py-4 text-gray-600">{team.leader_name}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {team.floor_number ? `Floor ${team.floor_number} - Room ${team.room_number}` : '—'}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {team.rounds_participated}
                        <span className="text-xs text-gray-400 ml-1">({team.scores_count} scores)</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, gradient }: { label: string; value: string; gradient: string }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-center text-white`}>
      <div className="text-lg font-bold truncate">{value}</div>
      <div className="text-xs opacity-80 mt-0.5">{label}</div>
    </div>
  )
}
