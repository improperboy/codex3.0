import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { teamsApi } from '@/api/teams'

export default function MyJoinRequestsPage() {
  const qc = useQueryClient()
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-join-requests'],
    queryFn: teamsApi.getMyJoinRequests,
  })

  const { mutate: cancelRequest } = useMutation({
    mutationFn: (id: number) => teamsApi.cancelJoinRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-join-requests'] })
    },
  })

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Join Requests</h1>
        <p className="text-gray-500 text-sm">Track the status of your team join requests</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">All Requests ({requests.length})</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 mb-4">You haven't sent any join requests yet.</p>
            <Link to="/participant/team/join" className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              Browse Teams
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((req) => (
              <div key={req.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{req.team_name ?? 'Unnamed Team'}</p>
                  {req.leader_name && <p className="text-sm text-gray-500">Leader: {req.leader_name}</p>}
                  {req.message && <p className="text-xs text-gray-400 mt-1 italic">"{req.message}"</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Sent: {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                  {req.status === 'pending' && (
                    <button
                      onClick={() => { if (confirm('Delete this join request?')) cancelRequest(req.id) }}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors text-sm"
                      title="Delete request"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
