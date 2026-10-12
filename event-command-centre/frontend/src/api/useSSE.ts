import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "./hooks";

/**
 * Subscribe to the SSE stream for an event.
 * Invalidates the relevant queries when dashboard.updated or risks.updated arrive.
 */
export function useSSE(eventId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!eventId) return;

    const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
    const es = new EventSource(`${BASE}/events/${eventId}/stream`);

    es.addEventListener("dashboard.updated", () => {
      qc.invalidateQueries({ queryKey: keys.dashboard(eventId) });
      qc.invalidateQueries({ queryKey: keys.tasks(eventId) });
    });

    es.addEventListener("risks.updated", () => {
      qc.invalidateQueries({ queryKey: keys.risks(eventId) });
      qc.invalidateQueries({ queryKey: keys.recommendations(eventId) });
    });

    return () => es.close();
  }, [eventId, qc]);
}
