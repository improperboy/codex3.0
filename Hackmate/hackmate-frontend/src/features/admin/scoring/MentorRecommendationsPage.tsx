import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { MentorRecommendation, RoomTech } from '@/api/admin'

// ── helpers ─────────────────────────────────────────────────────────────────

const scoreColor = (score: number) => {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-400'
  if (score >= 30) return 'bg-orange-400'
  return 'bg-gray-400'
}

const scoreBadgeColor = (score: number) => {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (score >= 30) return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}

const statusBadge = (s?: string) => {
  switch (s) {
    case 'assigned':  return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'approved':  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'rejected':  return 'bg-red-100 text-red-700 border-red-200'
    default:          return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

// ── group by room ─────────────────────────────────────────────────────────

type RoomGroup = {
  floor_id?: number
  floor_number?: string
  room_id?: number
  room_number?: string
  team_count: number
  team_names: string[]
  top_room_technologies: RoomTech[]
  mentors: MentorRecommendation[]
}

function groupByRoom(recs: MentorRecommendation[]): RoomGroup[] {
  const map = new Map<string, RoomGroup>()

  for (const rec of recs) {
    const key = `${rec.floor_id ?? 'unassigned'}-${rec.room_id ?? 'unassigned'}`
    if (!map.has(key)) {
      map.set(key, {
        floor_id:             rec.floor_id,
        floor_number:         rec.floor_number,
        room_id:              rec.room_id,
        room_number:          rec.room_number,
        team_count:           rec.team_count ?? 0,
        team_names:           rec.team_names ?? [],
        top_room_technologies: rec.top_room_technologies ?? [],
        mentors:              [],
      })
    }
    map.get(key)!.mentors.push(rec)
  }

  // Sort rooms: assigned rooms first, then by floor/room number
  return Array.from(map.values()).sort((a, b) => {
    const aKey = `${a.floor_number ?? ''}${a.room_number ?? ''}`
    const bKey = `${b.floor_number ?? ''}${b.room_number ?? ''}`
    return aKey.localeCompare(bKey)
  })
}

// ── component ────────────────────────────────────────────────────────────────

export default function MentorRecommendationsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null)

  const { data: recs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['mentor-recommendations', statusFilter],
    queryFn: () => adminApi.getRecommendations(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  })

  const generate = useMutation({
    mutationFn: adminApi.generateRecommendations,
    onSuccess: (res) => {
      setGeneratedMsg(res.message ?? `Generated ${res.count} recommendations`)
      qc.invalidateQueries({ queryKey: ['mentor-recommendations'] })
      setTimeout(() => setGeneratedMsg(null), 5000)
    },
  })

  const assign = useMutation({
    mutationFn: (payload: { recommendation_id: number; mentor_id: number; floor_id: number; room_id: number }) =>
      adminApi.assignRecommendation(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-recommendations'] }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminApi.updateRecommendationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-recommendations'] }),
  })

  const deleteRec = useMutation({
    mutationFn: adminApi.deleteRecommendation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-recommendations'] }),
  })

  const groups = groupByRoom(recs)
  const totalRooms  = groups.filter((g) => g.room_id).length
  const highMatches = recs.filter((r) => parseFloat(r.match_score) >= 70).length
  const assigned    = recs.filter((r) => r.status === 'assigned').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mentor Recommendations</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Room-tech matching — finds mentors whose skills align with the dominant technologies used by teams in each room
          </p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          {generate.isPending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            '✨ Generate Recommendations'
          )}
        </button>
      </div>

      {/* Success toast */}
      {generatedMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
          <span>✅</span> {generatedMsg}
        </div>
      )}
      {generate.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
          ⚠️ Failed to generate recommendations. Make sure teams have tech skills and are assigned to rooms.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Rooms Matched', value: totalRooms, icon: '🏢' },
          { label: 'Total Suggestions', value: recs.length, icon: '💡' },
          { label: 'High Matches (70%+)', value: highMatches, icon: '⭐' },
          { label: 'Already Assigned', value: assigned, icon: '✅' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">Filter:</span>
        {['all', 'pending', 'approved', 'assigned', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
              statusFilter === f
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          className="ml-auto text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-400">Loading recommendations…</p>
        </div>
      ) : isError ? (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-gray-600 font-medium">Failed to load recommendations</p>
          <button onClick={() => refetch()} className="mt-3 text-sm text-indigo-600 hover:underline">Try again</button>
        </div>
      ) : recs.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-gray-600 font-semibold">No recommendations yet</p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Click "Generate Recommendations" above. Make sure your teams have tech skills filled in and are assigned to rooms.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const roomLabel = group.room_id
              ? `Floor ${group.floor_number ?? group.floor_id} · Room ${group.room_number ?? group.room_id}`
              : 'Unassigned Teams'
            const topTechs = group.top_room_technologies.slice(0, 6)
            const maxCount = topTechs[0]?.count ?? 1

            return (
              <div
                key={`${group.floor_id}-${group.room_id}`}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                {/* Room header */}
                <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">🏢</span>
                        <h2 className="font-bold text-gray-900 text-base">{roomLabel}</h2>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {group.team_count} team{group.team_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {group.mentors.length} mentor suggestion{group.mentors.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {group.team_names.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                          Teams: {group.team_names.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Room dominant tech bars */}
                  {topTechs.length > 0 && (
                    <div className="mt-3 ml-7">
                      <p className="text-xs text-gray-500 font-medium mb-2">Dominant technologies in room:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                        {topTechs.map((t) => (
                          <div key={t.tech} className="flex items-center gap-2 min-w-0">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden min-w-0">
                              <div
                                className="bg-purple-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.max(8, (t.count / maxCount) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{t.tech}</span>
                            <span className="text-xs text-gray-400 shrink-0">{t.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mentor matches for this room */}
                <div className="divide-y divide-gray-100">
                  {group.mentors
                    .sort((a, b) => parseFloat(b.match_score) - parseFloat(a.match_score))
                    .map((rec) => {
                      const score = parseFloat(rec.match_score)
                      const isPending = !rec.status || rec.status === 'pending'
                      const isAssigned = rec.status === 'assigned'

                      return (
                        <div key={rec.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            {/* Mentor info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                                {(rec.mentor_name ?? 'M').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {rec.mentor_name ?? 'Mentor'}
                                </div>
                                {rec.mentor_email && (
                                  <div className="text-xs text-gray-400 truncate">{rec.mentor_email}</div>
                                )}
                              </div>
                            </div>

                            {/* Score + Status + Actions */}
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                              {/* Score badge */}
                              <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${scoreBadgeColor(score)}`}>
                                {score.toFixed(0)}% match
                              </span>

                              {/* Status badge */}
                              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${statusBadge(rec.status)}`}>
                                {rec.status ?? 'pending'}
                              </span>

                              {/* Action buttons */}
                              {isPending && rec.floor_id && rec.room_id && (
                                <button
                                  onClick={() =>
                                    assign.mutate({
                                      recommendation_id: rec.id,
                                      mentor_id: rec.mentor_id,
                                      floor_id: rec.floor_id!,
                                      room_id: rec.room_id!,
                                    })
                                  }
                                  disabled={assign.isPending}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                                  title="Assign this mentor to the room"
                                >
                                  📌 Assign
                                </button>
                              )}

                              {isPending && (
                                <button
                                  onClick={() => updateStatus.mutate({ id: rec.id, status: 'approved' })}
                                  disabled={updateStatus.isPending}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                  ✓ Approve
                                </button>
                              )}

                              {(isPending || rec.status === 'approved') && (
                                <button
                                  onClick={() => updateStatus.mutate({ id: rec.id, status: 'rejected' })}
                                  disabled={updateStatus.isPending}
                                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                  ✗ Reject
                                </button>
                              )}

                              {isAssigned && (
                                <button
                                  onClick={() => updateStatus.mutate({ id: rec.id, status: 'pending' })}
                                  disabled={updateStatus.isPending}
                                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  ↩ Unassign
                                </button>
                              )}

                              <button
                                onClick={() => deleteRec.mutate(rec.id)}
                                disabled={deleteRec.isPending}
                                className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50 p-1.5"
                                title="Remove recommendation"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Score bar */}
                          <div className="mt-3 ml-13">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${scoreColor(score)}`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Matched skills */}
                          {(rec.matched_skills ?? []).length > 0 && (
                            <div className="mt-2 ml-13 flex flex-wrap gap-1">
                              {rec.matched_skills!.map((ms) => (
                                <span
                                  key={ms.skill}
                                  className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium"
                                  title={`${ms.percentage}% of teams in room use this`}
                                >
                                  {ms.skill} · {ms.teams_count} team{ms.teams_count !== 1 ? 's' : ''}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* All mentor skills */}
                          {(rec.mentor_skills ?? []).length > 0 && (
                            <div className="mt-1.5 ml-13 flex flex-wrap gap-1">
                              {rec.mentor_skills!.map((s) => (
                                <span key={s} className="px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-xs">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Recommendation reason */}
                          {rec.recommendation_reason && (
                            <p className="mt-2 ml-13 text-xs text-gray-400 italic">{rec.recommendation_reason}</p>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
