export interface Submission {
  id: number
  team_id: number
  github_link: string
  live_link?: string
  tech_stack: string
  demo_video?: string
  ppt_link?: string
  submitted_at?: string
}

export interface SubmissionSettings {
  id: number
  start_time: string
  end_time: string
  is_active: boolean
}
