import { useQuery } from '@tanstack/react-query'
import { mentorApi } from '@/api/mentor'
import { Trophy, MapPin } from 'lucide-react'

export default function MentorRankingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['mentor-rankings'],
    queryFn: mentorApi.getRankings,
  })

  const rankings = data?.rankings ?? []

  const medalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500'
    if (rank === 2) return 'text-gray-400'
    if (rank === 3) return 'text-amber-600'
    return 'text-gray-400'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rankings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Team standings based on average scores</p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading rankings…</div>
      ) : rankings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No rankings available yet</p>
          <p className="text-gray-400 text-sm mt-1">Rankings will appear once teams have been scored</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Team Rankings</h3>
            <span className="text-xs text-gray-500">{rankings.length} teams</span>
          </div>
          <div className="divide-y divide-gray-100">
            {rankings.map((r) => (
              <div key={r.team_id} className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${r.rank <= 3 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                  r.rank === 1 ? 'bg-yellow-100' : r.rank === 2 ? 'bg-gray-100' : r.rank === 3 ? 'bg-amber-100' : 'bg-gray-50'
                }`}>
                  <span className={medalColor(r.rank)}>
                    {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                  </span>
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
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">#{r.rank}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
