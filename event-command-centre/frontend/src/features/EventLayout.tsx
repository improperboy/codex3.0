import { Outlet, useParams } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { SideNav } from "../components/SideNav";
import { useDashboard } from "../api/hooks";

export function EventLayout() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: dashboard } = useDashboard(eventId ?? null);

  // SSE live update subscription
  if (eventId) {
    // Connect to the SSE stream and invalidate queries on events
    // (handled via the useSSE hook called in DashboardPage)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar dashboard={dashboard} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <SideNav eventId={eventId!} />
        <main
          id="main-content"
          style={{ flex: 1, overflowY: "auto", background: "var(--slate-100)" }}
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
