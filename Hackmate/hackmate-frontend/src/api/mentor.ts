import client from './client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface MentoringRound {
  id: number
  round_name: string
  description?: string
  start_time: string
  end_time: string
  max_score: number
  is_active: number
  is_ongoing?: boolean
}

export interface AssignedTeam {
  id: number
  name: string
  leader_id: number
  leader_name?: string
  floor_number?: string
  room_number?: string
  idea?: string
  problem_statement?: string
  member_count?: number
  status: string
}

export interface ScoreResponse {
  id: number
  mentor_id: number
  team_id: number
  round_id: number
  score: number
  comment?: string
  created_at?: string
  updated_at?: string
}

export interface ScoreSubmit {
  team_id: number
  round_id: number
  score: number
  comment?: string
}

export interface TeamProgress {
  team_id: number
  rounds: {
    round_id: number
    round_name: string
    max_score: number
    avg_score: number
    mentor_count: number
    percentage: number
  }[]
  overall_avg: number
}

export interface SupportMessage {
  id: number
  from_id: number
  from_role: string
  to_role: string
  subject?: string
  message: string
  priority: string
  status: string
  floor_id?: number
  room_id?: number
  created_at: string
  resolved_at?: string
  resolution_notes?: string
  from_name?: string
  floor_number?: string
  room_number?: string
}

// ── Round classification (mirrors admin panel logic) ───────────────────────

export function classifyRound(r: MentoringRound): 'active' | 'upcoming' | 'past' | 'inactive' {
  if (!r.is_active) return 'inactive'
  const now = new Date()
  const start = new Date(r.start_time)
  const end = new Date(r.end_time)
  if (now < start) return 'upcoming'
  if (now > end) return 'past'
  return 'active'
}

// ── Mentor API ─────────────────────────────────────────────────────────────

export const mentorApi = {
  // Assigned teams
  getAssignedTeams: (search?: string) =>
    client.get<{ total: number; teams: AssignedTeam[] }>('/teams/mentor/assigned', {
      params: search ? { search } : undefined,
    }).then((r) => r.data),

  // Rounds — fetch all, classify on frontend (mirrors admin panel logic)
  getAllRounds: () =>
    client.get<MentoringRound[]>('/rounds/').then((r) => r.data),

  // Scores
  submitScore: (data: ScoreSubmit) =>
    client.post<ScoreResponse>('/scores/', data).then((r) => r.data),
  updateScore: (id: number, score: number, comment?: string) =>
    client.put<ScoreResponse>(`/scores/${id}`, { score, comment }).then((r) => r.data),
  getMyScores: () =>
    client.get<ScoreResponse[]>('/scores/mine').then((r) => r.data),
  getTeamScores: (teamId: number) =>
    client.get<ScoreResponse[]>(`/scores/team/${teamId}`).then((r) => r.data),

  // Team progress
  getTeamProgress: (teamId: number) =>
    client.get<TeamProgress>(`/scores/team/${teamId}/progress`).then((r) => r.data),

  // Rankings
  getRankings: () =>
    client.get<{ rankings: import('./admin').TeamRankingEntry[] }>('/scores/rankings/all').then((r) => r.data),

  // Support messages (mentor sees messages directed to them)
  getSupportMessages: (params?: { status?: string }) =>
    client.get<SupportMessage[]>('/support/', { params }).then((r) => r.data),
  resolveSupportMessage: (id: number, notes?: string) =>
    client.put<SupportMessage>(`/support/${id}/status`, { resolution_notes: notes }, {
      params: { new_status: 'closed' },
    }).then((r) => r.data),
}
