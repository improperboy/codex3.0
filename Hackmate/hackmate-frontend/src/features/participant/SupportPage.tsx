import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import client from '@/api/client'
import { teamsApi } from '@/api/teams'
import { LifeBuoy, Send, Clock, CheckCircle, MapPin, Crown, Users } from 'lucide-react'

interface SupportMessage {
  id: number
  message: string
  status: 'open' | 'closed'
  floor_number?: string
  room_number?: string
  created_at: string
}

export default function SupportPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const { data: myTeam } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

  const { data: history = [], isLoading: historyLoading } = useQuery<SupportMessage[]>({
    queryKey: ['support-history'],
    queryFn: () => client.get('/support/mine').then((r) => r.data),
    retry: false,
  })

  const isLeader = myTeam?.leader_id === user?.id
  const hasLocation = !!(myTeam?.floor_number && myTeam?.room_number)
  const canSubmit = isLeader && hasLocation

  const submit = useMutation({
    mutationFn: () => client.post('/support/', {
      to_role: 'mentor',
      message: text,
      priority: 'medium',
    }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-history'] })
      setMsg("Support request sent! A mentor from your team's area will respond soon.")
      setText('')
      setErr('')
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg ?? String(d)).join(', ')
        : typeof detail === 'string'
        ? detail
        : 'Failed to send message. Please try again.'
      setErr(msg)
    },
  })

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Get Support</h1>
        <p className="text-gray-500 text-sm mt-0.5">Need help? Send a message to our support team</p>
      </div>

      {/* Feedback */}
      {msg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="text-white w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-green-900 text-sm">Success!</p>
            <p className="text-green-700 text-sm mt-0.5">{msg}</p>
          </div>
        </div>
      )}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{err}</div>
      )}

      {/* Team Status Banner */}
      {myTeam && isLeader ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Crown className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Team Leader Access</h3>
            <p className="text-green-700 text-sm mt-0.5">
              You can raise support requests for your team "{myTeam.name}"
            </p>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {hasLocation
                  ? `Floor ${myTeam.floor_number} - Room ${myTeam.room_number}`
                  : 'Location not assigned yet'}
              </span>
            </div>
          </div>
        </div>
      ) : myTeam && !isLeader ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-yellow-900">Team Member</h3>
            <p className="text-yellow-700 text-sm mt-0.5">
              You are a member of team "{myTeam.name}". Only team leaders can raise support requests.
            </p>
            {myTeam.leader_name && (
              <p className="text-yellow-600 text-sm mt-1">Leader: {myTeam.leader_name}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">No Team Access</h3>
            <p className="text-gray-600 text-sm mt-0.5">
              You need to be a team leader to raise support requests.
            </p>
            <div className="flex gap-3 mt-3">
              <Link to="/participant/team/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Create Team
              </Link>
              <Link to="/participant/team/join" className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium border border-blue-300 hover:bg-blue-50 transition-colors">
                Join Team
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Request Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-blue-500" /> New Support Request
        </h3>

        {canSubmit ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
              Your message will be sent to mentors assigned to your team's location
              (Floor {myTeam!.floor_number} - Room {myTeam!.room_number}).
            </div>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your issue or question in detail…"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Usually responds within 30 minutes
              </span>
              <button
                onClick={() => { setMsg(''); setErr(''); submit.mutate() }}
                disabled={!text.trim() || submit.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {submit.isPending ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-gray-600 text-sm">
              {!myTeam
                ? 'You need to be a team leader to raise support requests.'
                : !isLeader
                ? 'Only team leaders can raise support requests.'
                : 'Your team needs to be assigned a floor and room first.'}
            </p>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Support History</h3>
          <p className="text-xs text-gray-500 mt-0.5">{history.length} message{history.length !== 1 ? 's' : ''} total</p>
        </div>

        {historyLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <LifeBuoy className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No support requests yet</p>
            <p className="text-gray-400 text-xs mt-1">Submit your first request above to get help</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((item) => (
              <div key={item.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.status === 'open'
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                      : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
                    {item.status === 'open'
                      ? <Clock className="text-white w-4 h-4" />
                      : <CheckCircle className="text-white w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.status === 'open'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.status === 'open' ? '⏳ Open' : '✅ Closed'}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">{item.message}</p>
                    {(item.floor_number || item.room_number) && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        Floor: {item.floor_number ?? 'N/A'}, Room: {item.room_number ?? 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
