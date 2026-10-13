import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { adminApi } from '@/api/admin'
import type { Team, TeamMember } from '@/types/team'
import { useUserMap } from '@/hooks/useUserMap'

const statusBadge: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
}

interface TeamDetails extends Team {
  leader_email?: string
}

interface Score {
  id: number
  score: number
  comment?: string
  mentor_name?: string
  round_name?: string
  max_score?: number
  created_at?: string
}

interface Submission {
  github_link?: string
  live_link?: string
  tech_stack?: string
  ppt_link?: string
  demo_video?: string
  submitted_at?: string
}

export default function TeamsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [approveModal, setApproveModal] = useState<{ team: Team } | null>(null)
  const [selectedFloor, setSelectedFloor] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [detailsModal, setDetailsModal] = useState<TeamDetails | null>(null)

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['admin-teams', search, statusFilter],
    queryFn: () => client.get<{ teams: Team[]; total: number }>('/teams/admin/all', {
      params: { search: search || undefined, status: statusFilter || undefined }
    }).then((r) => r.data),
  })

  const { data: floors = [] } = useQuery({ queryKey: ['floors'], queryFn: adminApi.getFloors })
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: adminApi.getRooms })

  const { data: publicSettings = [] } = useQuery({
    queryKey: ['public-settings'],
    queryFn: adminApi.getPublicSettings,
    staleTime: 10 * 1000,
  })
  const maxTeamSize = (() => {
    const s = publicSettings.find((s) => s.setting_key === 'max_team_size')
    return s ? parseInt(s.setting_value, 10) || 4 : 4
  })()

  // Detail modal queries — only run when a team is selected
  const { data: detailTeam } = useQuery({
    queryKey: ['team-detail', detailsModal?.id],
    queryFn: () => client.get<TeamDetails>(`/teams/${detailsModal!.id}`).then((r) => r.data),
    enabled: !!detailsModal,
  })

  const { data: detailMembers = [] } = useQuery({
    queryKey: ['team-members', detailsModal?.id],
    queryFn: () => client.get<TeamMember[]>(`/teams/${detailsModal!.id}/members`).then((r) => r.data),
    enabled: !!detailsModal,
  })

  const { data: detailSubmission } = useQuery<Submission | null>({
    queryKey: ['team-submission', detailsModal?.id],
    queryFn: () =>
      client.get<Submission>(`/submissions/team/${detailsModal!.id}`)
        .then((r) => r.data)
        .catch(() => null),
    enabled: !!detailsModal,
  })

  const { data: detailScores = [] } = useQuery<Score[]>({
    queryKey: ['team-scores', detailsModal?.id],
    queryFn: () =>
      client.get<Score[]>(`/scores/team/${detailsModal!.id}`)
        .then((r) => r.data)
        .catch(() => []),
    enabled: !!detailsModal,
  })

  const teams = teamsData?.teams ?? []

  const approveTeam = useMutation({
    mutationFn: ({ id, floor_id, room_id }: { id: number; floor_id: number; room_id: number }) =>
      client.put(`/teams/${id}/approve`, { floor_id, room_id }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teams'] }); setMsg('Team approved!'); setApproveModal(null) },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      if (Array.isArray(detail)) setErr(detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(', '))
      else setErr(typeof detail === 'string' ? detail : 'Failed to approve')
    },
  })

  const rejectTeam = useMutation({
    mutationFn: (id: number) => client.put(`/teams/${id}/reject`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teams'] }); setMsg('Team rejected') },
    onError: () => setErr('Failed to reject team'),
  })

  const deleteTeam = useMutation({
    mutationFn: (id: number) => client.delete(`/teams/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teams'] }); setMsg('Team deleted') },
    onError: () => setErr('Failed to delete team'),
  })

  const filteredRooms = selectedFloor
    ? rooms.filter((r) => r.floor_id === Number(selectedFloor))
    : rooms

  const [exportingCsv, setExportingCsv] = useState(false)

  const handleExportTeamsCsv = async () => {
    setExportingCsv(true)
    setMsg('')
    setErr('')
    try {
      const blob = await adminApi.exportTeams()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teams_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Teams data exported successfully!')
    } catch {
      setErr('Failed to export teams data')
    } finally {
      setExportingCsv(false)
    }
  }

  const handleExportPdf = async (teamId: number) => {
    try {
      const blob = await adminApi.exportTeamPdf(teamId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `team_${teamId}_report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErr('Failed to export PDF')
    }
  }

  const activeTeam = detailTeam ?? detailsModal

  // Enrich members in the detail modal with real user info
  const detailMemberUserIds = detailMembers.map((m) => m.user_id)
  const detailUserMap = useUserMap(detailMemberUserIds)
  const enrichedDetailMembers = detailMembers.map((m) => ({
    ...m,
    name: (m as any).name ?? detailUserMap[m.user_id]?.name,
    email: (m as any).email ?? detailUserMap[m.user_id]?.email,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage team registrations and approvals</p>
        </div>
        <div className="flex items-center gap-2">
          {teams.filter((t) => t.status === 'pending').length > 0 && (
            <span className="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg text-sm font-medium">
              ⏳ {teams.filter((t) => t.status === 'pending').length} Pending
            </span>
          )}
          <button
            onClick={handleExportTeamsCsv}
            disabled={exportingCsv}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exportingCsv ? '⏳ Exporting…' : '📥 Export Teams'}
          </button>
        </div>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search teams…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={() => { setSearch(''); setStatusFilter('') }}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">Clear</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Teams ({teams.length})</h3>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No teams found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Team</th>
                  <th className="px-5 py-3 text-left">Leader</th>
                  <th className="px-5 py-3 text-left">Members</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{team.name}</div>
                      {team.idea && <div className="text-xs text-gray-500 truncate max-w-[200px]">{team.idea}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{(team as any).leader_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{(team as any).member_count ?? '—'}/{maxTeamSize}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {(team as any).floor_number
                        ? `${(team as any).floor_number} - ${(team as any).room_number}`
                        : <span className="text-red-500 text-xs">Not assigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[team.status ?? 'pending']}`}>
                        {team.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => { setMsg(''); setErr(''); setDetailsModal(team as TeamDetails) }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          👁 View
                        </button>
                        {team.status === 'pending' && (
                          <>
                            <button onClick={() => { setMsg(''); setErr(''); setApproveModal({ team }); setSelectedFloor(''); setSelectedRoom('') }}
                              className="text-green-600 hover:text-green-800 text-xs font-medium">✓ Approve</button>
                            <button onClick={() => { if (confirm('Reject this team?')) { setMsg(''); setErr(''); rejectTeam.mutate(team.id) } }}
                              className="text-red-500 hover:text-red-700 text-xs font-medium">✗ Reject</button>
                          </>
                        )}
                        <button onClick={() => { if (confirm('Delete this team?')) { setMsg(''); setErr(''); deleteTeam.mutate(team.id) } }}
                          className="text-gray-400 hover:text-gray-600 text-xs font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Approve Team: <span className="text-indigo-600">{approveModal.team.name}</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Floor *</label>
                <select value={selectedFloor} onChange={(e) => { setSelectedFloor(e.target.value); setSelectedRoom('') }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Floor</option>
                  {floors.map((f) => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Room *</label>
                <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Room</option>
                  {filteredRooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number} (Cap: {r.capacity})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                disabled={!selectedFloor || !selectedRoom}
                onClick={() => approveTeam.mutate({ id: approveModal.team.id, floor_id: Number(selectedFloor), room_id: Number(selectedRoom) })}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                ✓ Approve & Assign
              </button>
              <button onClick={() => setApproveModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailsModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">{activeTeam?.name}</h3>
              <button onClick={() => setDetailsModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: General Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">ℹ️ General Information</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                    <p><span className="font-medium text-gray-600">Leader:</span> {(activeTeam as any)?.leader_name ?? '—'} {(activeTeam as any)?.leader_email ? `(${(activeTeam as any).leader_email})` : ''}</p>
                    <p><span className="font-medium text-gray-600">Members:</span> {(activeTeam as any)?.member_count ?? detailMembers.length}/{maxTeamSize}</p>
                    <p><span className="font-medium text-gray-600">Location:</span> {(activeTeam as any)?.floor_number ? `${(activeTeam as any).floor_number} - ${(activeTeam as any).room_number}` : 'Not assigned'}</p>
                    <p>
                      <span className="font-medium text-gray-600">Status:</span>{' '}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[activeTeam?.status ?? 'pending']}`}>
                        {activeTeam?.status}
                      </span>
                    </p>
                    {activeTeam?.created_at && (
                      <p><span className="font-medium text-gray-600">Created:</span> {new Date(activeTeam.created_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Project Idea</h4>
                  <p className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{activeTeam?.idea || 'Not provided yet'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Problem Statement</h4>
                  <p className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{activeTeam?.problem_statement || 'Not provided yet'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📦 Submission</h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
                    {detailSubmission ? (
                      <>
                        <p className="text-green-700 font-medium">✓ Project Submitted</p>
                        {detailSubmission.github_link && (
                          <p><span className="font-medium text-gray-600">GitHub:</span>{' '}
                            <a href={detailSubmission.github_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{detailSubmission.github_link}</a>
                          </p>
                        )}
                        {detailSubmission.live_link && (
                          <p><span className="font-medium text-gray-600">Live Demo:</span>{' '}
                            <a href={detailSubmission.live_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{detailSubmission.live_link}</a>
                          </p>
                        )}
                        {detailSubmission.ppt_link && (
                          <p><span className="font-medium text-gray-600">PPT / Slides:</span>{' '}
                            <a href={detailSubmission.ppt_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{detailSubmission.ppt_link}</a>
                          </p>
                        )}
                        {detailSubmission.demo_video && (
                          <p><span className="font-medium text-gray-600">Demo Video:</span>{' '}
                            <a href={detailSubmission.demo_video} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{detailSubmission.demo_video}</a>
                          </p>
                        )}
                        {detailSubmission.tech_stack && (
                          <p><span className="font-medium text-gray-600">Tech Stack:</span> {detailSubmission.tech_stack}</p>
                        )}
                        {detailSubmission.submitted_at && (
                          <p><span className="font-medium text-gray-600">Submitted:</span> {new Date(detailSubmission.submitted_at).toLocaleString()}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-yellow-700 font-medium">⏳ Not Submitted Yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Members & Scores */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">👥 Team Members</h4>
                  {detailMembers.length === 0 ? (
                    <p className="text-gray-400 text-sm">No members found.</p>
                  ) : (
                    <div className="space-y-2">
                      {enrichedDetailMembers.map((m) => (
                        <div key={m.user_id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
                          <span className="text-lg">{m.user_id === activeTeam?.leader_id ? '👑' : '👤'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{m.name ?? 'Team Member'}</p>
                            <p className="text-xs text-gray-500 truncate">{m.email ?? ''}</p>
                            <p className="text-xs text-gray-400">{m.user_id === activeTeam?.leader_id ? 'Team Leader' : m.joined_at ? `Joined: ${new Date(m.joined_at).toLocaleDateString()}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">⭐ Mentor Scores</h4>
                  {detailScores.length === 0 ? (
                    <p className="text-gray-400 text-sm">No scores recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailScores.map((s) => (
                        <div key={s.id} className="border-l-4 border-blue-400 bg-blue-50 rounded p-3">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-medium text-gray-900">{s.round_name ?? 'Round'} by {s.mentor_name ?? '—'}</p>
                            <span className="text-sm font-bold text-blue-600">{s.score}/{s.max_score ?? '?'}</span>
                          </div>
                          {s.comment && <p className="text-xs text-gray-600">{s.comment}</p>}
                          {s.created_at && <p className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleString()}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleExportPdf(detailsModal.id)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                📄 Export PDF Report
              </button>
              <button onClick={() => setDetailsModal(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
