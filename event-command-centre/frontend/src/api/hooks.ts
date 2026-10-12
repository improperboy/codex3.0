/**
 * TanStack Query hooks — one hook per API resource.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./client";
import type { Brief } from "./types";

// ── Query keys ────────────────────────────────────────────────────────────────
export const keys = {
  event: (id: string) => ["event", id] as const,
  dashboard: (id: string) => ["dashboard", id] as const,
  plan: (id: string) => ["plan", id] as const,
  risks: (id: string) => ["risks", id] as const,
  recommendations: (id: string, role?: string) => ["recommendations", id, role] as const,
  tasks: (id: string, role?: string) => ["tasks", id, role] as const,
  registrations: (id: string) => ["registrations", id] as const,
  partners: (id: string) => ["partners", id] as const,
  logistics: (id: string) => ["logistics", id] as const,
  content: (id: string) => ["content", id] as const,
  outreach: (id: string) => ["outreach", id] as const,
  health: () => ["health"] as const,
};

// ── Event ─────────────────────────────────────────────────────────────────────
export const useEvent = (id: string | null) =>
  useQuery({ queryKey: keys.event(id!), queryFn: () => api.getEvent(id!), enabled: !!id });

export const useDashboard = (id: string | null) =>
  useQuery({ queryKey: keys.dashboard(id!), queryFn: () => api.getDashboard(id!), enabled: !!id, refetchInterval: 60_000 });

export const usePlan = (id: string | null) =>
  useQuery({ queryKey: keys.plan(id!), queryFn: () => api.getPlan(id!), enabled: !!id });

// ── Risks & Recommendations ───────────────────────────────────────────────────
export const useRisks = (id: string | null, includeResolved = false) =>
  useQuery({
    queryKey: [...keys.risks(id!), includeResolved],
    queryFn: () => api.getRisks(id!, includeResolved),
    enabled: !!id,
  });

export const useRecommendations = (id: string | null, role?: string) =>
  useQuery({
    queryKey: keys.recommendations(id!, role),
    queryFn: () => api.getRecommendations(id!, role),
    enabled: !!id,
  });

export const useAcceptRecommendation = (eventId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionId, ownerName }: { actionId: string; ownerName?: string }) =>
      api.acceptRecommendation(actionId, ownerName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboard(eventId) });
      qc.invalidateQueries({ queryKey: keys.recommendations(eventId) });
      qc.invalidateQueries({ queryKey: keys.tasks(eventId) });
    },
  });
};

export const useDismissRecommendation = (eventId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionId, reason }: { actionId: string; reason: string }) =>
      api.dismissRecommendation(actionId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.recommendations(eventId) }),
  });
};

export const useSnoozeRecommendation = (eventId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionId, days }: { actionId: string; days: number }) =>
      api.snoozeRecommendation(actionId, days),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.recommendations(eventId) }),
  });
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const useTaskBoard = (id: string | null, ownerRole?: string) =>
  useQuery({
    queryKey: keys.tasks(id!, ownerRole),
    queryFn: () => api.getTaskBoard(id!, ownerRole),
    enabled: !!id,
  });

export const useCloseTask = (eventId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskId: string; outcome_note: string; metric_key?: string; metric_value?: number }) =>
      api.closeTask(data.taskId, { outcome_note: data.outcome_note, metric_key: data.metric_key, metric_value: data.metric_value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboard(eventId) });
      qc.invalidateQueries({ queryKey: keys.tasks(eventId) });
      qc.invalidateQueries({ queryKey: keys.risks(eventId) });
      qc.invalidateQueries({ queryKey: keys.recommendations(eventId) });
    },
  });
};

export const useReopenTask = (eventId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.reopenTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tasks(eventId) });
      qc.invalidateQueries({ queryKey: keys.dashboard(eventId) });
    },
  });
};

// ── Workstreams ───────────────────────────────────────────────────────────────
export const useRegistrations = (id: string | null) =>
  useQuery({ queryKey: keys.registrations(id!), queryFn: () => api.getRegistrations(id!), enabled: !!id });

export const usePartners = (id: string | null) =>
  useQuery({ queryKey: keys.partners(id!), queryFn: () => api.getPartners(id!), enabled: !!id });

export const useLogistics = (id: string | null) =>
  useQuery({ queryKey: keys.logistics(id!), queryFn: () => api.getLogistics(id!), enabled: !!id });

export const useContent = (id: string | null) =>
  useQuery({ queryKey: keys.content(id!), queryFn: () => api.getContent(id!), enabled: !!id });

export const useOutreach = (id: string | null) =>
  useQuery({ queryKey: keys.outreach(id!), queryFn: () => api.getOutreach(id!), enabled: !!id });

// ── Demo ──────────────────────────────────────────────────────────────────────
export const useSeedDemo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.seedDemo,
    onSuccess: () => qc.invalidateQueries(),
  });
};

export const useResetDemo = (eventId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.resetDemo(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboard(eventId) });
      qc.invalidateQueries({ queryKey: keys.risks(eventId) });
      qc.invalidateQueries({ queryKey: keys.recommendations(eventId) });
      qc.invalidateQueries({ queryKey: keys.tasks(eventId) });
    },
  });
};

// ── Health ────────────────────────────────────────────────────────────────────
export const useHealth = () =>
  useQuery({ queryKey: keys.health(), queryFn: api.getHealth, refetchInterval: 15_000 });

// ── Create event ──────────────────────────────────────────────────────────────
export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (brief: Brief) => api.createEvent(brief),
    onSuccess: () => qc.invalidateQueries(),
  });
};
