import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#6366F1', '#F97316', '#EC4899', '#14B8A6']

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.getAnalytics,
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading analytics…</div>
  if (!data) return null

  const { stats, daily_activity, role_distribution, team_status_distribution, avg_scores_per_round, top_tech_stacks, teams_per_location } = data

  const roleData = Object.entries(role_distribution).map(([role, count]) => ({ name: role.charAt(0).toUpperCase() + role.slice(1), value: count }))
  const statusData = Object.entries(team_status_distribution).map(([status, count]) => ({ name: status.charAt(0).toUpperCase() + status.slice(1), value: count }))
  const locationData = teams_per_location.map((l) => ({ name: `${l.floor}-${l.room}`, teams: l.team_count }))

  const approvalRate = stats.total_teams > 0 ? Math.round((stats.approved_teams / stats.total_teams) * 100) : 0
  const completionRate = stats.approved_teams > 0 ? Math.round((stats.total_submissions / stats.approved_teams) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Comprehensive hackathon analytics and insights</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total_users, icon: '👤', sub: 'All roles', color: 'blue' },
          { label: 'Approved Teams', value: stats.approved_teams, icon: '✅', sub: `${approvalRate}% approval rate`, color: 'green' },
          { label: 'Submissions', value: stats.total_submissions, icon: '📤', sub: `${completionRate}% completion`, color: 'purple' },
          { label: 'Support Staff', value: stats.total_mentors + stats.total_volunteers, icon: '🤝', sub: `${stats.total_mentors} mentors · ${stats.total_volunteers} volunteers`, color: 'indigo' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
              <span className="text-xl">{c.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Role Distribution */}
        <ChartCard title="User Role Distribution" badge="Live Data">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Team Status Distribution */}
        <ChartCard title="Team Status Distribution" badge="Real Time">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={['#22C55E', '#F59E0B', '#EF4444'][i % 3]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Submissions Timeline */}
        <ChartCard title="Daily Activity (Last 7 Days)" badge="Trending">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily_activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="Users" />
              <Line type="monotone" dataKey="teams" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Teams" />
              <Line type="monotone" dataKey="submissions" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Submissions" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Avg Scores per Round */}
        <ChartCard title="Average Scores by Round" badge="Performance">
          {avg_scores_per_round.length === 0
            ? <EmptyChart message="No scoring data yet" />
            : <ResponsiveContainer width="100%" height={260}>
                <BarChart data={avg_scores_per_round}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="round_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avg_score" fill="#F97316" name="Avg Score" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        {/* Teams per Location */}
        <ChartCard title="Teams by Location" badge="Distribution">
          {locationData.length === 0
            ? <EmptyChart message="No location data yet" />
            : <ResponsiveContainer width="100%" height={260}>
                <BarChart data={locationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="teams" fill="#06B6D4" name="Teams" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        {/* Top Tech Stacks */}
        <ChartCard title="Popular Tech Stacks" badge="Top 10">
          {top_tech_stacks.length === 0
            ? <EmptyChart message="No tech stack data yet" />
            : <ResponsiveContainer width="100%" height={260}>
                <BarChart data={top_tech_stacks} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EC4899" name="Count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{badge}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">{message}</div>
  )
}
