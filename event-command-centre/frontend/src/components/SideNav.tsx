import { NavLink } from "react-router-dom";

interface NavItem { to: string; label: string; icon: string; }

interface SideNavProps { eventId: string; }

export function SideNav({ eventId }: SideNavProps) {
  const base = `/events/${eventId}`;
  const items: NavItem[] = [
    { to: base, label: "Dashboard", icon: "🏠" },
    { to: `${base}/registrations`, label: "Registrations", icon: "📊" },
    { to: `${base}/outreach`, label: "Outreach", icon: "📢" },
    { to: `${base}/partners`, label: "Partners", icon: "🤝" },
    { to: `${base}/tasks`, label: "Tasks", icon: "✅" },
    { to: `${base}/content`, label: "Content", icon: "📝" },
    { to: `${base}/operations`, label: "Operations", icon: "⚙️" },
    { to: `${base}/risks`, label: "Risks", icon: "⚠️" },
    { to: `${base}/plan`, label: "Plan", icon: "🗓️" },
  ];

  return (
    <nav
      aria-label="Section navigation"
      style={{
        width: 200, flexShrink: 0, background: "#fff",
        borderRight: "1px solid var(--slate-200)",
        padding: "16px 0", display: "flex", flexDirection: "column", gap: 2,
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === base}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 20px", fontSize: 14, fontWeight: isActive ? 600 : 400,
            color: isActive ? "var(--blue-600)" : "var(--slate-700)",
            background: isActive ? "var(--blue-50)" : "transparent",
            borderLeft: isActive ? "3px solid var(--blue-600)" : "3px solid transparent",
            textDecoration: "none",
            transition: "background .1s",
          })}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
