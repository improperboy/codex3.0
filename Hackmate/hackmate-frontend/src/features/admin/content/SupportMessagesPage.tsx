import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'

const priorityBadge: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const statusBadge: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
}

export default function SupportMessagesPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['support-messages', statusFilter, priorityFilter],
    queryFn: () => adminApi.getSupportMessages({ status: statusFilter || undefined, priority: priorityFilter || undefined }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminApi.updateSupportStatus(id, status, notes || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-messages'] }); setMsg('Status updated!'); setSelected(null); setNotes('') },
  })

  const deleteMsg = useMutation({
    mutationFn: adminApi.deleteSupportMessage,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-messages'] }); setMsg('Message deleted') },
  })

  const openCount = messages.filter((m) => m.status === 'open').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Messages</h1>
          <p className="text-gray-500 text-sm mt-0.5">Handle support tickets from participants, mentors, and volunteers</p>
        </div>
        {openCount > 0 && (
          <span className="bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-sm font-medium">
            ⚠️ {openCount} Open
          </span>
        )}
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button onClick={() => { setStatusFilter(''); setPriorityFilter('') }}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">Clear</button>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Messages ({messages.length})</h3>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No messages found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((m) => (
              <div key={m.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-900 text-sm">{m.subject ?? 'Support Request'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[m.status]}`}>{m.status}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityBadge[m.priority]}`}>{m.priority}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{m.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>From: {m.from_role}</span>
                      <span>To: {m.to_role}</span>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    {m.resolution_notes && (
                      <div className="mt-2 bg-green-50 border border-green-100 rounded px-3 py-2 text-xs text-green-700">
                        Resolution: {m.resolution_notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {m.status === 'open' && (
                      <button onClick={() => { setSelected(m.id); setNotes('') }}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">Resolve</button>
                    )}
                    <button onClick={() => { if (confirm('Delete this message?')) deleteMsg.mutate(m.id) }}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors">Delete</button>
                  </div>
                </div>

                {/* Resolve inline */}
                {selected === m.id && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2">
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Resolution notes (optional)…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    <div className="flex gap-2">
                      {['in_progress', 'resolved', 'closed'].map((s) => (
                        <button key={s} onClick={() => updateStatus.mutate({ id: m.id, status: s })}
                          className="text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1 rounded transition-colors capitalize">
                          → {s.replace('_', ' ')}
                        </button>
                      ))}
                      <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
