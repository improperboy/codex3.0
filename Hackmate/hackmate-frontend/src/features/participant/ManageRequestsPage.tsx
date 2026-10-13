import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { teamsApi } from '@/api/teams'
import { adminApi } from '@/api/admin'
import { useState } from 'react'
import { useUserMap } from '@/hooks/useUserMap'

export default function ManageRequestsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const { data: myTeam, isLoading: teamLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

  // Redirect if not a leader
  const isLeader = myTeam?.leader_id === user?.id

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['team-join-requests', myTeam?.id],
    queryFn: () => teamsApi.getTeamJoinRequests(myTeam!.id),
    enabled: !!myTeam?.id && isLeader,
  })
  const { mutate: cancelInvite } = useMutation({
    mutationFn: (id: number) => teamsApi.cancelInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-sent-invitations', myTeam?.id] })
      showToast('Invitation cancelled.')
    },
    onError: (err: any) => showError(err?.response?.data?.detail ?? 'Failed to cancel invitation.'),
  })

  const { data: sentInvites = [] } = useQuery({
    queryKey: ['team-sent-invitations', myTeam?.id],
    queryFn: () => teamsApi.getSentInvitations(myTeam!.id),
    enabled: !!myTeam?.id && isLeader,
  })

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

  const pendingInvites = sentInvites.filter((i) => i.status === 'pending')
  const { mutate: respond } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) =>
      teamsApi.respondJoinRequest(id, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['team-join-requests', myTeam?.id] })
      qc.invalidateQueries({ queryKey: ['team-members', myTeam?.id] })
      qc.invalidateQueries({ queryKey: ['my-team'] })
      qc.invalidateQueries({ queryKey: ['team-sent-invitations', myTeam?.id] })
      showToast(vars.status === 'approved' ? 'Request approved! Member added to team.' : 'Request rejected.')
    },
    onError: (err: any) => showError(err?.response?.data?.detail ?? 'Action failed.'),
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

  const pending = requests.filter((r) => r.status === 'pending')
  const processed = requests.filter((r) => r.status !== 'pending')
  const memberCount = myTeam.member_count ?? 0

  // Enrich join request users with real names/emails
  const requestUserIds = requests.map((r) => r.user_id)
  const inviteToUserIds = sentInvites.map((i: any) => i.to_user_id).filter(Boolean)
  const requestUserMap = useUserMap([...new Set([...requestUserIds, ...inviteToUserIds])])

  const enrichedPending = pending.map((r) => ({
    ...r,
    name: r.name ?? requestUserMap[r.user_id]?.name,
    email: r.email ?? requestUserMap[r.user_id]?.email,
  }))
  const enrichedProcessed = processed.map((r) => ({
    ...r,
    name: r.name ?? requestUserMap[r.user_id]?.name,
  }))
  const enrichedInvites = pendingInvites.map((i: any) => ({
    ...i,
    to_user_name: i.to_user_name ?? requestUserMap[i.to_user_id]?.name,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Join Requests</h1>
        <p className="text-gray-500 text-sm">Team: {myTeam.name}</p>
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
                You cannot approve new join requests at this time. The administrator has temporarily disabled team management operations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team capacity */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl text-sm text-blue-700">
        <strong>Team Status:</strong> {memberCount}/{maxTeamSize} members —{' '}
        {memberCount >= maxTeamSize
          ? <span className="text-red-600 font-medium">Team is full</span>
          : <span className="text-green-600 font-medium">{maxTeamSize - memberCount} spot(s) available</span>
        }
      </div>

      {/* Pending Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-yellow-600">⏳ Pending Join Requests ({pending.length})</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending join requests.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {enrichedPending.map((req) => (
              <div key={req.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{req.name ?? 'Applicant'}</p>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                  <p className="text-sm text-gray-500">{req.email ?? ''}</p>
                  {req.message && (
                    <div className="mt-2 bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{req.message}</div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Requested: {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {memberCount < maxTeamSize && (
                    <button
                      onClick={() => { if (confirm(`Approve join request from ${req.name}?`)) respond({ id: req.id, status: 'approved' }) }}
                      disabled={teamMgmtSettings && !teamMgmtSettings.is_currently_active}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✓ Approve
                    </button>
                  )}
                  {memberCount >= maxTeamSize && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Team Full</span>
                  )}
                  <button
                    onClick={() => { if (confirm(`Reject join request from ${req.name}?`)) respond({ id: req.id, status: 'rejected' }) }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent Invitations by Leader */}
      {enrichedInvites.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-blue-600">📤 Sent Invitations ({pendingInvites.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {enrichedInvites.map((inv: any) => (
              <div key={inv.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">Invited: {inv.to_user_name ?? 'Invited User'}</p>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Sent</span>
                  </div>
                  {inv.message && (
                    <div className="mt-2 bg-gray-50 p-3 rounded-lg text-sm text-gray-700 italic border-l-2 border-blue-300">"{inv.message}"</div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Sent: {inv.created_at ? new Date(inv.created_at).toLocaleString() : '—'}
                  </p>
                </div>
                <button
                  onClick={() => { if (confirm('Cancel this invitation?')) cancelInvite(inv.id) }}
                  className="bg-gray-100 hover:bg-red-50 text-red-500 hover:text-red-700 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  🗑️ Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-600">📋 Recent Responses ({processed.length})</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
            {enrichedProcessed.slice(0, 10).map((req) => (
              <div key={req.id} className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{req.name ?? 'Applicant'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      req.status === 'approved' ? 'bg-green-100 text-green-800' :
                      req.status === 'expired' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {req.responded_at ? new Date(req.responded_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
