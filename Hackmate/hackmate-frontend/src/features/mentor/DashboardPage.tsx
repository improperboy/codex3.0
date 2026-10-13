import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { mentorApi, classifyRound } from '@/api/mentor'
import { Users, Star, Clock, LifeBuoy, Calendar, ChevronRight } from 'lucide-react'

export default function MentorDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data: teamsData } = useQuery({
    queryKey: ['mentor-assigned-teams'],
    queryFn: () => mentorApi.getAssignedTeams(),
  })
  const { data: allRounds = [] } = useQuery({
    queryKey: ['mentor-all-rounds'],
    queryFn: mentorApi.getAllRounds,
  })
  const { data: myScores = [] } = useQuery({
    queryKey: ['mentor-my-scores'],
    queryFn: mentorApi.getMyScores,
  })
  const { data: supportMessages = [] } = useQuery({
    queryKey: ['mentor-support-open'],
    queryFn: () => mentorApi.getSupportMessages({ status: 'open' }),
  })

  const teams = teamsData?.teams ?? []
  const activeRounds = allRounds.filter((r) => classifyRound(r) === 'active')
  const upcomingRounds = allRounds.filter((r) => classifyRound(r) === 'upcoming').slice(0, 3)
  const teamsScored = new Set(myScores.map((s) => s.team_id)).size
  const avgScore = myScores.length
    ? (myScores.reduce((a, s) => a + s.score, 0) / myScores.length).toFixed(1)
    : '0'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{greeting}, {user?.name}!</h2>
            <p className="text-green-100 mb-3">Ready to guide and mentor amazing teams today?</p>
            {teams.length > 0 ? (
              <p className="text-sm text-green-100">
                📍 {teams.length} team{teams.length !== 1 ? 's' : ''} assigned to you
              </p>
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-300/40 rounded-lg px-3 py-2 text-sm text-yellow-100 mt-2">
                ⚠️ No assignments yet — contact admin for team assignments.
              </div>
            )}
          </div>
          <div className="hidden md:flex w-20 h-20 bg-white/20 rounded-full items-center justify-center text-4xl">
            🧑‍🏫
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Teams', value: teams.length, sub: 'in your area', icon: Users, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Teams Scored', value: teamsScored, sub: `Avg: ${avgScore} pts`, icon: Star, gradient: 'from-green-500 to-green-600' },
          { label: 'Active Rounds', value: activeRounds.length, sub: `${upcomingRounds.length} upcoming`, icon: Clock, gradient: 'from-purple-500 to-purple-600' },
          { label: 'Support Requests', value: supportMessages.length, sub: 'open', icon: LifeBuoy, gradient: 'from-orange-500 to-orange-600' },
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
              { label: 'Score Teams', desc: `${activeRounds.length} active`, to: '/mentor/score', icon: '⭐', color: 'from-blue-50 to-blue-100', iconBg: 'bg-blue-500' },
              { label: 'My Teams', desc: `${teams.length} teams`, to: '/mentor/teams', icon: '👥', color: 'from-purple-50 to-purple-100', iconBg: 'bg-purple-500' },
              { label: 'Support', desc: `${supportMessages.length} open`, to: '/mentor/support', icon: '🆘', color: 'from-green-50 to-green-100', iconBg: 'bg-green-500' },
              { label: 'Schedule', desc: 'View rounds', to: '/mentor/schedule', icon: '📅', color: 'from-indigo-50 to-indigo-100', iconBg: 'bg-indigo-500' },
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

        {/* Mentoring Rounds */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Mentoring Rounds
            </h3>
            <Link to="/mentor/schedule" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activeRounds.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" /> Active Now
                </p>
                {activeRounds.map((r) => (
                  <div key={r.id} className="p-3 bg-green-50 border-l-4 border-green-500 rounded-xl mb-2">
                    <p className="font-medium text-gray-900 text-sm">{r.round_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ends: {new Date(r.end_time).toLocaleString()} · Max: {r.max_score} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
            {upcomingRounds.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" /> Upcoming
                </p>
                {upcomingRounds.map((r) => (
                  <div key={r.id} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-xl mb-2">
                    <p className="font-medium text-gray-900 text-sm">{r.round_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Starts: {new Date(r.start_time).toLocaleString()} · Max: {r.max_score} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
            {activeRounds.length === 0 && upcomingRounds.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No rounds scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
