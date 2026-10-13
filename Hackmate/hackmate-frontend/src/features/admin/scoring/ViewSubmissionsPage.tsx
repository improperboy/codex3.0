import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import client from '@/api/client'
import type { Submission } from '@/types/submission'

export default function ViewSubmissionsPage() {
  const [search, setSearch] = useState('')

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['admin-submissions', search],
    queryFn: () => client.get<{ total: number; submissions: Submission[] }>('/submissions/', { params: { search: search || undefined } }).then((r) => r.data.submissions ?? []),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Submissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">View all team project submissions</p>
        </div>
        <Link to="/admin/export" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          📥 Export Data
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Submissions', value: submissions.length, color: 'bg-indigo-600 text-white' },
          { label: 'With GitHub', value: submissions.filter((s) => s.github_link).length, color: 'bg-white border border-gray-200' },
          { label: 'With Live Demo', value: submissions.filter((s) => s.live_link).length, color: 'bg-white border border-gray-200' },
          { label: 'With PPT / Slides', value: submissions.filter((s) => s.ppt_link).length, color: 'bg-white border border-gray-200' },
          { label: 'With Video', value: submissions.filter((s) => s.demo_video).length, color: 'bg-white border border-gray-200' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-5 ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm mt-0.5 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input type="text" placeholder="Search by team name, tech stack…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Submissions ({submissions.length})</h3>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : submissions.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No submissions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Team</th>
                  <th className="px-5 py-3 text-left">Tech Stack</th>
                  <th className="px-5 py-3 text-left">Submitted</th>
                  <th className="px-5 py-3 text-left">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                          {String((s as any).team_name ?? 'T').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{(s as any).team_name ?? 'Unnamed Team'}</div>
                          {(s as any).leader_name && <div className="text-xs text-gray-500">{(s as any).leader_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.tech_stack ?? '').split(',').slice(0, 3).map((t) => (
                          <span key={t} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">{t.trim()}</span>
                        ))}
                        {(s.tech_stack ?? '').split(',').length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">+{(s.tech_stack ?? '').split(',').length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {s.github_link && <a href={s.github_link} target="_blank" rel="noreferrer" className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">GitHub</a>}
                        {s.live_link && <a href={s.live_link} target="_blank" rel="noreferrer" className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors">Live</a>}
                        {s.ppt_link && <a href={s.ppt_link} target="_blank" rel="noreferrer" className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors">PPT</a>}
                        {s.demo_video && <a href={s.demo_video} target="_blank" rel="noreferrer" className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors">Video</a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
