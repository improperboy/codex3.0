import client from './client'

export interface MentoringRound {
  id: number
  round_name: string
  description?: string
  start_time: string
  end_time: string
  max_score: number
  is_active: number
  is_ongoing: boolean
  assigned_mentors: { id: number; name: string; email: string }[]
  feedback: {
    id: number
    mentor_id: number
    mentor_name: string
    comment?: string
    created_at?: string
    score?: number
    max_score?: number
  }[]
  scores_visible: boolean
}

export const scoresApi = {
  getTeamMentoringSummary: (teamId: number) =>
    client.get<MentoringRound[]>(`/scores/team/${teamId}/mentoring-summary`).then((r) => r.data),
}
