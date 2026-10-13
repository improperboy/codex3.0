import { useQuery } from '@tanstack/react-query'
import { volunteerApi } from '@/api/volunteer'
import { Trophy, MapPin } from 'lucide-react'
import client from '@/api/client'

export default function VolunteerRankingsPage() {
  const { data, isLoading, error: rankingsError } = useQuery({
    queryKey: ['volunteer-rankings'],
    queryFn: volunteerApi.getRankings,
    retry: false,
  })

  const { data: settingsRaw } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => client.get('/admin/settings/public').then((r) => r.data),
    retry: false,
  })

  const settings: { setting_key: string; setting_value: string }[] = Array.isArray(settingsRaw) ? settingsRaw : []
  const rankingsVisible = settings.find((s) => s.setting_key === 'rankings_visible')?.setting_value
  const rankingsBlocked = (rankingsError as any)?.response?.status === 403
  const isVisible = !rankingsBlocked && (rankingsVisible === '1' || rankingsVisible === 'true')

  const rankings = data?.rankings ?? []

  const medalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  if (isLoading) {
    return <div className="py-16 text-center text-gray-400">Loading rankings…</div>
  }

  if (!isVisible) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rankings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Team standings based on average scores</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Rankings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Team standings based on average scores</p>
      </div>

      {rankings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No rankings available yet</p>
          <p className="text-gray-400 text-sm mt-1">Rankings appear once teams have been scored</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Team Rankings</h3>
            <span className="text-xs text-gray-500">{rankings.length} teams</span>
          </div>
          <div className="divide-y divide-gray-100">
            {rankings.map((r) => (
              <div
                key={r.team_id}
                className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${r.rank <= 3 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                  r.rank === 1 ? 'bg-yellow-100' : r.rank === 2 ? 'bg-gray-100' : r.rank === 3 ? 'bg-amber-100' : 'bg-gray-50'
                }`}>
                  {medalEmoji(r.rank) ?? <span className="text-sm text-gray-500">#{r.rank}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{r.team_name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                    <span>👤 {r.leader_name}</span>
                    {r.floor_number && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {r.floor_number}-{r.room_number}
                      </span>
                    )}
                    <span>{r.rounds_participated} round{r.rounds_participated !== 1 ? 's' : ''}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
