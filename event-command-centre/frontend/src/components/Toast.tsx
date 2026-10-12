import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onUndo?: () => void;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, onUndo, duration = 5000, onDismiss }: ToastProps) {
  const [countdown, setCountdown] = useState(Math.round(duration / 1000));

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => { clearTimeout(timer); clearInterval(tick); };
  }, [duration, onDismiss]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      {onUndo && (
        <button
          className="btn-secondary"
          style={{ padding: "4px 10px", fontSize: 13 }}
          onClick={() => { onUndo(); onDismiss(); }}
        >
          Undo ({countdown}s)
        </button>
      )}
      <button
        aria-label="Dismiss"
        style={{ background: "transparent", color: "#fff", padding: "4px 8px" }}
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}
