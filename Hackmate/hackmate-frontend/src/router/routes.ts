export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',

  PARTICIPANT: '/participant',
  PARTICIPANT_DASHBOARD: '/participant/dashboard',
  PARTICIPANT_TEAM_CREATE: '/participant/team/create',
  PARTICIPANT_TEAM_JOIN: '/participant/team/join',
  PARTICIPANT_TEAM: '/participant/team/:id',
  PARTICIPANT_SUBMIT: '/participant/submit',
  PARTICIPANT_RANKINGS: '/participant/rankings',
  PARTICIPANT_ANNOUNCEMENTS: '/participant/announcements',
  PARTICIPANT_SUPPORT: '/participant/support',

  MENTOR: '/mentor',
  MENTOR_DASHBOARD: '/mentor/dashboard',
  MENTOR_TEAMS: '/mentor/teams',
  MENTOR_SCORE: '/mentor/score',
  MENTOR_HISTORY: '/mentor/history',

  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_TEAMS: '/admin/teams',
  ADMIN_ANALYTICS: '/admin/analytics',

  VOLUNTEER: '/volunteer',
  VOLUNTEER_DASHBOARD: '/volunteer/dashboard',
  VOLUNTEER_TEAMS: '/volunteer/teams',
  VOLUNTEER_SUPPORT: '/volunteer/support',

  CHANGE_PASSWORD: '/change-password',
} as const
