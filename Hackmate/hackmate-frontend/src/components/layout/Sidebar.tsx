import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import { teamsApi } from '@/api/teams'

interface NavItem {
  label: string
  to: string
  icon: string
  badge?: number
}

// Static nav for non-participant roles
const STATIC_NAV: Record<string, NavItem[]> = {
  mentor: [
    { label: 'Dashboard', to: '/mentor/dashboard', icon: '🏠' },
    { label: 'My Teams', to: '/mentor/teams', icon: '👥' },
    { label: 'Score Teams', to: '/mentor/score', icon: '⭐' },
    { label: 'History', to: '/mentor/history', icon: '📋' },
    { label: 'Schedule', to: '/mentor/schedule', icon: '�' },
    { label: 'Rankings', to: '/mentor/rankings', icon: '🏆' },
    { label: 'Announcements', to: '/mentor/announcements', icon: '📢' },
    { label: 'Support', to: '/mentor/support', icon: '💬' },
  ],
  volunteer: [
    { label: 'Dashboard', to: '/volunteer/dashboard', icon: '🏠' },
    { label: 'View Teams', to: '/volunteer/teams', icon: '👥' },
    { label: 'Mentors', to: '/volunteer/mentors', icon: '🎓' },
    { label: 'Support Requests', to: '/volunteer/support', icon: '💬' },
    { label: 'Rankings', to: '/volunteer/rankings', icon: '🏆' },
    { label: 'Announcements', to: '/volunteer/announcements', icon: '📢' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: '🏠' },
    { label: 'Users', to: '/admin/users', icon: '👤' },
    { label: 'Teams', to: '/admin/teams', icon: '👥' },
    { label: 'Venue', to: '/admin/venue', icon: '🏢' },
    { label: 'Analytics', to: '/admin/analytics', icon: '📊' },
    { label: 'Submissions', to: '/admin/submissions', icon: '📤' },
    { label: 'Submission Settings', to: '/admin/submission-settings', icon: '⏱️' },
    { label: 'Mentoring Rounds', to: '/admin/mentoring-rounds', icon: '🎓' },
    { label: 'Rankings', to: '/admin/rankings', icon: '🏆' },
    { label: 'Mentor Assign', to: '/admin/mentor-assignments', icon: '🎓' },
    { label: 'Volunteer Assign', to: '/admin/volunteer-assignments', icon: '🤝' },
    { label: 'AI Recommendations', to: '/admin/mentor-recommendations', icon: '🤖' },
    { label: 'AI Event Wizard', to: '/admin/ai-wizard', icon: '✨' },
    { label: 'Announcements', to: '/admin/announcements', icon: '📢' },
    { label: 'Themes', to: '/admin/themes', icon: '🎨' },
    { label: 'Support', to: '/admin/support', icon: '💬' },
    { label: 'Activity', to: '/admin/activity', icon: '📋' },
    { label: 'Settings', to: '/admin/settings', icon: '⚙️' },
    { label: 'Export', to: '/admin/export', icon: '📥' },
  ],
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user)

  if (user?.role === 'participant') {
    return <ParticipantSidebar open={open} onClose={onClose} user={user} />
  }

  const items = STATIC_NAV[user?.role ?? ''] ?? []

  return (
    <SidebarShell open={open} onClose={onClose} user={user}>
      {items.map((item) => <SidebarLink key={item.to} item={item} onClose={onClose} />)}
    </SidebarShell>
  )
}

// ── Participant sidebar — dynamic based on team state ──────────────────────

function ParticipantSidebar({ open, onClose, user }: { open: boolean; onClose: () => void; user: any }) {
  const { data: myTeam } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-join-requests'],
    queryFn: teamsApi.getMyJoinRequests,
    enabled: !myTeam,
  })

  const { data: myInvitations = [] } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: teamsApi.getMyInvitations,
    enabled: !myTeam,
  })

  const { data: joinRequests = [] } = useQuery({
    queryKey: ['team-join-requests', myTeam?.id],
    queryFn: () => teamsApi.getTeamJoinRequests(myTeam!.id),
    enabled: !!myTeam?.id && myTeam?.leader_id === user?.id,
  })

  const isLeader = myTeam?.leader_id === user?.id
  const pendingRequests = myRequests.filter((r) => r.status === 'pending').length
  const pendingInvitations = myInvitations.filter((i) => i.status === 'pending').length
  const pendingJoinRequests = joinRequests.filter((r) => r.status === 'pending').length

  const baseItems: NavItem[] = [
    { label: 'Dashboard', to: '/participant/dashboard', icon: '🏠' },
  ]

  const teamItems: NavItem[] = myTeam
    ? [
        { label: 'My Team', to: `/participant/team/${myTeam.id}`, icon: '👥' },
        ...(myTeam.status === 'approved' ? [{ label: 'Mentoring Rounds', to: '/participant/mentoring-rounds', icon: '🎓' }] : []),
        ...(isLeader
          ? [
              { label: 'Join Requests', to: '/participant/manage-requests', icon: '✅', badge: pendingJoinRequests || undefined },
              { label: 'Find Members', to: '/participant/search-users', icon: '🔍' },
              ...(myTeam.status === 'approved' ? [{ label: 'Submit Project', to: '/participant/submit', icon: '📤' }] : []),
            ]
          : []),
      ]
    : [
        { label: 'Create Team', to: '/participant/team/create', icon: '➕' },
        { label: 'Join Teams', to: '/participant/team/join', icon: '🤝' },
      ]

  const activityItems: NavItem[] = [
    { label: 'Invitations', to: '/participant/invitations', icon: '✉️', badge: pendingInvitations || undefined },
    ...(!myTeam ? [{ label: 'Join Requests', to: '/participant/join-requests', icon: '📨', badge: pendingRequests || undefined }] : []),
    { label: 'Rankings', to: '/participant/rankings', icon: '🏆' },
    { label: 'Announcements', to: '/participant/announcements', icon: '📢' },
  ]

  const supportItems: NavItem[] = [
    { label: 'Get Help', to: '/participant/support', icon: '💬' },
  ]

  return (
    <SidebarShell open={open} onClose={onClose} user={user}>
      {baseItems.map((item) => <SidebarLink key={item.to} item={item} onClose={onClose} />)}

      {teamItems.length > 0 && (
        <>
          <div className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</div>
          {teamItems.map((item) => <SidebarLink key={item.to} item={item} onClose={onClose} />)}
        </>
      )}

      <div className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Activity</div>
      {activityItems.map((item) => <SidebarLink key={item.to} item={item} onClose={onClose} />)}

      <div className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Support</div>
      {supportItems.map((item) => <SidebarLink key={item.to} item={item} onClose={onClose} />)}
    </SidebarShell>
  )
}

// ── Shared shell ───────────────────────────────────────────────────────────

function SidebarShell({ open, onClose, user, children }: {
  open: boolean; onClose: () => void; user: any; children: React.ReactNode
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-200 z-30 flex flex-col
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0 lg:z-auto
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-gray-200 shrink-0 bg-gradient-to-r from-purple-600 to-blue-600">
          <span className="text-lg font-bold text-white">HackMate</span>
        </div>

        {/* User info */}
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {(user?.name ?? 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {children}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 space-y-1">
          <NavLink
            to={`/${user?.role}/change-password`}
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-white rounded-lg transition-colors"
          >
            🔑 Change Password
          </NavLink>
          <button
            onClick={() => {
              useAuthStore.getState().logout()
              window.location.href = '/login'
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({ item, onClose }: { item: NavItem; onClose: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all ${
          isActive
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <span className="flex items-center gap-2.5">
        <span>{item.icon}</span>
        {item.label}
      </span>
      {item.badge ? (
        <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  )
}
