import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { ActivityLog } from '@/api/admin'

const ACTION_ICONS: Record<string, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  login: '🔑',
  logout: '🚪',
  approve: '✅',
  reject: '❌',
  assign: '📌',
  export: '📥',
  register: '🆕',
  generate: '🤖',
}

const getIcon = (action: string) => {
  const key = Object.keys(ACTION_ICONS).find((k) => action.toLowerCase().includes(k))
  return key ? ACTION_ICONS[key] : '📋'
}

const ENTITY_COLORS: Record<string, string> = {
  user: 'bg-blue-100 text-blue-700',
  team: 'bg-purple-100 text-purple-700',
  submission: 'bg-green-100 text-green-700',
  score: 'bg-yellow-100 text-yellow-700',
  round: 'bg-orange-100 text-orange-700',
  setting: 'bg-gray-100 text-gray-600',
  mentor: 'bg-teal-100 text-teal-700',
  venue: 'bg-pink-100 text-pink-700',
  recommendation: 'bg-indigo-100 text-indigo-700',
}

const entityColor = (type?: string) =>
  type ? (ENTITY_COLORS[type.toLowerCase()] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600'

export default function RecentActivityPage() {
  const [entityFilter, setEntityFilter] = useState('')
  const [limit, setLimit] = useState(100)

  const { data: logs = [], isLoading, isError, error, refetch } = useQuery<ActivityLog[]>({
    queryKey: ['activity-logs', entityFilter, limit],
    queryFn: () => adminApi.getActivityLogs({ limit, ...(entityFilter ? { entity_type: entityFilter } : {}) }),
    retry: 1,
  })

  const entityTypes = [...new Set(logs.map((l) => l.entity_type).filter(Boolean))]

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
          <p className="text-gray-500 text-sm mt-0.5">System-wide activity log</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All entity types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={200}>Last 200</option>
          <option value={500}>Last 500</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Activity Log</h3>
          <span className="text-xs text-gray-400">{logs.length} entries</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Loading activity logs…</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-2xl">⚠️</p>
            <p className="text-gray-700 font-medium text-sm">Failed to load activity logs</p>
            <p className="text-gray-400 text-xs max-w-xs mx-auto">
              {(error as any)?.response?.data?.detail ?? (error as any)?.message ?? 'The admin service may be unavailable.'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm text-indigo-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-gray-500 text-sm font-medium">No activity logged yet</p>
            <p className="text-gray-400 text-xs mt-1">Activity will appear here as users interact with the system</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const displayName = (log as any).user_name || (log.user_id ? 'Unknown User' : 'System')
              const displayEmail = (log as any).user_email ?? ''
              return (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5">
                    {getIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{log.action.replace(/_/g, ' ')}</span>
                      {log.entity_type && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entityColor(log.entity_type)}`}>
                          {log.entity_type}
                        </span>
                      )}
                      {displayName && (
                        <span className="text-xs text-gray-500 font-medium">
                          by <span className="text-gray-700">{displayName}</span>
                          {displayEmail && <span className="text-gray-400"> ({displayEmail})</span>}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-0.5 break-words">{log.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
