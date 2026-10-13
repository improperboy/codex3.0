export interface MentoringRound {
  id: number
  round_name: string
  description?: string
  start_time: string
  end_time: string
  max_score: number
  is_active: boolean
  is_ongoing?: boolean
}
