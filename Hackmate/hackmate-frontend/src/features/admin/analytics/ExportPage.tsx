import { useState } from 'react'
import { adminApi } from '@/api/admin'

const EXPORTS = [
  { key: 'users', label: 'Users', desc: 'All registered users with roles', icon: '👤', color: 'blue' },
  { key: 'teams', label: 'Teams', desc: 'All teams with leader, members, idea, PPT & repo links', icon: '👥', color: 'green' },
  { key: 'submissions', label: 'Submissions', desc: 'Project submissions with GitHub, Live & PPT links', icon: '📤', color: 'purple' },
  { key: 'scores', label: 'Scores', desc: 'All mentor scores per round', icon: '⭐', color: 'yellow' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const handleExport = async (type: string) => {
    setLoading(type); setMsg(''); setErr('')
    try {
      let blob: Blob
      const ts = new Date().toISOString().slice(0, 10)
      if (type === 'users') blob = await adminApi.exportUsers()
      else if (type === 'teams') blob = await adminApi.exportTeams()
      else if (type === 'submissions') blob = await adminApi.exportSubmissions()
      else if (type === 'scores') blob = await adminApi.exportScores()
      else return
      downloadBlob(blob, `${type}_export_${ts}.csv`)
      setMsg(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully!`)
    } catch {
      setErr(`Failed to export ${type}`)
    } finally {
      setLoading(null)
    }
  }

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
        <p className="text-gray-500 text-sm mt-0.5">Download hackathon data as CSV files</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">✅ {msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">❌ {err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORTS.map((e) => (
          <button key={e.key} onClick={() => handleExport(e.key)} disabled={loading === e.key}
            className={`${colorMap[e.color]} border rounded-xl p-5 text-left transition-all disabled:opacity-50 group`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{e.icon}</span>
              {loading === e.key
                ? <span className="text-xs text-gray-500">Downloading…</span>
                : <span className="text-xs text-gray-400 group-hover:text-gray-600">📥 CSV</span>}
            </div>
            <div className="font-semibold text-gray-900">{e.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{e.desc}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-2">📄 Team PDF Reports</h3>
        <p className="text-sm text-gray-600">
          Export detailed PDF reports for individual teams. Go to{' '}
          <a href="/admin/teams" className="text-indigo-600 hover:underline">Manage Teams</a>{' '}
          and use the export button on any team.
        </p>
      </div>
    </div>
  )
}
