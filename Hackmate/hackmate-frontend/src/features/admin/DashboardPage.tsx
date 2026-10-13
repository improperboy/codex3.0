import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { adminApi } from '@/api/admin'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.getAnalytics,
  })

  const stats = data?.stats
  const daily = data?.daily_activity ?? []

  const approvalRate = stats && stats.total_teams > 0
    ? Math.round((stats.approved_teams / stats.total_teams) * 100) : 0
  const submissionRate = stats && stats.total_teams > 0
    ? Math.round((stats.total_submissions / stats.total_teams) * 100) : 0
  const mentorUtil = stats && stats.total_mentors > 0
    ? Math.round((stats.assigned_mentors / stats.total_mentors) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Welcome back, {user?.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          {stats && stats.pending_teams > 0 && (
            <Link to="/admin/teams" className="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors">
              ⏳ {stats.pending_teams} Pending Teams
            </Link>
          )}
          {stats && stats.open_support_requests > 0 && (
            <Link to="/admin/support" className="bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
              💬 {stats.open_support_requests} Support Requests
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Participants" value={stats?.total_participants ?? 0} sub="Total registered" icon="👤" color="blue" progress={stats ? Math.min((stats.total_participants / 200) * 100, 100) : 0} progressLabel="Target: 200" loading={isLoading} />
        <MetricCard label="Teams" value={stats?.total_teams ?? 0} sub={`${stats?.approved_teams ?? 0} approved`} icon="👥" color="green" progress={stats ? Math.min((stats.total_teams / 50) * 100, 100) : 0} progressLabel="Max: 50 teams" loading={isLoading} />
        <MetricCard label="Submissions" value={stats?.total_submissions ?? 0} sub={`${submissionRate}% completion`} icon="📤" color="purple" progress={submissionRate} progressLabel="Projects submitted" loading={isLoading} />
        <MetricCard label="Support Staff" value={(stats?.total_mentors ?? 0) + (stats?.total_volunteers ?? 0)} sub={`${(stats?.assigned_mentors ?? 0) + (stats?.assigned_volunteers ?? 0)} active`} icon="🤝" color="indigo" progress={stats && (stats.total_mentors + stats.total_volunteers) > 0 ? Math.round(((stats.assigned_mentors + stats.assigned_volunteers) / (stats.total_mentors + stats.total_volunteers)) * 100) : 0} progressLabel={`${stats?.total_mentors ?? 0} mentors, ${stats?.total_volunteers ?? 0} volunteers`} loading={isLoading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Daily Activity (Last 7 Days)</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="teams" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Teams" />
              <Line type="monotone" dataKey="submissions" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Submissions" />
              <Line type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Progress Overview</h3>
          <div className="space-y-4">
            <ProgressBar label="Team Approvals" value={approvalRate} sub={`${stats?.approved_teams ?? 0} of ${stats?.total_teams ?? 0} teams`} color="bg-blue-500" />
            <ProgressBar label="Project Submissions" value={submissionRate} sub={`${stats?.total_submissions ?? 0} projects`} color="bg-green-500" />
            <ProgressBar label="Mentor Utilization" value={mentorUtil} sub={`${stats?.assigned_mentors ?? 0} of ${stats?.total_mentors ?? 0} mentors`} color="bg-purple-500" />
          </div>
          <div className={`mt-4 p-3 rounded-lg text-sm ${stats?.open_support_requests ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {stats?.open_support_requests
              ? `⚠️ ${stats.open_support_requests} open support requests`
              : '✅ All support requests resolved'}
          </div>
        </div>
      </div>

      {/* Quick Stats + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Active Mentors" value={stats?.assigned_mentors ?? 0} color="blue" />
            <StatBox label="Active Volunteers" value={stats?.assigned_volunteers ?? 0} color="green" />
            <StatBox label="Pending Teams" value={stats?.pending_teams ?? 0} color="orange" />
            <StatBox label="Submissions" value={stats?.total_submissions ?? 0} color="purple" />
          </div>
          <div className="mt-4 space-y-2">
            <Link to="/admin/teams" className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              👥 Manage Teams
            </Link>
            <Link to="/admin/submissions" className="w-full bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              📤 View Submissions
            </Link>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-2">
            {NAV_CARDS.map((c) => (
              <Link key={c.to} to={c.to} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-sm">
                <span className="text-lg">{c.icon}</span>
                <span className="font-medium text-gray-700">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const NAV_CARDS = [
  { label: 'Users', to: '/admin/users', icon: '👤' },
  { label: 'Analytics', to: '/admin/analytics', icon: '📊' },
  { label: 'Rankings', to: '/admin/rankings', icon: '🏆' },
  { label: 'Announcements', to: '/admin/announcements', icon: '📢' },
  { label: 'Mentor Assign', to: '/admin/mentor-assignments', icon: '🎓' },
  { label: 'Volunteer Assign', to: '/admin/volunteer-assignments', icon: '🤝' },
  { label: 'Settings', to: '/admin/settings', icon: '⚙️' },
  { label: 'Export', to: '/admin/export', icon: '📥' },
  { label: 'AI Wizard', to: '/admin/ai-wizard', icon: '🤖' },
]

function MetricCard({ label, value, sub, icon, color, progress, progressLabel, loading }: {
  label: string; value: number; sub: string; icon: string; color: string; progress: number; progressLabel: string; loading: boolean
}) {
  const barColor: Record<string, string> = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', indigo: 'bg-indigo-500' }
  const bgColor: Record<string, string> = { blue: 'bg-blue-100', green: 'bg-green-100', purple: 'bg-purple-100', indigo: 'bg-indigo-100' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '—' : value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
        </div>
        <div className={`w-11 h-11 ${bgColor[color]} rounded-lg flex items-center justify-center text-xl`}>{icon}</div>
      </div>
      <div className="mt-3">
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className={`${barColor[color]} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{progressLabel}</p>
      </div>
    </div>
  )
}

function ProgressBar({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const bg: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', orange: 'bg-orange-50 text-orange-600', purple: 'bg-purple-50 text-purple-600' }
  return (
    <div className={`${bg[color]} rounded-lg p-3 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  )
}
