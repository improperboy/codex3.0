interface BadgeProps {
  label: string;
  variant?: string;
}
export function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`badge badge-${variant ?? label.toLowerCase().replace(/\s/g, "_")}`}>
      {label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const labels: Record<string, string> = {
    critical: "Critical", high: "High", medium: "Medium", low: "Low",
  };
  return <Badge label={labels[severity] ?? severity} variant={severity} />;
}

export function HealthBadge({ label }: { label: string }) {
  const display: Record<string, string> = {
    on_track: "On track", at_risk: "At risk", off_track: "Off track",
  };
  return <Badge label={display[label] ?? label} variant={label} />;
}

export function StatusBadge({ status }: { status: string }) {
  const display: Record<string, string> = {
    todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done",
  };
  return (
    <span className={`badge status-${status}`}>
      {display[status] ?? status}
    </span>
  );
}
