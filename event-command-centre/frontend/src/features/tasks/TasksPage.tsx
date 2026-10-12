import { useParams, useSearchParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTaskBoard, useCloseTask, useReopenTask, useRisks } from "../../api/hooks";
import { useUIStore } from "../../state/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask, tickChecklist } from "../../api/client";
import { keys } from "../../api/hooks";
import { StatusBadge } from "../../components/Badge";
import { SkeletonCard } from "../../components/Skeleton";
import { Toast } from "../../components/Toast";
import type { TaskOut, TaskCloseResponse } from "../../api/types";

type ColumnKey = "todo" | "in_progress" | "blocked" | "done";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
];

export function TasksPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const workstreamId = searchParams.get("workstream_id");
  const { role } = useUIStore();

  const [filterRole, setFilterRole] = useState<string>(role);
  const [selectedTask, setSelectedTask] = useState<TaskOut | null>(null);
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
  const [feedback, setFeedback] = useState<TaskCloseResponse | null>(null);
  const [closeConflict, setCloseConflict] = useState<string | null>(null);

  // Update filter role when global role changes
  useEffect(() => {
    setFilterRole(role);
  }, [role]);

  const { data: board, isLoading } = useTaskBoard(eventId ?? null, filterRole || undefined);
  const { data: risksData } = useRisks(eventId ?? null, true);
  const closeTask = useCloseTask(eventId!);
  const reopenTask = useReopenTask(eventId!);
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; blocked_reason?: string; owner_name?: string } }) =>
      updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tasks(eventId!) });
      qc.invalidateQueries({ queryKey: keys.dashboard(eventId!) });
    },
  });

  if (isLoading) {
    return (
      <div className="page">
        <SkeletonCard rows={5} />
      </div>
    );
  }

  // Filter tasks by workstream if workstream_id is in query params
  const filterByWs = (tasks: TaskOut[]) => {
    if (!workstreamId) return tasks;
    return tasks.filter((t) => t.workstream_id === workstreamId);
  };

  const handleCloseSuccess = (res: TaskCloseResponse) => {
    setFeedback(res);
    setCloseConflict(null);
    setToast({
      message: `Task closed — dashboard updated`,
      onUndo: () => {
        reopenTask.mutate(res.task.id, {
          onSuccess: () => {
            setToast({ message: "Task closure undone" });
            setFeedback(null);
          },
        });
      },
    });
  };

  const handleCloseError = (err: unknown) => {
    const errorObj = (err as { response?: { data?: { detail?: { error?: { message?: string } } } } })?.response?.data?.detail?.error;
    const msg = errorObj?.message || (err instanceof Error ? err.message : "Error closing task");
    setCloseConflict(msg);
    qc.invalidateQueries({ queryKey: keys.tasks(eventId!) });
  };

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>Team Task Board</h1>
          {workstreamId && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: "var(--blue-600)", background: "var(--blue-50)", padding: "2px 8px", borderRadius: 12 }}>
                Filtered by workstream
              </span>
              <button
                className="btn-secondary"
                style={{ fontSize: 11, padding: "2px 6px" }}
                onClick={() => setSearchParams({})}
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label htmlFor="filter-role" style={{ fontSize: 13, color: "var(--slate-500)", fontWeight: 500 }}>
            Role filter:
          </label>
          <select
            id="filter-role"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ width: "auto", fontSize: 13, padding: "4px 10px" }}
          >
            <option value="">All Roles</option>
            {["leadership", "marketing", "partnerships", "operations", "programme"].map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {closeConflict && (
        <div style={{ marginBottom: 16, background: "var(--red-50)", color: "var(--red-600)", padding: "10px 14px", borderRadius: 6, fontSize: 13, border: "1px solid var(--red-200)" }}>
          ⚠ {closeConflict}
        </div>
      )}

      {/* Post-close feedback panel */}
      {feedback && (
        <div className="card" style={{ marginBottom: 20, borderLeft: "4px solid var(--green-600)", background: "#fafdf9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--green-700)", margin: 0 }}>
                ✓ Task Closed: {feedback.task.title}
              </h2>
              <p style={{ fontSize: 13, color: "var(--slate-600)", marginTop: 4, marginBottom: 8 }}>
                Outcome: <em>"{feedback.closure.outcome_note}"</em>
              </p>
            </div>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => setFeedback(null)}
            >
              Dismiss
            </button>
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12, marginTop: 8 }}>
            {feedback.closure.metric_key && (
              <div>
                <span style={{ color: "var(--slate-500)" }}>{feedback.closure.metric_key}: </span>
                <span style={{ color: "var(--slate-400)" }}>{String(feedback.before[feedback.closure.metric_key] ?? 0)}</span>
                <span style={{ color: "var(--slate-600)" }}> → </span>
                <strong style={{ color: "var(--green-700)" }}>{String(feedback.after[feedback.closure.metric_key] ?? feedback.closure.metric_value)}</strong>
              </div>
            )}
            {feedback.risk_changes.length > 0 && (
              <div>
                <span style={{ color: "var(--slate-500)" }}>Risk impact: </span>
                {feedback.risk_changes.map((rc, i) => (
                  <span key={i} style={{ color: "var(--slate-700)", fontWeight: 500, marginRight: 6 }}>
                    {rc.rule_key} ({rc.severity})
                  </span>
                ))}
              </div>
            )}
            {feedback.new_recommendations.length > 0 && (
              <div>
                <span style={{ color: "var(--blue-600)", fontWeight: 500 }}>
                  + New follow-up action: {feedback.new_recommendations[0].title}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4-column board */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "start" }}>
        {COLUMNS.map((col) => {
          const colTasks = filterByWs(board ? board[col.key] || [] : []);
          return (
            <div key={col.key}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: "var(--slate-600)",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{col.label}</span>
                <span style={{ color: "var(--slate-400)" }}>{colTasks.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onSelect={() => setSelectedTask(task)}
                    onStatusChange={(newStatus, blockedReason) =>
                      updateMutation.mutate({ id: task.id, data: { status: newStatus, blocked_reason: blockedReason } })
                    }
                    onClose={(data) =>
                      closeTask.mutate(
                        { taskId: task.id, ...data },
                        {
                          onSuccess: handleCloseSuccess,
                          onError: handleCloseError,
                        }
                      )
                    }
                    onReopen={() =>
                      reopenTask.mutate(task.id, {
                        onSuccess: () => setToast({ message: "Task reopened" }),
                      })
                    }
                  />
                ))}
                {colTasks.length === 0 && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--slate-400)",
                      border: "2px dashed var(--slate-200)",
                      borderRadius: 8,
                      padding: 16,
                      textAlign: "center",
                    }}
                  >
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          risks={risksData?.risks ?? []}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: TaskOut;
  onSelect: () => void;
  onStatusChange: (status: string, blockedReason?: string) => void;
  onClose: (data: { outcome_note: string; metric_key?: string; metric_value?: number }) => void;
  onReopen: () => void;
}

function TaskCard({ task, onSelect, onStatusChange, onClose, onReopen }: TaskCardProps) {
  const [showClose, setShowClose] = useState(false);
  const [showBlockedPrompt, setShowBlockedPrompt] = useState(false);
  const [blockedInput, setBlockedInput] = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [metricKey, setMetricKey] = useState("");
  const [metricValue, setMetricValue] = useState("");

  const now = new Date();
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && dueDate < now && task.status !== "done";
  const daysOverdue = dueDate && isOverdue ? Math.max(1, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <article
      className="card"
      style={{
        padding: 14,
        borderLeft: task.status === "blocked" ? "4px solid var(--red-600)" : "4px solid transparent",
        transition: "box-shadow 0.15s ease",
      }}
      aria-label={task.title}
    >
      <div
        style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "var(--slate-900)", cursor: "pointer" }}
        onClick={onSelect}
      >
        {task.title}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <StatusBadge status={task.status} />
        <span style={{ fontSize: 11, color: "var(--slate-500)", textTransform: "capitalize" }}>{task.owner_role}</span>
        {isOverdue && (
          <span style={{ fontSize: 11, color: "var(--orange-600)", fontWeight: 600 }}>
            ⏰ {daysOverdue}d overdue
          </span>
        )}
        {task.source_action_id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            style={{
              fontSize: 11,
              color: "var(--blue-600)",
              background: "var(--blue-50)",
              padding: "1px 6px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
            }}
          >
            From recommendation
          </button>
        )}
      </div>

      {task.blocked_reason && (
        <div style={{ fontSize: 12, color: "var(--red-600)", marginBottom: 8, background: "var(--red-50)", padding: "4px 8px", borderRadius: 4 }}>
          <strong>Blocked:</strong> {task.blocked_reason}
        </div>
      )}

      {dueDate && (
        <div style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 8 }}>
          Due: {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </div>
      )}

      {/* Checklist items */}
      {task.checklist_items && task.checklist_items.length > 0 && (
        <ChecklistItems task={task} />
      )}

      {/* Quick State Transitions */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {task.status === "todo" && (
          <>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => onStatusChange("in_progress")}
            >
              Start →
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px", color: "var(--red-600)" }}
              onClick={() => setShowBlockedPrompt(true)}
            >
              Block
            </button>
          </>
        )}

        {task.status === "in_progress" && (
          <>
            <button
              className="btn-primary"
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => setShowClose(!showClose)}
            >
              Close task
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px", color: "var(--red-600)" }}
              onClick={() => setShowBlockedPrompt(true)}
            >
              Block
            </button>
          </>
        )}

        {task.status === "blocked" && (
          <button
            className="btn-secondary"
            style={{ fontSize: 11, padding: "4px 8px", color: "var(--blue-600)" }}
            onClick={() => onStatusChange("in_progress", "")}
          >
            Unblock → In progress
          </button>
        )}

        {task.status === "done" && (
          <button
            className="btn-secondary"
            style={{ width: "100%", fontSize: 11, padding: "4px 8px" }}
            onClick={onReopen}
          >
            Reopen task
          </button>
        )}
      </div>

      {/* Blocked reason input */}
      {showBlockedPrompt && (
        <div style={{ marginTop: 8, padding: 8, background: "var(--slate-50)", borderRadius: 6 }}>
          <input
            placeholder="Reason for blocking (required)"
            value={blockedInput}
            onChange={(e) => setBlockedInput(e.target.value)}
            style={{ fontSize: 12, marginBottom: 6 }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn-danger"
              style={{ fontSize: 11, padding: "3px 8px" }}
              disabled={!blockedInput.trim()}
              onClick={() => {
                onStatusChange("blocked", blockedInput);
                setShowBlockedPrompt(false);
                setBlockedInput("");
              }}
            >
              Confirm Block
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => setShowBlockedPrompt(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Close task inline form */}
      {showClose && (
        <div style={{ marginTop: 10, padding: 10, background: "var(--slate-50)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-800)" }}>Close Task</div>
          <textarea
            placeholder="Outcome note (required, e.g. 38 registrations from push)"
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            rows={2}
            maxLength={2000}
            aria-label="Outcome note"
            style={{ fontSize: 12 }}
            required
          />
          <div style={{ display: "flex", gap: 6 }}>
            <input
              placeholder="Metric key (e.g. registrations)"
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
              aria-label="Metric key"
            />
            <input
              type="number"
              placeholder="Value"
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
              style={{ width: 80, fontSize: 12 }}
              aria-label="Metric value"
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: 12, padding: "5px 0" }}
              disabled={!outcomeNote.trim()}
              onClick={() => {
                onClose({
                  outcome_note: outcomeNote,
                  metric_key: metricKey || undefined,
                  metric_value: metricValue ? parseFloat(metricValue) : undefined,
                });
                setShowClose(false);
              }}
            >
              Submit &amp; Close
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: 12, padding: "5px 8px" }}
              onClick={() => setShowClose(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function ChecklistItems({ task }: { task: TaskOut }) {
  const qc = useQueryClient();
  const { eventId } = useParams<{ eventId: string }>();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const tick = async (itemId: string, done: boolean) => {
    setOptimistic((prev) => ({ ...prev, [itemId]: done }));
    try {
      await tickChecklist(task.id, itemId, done);
      qc.invalidateQueries({ queryKey: keys.tasks(eventId!) });
    } catch {
      setOptimistic((prev) => ({ ...prev, [itemId]: !done })); // revert on error
    }
  };

  const doneCount = task.checklist_items.filter((i) => optimistic[i.id] ?? i.done).length;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 4 }}>
        Checklist ({doneCount}/{task.checklist_items.length})
      </div>
      {task.checklist_items.map((item) => {
        const isDone = optimistic[item.id] ?? item.done;
        return (
          <label
            key={item.id}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 3, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={isDone}
              onChange={(e) => tick(item.id, e.target.checked)}
              style={{ width: "auto" }}
            />
            <span style={{ textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--slate-400)" : "var(--slate-700)" }}>
              {item.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function TaskDetailModal({
  task,
  risks,
  onClose,
}: {
  task: TaskOut;
  risks: Array<{ id: string; type: string; severity: string; evidence: Record<string, unknown> }>;
  onClose: () => void;
}) {
  const matchingRisk = risks.find((r) => r.id === task.source_action_id || task.source_action_id != null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 550,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 24,
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--slate-900)" }}>
            {task.title}
          </h2>
          <button
            className="btn-secondary"
            style={{ fontSize: 12, padding: "4px 8px" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <StatusBadge status={task.status} />
          <span style={{ fontSize: 12, color: "var(--slate-500)", padding: "2px 8px", background: "var(--slate-100)", borderRadius: 12 }}>
            Owner: {task.owner_name || task.owner_role}
          </span>
          {task.due_date && (
            <span style={{ fontSize: 12, color: "var(--slate-500)", padding: "2px 8px", background: "var(--slate-100)", borderRadius: 12 }}>
              Due: {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {task.success_criterion && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-500)", marginBottom: 4 }}>
              SUCCESS CRITERION
            </div>
            <div style={{ fontSize: 13, color: "var(--slate-800)" }}>{task.success_criterion}</div>
          </div>
        )}

        {task.blocked_reason && (
          <div style={{ marginBottom: 16, background: "var(--red-50)", padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red-600)", marginBottom: 4 }}>
              BLOCKED REASON
            </div>
            <div style={{ fontSize: 13, color: "var(--red-700)" }}>{task.blocked_reason}</div>
          </div>
        )}

        {/* Action Detail & Triggering Evidence */}
        {task.source_action_id && (
          <div style={{ marginBottom: 16, borderTop: "1px solid var(--slate-100)", paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue-600)", marginBottom: 6 }}>
              LINKED RECOMMENDATION &amp; RISK EVIDENCE
            </div>
            <div style={{ fontSize: 13, color: "var(--slate-600)", marginBottom: 8 }}>
              This task was created by accepting a recommended action.
            </div>
            {matchingRisk && matchingRisk.evidence && (
              <div style={{ background: "var(--slate-50)", padding: 10, borderRadius: 6, fontSize: 12, fontFamily: "var(--mono)" }}>
                {Object.entries(matchingRisk.evidence).map(([k, v]) => (
                  <div key={k} style={{ color: "var(--slate-600)", marginBottom: 2 }}>
                    <span style={{ color: "var(--slate-400)" }}>{k}: </span>
                    <strong>{String(v)}</strong>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <Link
                to={`/events/${task.event_id}/risks`}
                style={{ fontSize: 12, color: "var(--blue-600)", textDecoration: "none" }}
              >
                View in Risks &amp; Recommendations →
              </Link>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
