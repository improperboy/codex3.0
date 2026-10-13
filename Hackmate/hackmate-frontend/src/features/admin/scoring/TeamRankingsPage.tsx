import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import client from '@/api/client'
import { adminApi } from '@/api/admin'

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

export default function TeamRankingsPage() {
  const [rankingsVisible, setRankingsVisible] = useState<boolean | null>(null)
  const [msg, setMsg] = useState('')

  const { data: rankings = [], isLoading } = useQuery<TeamRanking[]>({
    queryKey: ['admin-rankings'],
    queryFn: () => client.get<{ rankings: TeamRanking[] }>('/rankings/').then((r) => r.data.rankings ?? []),
  })

  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings,
  })

  const rankingsVisibleSetting = settings.find((s: any) => s.setting_key === 'rankings_visible')
  const computedVisible = rankingsVisibleSetting
    ? rankingsVisibleSetting.setting_value === 'true' || rankingsVisibleSetting.setting_value === '1'
    : false

  // Sync local state with fetched setting (only when not mid-toggle)
  useEffect(() => {
    if (rankingsVisibleSetting !== undefined && rankingsVisible === null) {
      setRankingsVisible(computedVisible)
    }
  }, [rankingsVisibleSetting])

  const toggleVisibility = useMutation({
    mutationFn: (visible: boolean) => adminApi.updateSetting('rankings_visible', visible ? 'true' : 'false'),
    onSuccess: (_, visible) => { setRankingsVisible(visible); setMsg(visible ? 'Rankings are now visible to participants!' : 'Rankings hidden from participants') },
  })

  const medalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500'
    if (rank === 2) return 'text-gray-400'
    if (rank === 3) return 'text-amber-600'
    return 'text-gray-400'
  }

  const topScore = rankings[0]?.average_score ?? 0
  const totalScores = rankings.reduce((sum, t) => sum + t.scores_count, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Rankings</h1>
        <p className="text-gray-500 text-sm mt-0.5">View and manage team performance rankings</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Visibility Control */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Ranking Visibility</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={rankingsVisible ?? false}
              onChange={(e) => toggleVisibility.mutate(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded" />
            <span className="text-sm text-gray-700">Make rankings visible to participants</span>
          </label>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rankingsVisible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {rankingsVisible ? 'VISIBLE' : 'HIDDEN'}
          </span>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Teams with Scores', value: rankings.length, icon: '🏆' },
          { label: 'Highest Avg Score', value: topScore.toFixed(2), icon: '⭐' },
          { label: 'Total Scores Given', value: totalScores, icon: '📊' },
          { label: 'Ranked Teams', value: rankings.length, icon: '📋' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Team Rankings ({rankings.length} teams)</h3>
          <p className="text-xs text-gray-500 mt-0.5">Sorted by average score across all mentoring rounds</p>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : rankings.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-gray-500">No rankings yet</p>
            <p className="text-gray-400 text-sm mt-1">Teams will appear here once they receive scores from mentors</p>
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
                  <th className="px-5 py-3 text-left">Avg Score</th>
                  <th className="px-5 py-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankings.map((team) => (
                  <tr key={team.team_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {team.rank <= 3 && <span className={`text-lg ${medalColor(team.rank)}`}>🏅</span>}
                        <span className="font-bold text-gray-900">#{team.rank}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{team.team_name}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{team.leader_name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {team.floor_number ? `${team.floor_number} - ${team.room_number}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {team.rounds_participated}
                      <span className="text-xs text-gray-400 ml-1">({team.scores_count} scores)</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-lg font-bold text-indigo-600">{team.average_score.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700 font-medium">{team.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
