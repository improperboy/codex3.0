// ── Shared types mirroring backend Pydantic schemas ──────────────────────────

export interface Brief {
  name: string;
  type: "hackathon" | "workshop" | "bootcamp" | "webinar_series";
  format: "in_person" | "hybrid" | "virtual";
  start_date: string;
  end_date: string;
  audience: string;
  scale_seats: number;
  venue_type?: string;
  city?: string;
  needs_catering?: boolean;
  needs_av?: boolean;
  needs_streaming?: boolean;
  objectives: string[];
  target_registrations: number;
  target_reach?: number;
  target_partners?: number;
}

export interface EventOut {
  id: string;
  name: string;
  type: string;
  format: string;
  start_date: string;
  end_date: string;
  audience: string;
  scale_seats: number;
  venue_type: string | null;
  city: string | null;
  objectives: string[];
  target_registrations: number;
  target_reach: number | null;
  target_partners: number | null;
  created_at: string;
}

export interface EventCreatedOut {
  id: string;
  name: string;
  plan_id: string;
  task_count: number;
  message: string;
}

export interface KpiOut {
  value: number | null;
  target: number | null;
  pace?: number | null;
  required_pace?: number | null;
}

export interface WorkstreamSummary {
  workstream_id: string;
  name: string;
  owner_role: string;
  total_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  next_milestone_title: string | null;
  next_milestone_date: string | null;
}

export interface RiskSummary {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  owner_role: string;
  evidence_summary: string;
}

export interface ActionSummary {
  id: string;
  title: string;
  owner_role: string;
  expected_impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  urgency: number;
  rationale: string;
}

export interface DashboardOut {
  event_id: string;
  health_label: "on_track" | "at_risk" | "off_track";
  days_remaining: number | null;
  registrations: KpiOut;
  reach: KpiOut;
  partners: KpiOut;
  open_tasks: number;
  overdue_tasks: number;
  content_published: KpiOut;
  top_risks: RiskSummary[];
  top_recommendations: ActionSummary[];
  workstreams: WorkstreamSummary[];
  evaluated_at: string | null;
}

export interface RiskOut {
  id: string;
  rule_key: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  owner_role: string;
  evidence: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface ActionOut {
  id: string;
  template_key: string;
  title: string;
  rationale: string;
  owner_role: string;
  expected_impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  urgency: number;
  status: string;
  risk_id: string | null;
  checklist_template: string[];
  snoozed_until: string | null;
}

export interface ChecklistItemOut {
  id: string;
  label: string;
  done: boolean;
  position: number;
}

export interface TaskOut {
  id: string;
  event_id: string;
  workstream_id: string | null;
  title: string;
  owner_role: string;
  owner_name: string | null;
  due_date: string | null;
  status: "todo" | "in_progress" | "blocked" | "done";
  source_action_id: string | null;
  success_criterion: string | null;
  blocked_reason: string | null;
  checklist_items: ChecklistItemOut[];
  created_at: string;
  updated_at: string;
}

export interface TaskBoardOut {
  todo: TaskOut[];
  in_progress: TaskOut[];
  blocked: TaskOut[];
  done: TaskOut[];
}

export interface ClosureOut {
  id: string;
  task_id: string;
  outcome_note: string;
  metric_key: string | null;
  metric_value: number | null;
  closed_by: string;
  closed_at: string;
}

export interface TaskCloseResponse {
  task: TaskOut;
  closure: ClosureOut;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  risk_changes: Array<{ rule_key: string; severity: string }>;
  new_recommendations: Array<{ title: string; template_key: string }>;
}

export interface FunnelOut {
  visits: number;
  form_starts: number;
  registrations: number;
  confirmed_attendees: number;
  visit_to_registration: number;
}

export interface GapPanelOut {
  target: number;
  actual: number;
  required_pace: number;
  current_pace: number;
  projected_finish: number;
  days_remaining: number;
}

export interface ChannelStatOut {
  channel_id: string;
  name: string;
  visits: number;
  registrations: number;
  conversion: number;
  is_campus: boolean;
  is_top_converting: boolean;
}

export interface RegistrationsOut {
  funnel: FunnelOut;
  gap: GapPanelOut;
  channels: ChannelStatOut[];
}

export interface PartnerOut {
  id: string;
  name: string;
  tier: string;
  status: "prospect" | "contacted" | "confirmed" | "activated";
  confirmation_due_date: string | null;
  days_late: number | null;
  fallback_partner_id: string | null;
}

export interface LogisticsItemOut {
  id: string;
  category: string;
  title: string;
  status: string;
  lead_time_days: number;
  lock_date: string | null;
  needs_escalation: boolean;
}

export interface ContentItemOut {
  id: string;
  channel_id: string | null;
  type: string;
  planned_date: string;
  published_at: string | null;
  owner_role: string;
  title: string | null;
  is_behind_plan: boolean;
}

export interface CampaignOut {
  channel_id: string;
  channel_name: string;
  total_visits: number;
  total_registrations: number;
  conversion: number;
  is_top_converting: boolean;
}

export interface PlanOut {
  id: string;
  event_id: string;
  generated_at: string;
  engine_version: string;
  rules_applied: string[];
  workstreams: Array<{ id: string; name: string; owner_role: string }>;
  milestones: Array<{ id: string; title: string; due_date: string; status: string }>;
  task_count: number;
}

export interface PlanPreviewOut {
  task_count: number;
  workstream_names: string[];
  milestone_count: number;
  content_items: number;
  rules_applied: string[];
  warnings: string[];
}

export interface ApiError {
  error: { code: string; message: string; fields?: Array<{ field: string; message: string }> };
}
