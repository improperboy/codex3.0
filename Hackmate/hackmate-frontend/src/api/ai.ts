import client from './client'

export interface EventWizardInput {
  event_format: string
  event_date: string
  expected_participants: number
  venue: string
  budget: string
  goals: string
  audience: string
  duration_days?: number
  theme?: string
}

export interface Milestone {
  name: string
  date_offset_days: number
  description: string
  responsible_team: string
}

export interface StaffRole {
  role: string
  count: number
  responsibilities: string
}

export interface MarketingChannel {
  channel: string
  target: string
  deadline_offset_days: number
}

export interface BudgetItem {
  category: string
  estimated_amount: string
  percentage?: number
}

export interface Risk {
  risk: string
  mitigation: string
}

export interface EventPlan {
  overview: string
  timeline: Milestone[]
  staffing: StaffRole[]
  marketing: MarketingChannel[]
  budget_breakdown: BudgetItem[]
  key_risks: Risk[]
  success_metrics: string[]
}

export const aiApi = {
  generateEventPlan: async (data: EventWizardInput): Promise<EventPlan> => {
    const res = await client.post<EventPlan>('/ai/event-wizard/generate', data)
    return res.data
  },
}
