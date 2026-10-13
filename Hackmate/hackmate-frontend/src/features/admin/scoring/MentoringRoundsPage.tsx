import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scoringApi } from '@/api/scoring'
import type { MentoringRound } from '@/types/score'

const emptyForm = { round_name: '', description: '', start_time: '', end_time: '', max_score: 100, is_active: true }

export default function AdminMentoringRoundsPage() {
  const qc = useQueryClient()
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editRound, setEditRound] = useState<MentoringRound | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: rounds = [], isLoading } = useQuery<MentoringRound[]>({
    queryKey: ['admin-rounds'],
    queryFn: scoringApi.getRounds,
  })

  const openCreate = () => { setForm(emptyForm); setEditRound(null); setShowForm(true) }
  const openEdit = (r: MentoringRound) => {
    setForm({
      round_name: r.round_name,
      description: r.description ?? '',
      start_time: r.start_time?.slice(0, 16) ?? '',
      end_time: r.end_time?.slice(0, 16) ?? '',
      max_score: r.max_score,
      is_active: r.is_active,
    })
    setEditRound(r)
    setShowForm(true)
  }

  const save = useMutation({
    mutationFn: () =>
      editRound
        ? scoringApi.updateRound(editRound.id, form)
        : scoringApi.createRound(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rounds'] })
      setMsg(editRound ? 'Round updated!' : 'Round created!')
      setShowForm(false)
      setEditRound(null)
      setTimeout(() => setMsg(''), 3000)
    },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to save round'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => scoringApi.deleteRound(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rounds'] })
      setDeleteId(null)
      setMsg('Round deleted')
      setTimeout(() => setMsg(''), 3000)
    },
    onError: () => setErr('Failed to delete round'),
  })

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const statusBadge = (r: MentoringRound) => {
    const now = new Date()
    const start = r.start_time ? new Date(r.start_time) : null
    const end = r.end_time ? new Date(r.end_time) : null
    if (!r.is_active) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
    if (start && now < start) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Upcoming</span>
    if (end && now > end) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Ended</span>
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mentoring Rounds</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create and manage mentoring scoring rounds</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Round
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      {/* Rounds List */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading rounds…</div>
      ) : rounds.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">No mentoring rounds yet.</p>
          <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm hover:underline">Create the first round</button>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{r.round_name}</span>
                  {statusBadge(r)}
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Max: {r.max_score} pts</span>
                </div>
                {r.description && <p className="text-sm text-gray-500 truncate">{r.description}</p>}
                <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                  {r.start_time && <span>Start: {new Date(r.start_time).toLocaleString()}</span>}
                  {r.end_time && <span>End: {new Date(r.end_time).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(r)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-indigo-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 border border-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{editRound ? 'Edit Round' : 'New Mentoring Round'}</h3>
              <button onClick={() => { setShowForm(false); setEditRound(null) }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Round Name</label>
                <input
                  value={form.round_name}
                  onChange={(e) => set('round_name', e.target.value)}
                  placeholder="e.g. Round 1 – Technical Review"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => set('start_time', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => set('end_time', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_score}
                  onChange={(e) => set('max_score', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className="text-sm text-gray-700">Active</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); setEditRound(null) }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.round_name}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {save.isPending ? 'Saving…' : editRound ? 'Update Round' : 'Create Round'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Delete Round?</h3>
            <p className="text-sm text-gray-500">All scores associated with this round will also be removed. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={() => remove.mutate(deleteId)}
                disabled={remove.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {remove.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
