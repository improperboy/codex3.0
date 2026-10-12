/**
 * Typed API client — thin fetch wrapper.
 * All requests send X-Role from the UI store.
 */
import { useUIStore } from "../state/store";
import type {
  ActionOut,
  Brief,
  CampaignOut,
  ContentItemOut,
  DashboardOut,
  EventCreatedOut,
  EventOut,
  LogisticsItemOut,
  PartnerOut,
  PlanOut,
  PlanPreviewOut,
  RegistrationsOut,
  RiskOut,
  TaskBoardOut,
  TaskCloseResponse,
  TaskOut,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

function getRole(): string {
  return useUIStore.getState().role;
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Role": getRole(),
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let detail: unknown;
    try { detail = await res.json(); } catch { detail = res.statusText; }
    const err = new Error(`API ${res.status}: ${path}`) as Error & { status: number; detail: unknown };
    err.status = res.status;
    err.detail = detail;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path, { method: "GET" });
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });

// ── Events ────────────────────────────────────────────────────────────────────
export const createEvent = (brief: Brief) => post<EventCreatedOut>("/events", brief);
export const getEvent = (id: string) => get<EventOut>(`/events/${id}`);
export const getDashboard = (id: string) => get<DashboardOut>(`/events/${id}/dashboard`);
export const recordMetric = (id: string, data: { metric_key: string; value: number }) =>
  post(`/events/${id}/metrics`, data);

// ── Plans ─────────────────────────────────────────────────────────────────────
export const getPlan = (id: string) => get<PlanOut>(`/events/${id}/plan`);
export const previewPlan = (brief: Brief) => post<PlanPreviewOut>("/plans/preview", brief);

// ── Risks ─────────────────────────────────────────────────────────────────────
export const getRisks = (id: string, includeResolved = false) =>
  get<{ risks: RiskOut[]; evaluated_at: string | null }>(
    `/events/${id}/risks${includeResolved ? "?include_resolved=true" : ""}`
  );

// ── Recommendations ───────────────────────────────────────────────────────────
export const getRecommendations = (id: string, role?: string) =>
  get<{ recommendations: ActionOut[]; evaluated_at: string | null }>(
    `/events/${id}/recommendations${role ? `?role=${role}` : ""}`
  );
export const acceptRecommendation = (actionId: string, ownerName?: string) =>
  post(`/recommendations/${actionId}/accept`, { owner_name: ownerName });
export const dismissRecommendation = (actionId: string, reason: string) =>
  post(`/recommendations/${actionId}/dismiss`, { reason });
export const snoozeRecommendation = (actionId: string, days: number) =>
  post(`/recommendations/${actionId}/snooze`, { days });
export const restoreRecommendation = (actionId: string) =>
  post(`/recommendations/${actionId}/restore`);

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const getTaskBoard = (id: string, ownerRole?: string) =>
  get<TaskBoardOut>(`/events/${id}/tasks${ownerRole ? `?owner_role=${ownerRole}` : ""}`);
export const updateTask = (taskId: string, data: { status?: string; blocked_reason?: string; owner_name?: string }) =>
  patch<TaskOut>(`/tasks/${taskId}`, data);
export const tickChecklist = (taskId: string, itemId: string, done: boolean) =>
  patch(`/tasks/${taskId}/checklist`, { item_id: itemId, done });
export const closeTask = (taskId: string, data: { outcome_note: string; metric_key?: string; metric_value?: number }) =>
  post<TaskCloseResponse>(`/tasks/${taskId}/close`, data);
export const reopenTask = (taskId: string) => post(`/tasks/${taskId}/reopen`);

// ── Workstreams ───────────────────────────────────────────────────────────────
export const getRegistrations = (id: string) => get<RegistrationsOut>(`/events/${id}/registrations`);
export const getPartners = (id: string) => get<PartnerOut[]>(`/events/${id}/partners`);
export const updatePartner = (partnerId: string, status: string) =>
  patch<PartnerOut>(`/partners/${partnerId}`, { status });
export const getLogistics = (id: string) => get<LogisticsItemOut[]>(`/events/${id}/logistics`);
export const updateLogistics = (itemId: string, status: string) =>
  patch<LogisticsItemOut>(`/logistics/${itemId}`, { status });
export const getContent = (id: string) => get<ContentItemOut[]>(`/events/${id}/content`);
export const getOutreach = (id: string) => get<CampaignOut[]>(`/events/${id}/outreach`);

// ── Demo ──────────────────────────────────────────────────────────────────────
export const seedDemo = () => post<{ event_id: string; name: string }>("/demo/seed");
export const resetDemo = (eventId: string) => post("/demo/reset", { confirm: eventId });

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = () => get<{ status: string; database: string }>("/health");
