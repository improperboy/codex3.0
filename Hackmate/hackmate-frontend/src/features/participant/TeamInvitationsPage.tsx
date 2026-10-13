import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi } from '@/api/teams'
import { adminApi } from '@/api/admin'
import { useUserMap } from '@/hooks/useUserMap'

export default function TeamInvitationsPage() {
  const qc = useQueryClient()
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const { data: myTeam } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

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

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: teamsApi.getMyInvitations,
  })

  const { mutate: respond } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'accepted' | 'rejected' }) =>
      teamsApi.respondInvitation(id, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-invitations'] })
      qc.invalidateQueries({ queryKey: ['my-team'] })
      showToast(vars.status === 'accepted' ? 'Invitation accepted! You joined the team.' : 'Invitation rejected.')
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg).join(', ')
        : (detail ?? 'Action failed.')
      showError(msg)
    },
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const showError = (msg: string | any) => { 
    const errorMsg = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.map((e: any) => e.msg || e).join(', ') : 'Action failed.'
    setError(errorMsg)
    setTimeout(() => setError(''), 4000) 
  }

  const pending = invitations.filter((i) => i.status === 'pending')
  const history = invitations.filter((i) => i.status !== 'pending')

  // Enrich invitations with from_user_name via user lookup
  const fromUserIds = invitations.map((i) => i.from_user_id).filter(Boolean) as number[]
  const fromUserMap = useUserMap([...new Set(fromUserIds)])
  const enrichedPending = pending.map((i) => ({
    ...i,
    from_user_name: i.from_user_name ?? fromUserMap[i.from_user_id]?.name,
  }))
  const enrichedHistory = history.map((i) => ({
    ...i,
    from_user_name: i.from_user_name ?? fromUserMap[i.from_user_id]?.name,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Invitations</h1>
        <p className="text-gray-500 text-sm">Manage invitations from team leaders</p>
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
                You cannot accept team invitations at this time. The administrator has temporarily disabled team management operations.
              </p>
            </div>
          </div>
        </div>
      )}

      {myTeam && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
          ℹ️ You are already part of a team. You cannot accept new invitations.
        </div>
      )}

      {/* Pending */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-orange-600">⏳ Pending Invitations ({pending.length})</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No pending team invitations.</p>
            <p className="text-sm text-gray-400 mt-1">Team leaders can invite you to join their teams.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {enrichedPending.map((inv) => (
              <div key={inv.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl">👥</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{inv.team_name ?? 'Unnamed Team'}</h4>
                        <p className="text-sm text-gray-500">Invited by: {inv.from_user_name ?? 'Team Leader'}</p>
                      </div>
                    </div>

                    {inv.current_members !== undefined && (
                      <p className="text-sm text-gray-600 mb-2">Team size: {inv.current_members}/{maxTeamSize} members</p>
                    )}

                    {inv.team_idea && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-gray-500">Project Idea</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">{inv.team_idea}</p>
                      </div>
                    )}

                    {inv.message && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-gray-500">Personal Message</p>
                        <p className="text-sm text-gray-700 bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-1">{inv.message}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Received: {inv.created_at ? new Date(inv.created_at).toLocaleString() : '—'}
                    </p>
                  </div>

                  {!myTeam && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => { if (confirm(`Accept invitation to join ${inv.team_name}?`)) respond({ id: inv.id, status: 'accepted' }) }}
                        disabled={teamMgmtSettings && !teamMgmtSettings.is_currently_active}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => { if (confirm(`Reject invitation from ${inv.team_name}?`)) respond({ id: inv.id, status: 'rejected' }) }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-600">📋 Invitation History</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {enrichedHistory.map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{inv.team_name ?? 'Unnamed Team'}</p>
                  <p className="text-sm text-gray-500">From: {inv.from_user_name ?? 'Team Leader'}</p>
                  <p className="text-xs text-gray-400">{inv.responded_at ? new Date(inv.responded_at).toLocaleString() : '—'}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  inv.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
