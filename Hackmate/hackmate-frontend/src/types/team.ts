export interface Theme {
  id: number
  name: string
  description?: string
  color_code: string
  is_active: number
}

export interface Team {
  id: number
  name: string
  idea?: string
  problem_statement?: string
  tech_skills?: string
  theme_id?: number
  leader_id?: number
  floor_id?: number
  room_id?: number
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at?: string
  member_count?: number
  // enriched fields (joined from other services)
  leader_name?: string
  theme_name?: string
  theme_color?: string
  floor_number?: number
  room_number?: string
}

export interface TeamMember {
  id: number
  user_id: number
  team_id: number
  status: string
  joined_at?: string
  // enriched
  name?: string
  email?: string
  tech_stack?: string
}

export interface JoinRequest {
  id: number
  user_id: number
  team_id: number
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  message?: string
  created_at?: string
  responded_at?: string
  // enriched
  team_name?: string
  leader_name?: string
  name?: string
  email?: string
}

export interface Invitation {
  id: number
  team_id: number
  from_user_id: number
  to_user_id: number
  status: 'pending' | 'accepted' | 'rejected'
  message?: string
  created_at?: string
  responded_at?: string
  // enriched
  team_name?: string
  from_user_name?: string
  from_user_email?: string
  team_idea?: string
  team_problem_statement?: string
  current_members?: number
  team_members?: string
}

export interface TeamListResponse {
  total: number
  teams: Team[]
}
