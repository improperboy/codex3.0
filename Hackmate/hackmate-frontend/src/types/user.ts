export interface User {
  id: number
  name: string
  email: string
  role: string
  tech_stack?: string
  in_team?: number
  is_leader?: number
  has_pending_invite?: number
}
