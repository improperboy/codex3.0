import { Link, useParams } from "react-router-dom";
import { useEvent } from "../api/hooks";
import { HealthBadge } from "./Badge";
import { RoleSwitcher } from "./RoleSwitcher";
import type { DashboardOut } from "../api/types";

interface TopBarProps {
  dashboard?: DashboardOut | null;
}

export function TopBar({ dashboard }: TopBarProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event } = useEvent(eventId ?? null);

  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid var(--slate-200)",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        to={eventId ? `/events/${eventId}` : "/"}
        style={{ fontWeight: 700, fontSize: 15, color: "var(--slate-900)", textDecoration: "none" }}
        aria-label="Command Centre home"
      >
        ⚡ Command Centre
      </Link>

      {event && (
        <span style={{ color: "var(--slate-400)", fontSize: 13 }}>
          {event.name}
        </span>
      )}

      {dashboard && (
        <>
          <HealthBadge label={dashboard.health_label} />
          {dashboard.days_remaining != null && (
            <span style={{ fontSize: 13, color: "var(--slate-500)" }}>
              {dashboard.days_remaining > 0
                ? `${dashboard.days_remaining} days to go`
                : dashboard.days_remaining === 0
                ? "Event today"
                : `Event ended ${Math.abs(dashboard.days_remaining)} days ago`}
            </span>
          )}
        </>
      )}

      <div style={{ marginLeft: "auto" }}>
        <RoleSwitcher />
      </div>
    </header>
  );
}
