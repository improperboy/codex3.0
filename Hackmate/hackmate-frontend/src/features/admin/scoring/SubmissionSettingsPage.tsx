import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionsApi } from '@/api/submissions'
import { adminApi } from '@/api/admin'
import type { Submission } from '@/types/submission'

export default function SubmissionSettingsPage() {
  const qc = useQueryClient()
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Submission window settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['submission-settings'],
    queryFn: submissionsApi.getSettings,
  })

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Sync form when settings load
  useState(() => {
    if (settings) {
      setStartTime(settings.start_time?.slice(0, 16) ?? '')
      setEndTime(settings.end_time?.slice(0, 16) ?? '')
      setIsActive(settings.is_active)
    }
  })

  const updateSettings = useMutation({
    mutationFn: () =>
      submissionsApi.updateSettings({ start_time: startTime, end_time: endTime, is_active: isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submission-settings'] }); setMsg('Settings saved!') },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to save'),
  })

  // All submissions list
  const { data: submissionsData, isLoading: loadingSubs } = useQuery({
    queryKey: ['admin-submissions-list'],
    queryFn: () => adminApi.listSubmissions(),
  })
  const submissions: Submission[] = submissionsData?.submissions ?? []

  const deleteSub = useMutation({
    mutationFn: (id: number) => adminApi.deleteSubmission(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-submissions-list'] }); setDeleteId(null); setMsg('Submission deleted') },
    onError: () => setErr('Failed to delete submission'),
  })

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submission Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage submission window and review all project submissions</p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-medium">Admin Only</span>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      {/* Submission Window Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Submission Window</h2>
        {loadingSettings ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={startTime || (settings?.start_time?.slice(0, 16) ?? '')}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                value={endTime || (settings?.end_time?.slice(0, 16) ?? '')}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive ?? settings?.is_active ?? false}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <span className="text-sm text-gray-700">Submissions Active</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${(isActive ?? settings?.is_active) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {(isActive ?? settings?.is_active) ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                onClick={() => updateSettings.mutate()}
                disabled={updateSettings.isPending}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {updateSettings.isPending ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">All Submissions</h2>
          <span className="text-xs text-gray-400">{submissions.length} total</span>
        </div>
        {loadingSubs ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading submissions…</div>
        ) : submissions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No submissions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Team ID</th>
                  <th className="px-4 py-3 text-left">GitHub</th>
                  <th className="px-4 py-3 text-left">Tech Stack</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">#{s.team_id}</td>
                    <td className="px-4 py-3">
                      <a href={s.github_link} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline truncate max-w-[180px] block">
                        {s.github_link.replace('https://github.com/', '')}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{s.tech_stack}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Delete Submission?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone. The submission will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={() => deleteSub.mutate(deleteId)}
                disabled={deleteSub.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSub.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
