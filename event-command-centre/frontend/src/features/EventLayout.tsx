import { Outlet, useParams } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { SideNav } from "../components/SideNav";
import { useDashboard } from "../api/hooks";

export function EventLayout() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: dashboard } = useDashboard(eventId ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* F7.3 Accessibility: skip-to-content for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <TopBar dashboard={dashboard} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div className="side-nav">
          <SideNav eventId={eventId!} />
        </div>
        <main
          id="main-content"
          style={{ flex: 1, overflowY: "auto", background: "var(--slate-100)" }}
          tabIndex={-1}
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
