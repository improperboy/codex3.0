import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { teamsApi } from '@/api/teams'
import { adminApi } from '@/api/admin'
import { usersApi } from '@/api/users'
import type { User } from '@/types/user'

export default function SearchUsersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [tech, setTech] = useState('')
  const [inviteMsg, setInviteMsg] = useState<Record<number, string>>({})
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const { data: myTeam, isLoading: teamLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

  const isLeader = myTeam?.leader_id === user?.id

  // Fetch dynamic max team size
  const { data: publicSettings = [] } = useQuery({
    queryKey: ['public-settings'],
    queryFn: adminApi.getPublicSettings,
    staleTime: 10 * 1000,
  })
  const maxTeamSize = (() => {
    const s = publicSettings.find((s) => s.setting_key === 'max_team_size')
    return s ? parseInt(s.setting_value, 10) || 4 : 4
  })()
  
  const { data: teamMgmtSettings } = useQuery({
    queryKey: ['team-management-settings'],
    queryFn: adminApi.getTeamManagementSettings,
    staleTime: 10 * 1000,
  })

  const { data: sentInvites = [] } = useQuery({
    queryKey: ['team-sent-invitations', myTeam?.id],
    queryFn: () => teamsApi.getSentInvitations(myTeam!.id),
    enabled: !!myTeam?.id && isLeader,
  })
  const pendingInvitesCount = sentInvites.filter((i: any) => i.status === 'pending').length
  const memberCount = myTeam?.member_count ?? 0
  const totalOccupied = memberCount + pendingInvitesCount
  const canInvite = totalOccupied < maxTeamSize

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-search', search, tech, myTeam?.id],
    queryFn: () => usersApi.search({ q: search || undefined, tech: tech || undefined, team_id: myTeam?.id }),
    enabled: isLeader,
  })

  const { mutate: sendInvite } = useMutation({
    mutationFn: ({ userId, msg }: { userId: number; msg: string }) =>
      teamsApi.sendInvitation(myTeam!.id, { to_user_id: userId, message: msg }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['users-search'] })
      qc.invalidateQueries({ queryKey: ['team-sent-invitations', myTeam?.id] })
      qc.invalidateQueries({ queryKey: ['my-team'] })
      showToast('Invitation sent successfully!')
      setInviteMsg((prev) => ({ ...prev, [vars.userId]: '' }))
    },
    onError: (err: any) => showError(err?.response?.data?.detail ?? 'Failed to send invitation.'),
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const showError = (msg: string | any) => { 
    const errorMsg = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.map((e: any) => e.msg || e).join(', ') : 'Action failed.'
    setError(errorMsg)
    setTimeout(() => setError(''), 4000) 
  }

  if (teamLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!myTeam || !isLeader) {
    navigate('/participant/dashboard')
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Members</h1>
          <p className="text-gray-500 text-sm">Search and invite participants to join your team</p>
        </div>
        <span className="text-sm text-gray-500">
          Team: <span className="font-semibold">{myTeam.name}</span> ({myTeam.member_count ?? 0}/{maxTeamSize})
        </span>
      </div>

      {toast && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{toast}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
      
      {/* Team Management Disabled Alert */}
      {teamMgmtSettings && !teamMgmtSettings.is_currently_active && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 px-5 py-4 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚫</span>
            <div>
              <p className="font-semibold mb-1">Team Management Currently Disabled</p>
              <p className="text-sm text-yellow-800">
                You cannot send team invitations at this time. The administrator has temporarily disabled team management operations.
              </p>
            </div>
          </div>
        </div>
      )}

      {!canInvite && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm space-y-1">
          <p className="font-semibold">
            {memberCount >= maxTeamSize
              ? `⚠️ Team is at maximum capacity (${maxTeamSize}/${maxTeamSize} members).`
              : `⚠️ All ${maxTeamSize} team spots are currently reserved (${memberCount} member(s) + ${pendingInvitesCount} pending invitation(s)).`}
          </p>
          <p className="text-xs text-amber-700">
            {memberCount >= maxTeamSize
              ? 'You cannot invite more members. Maximum team size configured by admin has been reached.'
              : 'Cancel an existing pending invitation from the Join Requests page to invite a different participant.'}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Search & Filter Users</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name or Email</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack</label>
            <input
              type="text"
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              placeholder="e.g., React, Python..."
              className="input"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSearch(''); setTech('') }}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl border border-gray-300 text-sm font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Available Users ({users.length})</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found matching your criteria.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map((u: User) => (
              <UserRow
                key={u.id}
                user={u}
                canInvite={canInvite}
                isFull={memberCount >= maxTeamSize}
                inviteMsg={inviteMsg[u.id] ?? ''}
                onMsgChange={(v) => setInviteMsg((prev) => ({ ...prev, [u.id]: v }))}
                onInvite={() => sendInvite({ userId: u.id, msg: inviteMsg[u.id] ?? '' })}
                isTeamMgmtDisabled={teamMgmtSettings ? !teamMgmtSettings.is_currently_active : false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({ user, canInvite, isFull, inviteMsg, onMsgChange, onInvite, isTeamMgmtDisabled }: {
  user: User
  canInvite: boolean
  isFull: boolean
  inviteMsg: string
  onMsgChange: (v: string) => void
  onInvite: () => void
  isTeamMgmtDisabled: boolean
}) {
  const [showForm, setShowForm] = useState(false)

  const alreadyInTeam = (user.in_team ?? 0) > 0 || (user.is_leader ?? 0) > 0
  const hasPendingInvite = (user.has_pending_invite ?? 0) > 0

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">👤</div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{user.name}</h4>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.tech_stack && (
              <div className="flex flex-wrap gap-1 mt-2">
                {user.tech_stack.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span key={t} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {alreadyInTeam ? (
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Already in team</span>
          ) : hasPendingInvite ? (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">⏳ Invitation sent</span>
          ) : canInvite && !isTeamMgmtDisabled ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              ✉️ Invite
            </button>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
              {isTeamMgmtDisabled ? 'Invites disabled' : isFull ? 'Team full' : 'Slots reserved'}
            </span>
          )}
        </div>
      </div>

      {showForm && canInvite && !alreadyInTeam && !hasPendingInvite && (
        <div className="mt-3 ml-13 space-y-2">
          <textarea
            value={inviteMsg}
            onChange={(e) => onMsgChange(e.target.value)}
            placeholder="Add a personal message... (optional)"
            rows={2}
            className="input resize-none text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onInvite(); setShowForm(false) }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Send Invitation
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
