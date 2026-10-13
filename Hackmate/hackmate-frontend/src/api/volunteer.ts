import client from './client'
import type { TeamListResponse } from '@/types/team'

export interface VolunteerAssignment {
  id: number
  volunteer_id: number
  floor_id: number
  room_id: number
  floor_number?: string
  room_number?: string
  created_at?: string
}

export interface AssignedMentor {
  id: number
  name: string
  email: string
  tech_stack?: string
  floor_number?: string
  room_number?: string
  floor_id: number
  room_id: number
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

export const volunteerApi = {
  // My location assignments
  getMyAssignments: () =>
    client.get<VolunteerAssignment[]>('/admin/venue/volunteer-assignments/mine').then((r) => r.data),

  // Teams in my assigned locations
  getAssignedTeams: (search?: string) =>
    client.get<TeamListResponse>('/teams/volunteer/assigned', {
      params: search ? { search } : undefined,
    }).then((r) => r.data),

  // Mentors in my assigned locations
  getAssignedMentors: () =>
    client.get<AssignedMentor[]>('/teams/volunteer/mentors').then((r) => r.data),

  // Support messages directed to volunteer role (filtered by location on backend)
  getSupportMessages: (params?: { status?: string }) =>
    client.get<SupportMessage[]>('/support/', { params }).then((r) => r.data),

  resolveSupportMessage: (id: number, notes?: string) =>
    client.put<SupportMessage>(`/support/${id}/status`, { resolution_notes: notes }, {
      params: { new_status: 'closed' },
    }).then((r) => r.data),

  // Rankings (public)
  getRankings: () =>
    client.get<{ rankings: TeamRanking[] }>('/rankings/').then((r) => r.data),
}

export interface TeamRanking {
  rank: number
  team_id: number
  team_name: string
  leader_name: string
  floor_number?: string
  room_number?: string
  average_score: number
  total_score: number
  rounds_participated: number
  scores_count: number
}
