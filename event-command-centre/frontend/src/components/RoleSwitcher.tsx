import { useUIStore, type Role } from "../state/store";
import { useQueryClient } from "@tanstack/react-query";

const ROLES: { value: Role; label: string }[] = [
  { value: "leadership", label: "Leadership" },
  { value: "marketing", label: "Marketing" },
  { value: "partnerships", label: "Partnerships" },
  { value: "operations", label: "Operations" },
  { value: "programme", label: "Programme" },
];

export function RoleSwitcher() {
  const { role, setRole } = useUIStore();
  const qc = useQueryClient();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label htmlFor="role-select" style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500 }}>
        Role
      </label>
      <select
        id="role-select"
        value={role}
        onChange={(e) => {
          const newRole = e.target.value as Role;
          setRole(newRole);
          qc.invalidateQueries();
        }}
        style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
        aria-label="Switch role"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}
