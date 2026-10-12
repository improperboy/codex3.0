/**
 * UI-only Zustand store.
 * No server data lives here — that belongs in TanStack Query.
 */
import { create } from "zustand";

export type Role = "leadership" | "marketing" | "partnerships" | "operations" | "programme";

interface UIState {
  role: Role;
  wizardStep: number;
  activeEventId: string | null;
  setRole: (role: Role) => void;
  setWizardStep: (step: number) => void;
  setActiveEventId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  role: "leadership",
  wizardStep: 0,
  activeEventId: null,
  setRole: (role) => set({ role }),
  setWizardStep: (wizardStep) => set({ wizardStep }),
  setActiveEventId: (activeEventId) => set({ activeEventId }),
}));
