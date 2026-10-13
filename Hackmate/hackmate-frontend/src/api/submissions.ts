import client from './client'
import type { Submission, SubmissionSettings } from '@/types/submission'

export const submissionsApi = {
  getSettings: () =>
    client.get<SubmissionSettings>('/submissions/settings').then((r) => r.data),

  updateSettings: (data: { start_time: string; end_time: string; is_active: boolean }) =>
    client.put<SubmissionSettings>('/submissions/settings', data).then((r) => r.data),

  getByTeam: (teamId: number) =>
    client.get<Submission>(`/submissions/team/${teamId}`).then((r) => r.data),

  submit: (data: {
    team_id: number
    github_link: string
    live_link?: string
    tech_stack: string
    demo_video?: string
    ppt_link?: string
  }) => client.post<Submission>('/submissions/', data).then((r) => r.data),

  update: (submissionId: number, data: {
    github_link?: string
    live_link?: string
    tech_stack?: string
    demo_video?: string
    ppt_link?: string
  }) => client.put<Submission>(`/submissions/${submissionId}`, data).then((r) => r.data),
}
