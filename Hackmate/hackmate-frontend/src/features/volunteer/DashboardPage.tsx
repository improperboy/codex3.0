import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { volunteerApi } from '@/api/volunteer'
import { Users, MapPin, LifeBuoy as _LifeBuoy, AlertCircle, UserCheck } from 'lucide-react'

export default function VolunteerDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data: assignments = [] } = useQuery({
    queryKey: ['volunteer-assignments'],
    queryFn: volunteerApi.getMyAssignments,
  })

  const { data: teamsData } = useQuery({
    queryKey: ['volunteer-assigned-teams'],
    queryFn: () => volunteerApi.getAssignedTeams(),
  })

  const { data: mentors = [] } = useQuery({
    queryKey: ['volunteer-assigned-mentors'],
    queryFn: volunteerApi.getAssignedMentors,
    enabled: assignments.length > 0,
  })

  const { data: supportMessages = [] } = useQuery({
    queryKey: ['volunteer-support-open'],
    queryFn: () => volunteerApi.getSupportMessages({ status: 'open' }),
  })

  const teams = teamsData?.teams ?? []
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{greeting}, {user?.name}!</h2>
            <p className="text-teal-100 mb-3">Keep things running smoothly for all participants.</p>
            {assignments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignments.map((a) => (
                  <span key={a.id} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {a.floor_number ?? `Floor ${a.floor_id}`} — {a.room_number ?? `Room ${a.room_id}`}
                  </span>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-300/40 rounded-lg px-3 py-2 text-sm text-yellow-100 mt-2">
                ⚠️ No location assigned yet — contact admin.
              </div>
            )}
          </div>
          <div className="hidden md:flex w-20 h-20 bg-white/20 rounded-full items-center justify-center text-4xl">
            🤝
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Locations', value: assignments.length, sub: 'floors & rooms', icon: MapPin, gradient: 'from-teal-500 to-teal-600' },
          { label: 'Teams in My Area', value: teams.length, sub: 'approved teams', icon: Users, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Mentors in My Area', value: mentors.length, sub: 'assigned mentors', icon: UserCheck, gradient: 'from-indigo-500 to-indigo-600' },
          { label: 'Open Requests', value: supportMessages.length, sub: 'need attention', icon: AlertCircle, gradient: 'from-orange-500 to-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
              <div className={`w-11 h-11 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center`}>
                <s.icon className="text-white w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'View Teams', desc: `${teams.length} in your area`, to: '/volunteer/teams', icon: '👥', color: 'from-blue-50 to-blue-100', iconBg: 'bg-blue-500' },
              { label: 'Mentors', desc: `${mentors.length} in your area`, to: '/volunteer/mentors', icon: '🎓', color: 'from-indigo-50 to-indigo-100', iconBg: 'bg-indigo-500' },
              { label: 'Support', desc: `${supportMessages.length} open`, to: '/volunteer/support', icon: '💬', color: 'from-orange-50 to-orange-100', iconBg: 'bg-orange-500' },
              { label: 'Rankings', desc: 'Team standings', to: '/volunteer/rankings', icon: '🏆', color: 'from-yellow-50 to-yellow-100', iconBg: 'bg-yellow-500' },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`bg-gradient-to-br ${a.color} hover:opacity-90 p-4 rounded-xl text-center transition-all group`}
              >
                <div className={`w-11 h-11 ${a.iconBg} rounded-lg flex items-center justify-center mx-auto mb-2 text-xl group-hover:scale-110 transition-transform`}>
                  {a.icon}
                </div>
                <p className="text-sm font-medium text-gray-900">{a.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* My Assigned Teams preview */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-500" /> Teams in My Area
            </h3>
            <Link to="/volunteer/teams" className="text-xs text-teal-600 hover:underline">
              View all →
            </Link>
          </div>
          {teams.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No teams assigned to your area yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teams.slice(0, 6).map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-teal-50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{team.name}</p>
                    <p className="text-xs text-gray-500">{team.member_count ?? 0} members · {team.leader_name ?? '—'}</p>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 ml-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {team.floor_number && team.room_number
                      ? `${team.floor_number}-${team.room_number}`
                      : '—'}
                  </div>
                </div>
              ))}
              {teams.length > 6 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{teams.length - 6} more teams</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
