import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { mentorApi, classifyRound, type AssignedTeam, type MentoringRound } from '@/api/mentor'
import { Star, Users, MapPin, Lightbulb, CheckCircle, AlertCircle, Search } from 'lucide-react'

export default function ScoreTeamsPage() {
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const [selectedTeam, setSelectedTeam] = useState<AssignedTeam | null>(null)
  const [selectedRound, setSelectedRound] = useState<MentoringRound | null>(null)
  const [score, setScore] = useState('')
  const [comment, setComment] = useState('')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['mentor-assigned-teams'],
    queryFn: () => mentorApi.getAssignedTeams(),
  })
  const { data: allRounds = [] } = useQuery({
    queryKey: ['mentor-all-rounds'],
    queryFn: mentorApi.getAllRounds,
  })
  const { data: myScores = [] } = useQuery({
    queryKey: ['mentor-my-scores'],
    queryFn: mentorApi.getMyScores,
  })

  const activeRounds = allRounds.filter((r) => classifyRound(r) === 'active')

  const teams = teamsData?.teams ?? []
  const filtered = search
    ? teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : teams

  // Pre-select team from URL param
  useEffect(() => {
    const tid = searchParams.get('team_id')
    if (tid && teams.length) {
      const t = teams.find((t) => t.id === Number(tid))
      if (t) setSelectedTeam(t)
    }
  }, [searchParams, teams])

  const existingScore = selectedTeam && selectedRound
    ? myScores.find((s) => s.team_id === selectedTeam.id && s.round_id === selectedRound.id)
    : null

  const submit = useMutation({
    mutationFn: () => {
      if (!selectedTeam || !selectedRound) throw new Error('Select team and round')
      const s = Number(score)
      if (existingScore) {
        return mentorApi.updateScore(existingScore.id, s, comment || undefined)
      }
      return mentorApi.submitScore({ team_id: selectedTeam.id, round_id: selectedRound.id, score: s, comment: comment || undefined })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mentor-my-scores'] })
      setMsg(existingScore ? 'Score updated successfully!' : 'Score submitted successfully!')
      setErr('')
      setScore('')
      setComment('')
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      setErr(typeof detail === 'string' ? detail : 'Failed to submit score.')
      setMsg('')
    },
  })

  const handleSelectTeam = (team: AssignedTeam) => {
    setSelectedTeam(team)
    setSelectedRound(null)
    setScore('')
    setComment('')
    setMsg('')
    setErr('')
  }

  const handleSelectRound = (round: MentoringRound) => {
    setSelectedRound(round)
    setScore('')
    setComment('')
    setMsg('')
    setErr('')
    // Pre-fill existing score
    const existing = myScores.find((s) => s.team_id === selectedTeam?.id && s.round_id === round.id)
    if (existing) {
      setScore(String(existing.score))
      setComment(existing.comment ?? '')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Score Teams</h1>
        <p className="text-gray-500 text-sm mt-0.5">Evaluate and score team performance</p>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Score Teams</h2>
            <p className="text-blue-100 text-sm">Evaluate team performance and provide feedback</p>
            {activeRounds.length > 0 && (
              <p className="text-blue-100 text-xs mt-1">
                ⏱ {activeRounds.length} active round{activeRounds.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">⭐</div>
        </div>
      </div>

      {activeRounds.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">No Active Rounds</p>
            <p className="text-yellow-700 text-sm mt-0.5">No mentoring rounds are currently active for scoring.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Team list */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Select Team ({filtered.length})
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {teamsLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No teams found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className={`w-full text-left p-3 border rounded-xl transition-all ${
                    selectedTeam?.id === team.id
                      ? 'bg-blue-50 border-blue-400'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{team.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{team.leader_name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{team.member_count ?? 0} members</span>
                        {team.floor_number && <span>· {team.floor_number}-{team.room_number}</span>}
                      </div>
                    </div>
                    {selectedTeam?.id === team.id && (
                      <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scoring form */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTeam ? (
            <>
              {/* Team info */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  ℹ️ Team: {selectedTeam.name}
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Leader</p>
                    <p className="font-semibold text-gray-900 text-sm">{selectedTeam.leader_name ?? '—'}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-green-500" />
                      <p className="text-xs text-gray-500">Location</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedTeam.floor_number && selectedTeam.room_number
                        ? `${selectedTeam.floor_number} - ${selectedTeam.room_number}`
                        : '—'}
                    </p>
                  </div>
                </div>
                {selectedTeam.idea && (
                  <div className="bg-yellow-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                      <p className="text-xs text-gray-500">Project Idea</p>
                    </div>
                    <p className="text-sm text-gray-700">{selectedTeam.idea}</p>
                  </div>
                )}
              </div>

              {/* Score form */}
              {activeRounds.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-orange-500" /> Submit Score
                  </h3>

                  {msg && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4" /> {msg}
                    </div>
                  )}
                  {err && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{err}</div>
                  )}

                  <div className="space-y-4">
                    {/* Round selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mentoring Round</label>
                      <div className="space-y-2">
                        {activeRounds.map((r) => {
                          const hasScore = myScores.some((s) => s.team_id === selectedTeam.id && s.round_id === r.id)
                          return (
                            <button
                              key={r.id}
                              onClick={() => handleSelectRound(r)}
                              className={`w-full text-left p-3 border rounded-xl transition-all ${
                                selectedRound?.id === r.id
                                  ? 'bg-blue-50 border-blue-400'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{r.round_name}</p>
                                  <p className="text-xs text-gray-500">Max: {r.max_score} pts</p>
                                </div>
                                {hasScore && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Scored</span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {selectedRound && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Score (0 – {selectedRound.max_score})
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={selectedRound.max_score}
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            placeholder={`Enter score (max ${selectedRound.max_score})`}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Comments & Feedback</label>
                          <textarea
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Provide constructive feedback for the team…"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <button
                          onClick={() => submit.mutate()}
                          disabled={!score || submit.isPending}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Star className="w-4 h-4" />
                          {submit.isPending ? 'Submitting…' : existingScore ? 'Update Score' : 'Submit Score'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                  <p className="text-sm">No active rounds available for scoring.</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-gray-600">Select a team to score</p>
              <p className="text-sm mt-1">Choose a team from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
