import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { NotFoundPage } from '@/components/ui/404-page-not-found'
import ProtectedRoute from './ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center text-gray-400">
    Loading…
  </div>
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (C: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<PageLoader />}>
    <C />
  </Suspense>
)

// Landing
const LandingPage = lazy(() => import('@/features/landing/LandingPage'))

// Auth
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'))
const ChangePasswordPage = lazy(() => import('@/features/auth/ChangePasswordPage'))

// Participant
const ParticipantDashboard = lazy(() => import('@/features/participant/DashboardPage'))
const ParticipantTeamCreate = lazy(() => import('@/features/participant/TeamCreatePage'))
const ParticipantTeamJoin = lazy(() => import('@/features/participant/TeamJoinPage'))
const ParticipantTeamDetails = lazy(() => import('@/features/participant/TeamDetailsPage'))
const ParticipantManageRequests = lazy(() => import('@/features/participant/ManageRequestsPage'))
const ParticipantMyJoinRequests = lazy(() => import('@/features/participant/MyJoinRequestsPage'))
const ParticipantInvitations = lazy(() => import('@/features/participant/TeamInvitationsPage'))
const ParticipantSearchUsers = lazy(() => import('@/features/participant/SearchUsersPage'))
const ParticipantSubmit = lazy(() => import('@/features/participant/SubmitProjectPage'))
const ParticipantRankings = lazy(() => import('@/features/participant/RankingsPage'))
const ParticipantAnnouncements = lazy(() => import('@/features/participant/AnnouncementsPage'))
const ParticipantSupport = lazy(() => import('@/features/participant/SupportPage'))
const ParticipantMentoringRounds = lazy(() => import('@/features/participant/MentoringRoundsPage'))

// Mentor
const MentorDashboard = lazy(() => import('@/features/mentor/DashboardPage'))
const MentorTeams = lazy(() => import('@/features/mentor/AssignedTeamsPage'))
const MentorScore = lazy(() => import('@/features/mentor/ScoreTeamsPage'))
const MentorHistory = lazy(() => import('@/features/mentor/ScoringHistoryPage'))
const MentorProgress = lazy(() => import('@/features/mentor/TeamProgressPage'))
const MentorSchedule = lazy(() => import('@/features/mentor/SchedulePage'))
const MentorRankings = lazy(() => import('@/features/mentor/RankingsPage'))
const MentorAnnouncements = lazy(() => import('@/features/mentor/AnnouncementsPage'))
const MentorSupport = lazy(() => import('@/features/mentor/SupportPage'))

// Volunteer
const VolunteerDashboard = lazy(() => import('@/features/volunteer/DashboardPage'))
const VolunteerTeams = lazy(() => import('@/features/volunteer/ViewTeamsPage'))
const VolunteerMentors = lazy(() => import('@/features/volunteer/MentorsPage'))
const VolunteerSupport = lazy(() => import('@/features/volunteer/SupportRequestsPage'))
const VolunteerRankings = lazy(() => import('@/features/volunteer/RankingsPage'))
const VolunteerAnnouncements = lazy(() => import('@/features/volunteer/AnnouncementsPage'))

// Admin
const AdminDashboard = lazy(() => import('@/features/admin/DashboardPage'))
const AdminAnalytics = lazy(() => import('@/features/admin/analytics/AnalyticsPage'))
const AdminExport = lazy(() => import('@/features/admin/analytics/ExportPage'))
const AdminActivity = lazy(() => import('@/features/admin/analytics/RecentActivityPage'))
const AdminManageUsers = lazy(() => import('@/features/admin/users/ManageUsersPage'))
const AdminAddUser = lazy(() => import('@/features/admin/users/AddUserPage'))
const AdminTeams = lazy(() => import('@/features/admin/teams/TeamsPage'))
const AdminFloorsRooms = lazy(() => import('@/features/admin/teams/FloorsRoomsPage'))
const AdminSubmissions = lazy(() => import('@/features/admin/scoring/ViewSubmissionsPage'))
const AdminMentorAssignments = lazy(() => import('@/features/admin/scoring/MentorAssignmentsPage'))
const AdminVolunteerAssignments = lazy(() => import('@/features/admin/scoring/VolunteerAssignmentsPage'))
const AdminMentorRecommendations = lazy(() => import('@/features/admin/scoring/MentorRecommendationsPage'))
const AdminRankings = lazy(() => import('@/features/admin/scoring/TeamRankingsPage'))
const AdminSubmissionSettings = lazy(() => import('@/features/admin/scoring/SubmissionSettingsPage'))
const AdminMentoringRounds = lazy(() => import('@/features/admin/scoring/MentoringRoundsPage'))
const AdminAnnouncements = lazy(() => import('@/features/admin/content/PostsPage'))
const AdminThemes = lazy(() => import('@/features/admin/content/ThemesPage'))
const AdminSupport = lazy(() => import('@/features/admin/content/SupportMessagesPage'))
const AdminSettings = lazy(() => import('@/features/admin/settings/SystemSettingsPage'))
const AdminEventWizard = lazy(() => import('@/features/admin/ai/EventSetupWizardPage'))

export const router = createBrowserRouter([
  // Public
  { path: '/login', element: wrap(LoginPage) },
  { path: '/register', element: wrap(RegisterPage) },

  // Participant layout
  {
    path: '/participant',
    element: (
      <ProtectedRoute role="participant">
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: wrap(ParticipantDashboard) },
      { path: 'team/create', element: wrap(ParticipantTeamCreate) },
      { path: 'team/join', element: wrap(ParticipantTeamJoin) },
      { path: 'team/:id', element: wrap(ParticipantTeamDetails) },
      { path: 'manage-requests', element: wrap(ParticipantManageRequests) },
      { path: 'join-requests', element: wrap(ParticipantMyJoinRequests) },
      { path: 'invitations', element: wrap(ParticipantInvitations) },
      { path: 'search-users', element: wrap(ParticipantSearchUsers) },
      { path: 'submit', element: wrap(ParticipantSubmit) },
      { path: 'mentoring-rounds', element: wrap(ParticipantMentoringRounds) },
      { path: 'rankings', element: wrap(ParticipantRankings) },
      { path: 'announcements', element: wrap(ParticipantAnnouncements) },
      { path: 'support', element: wrap(ParticipantSupport) },
      { path: 'change-password', element: wrap(ChangePasswordPage) },
    ],
  },

  // Mentor layout
  {
    path: '/mentor',
    element: (
      <ProtectedRoute role="mentor">
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: wrap(MentorDashboard) },
      { path: 'teams', element: wrap(MentorTeams) },
      { path: 'score', element: wrap(MentorScore) },
      { path: 'history', element: wrap(MentorHistory) },
      { path: 'progress/:id', element: wrap(MentorProgress) },
      { path: 'schedule', element: wrap(MentorSchedule) },
      { path: 'rankings', element: wrap(MentorRankings) },
      { path: 'announcements', element: wrap(MentorAnnouncements) },
      { path: 'support', element: wrap(MentorSupport) },
      { path: 'change-password', element: wrap(ChangePasswordPage) },
    ],
  },

  // Volunteer layout
  {
    path: '/volunteer',
    element: (
      <ProtectedRoute role="volunteer">
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: wrap(VolunteerDashboard) },
      { path: 'teams', element: wrap(VolunteerTeams) },
      { path: 'mentors', element: wrap(VolunteerMentors) },
      { path: 'support', element: wrap(VolunteerSupport) },
      { path: 'rankings', element: wrap(VolunteerRankings) },
      { path: 'announcements', element: wrap(VolunteerAnnouncements) },
      { path: 'change-password', element: wrap(ChangePasswordPage) },
    ],
  },

  // Admin layout
  {
    path: '/admin',
    element: (
      <ProtectedRoute role="admin">
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: wrap(AdminDashboard) },
      { path: 'analytics', element: wrap(AdminAnalytics) },
      { path: 'export', element: wrap(AdminExport) },
      { path: 'activity', element: wrap(AdminActivity) },
      { path: 'users', element: wrap(AdminManageUsers) },
      { path: 'users/add', element: wrap(AdminAddUser) },
      { path: 'teams', element: wrap(AdminTeams) },
      { path: 'venue', element: wrap(AdminFloorsRooms) },
      { path: 'submissions', element: wrap(AdminSubmissions) },
      { path: 'mentor-assignments', element: wrap(AdminMentorAssignments) },
      { path: 'volunteer-assignments', element: wrap(AdminVolunteerAssignments) },
      { path: 'mentor-recommendations', element: wrap(AdminMentorRecommendations) },
      { path: 'rankings', element: wrap(AdminRankings) },
      { path: 'submission-settings', element: wrap(AdminSubmissionSettings) },
      { path: 'mentoring-rounds', element: wrap(AdminMentoringRounds) },
      { path: 'announcements', element: wrap(AdminAnnouncements) },
      { path: 'themes', element: wrap(AdminThemes) },
      { path: 'support', element: wrap(AdminSupport) },
      { path: 'settings', element: wrap(AdminSettings) },
      { path: 'ai-wizard', element: wrap(AdminEventWizard) },
      { path: 'change-password', element: wrap(ChangePasswordPage) },
    ],
  },

  // Landing & Fallback
  { path: '/', element: wrap(LandingPage) },
  { path: '*', element: <NotFoundPage /> },
])
