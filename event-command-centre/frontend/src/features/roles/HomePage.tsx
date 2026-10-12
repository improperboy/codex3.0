import { useNavigate } from "react-router-dom";
import { useSeedDemo } from "../../api/hooks";
import { useState } from "react";

export function HomePage() {
  const navigate = useNavigate();
  const seedDemo = useSeedDemo();
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    try {
      const result = await seedDemo.mutateAsync();
      navigate(`/events/${result.event_id}`);
    } catch (e: unknown) {
      setError("Could not load demo. Make sure DEMO_ENABLED=true in your environment.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--slate-100)",
        flexDirection: "column", gap: 32, padding: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--slate-900)", marginBottom: 8 }}>
          Event Command Centre
        </h1>
        <p style={{ color: "var(--slate-500)", fontSize: 16, maxWidth: 480 }}>
          Turn an event brief into a live operating plan with decision support.
          Track registrations, manage partners, and act on ranked recommendations.
        </p>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <button
          className="btn-primary"
          style={{ fontSize: 15, padding: "14px 28px" }}
          onClick={() => navigate("/setup")}
        >
          New event →
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 15, padding: "14px 28px" }}
          disabled={seedDemo.isPending}
          onClick={handleSeed}
        >
          {seedDemo.isPending ? "Loading demo…" : "Load demo event"}
        </button>
      </div>

      {error && (
        <div style={{ color: "var(--red-600)", fontSize: 13, background: "var(--red-50)", padding: "10px 16px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 700, width: "100%" }}>
        {[
          { icon: "📊", title: "Live gap detection", desc: "Tracks registration pace against your target daily." },
          { icon: "🎯", title: "Ranked actions", desc: "Every recommendation shows the numbers behind it." },
          { icon: "🔄", title: "Close the loop", desc: "Closing a task updates the dashboard for everyone instantly." },
        ].map((f) => (
          <div key={f.title} className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: "var(--slate-500)" }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
