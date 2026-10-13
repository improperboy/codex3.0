import client from './client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_users: number
  total_teams: number
  pending_teams: number
  approved_teams: number
  total_submissions: number
  open_support_requests: number
  total_mentors: number
  total_volunteers: number
  total_participants: number
  assigned_mentors: number
  assigned_volunteers: number
}

export interface DailyActivity {
  date: string
  label: string
  users: number
  teams: number
  submissions: number
}

export interface AnalyticsData {
  stats: DashboardStats
  daily_activity: DailyActivity[]
  role_distribution: Record<string, number>
  team_status_distribution: Record<string, number>
  avg_scores_per_round: { round_name: string; avg_score: number }[]
  top_tech_stacks: { skill: string; count: number }[]
  teams_per_location: { floor: string; room: string; team_count: number }[]
}

export interface SystemSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description: string
  is_public: boolean
}

export interface Floor {
  id: number
  floor_number: string
  description?: string
}

export interface Room {
  id: number
  floor_id: number
  room_number: string
  capacity: number
}

export interface MentorAssignment {
  id: number
  mentor_id: number
  floor_id: number
  room_id: number
}

export interface VolunteerAssignment {
  id: number
  volunteer_id: number
  floor_id: number
  room_id: number
}

export interface TeamLocationInfo {
  team_id: number
  team_name: string
  floor_id?: number
  room_id?: number
}

export interface TeamReassignItem {
  team_id: number
  new_floor_id: number
  new_room_id: number
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
  resolved_by?: number
  resolution_notes?: string
}

export interface TeamRankingEntry {
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

export interface Theme {
  id: number
  name: string
  description?: string
  color_code: string
  is_active: number
  created_at?: string
  updated_at?: string
}

export interface ActivityLog {
  id: number
  user_id?: number
  user_name?: string
  user_email?: string
  action: string
  entity_type?: string
  entity_id?: number
  details?: string
  created_at: string
}

export interface RoomTech {
  tech: string
  count: number
  percentage: number
}

export interface MatchedSkill {
  skill: string
  teams_count: number
  percentage: number
}

export interface MentorRecommendation {
  id: number
  participant_id: number
  mentor_id: number
  match_score: string
  skill_match_details?: string
  created_at?: string
  // Enriched fields from backend
  mentor_name?: string
  mentor_email?: string
  mentor_skills?: string[]
  room_id?: number
  room_number?: string
  floor_id?: number
  floor_number?: string
  team_count?: number
  team_names?: string[]
  top_room_technologies?: RoomTech[]
  matched_skills?: MatchedSkill[]
  recommendation_reason?: string
  status?: string
}

export interface TeamManagementSettings {
  enabled: boolean
  start_time?: string
  end_time?: string
  is_currently_active: boolean
}

// ── Admin API ──────────────────────────────────────────────────────────────

export const adminApi = {
  // Analytics
  getAnalytics: () =>
    client.get<AnalyticsData>('/admin/analytics/').then((r) => r.data),

  // Settings
  getSettings: () =>
    client.get<SystemSetting[]>('/admin/settings/').then((r) => r.data),
  getPublicSettings: () =>
    client.get<SystemSetting[]>('/admin/settings/public').then((r) => r.data),
  updateSetting: (key: string, value: string) =>
    client.put<SystemSetting>(`/admin/settings/${key}`, { setting_value: value }).then((r) => r.data),
  
  // Team Management Settings
  getTeamManagementSettings: () =>
    client.get<TeamManagementSettings>('/admin/settings/team-management').then((r) => r.data),
  updateTeamManagementSettings: (data: { enabled: boolean; start_time?: string | null; end_time?: string | null }) =>
    client.put<TeamManagementSettings>('/admin/settings/team-management', data).then((r) => r.data),

  // Venue - Floors
  getFloors: () =>
    client.get<Floor[]>('/admin/venue/floors').then((r) => r.data),
  createFloor: (floor_number: string, description?: string) =>
    client.post<Floor>('/admin/venue/floors', { floor_number, description }).then((r) => r.data),
  deleteFloor: (id: number) =>
    client.delete(`/admin/venue/floors/${id}`),

  // Venue - Rooms
  getRooms: () =>
    client.get<Room[]>('/admin/venue/rooms').then((r) => r.data),
  createRoom: (floor_id: number, room_number: string, capacity: number) =>
    client.post<Room>('/admin/venue/rooms', { floor_id, room_number, capacity }).then((r) => r.data),
  deleteRoom: (id: number) =>
    client.delete(`/admin/venue/rooms/${id}`),

  // Venue - Team location helpers
  getTeamsOnFloor: (floor_id: number) =>
    client.get<TeamLocationInfo[]>(`/admin/venue/floors/${floor_id}/teams`).then((r) => r.data),
  getTeamsInRoom: (room_id: number) =>
    client.get<TeamLocationInfo[]>(`/admin/venue/rooms/${room_id}/teams`).then((r) => r.data),
  bulkReassignTeams: (reassignments: TeamReassignItem[]) =>
    client.post<{ updated: number }>('/admin/venue/teams/reassign-location', { reassignments }).then((r) => r.data),

  getMentorAssignments: () =>
    client.get<MentorAssignment[]>('/admin/venue/mentor-assignments').then((r) => r.data),
  assignMentor: (mentor_id: number, floor_id: number, room_id: number) =>
    client.post<MentorAssignment>('/admin/venue/mentor-assignments', { mentor_id, floor_id, room_id }).then((r) => r.data),
  removeMentorAssignment: (id: number) =>
    client.delete(`/admin/venue/mentor-assignments/${id}`),

  // Volunteer assignments
  getVolunteerAssignments: () =>
    client.get<VolunteerAssignment[]>('/admin/venue/volunteer-assignments').then((r) => r.data),
  assignVolunteer: (volunteer_id: number, floor_id: number, room_id: number) =>
    client.post<VolunteerAssignment>('/admin/venue/volunteer-assignments', { volunteer_id, floor_id, room_id }).then((r) => r.data),
  removeVolunteerAssignment: (id: number) =>
    client.delete(`/admin/venue/volunteer-assignments/${id}`),

  // Support messages
  getSupportMessages: (params?: { status?: string; priority?: string }) =>
    client.get<SupportMessage[]>('/support/', { params }).then((r) => r.data),
  updateSupportStatus: (id: number, status: string, resolution_notes?: string) =>
    client.put<SupportMessage>(`/support/${id}/status`, { resolution_notes }, { params: { new_status: status } }).then((r) => r.data),
  deleteSupportMessage: (id: number) =>
    client.delete(`/support/${id}`),

  // Activity logs
  getActivityLogs: (params?: { skip?: number; limit?: number; entity_type?: string }) =>
    client.get<ActivityLog[]>('/admin/activity-logs/', { params }).then((r) => r.data),

  // Recommendations
  getRecommendations: (params?: { room_id?: number; floor_id?: number; status?: string; min_score?: number }) =>
    client.get<MentorRecommendation[]>('/admin/recommendations/', { params }).then((r) => r.data),
  generateRecommendations: () =>
    client.post<{ message: string; count: number }>('/admin/recommendations/generate').then((r) => r.data),
  assignRecommendation: (payload: { recommendation_id?: number; mentor_id: number; floor_id: number; room_id: number }) =>
    client.post('/admin/recommendations/assign', payload).then((r) => r.data),
  updateRecommendationStatus: (id: number, status: string) =>
    client.put(`/admin/recommendations/${id}/status`, { status }).then((r) => r.data),
  deleteRecommendation: (id: number) =>
    client.delete(`/admin/recommendations/${id}`),

  // Submissions (admin)
  listSubmissions: (params?: { skip?: number; limit?: number }) =>
    client.get<{ total: number; submissions: import('@/types/submission').Submission[] }>('/submissions/', { params }).then((r) => r.data),
  deleteSubmission: (id: number) =>
    client.delete(`/submissions/${id}`),

  // Themes
  getThemes: () =>
    client.get<Theme[]>('/admin/themes/').then((r) => r.data),
  createTheme: (data: { name: string; description?: string; color_code?: string; is_active?: number }) =>
    client.post<Theme>('/admin/themes/', data).then((r) => r.data),
  updateTheme: (id: number, data: Partial<{ name: string; description: string; color_code: string; is_active: number }>) =>
    client.put<Theme>(`/admin/themes/${id}`, data).then((r) => r.data),
  deleteTheme: (id: number) =>
    client.delete(`/admin/themes/${id}`),

  // Exports
  exportUsers: () =>
    client.get('/admin/export/users', { responseType: 'blob' }).then((r) => r.data),
  exportTeams: () =>
    client.get('/admin/export/teams', { responseType: 'blob' }).then((r) => r.data),
  exportSubmissions: () =>
    client.get('/admin/export/submissions', { responseType: 'blob' }).then((r) => r.data),
  exportScores: () =>
    client.get('/admin/export/scores', { responseType: 'blob' }).then((r) => r.data),
  exportTeamPdf: (teamId: number) =>
    client.get(`/admin/export/teams/${teamId}/pdf`, { responseType: 'blob' }).then((r) => r.data),

  // Database Reset (Danger Zone)
  resetDatabase: (confirmation: string) =>
    client.post<DatabaseResetResult>('/admin/settings/reset-database', { confirmation }).then((r) => r.data),
}

export interface DatabaseResetResult {
  success: boolean
  message: string
  admins_preserved: { id: number; name: string; email: string; role?: string }[]
  deleted_counts: Record<string, number>
  total_deleted: number
}
