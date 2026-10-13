import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { teamsApi } from '@/api/teams'
import { adminApi } from '@/api/admin'
import { submissionsApi } from '@/api/submissions'
import { Users, Upload, Trophy, Clock, CheckCircle, AlertTriangle, Send } from 'lucide-react'
import type { Team, TeamMember } from '@/types/team'
import type { Submission, SubmissionSettings } from '@/types/submission'
import type { JoinRequest } from '@/types/team'
import { useUserMap } from '@/hooks/useUserMap'

export default function ParticipantDashboard() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [toast, setToast] = useState('')
  const [toastError, setToastError] = useState('')

  // getMyTeam returns null (no team) or a Team object — never throws on 404.
  // This means:
  //   isLoading === true  → request still in-flight, render the spinner
  //   data === null       → confirmed: user has no team
  //   data === Team       → confirmed: user has a team
  // We never fall through to the "No Team" UI while still loading.
  const { data: myTeam, isLoading: teamLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: 1,
    staleTime: 60_000, // treat a fresh result as valid for 60 s — prevents redundant re-fetches on remount
  })

  // Only fetch join-requests once we know the user has no team (data is null).
  // Previously `enabled: !myTeam` also fired during the loading phase (myTeam === undefined),
  // which sent unnecessary requests and amplified backend load on rapid reloads.
  const { data: myJoinRequests } = useQuery({
    queryKey: ['my-join-requests'],
    queryFn: teamsApi.getMyJoinRequests,
    enabled: myTeam === null,
  })

  const { data: submission } = useQuery({
    queryKey: ['submission', myTeam?.id],
    queryFn: () => submissionsApi.getByTeam(myTeam!.id),
    enabled: !!myTeam?.id,
    retry: false,
  })

  const { data: submissionSettings } = useQuery({
    queryKey: ['submission-settings'],
    queryFn: submissionsApi.getSettings,
    retry: false,
  })

  // Fetch dynamic team size settings.
  // staleTime: 0 was overriding the global 30 s default and causing an extra
  // refetch on every remount — contributing to DB pool pressure on rapid reloads.
  const { data: publicSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['public-settings'],
    queryFn: adminApi.getPublicSettings,
    staleTime: 30_000,
  })
  const getSetting = (key: string, fallback: number) => {
    if (!publicSettings) return fallback
    const s = publicSettings.find((s) => s.setting_key === key)
    return s ? parseInt(s.setting_value, 10) || fallback : fallback
  }
  const minTeamSize = getSetting('min_team_size', 1)
  const maxTeamSize = getSetting('max_team_size', 4)

  // Fetch live member list so memberCount is always accurate (not stale from team.member_count)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', myTeam?.id],
    queryFn: () => teamsApi.getMembers(myTeam!.id),
    enabled: !!myTeam?.id,
  })

  const pendingRequests = (myJoinRequests ?? []).filter((r) => r.status === 'pending')
  const isLeader = myTeam?.leader_id === user?.id
  // Use live members.length — myTeam.member_count can be stale and cause the button to never appear
  const memberCount = myTeam ? (teamMembers.length > 0 ? teamMembers.length : (myTeam.member_count ?? 0)) : 0
  const submissionStatus = submission ? 'Submitted' : submissionSettings ? 'Pending' : 'Not Available'

  // Can submit: leader, draft status only (not pending), member count within [min, max]
  const canSubmitForApproval =
    isLeader &&
    myTeam?.status === 'draft' &&
    memberCount >= minTeamSize &&
    memberCount <= maxTeamSize

  const { mutate: submitForApproval, isPending: submitting } = useMutation({
    mutationFn: () => teamsApi.submitTeamForApproval(myTeam!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team'] })
      qc.invalidateQueries({ queryKey: ['team', myTeam?.id] })
      qc.invalidateQueries({ queryKey: ['team-members', myTeam?.id] })
      setToast('Team submitted for approval! Admins will review your team.')
      setTimeout(() => setToast(''), 4000)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Failed to submit for approval.'
      setToastError(msg)
      setTimeout(() => setToastError(''), 4000)
    },
  })

  const handleSubmitForApproval = () => {
    if (confirm('Submit this team for admin approval? Make sure your team is ready.')) {
      submitForApproval()
    }
  }

  if (teamLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard…</div>
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-500 mt-1">Hi {user?.name}, ready to build something amazing?</p>
      </div>

      {/* Toasts */}
      {toast && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{toast}</div>}
      {toastError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{toastError}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Team Status"
          value={myTeam ? 'Active' : 'No Team'}
          sub={myTeam ? `Team: ${myTeam.name}` : undefined}
          subColor="text-green-600"
          icon={<Users className="text-white w-5 h-5" />}
          gradient="from-blue-500 to-purple-600"
        />

        {myTeam ? (
          <>
            <StatCard
              label="Team Members"
              value={settingsLoading ? `${memberCount}/…` : `${memberCount}/${maxTeamSize}`}
              sub={
                settingsLoading
                  ? 'Loading settings…'
                  : memberCount < maxTeamSize
                  ? 'Can add more members'
                  : 'Team is full'
              }
              icon={<Users className="text-white w-5 h-5" />}
              gradient="from-orange-500 to-red-600"
            />
            <StatCard
              label="Submission"
              value={submissionStatus}
              sub={submission ? 'Project submitted' : submissionSettings ? 'Submission pending' : 'Submissions closed'}
              icon={submission ? <CheckCircle className="text-white w-5 h-5" /> : <Upload className="text-white w-5 h-5" />}
              gradient="from-purple-500 to-pink-600"
            />
            <StatCard
              label="Location"
              value={myTeam.floor_number && myTeam.room_number ? `F${myTeam.floor_number} R${myTeam.room_number}` : 'Not Assigned'}
              icon={<Trophy className="text-white w-5 h-5" />}
              gradient="from-green-500 to-teal-600"
            />
          </>
        ) : (
          <StatCard
            label="Your Requests"
            value={String(pendingRequests.length)}
            sub={pendingRequests.length > 0 ? 'Pending responses' : 'No active requests'}
            icon={<Send className="text-white w-5 h-5" />}
            gradient="from-purple-500 to-pink-600"
          />
        )}
      </div>

      {/* Status Banner */}
      <StatusBanner
        myTeam={myTeam}
        pendingRequests={pendingRequests}
        isLeader={isLeader}
        memberCount={memberCount}
        minTeamSize={minTeamSize}
        canSubmitForApproval={canSubmitForApproval}
        submitting={submitting}
        onSubmitForApproval={handleSubmitForApproval}
      />

      {/* Countdown */}
      {submissionSettings && myTeam?.status === 'approved' && (
        <Countdown endTime={submissionSettings.end_time} />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions
            myTeam={myTeam}
            isLeader={isLeader}
            pendingRequests={pendingRequests}
            submission={submission}
            submissionSettings={submissionSettings}
            canSubmitForApproval={canSubmitForApproval}
            submitting={submitting}
            onSubmitForApproval={handleSubmitForApproval}
            memberCount={memberCount}
            minTeamSize={minTeamSize}
          />
          {myTeam && <TeamMembersCard members={teamMembers} leaderId={myTeam.leader_id} maxTeamSize={settingsLoading ? undefined : maxTeamSize} />}
          {myTeam && submission && <SubmissionCard submission={submission} />}
        </div>
        <div>
          <QuickLinks myTeam={myTeam} isLeader={isLeader} />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subColor, icon, gradient }: {
  label: string; value: string; sub?: string; subColor?: string; icon: React.ReactNode; gradient: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {sub && <p className={`text-sm mt-3 ${subColor ?? 'text-gray-500'} truncate`}>{sub}</p>}
    </div>
  )
}

function StatusBanner({
  myTeam,
  pendingRequests,
  isLeader,
  memberCount,
  minTeamSize,
  canSubmitForApproval,
  submitting,
  onSubmitForApproval,
}: {
  myTeam: Team | undefined | null
  pendingRequests: JoinRequest[]
  isLeader: boolean
  memberCount: number
  minTeamSize: number
  canSubmitForApproval: boolean
  submitting: boolean
  onSubmitForApproval: () => void
}) {
  if (myTeam) {
    const statusLabel = myTeam.status === 'draft' ? 'Draft (not submitted)' : myTeam.status === 'pending' ? 'Pending Approval' : myTeam.status === 'approved' ? 'Approved' : 'Rejected'

    // Show a prominent submit CTA when leader's team is ready (draft status only, not pending)
    const showSubmitCTA = isLeader && myTeam.status === 'draft' && canSubmitForApproval

    return (
      <div className={`${myTeam.status === 'pending' ? 'bg-orange-50 border-orange-200' : myTeam.status === 'draft' ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'} border rounded-2xl p-5 flex items-start gap-4`}>
        <div className={`w-10 h-10 ${myTeam.status === 'pending' ? 'bg-orange-500' : myTeam.status === 'draft' ? 'bg-gray-400' : 'bg-green-500'} rounded-xl flex items-center justify-center shrink-0`}>
          {myTeam.status === 'pending' || myTeam.status === 'draft' ? <Clock className="text-white w-5 h-5" /> : <CheckCircle className="text-white w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${myTeam.status === 'pending' ? 'text-orange-900' : myTeam.status === 'draft' ? 'text-gray-700' : 'text-green-900'}`}>
            You're part of team: {myTeam.name}{' '}
            <span className="font-normal text-sm">({statusLabel})</span>
          </h3>
          {myTeam.leader_name && <p className={`${myTeam.status === 'pending' ? 'text-orange-700' : myTeam.status === 'draft' ? 'text-gray-500' : 'text-green-700'} text-sm mt-0.5`}>Leader: {myTeam.leader_name}</p>}
          {myTeam.theme_name && (
            <div className="flex items-center gap-2 mt-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: myTeam.theme_color }} />
              <span className={`${myTeam.status === 'pending' ? 'text-orange-700' : myTeam.status === 'draft' ? 'text-gray-500' : 'text-green-700'} text-sm`}>Theme: {myTeam.theme_name}</span>
            </div>
          )}
          {myTeam.floor_number && myTeam.room_number && (
            <p className={`${myTeam.status === 'pending' ? 'text-orange-700' : myTeam.status === 'draft' ? 'text-gray-500' : 'text-green-700'} text-sm mt-1`}>📍 Floor {myTeam.floor_number}, Room {myTeam.room_number}</p>
          )}

          {/* Submit for approval CTA — only for leader when team has enough members */}
          {showSubmitCTA && (
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-indigo-700 font-medium">
                🎉 Your team has {memberCount} member{memberCount !== 1 ? 's' : ''} — ready for approval!
              </p>
              <button
                onClick={onSubmitForApproval}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors shrink-0"
              >
                {submitting ? 'Submitting…' : '🚀 Send for Approval'}
              </button>
            </div>
          )}

          {/* Locked approval hint when team does not have minimum members yet */}
          {isLeader && myTeam.status === 'draft' && memberCount < minTeamSize && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-amber-800">
                🔒 Approval Locked: {memberCount}/{minTeamSize} minimum members required to submit for approval.
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Invite {minTeamSize - memberCount} more participant(s) or accept join requests to unlock admin approval submission.
              </p>
            </div>
          )}

          {/* Hint for non-leader members when team is ready */}
          {!isLeader && myTeam.status === 'draft' && memberCount >= minTeamSize && (
            <p className="text-sm text-gray-500 mt-3">
              ℹ️ Team is ready — ask your team leader to send it for approval.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (pendingRequests.length > 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
          <Send className="text-white w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900">
              {pendingRequests.length} Pending Join Request{pendingRequests.length > 1 ? 's' : ''}
            </h3>
            <Link to="/participant/join-requests" className="text-blue-600 text-sm hover:underline">View Details →</Link>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            When a team accepts, all other pending requests are automatically cancelled.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shrink-0">
        <AlertTriangle className="text-white w-5 h-5" />
      </div>
      <div>
        <h3 className="font-semibold text-yellow-900">Ready to Join the Action?</h3>
        <p className="text-yellow-700 text-sm mt-1">Create a new team or join an existing one to participate.</p>
        <div className="flex gap-3 mt-3">
          <Link to="/participant/team/create" className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors">
            Create Team
          </Link>
          <Link to="/participant/team/join" className="bg-white text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium border border-yellow-300 hover:bg-yellow-50 transition-colors">
            Join Team
          </Link>
        </div>
      </div>
    </div>
  )
}

function QuickActions({
  myTeam,
  isLeader,
  pendingRequests,
  submission,
  submissionSettings,
  canSubmitForApproval,
  submitting,
  onSubmitForApproval,
  memberCount,
  minTeamSize,
}: {
  myTeam: Team | undefined | null
  isLeader: boolean
  pendingRequests: JoinRequest[]
  submission: Submission | undefined
  submissionSettings: SubmissionSettings | undefined
  canSubmitForApproval: boolean
  submitting: boolean
  onSubmitForApproval: () => void
  memberCount: number
  minTeamSize: number
}) {
  if (!myTeam) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4">{pendingRequests.length > 0 ? 'Actions' : 'Get Started'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard to="/participant/team/create" gradient="from-blue-500 to-indigo-600" icon="➕" title="Create Team" desc="Start your own team and invite others." />
          <ActionCard to="/participant/team/join" gradient="from-green-500 to-emerald-600" icon="🤝" title="Join Team" desc="Find and join an existing team." />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-4">Team Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ActionCard to={`/participant/team/${myTeam.id}`} gradient="from-purple-500 to-pink-600" icon="👥" title="Team Details" small />
        {isLeader && (
          <>
            <ActionCard to="/participant/manage-requests" gradient="from-indigo-500 to-blue-600" icon="✅" title="Join Requests" small />
            <ActionCard to="/participant/search-users" gradient="from-cyan-500 to-teal-600" icon="🔍" title="Find Members" small />
            {/* Submit for Approval — shows only when team is draft (not pending) */}
            {myTeam.status === 'draft' && (
              canSubmitForApproval ? (
                <SubmitApprovalCard submitting={submitting} onSubmit={onSubmitForApproval} />
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <span>🔒</span> Approval Locked
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Need min {minTeamSize} members ({memberCount}/{minTeamSize})
                    </p>
                  </div>
                  <Link to={`/participant/team/${myTeam.id}`} className="text-[11px] text-indigo-600 hover:underline font-medium mt-2">
                    Manage Team →
                  </Link>
                </div>
              )
            )}
            {submissionSettings && myTeam.status === 'approved' && (
              <ActionCard to="/participant/submit" gradient="from-orange-500 to-red-600" icon="📤" title={submission ? 'Update Project' : 'Submit Project'} small />
            )}
          </>
        )}
        {myTeam.status === 'approved' && (
          <ActionCard to="/participant/mentoring-rounds" gradient="from-teal-500 to-green-600" icon="🎓" title="Mentoring" small />
        )}
        <ActionCard to="/participant/rankings" gradient="from-yellow-500 to-orange-600" icon="🏆" title="Rankings" small />
      </div>
    </div>
  )
}

function ActionCard({ to, gradient, icon, title, desc, small }: {
  to: string; gradient: string; icon: string; title: string; desc?: string; small?: boolean
}) {
  return (
    <Link to={to} className="group bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl p-4 transition-all">
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-lg`}>
        {icon}
      </div>
      <p className={`font-medium text-gray-900 ${small ? 'text-sm' : ''}`}>{title}</p>
      {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
    </Link>
  )
}

function SubmitApprovalCard({ submitting, onSubmit }: { submitting: boolean; onSubmit: () => void }) {
  return (
    <button
      onClick={onSubmit}
      disabled={submitting}
      className="group bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl p-4 transition-all text-left"
    >
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-lg">
        🚀
      </div>
      <p className="font-medium text-indigo-900 text-sm">
        {submitting ? 'Submitting…' : 'Send for Approval'}
      </p>
    </button>
  )
}

function TeamMembersCard({ members, leaderId, maxTeamSize }: { members: TeamMember[]; leaderId?: number; maxTeamSize?: number }) {
  const userMap = useUserMap(members.map((m) => m.user_id))
  const enriched = members.map((m) => ({
    ...m,
    name: m.name ?? userMap[m.user_id]?.name,
    email: m.email ?? userMap[m.user_id]?.email,
  }))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-500" /> Team Members ({members.length}{maxTeamSize != null ? `/${maxTeamSize}` : ''})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {enriched.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {(m.name ?? 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{m.name ?? 'Team Member'}</p>
                {m.user_id === leaderId && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full shrink-0">Leader</span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{m.email ?? ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubmissionCard({ submission }: { submission: Submission }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500" /> Your Submission
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 mb-1">GitHub Repository</p>
          <a href={submission.github_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{submission.github_link}</a>
        </div>
        {submission.live_link && (
          <div>
            <p className="text-gray-500 mb-1">Live Demo</p>
            <a href={submission.live_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{submission.live_link}</a>
          </div>
        )}
        <div>
          <p className="text-gray-500 mb-1">Tech Stack</p>
          <p className="text-gray-800">{submission.tech_stack}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Submitted</p>
          <p className="text-gray-800">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}</p>
        </div>
      </div>
    </div>
  )
}

function Countdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft(endTime))

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calcTimeLeft(endTime)), 1000)
    return () => clearInterval(t)
  }, [endTime])

  const segments = [
    { label: 'Days', value: timeLeft.days, gradient: 'from-red-500 to-pink-600' },
    { label: 'Hours', value: timeLeft.hours, gradient: 'from-orange-500 to-red-600' },
    { label: 'Minutes', value: timeLeft.minutes, gradient: 'from-yellow-500 to-orange-600' },
    { label: 'Seconds', value: timeLeft.seconds, gradient: 'from-green-500 to-yellow-600' },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-500" /> Submission Deadline
        </h3>
        <span className="text-sm text-gray-500">{new Date(endTime).toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {segments.map(({ label, value, gradient }) => (
          <div key={label} className={`rounded-2xl p-4 text-center text-white bg-gradient-to-br ${gradient}`}>
            <div className="text-3xl font-bold">{String(value).padStart(2, '0')}</div>
            <div className="text-xs opacity-90">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickLinks(_: { myTeam: Team | undefined | null; isLeader: boolean }) {
  const links = [
    { to: '/participant/rankings', label: '🏆 Rankings' },
    { to: '/participant/announcements', label: '📢 Announcements' },
    { to: '/participant/invitations', label: '✉️ Invitations' },
    { to: '/participant/support', label: '💬 Support' },
    { to: '/participant/change-password', label: '🔑 Change Password' },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-3">Quick Links</h3>
      <div className="space-y-1">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function calcTimeLeft(endTime: string) {
  const diff = Math.max(0, new Date(endTime).getTime() - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}
