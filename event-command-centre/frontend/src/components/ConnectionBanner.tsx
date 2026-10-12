import { useHealth } from "../api/hooks";

export function ConnectionBanner() {
  const { data, isError } = useHealth();
  if (!isError && data?.status === "ok") return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: "var(--amber-50)",
        borderBottom: "1px solid var(--amber-500)",
        padding: "10px 24px",
        fontSize: 13,
        color: "var(--amber-500)",
        fontWeight: 500,
      }}
    >
      ⚠ Can't reach the command centre. Showing cached data. Retrying…
    </div>
  );
}
