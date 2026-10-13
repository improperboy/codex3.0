import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { teamsApi } from '@/api/teams'
import { scoresApi, type MentoringRound } from '@/api/scores'
import { Clock, User, MessageSquare, Trophy, CheckCircle, AlertCircle, Calendar } from 'lucide-react'

export default function MentoringRoundsPage() {
  const user = useAuthStore((s) => s.user)

  const { data: myTeam, isLoading: teamLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

  const { data: rounds = [], isLoading: roundsLoading } = useQuery({
    queryKey: ['mentoring-summary', myTeam?.id],
    queryFn: () => scoresApi.getTeamMentoringSummary(myTeam!.id),
    enabled: !!myTeam?.id,
  })

  if (teamLoading || roundsLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  }

  if (!myTeam || myTeam.status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-400" />
        <p className="text-gray-600 font-medium">You need an approved team to view mentoring rounds.</p>
      </div>
    )
  }

  const isActive = (r: MentoringRound) =>
    !!r.is_active && new Date() >= new Date(r.start_time) && new Date() <= new Date(r.end_time)

  const ongoing = rounds.filter((r) => isActive(r))
  const upcoming = rounds.filter((r) => !isActive(r) && new Date(r.start_time) > new Date())
  const past = rounds.filter((r) => !isActive(r) && new Date(r.end_time) < new Date())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mentoring Rounds</h1>
        <p className="text-gray-500 mt-1">Hi {user?.name}, here are all the mentoring sessions for your team.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Rounds" value={rounds.length} gradient="from-blue-500 to-indigo-600" icon={<Calendar className="w-5 h-5 text-white" />} />
        <StatCard label="Ongoing" value={ongoing.length} gradient="from-green-500 to-emerald-600" icon={<CheckCircle className="w-5 h-5 text-white" />} />
        <StatCard label="Upcoming" value={upcoming.length} gradient="from-orange-500 to-amber-600" icon={<Clock className="w-5 h-5 text-white" />} />
        <StatCard label="Completed" value={past.length} gradient="from-purple-500 to-pink-600" icon={<Trophy className="w-5 h-5 text-white" />} />
      </div>

      {rounds.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          No mentoring rounds have been scheduled yet.
        </div>
      )}

      {ongoing.length > 0 && <Section title="🟢 Ongoing" rounds={ongoing} />}
      {upcoming.length > 0 && <Section title="🕐 Upcoming" rounds={upcoming} />}
      {past.length > 0 && <Section title="✅ Completed" rounds={past} />}
    </div>
  )
}

function StatCard({ label, value, gradient, icon }: {
  label: string; value: number; gradient: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, rounds }: { title: string; rounds: MentoringRound[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      {rounds.map((r) => <RoundCard key={r.id} round={r} />)}
    </div>
  )
}

function RoundCard({ round }: { round: MentoringRound }) {
  const now = new Date()
  const isOngoing = !!round.is_active && now >= new Date(round.start_time) && now <= new Date(round.end_time)
  const isCompleted = !isOngoing && new Date(round.end_time) < now
  const isUpcoming = !isOngoing && new Date(round.start_time) > now

  const statusBadge = isOngoing
    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Ongoing</span>
    : isUpcoming
    ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Upcoming</span>
    : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Completed</span>

  const scoredFeedback = round.feedback.filter((f) => f.score !== undefined)
  const avgScore = scoredFeedback.length > 0
    ? scoredFeedback.reduce((sum, f) => sum + (f.score ?? 0), 0) / scoredFeedback.length
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900">{round.round_name}</h3>
              {statusBadge}
            </div>
            {round.description && (
              <p className="text-sm text-gray-500 mt-1">{round.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {fmtDate(round.start_time)} &rarr; {fmtDate(round.end_time)}
              </span>
              <span>Max score: {round.max_score}</span>
            </div>
          </div>
          {round.scores_visible && avgScore !== null && (
            <div className="shrink-0 text-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl px-4 py-2">
              <div className="text-xl font-bold">{avgScore.toFixed(1)}</div>
              <div className="text-xs opacity-80">/ {round.max_score}</div>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Mentors */}
      <div className="px-5 py-4 border-b border-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Assigned Mentor{round.assigned_mentors.length !== 1 ? 's' : ''}
        </p>
        {round.assigned_mentors.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No mentor assigned to your location yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {round.assigned_mentors.map((m) => (
              <div key={m.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Mentor Feedback {round.feedback.length > 0 ? `(${round.feedback.length})` : ''}
        </p>
        {round.feedback.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            {isCompleted
              ? 'No feedback was given for this round.'
              : 'Feedback will appear here after the mentor scores your team.'}
          </p>
        ) : (
          <div className="space-y-3">
            {round.feedback.map((f) => (
              <FeedbackCard key={f.id} feedback={f} scoresVisible={round.scores_visible} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FeedbackCard({ feedback, scoresVisible }: {
  feedback: MentoringRound['feedback'][number]
  scoresVisible: boolean
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {feedback.mentor_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {feedback.mentor_name}
            </p>
            {feedback.created_at && (
              <p className="text-xs text-gray-400">{fmtDate(feedback.created_at)}</p>
            )}
          </div>
        </div>
        {scoresVisible && feedback.score !== undefined && (
          <div className="shrink-0 text-right">
            <span className="text-lg font-bold text-indigo-600">{feedback.score}</span>
            {feedback.max_score !== undefined && (
              <span className="text-xs text-gray-400"> / {feedback.max_score}</span>
            )}
          </div>
        )}
      </div>
      {feedback.comment ? (
        <div className="mt-3 flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700">{feedback.comment}</p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400 italic">No written feedback provided.</p>
      )}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
