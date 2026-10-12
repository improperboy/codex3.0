interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
}
export function Skeleton({ height = 20, width = "100%", style }: SkeletonProps) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={18} style={{ marginBottom: 10, width: i === 0 ? "60%" : "90%" }} />
      ))}
    </div>
  );
}
