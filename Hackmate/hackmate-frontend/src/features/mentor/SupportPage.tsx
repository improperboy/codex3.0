import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mentorApi } from '@/api/mentor'
import { LifeBuoy, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function MentorSupportPage() {
  const qc = useQueryClient()

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['mentor-support-all'],
    queryFn: () => mentorApi.getSupportMessages(),
  })

  const resolve = useMutation({
    mutationFn: (id: number) => mentorApi.resolveSupportMessage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-support-all'] }),
  })

  const open = messages.filter((m) => m.status === 'open')
  const closed = messages.filter((m) => m.status === 'closed')

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const MessageCard = ({ m }: { m: typeof messages[0] }) => (
    <div className={`p-4 border-l-4 rounded-xl ${
      m.status === 'open'
        ? m.priority === 'high' || m.priority === 'urgent'
          ? 'border-red-500 bg-red-50'
          : m.priority === 'medium'
          ? 'border-yellow-500 bg-yellow-50'
          : 'border-green-500 bg-green-50'
        : 'border-gray-300 bg-gray-50'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              m.priority === 'high' || m.priority === 'urgent'
                ? 'bg-red-100 text-red-700'
                : m.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}>{m.priority}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              m.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
            }`}>{m.status === 'open' ? '⏳ Open' : '✅ Closed'}</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{m.message}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(m.created_at)}</span>
            {(m.floor_number || m.room_number) && (
              <span>📍 Floor {m.floor_number} - Room {m.room_number}</span>
            )}
          </div>
        </div>
        {m.status === 'open' && (
          <button
            onClick={() => resolve.mutate(m.id)}
            disabled={resolve.isPending}
            className="shrink-0 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" /> Resolve
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Messages</h1>
        <p className="text-gray-500 text-sm mt-0.5">Support requests from teams in your assigned areas</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Open Requests', value: open.length, icon: AlertCircle, gradient: 'from-orange-500 to-red-500' },
          { label: 'Resolved', value: closed.length, icon: CheckCircle, gradient: 'from-green-500 to-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-11 h-11 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center`}>
              <s.icon className="text-white w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading messages…</div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No support messages yet</p>
          <p className="text-gray-400 text-sm mt-1">Messages from teams in your area will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Open Requests ({open.length})
              </h3>
              <div className="space-y-3">
                {open.map((m) => <MessageCard key={m.id} m={m} />)}
              </div>
            </div>
          )}
          {closed.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Resolved ({closed.length})
              </h3>
              <div className="space-y-3">
                {closed.map((m) => <MessageCard key={m.id} m={m} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
