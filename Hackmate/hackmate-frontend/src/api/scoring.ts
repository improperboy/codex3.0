import client from './client'
import type { MentoringRound } from '@/types/score'

export interface RoundPayload {
  round_name: string
  description?: string
  start_time: string
  end_time: string
  max_score: number
  is_active: boolean
}

export const scoringApi = {
  getRounds: () =>
    client.get<MentoringRound[]>('/rounds/').then((r) => r.data),

  createRound: (data: RoundPayload) =>
    client.post<MentoringRound>('/rounds/', data).then((r) => r.data),

  updateRound: (id: number, data: Partial<RoundPayload>) =>
    client.put<MentoringRound>(`/rounds/${id}`, data).then((r) => r.data),

  deleteRound: (id: number) =>
    client.delete(`/rounds/${id}`),
}
