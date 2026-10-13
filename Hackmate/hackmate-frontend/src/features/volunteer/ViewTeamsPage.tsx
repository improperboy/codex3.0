import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { volunteerApi } from '@/api/volunteer'
import { Users, MapPin, Crown, Lightbulb, Search, X, AlertTriangle } from 'lucide-react'

export default function ViewTeamsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data: assignments = [] } = useQuery({
    queryKey: ['volunteer-assignments'],
    queryFn: volunteerApi.getMyAssignments,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['volunteer-assigned-teams', debouncedSearch],
    queryFn: () => volunteerApi.getAssignedTeams(debouncedSearch || undefined),
  })

  const teams = data?.teams ?? []

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((window as any)._volSearchTimer)
    ;(window as any)._volSearchTimer = setTimeout(() => setDebouncedSearch(val), 400)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teams in My Area</h1>
        <p className="text-gray-500 text-sm mt-0.5">Teams assigned to your floor/room locations</p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Your Assigned Locations</h2>
            {assignments.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {assignments.map((a) => (
                  <span key={a.id} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {a.floor_number ?? `Floor ${a.floor_id}`} — {a.room_number ?? `Room ${a.room_id}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-teal-100 text-sm mt-1">No locations assigned yet</p>
            )}
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            👥
          </div>
        </div>
      </div>

      {/* No assignment warning */}
      {assignments.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">No location assigned</p>
            <p className="text-xs text-yellow-600 mt-0.5">Contact an admin to get assigned to a floor and room. You can only see teams in your assigned area.</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by team name or idea…"
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Showing {teams.length} team{teams.length !== 1 ? 's' : ''} in your assigned area
        </p>
      </div>

      {/* Teams grid */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading teams…</div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Teams Found</h3>
          <p className="text-gray-500 text-sm">
            {debouncedSearch
              ? 'No teams match your search in your assigned area.'
              : 'No approved teams are in your assigned locations yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card header */}
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{team.name}</h3>
                    <p className="text-teal-100 text-xs">Team</p>
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
                  <div className="bg-teal-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-500" />
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

                {team.tech_skills && (
                  <div className="flex flex-wrap gap-1">
                    {team.tech_skills.split(',').slice(0, 4).map((skill) => (
                      <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
