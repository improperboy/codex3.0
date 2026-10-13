import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { mentorApi } from '@/api/mentor'
import { Users, MapPin, Crown, Lightbulb, Star, Search, X } from 'lucide-react'

export default function AssignedTeamsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mentor-assigned-teams', debouncedSearch],
    queryFn: () => mentorApi.getAssignedTeams(debouncedSearch || undefined),
  })

  const teams = data?.teams ?? []

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((window as any)._searchTimer)
    ;(window as any)._searchTimer = setTimeout(() => setDebouncedSearch(val), 400)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Teams</h1>
        <p className="text-gray-500 text-sm mt-0.5">Teams assigned to your floor/room locations</p>
      </div>

      {/* Header banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Assigned Teams</h2>
            <p className="text-purple-100 text-sm">Manage and monitor your assigned teams</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            👥
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by team name or idea…"
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Teams */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading teams…</div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Teams Found</h3>
          <p className="text-gray-500 text-sm">
            {debouncedSearch ? 'No teams match your search.' : 'No teams are assigned to your areas yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{team.name}</h3>
                    <p className="text-blue-100 text-xs">Team</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="text-white w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-yellow-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Crown className="w-3.5 h-3.5 text-yellow-500" />
                      <p className="text-xs font-medium text-gray-600">Leader</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{team.leader_name ?? '—'}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-xs font-medium text-gray-600">Location</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {team.floor_number && team.room_number
                        ? `${team.floor_number} - ${team.room_number}`
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-500">{team.member_count ?? 0} members</p>
                  </div>
                </div>

                {team.idea && (
                  <div className="bg-yellow-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                      <p className="text-xs font-medium text-gray-600">Project Idea</p>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{team.idea}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Link
                    to={`/mentor/score?team_id=${team.id}`}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5" /> Score Team
                  </Link>
                  <Link
                    to={`/mentor/progress/${team.id}`}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-center py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1"
                  >
                    📈 Progress
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
