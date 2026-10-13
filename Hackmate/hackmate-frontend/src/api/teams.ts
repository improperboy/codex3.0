import client from './client'
import type { Team, TeamListResponse, TeamMember, JoinRequest, Invitation, Theme } from '@/types/team'

export const teamsApi = {
  // Themes
  getThemes: () =>
    client.get<Theme[]>('/teams/themes').then((r) => r.data),

  // My team — returns null (not a throw) when the user has no team so that
  // React Query can distinguish "no team" (null) from "still loading" (undefined).
  getMyTeam: () =>
    client.get<Team>('/teams/my').then((r) => r.data).catch((err) => {
      if (err?.response?.status === 404) return null
      throw err
    }),

  // List approved teams (for join page)
  listTeams: (params?: { search?: string; floor?: string; skip?: number; limit?: number }) =>
    client.get<TeamListResponse>('/teams/', { params }).then((r) => r.data),

  // Get team by id
  getTeam: (id: number) =>
    client.get<Team>(`/teams/${id}`).then((r) => r.data),

  // Create team
  createTeam: (data: {
    name: string
    idea?: string
    problem_statement?: string
    tech_skills?: string
    theme_id?: number
  }) => client.post<Team>('/teams/', data).then((r) => r.data),

  // Update team (leader only)
  updateTeam: (id: number, data: { idea?: string; problem_statement?: string }) =>
    client.put<Team>(`/teams/${id}`, data).then((r) => r.data),

  // Delete team (leader only — remove all members then delete)
  deleteTeam: (id: number) =>
    client.delete(`/teams/${id}`).then((r) => r.data),

  // Members
  getMembers: (teamId: number) =>
    client.get<TeamMember[]>(`/teams/${teamId}/members`).then((r) => r.data),

  removeMember: (teamId: number, userId: number) =>
    client.delete(`/teams/${teamId}/members/${userId}`).then((r) => r.data),

  // Leave team (remove self)
  leaveTeam: (teamId: number, userId: number) =>
    client.delete(`/teams/${teamId}/members/${userId}`).then((r) => r.data),

  // Join requests — send
  sendJoinRequest: (data: { team_id: number; message?: string }) =>
    client.post<JoinRequest>('/teams/join-requests', data).then((r) => r.data),

  // Join requests — my sent requests
  getMyJoinRequests: () =>
    client.get<JoinRequest[]>('/teams/join-requests/mine').then((r) => r.data),

  // Join requests — incoming (leader sees requests to their team)
  getTeamJoinRequests: (teamId: number) =>
    client.get<JoinRequest[]>(`/teams/${teamId}/join-requests`).then((r) => r.data),

  // Join requests — respond (approve/reject)
  respondJoinRequest: (requestId: number, status: 'approved' | 'rejected') =>
    client.put<JoinRequest>(`/teams/join-requests/${requestId}`, { status }).then((r) => r.data),

  // Invitations — send (leader invites user)
  sendInvitation: (teamId: number, data: { to_user_id: number; message?: string }) =>
    client.post<Invitation>(`/teams/${teamId}/invitations`, data).then((r) => r.data),

  // Invitations — mine (received)
  getMyInvitations: () =>
    client.get<Invitation[]>('/teams/invitations/mine').then((r) => r.data),

  // Invitations — respond
  respondInvitation: (invitationId: number, status: 'accepted' | 'rejected') =>
    client.put<Invitation>(`/teams/invitations/${invitationId}`, { status }).then((r) => r.data),

  // Cancel my join request
  cancelJoinRequest: (requestId: number) =>
    client.delete(`/teams/join-requests/${requestId}`).then((r) => r.data),

  // Sent invitations (leader only)
  getSentInvitations: (teamId: number) =>
    client.get<Invitation[]>(`/teams/${teamId}/invitations/sent`).then((r) => r.data),

  // Cancel an invitation
  cancelInvitation: (invitationId: number) =>
    client.delete(`/teams/invitations/${invitationId}`).then((r) => r.data),

  // Submit team for admin approval (leader only, requires min team size met)
  submitTeamForApproval: (teamId: number) =>
    client.post<Team>(`/teams/${teamId}/submit-approval`).then((r) => r.data),
}
