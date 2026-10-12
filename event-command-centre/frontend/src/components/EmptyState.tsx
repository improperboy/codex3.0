interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 12, padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40 }} aria-hidden="true">📋</div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--slate-800)" }}>{title}</h2>
      <p style={{ color: "var(--slate-500)", maxWidth: 360 }}>{description}</p>
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
