import { useParams } from "react-router-dom";
import { usePartners } from "../../api/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePartner } from "../../api/client";
import { keys } from "../../api/hooks";
import { SkeletonCard } from "../../components/Skeleton";
import type { PartnerOut } from "../../api/types";

const STATUSES: PartnerOut["status"][] = ["prospect", "contacted", "confirmed", "activated"];
const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect", contacted: "Contacted", confirmed: "Confirmed", activated: "Activated",
};

export function PartnersPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: partners, isLoading } = usePartners(eventId ?? null);
  const qc = useQueryClient();
  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePartner(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.partners(eventId!) }),
  });

  if (isLoading) return <div className="page"><SkeletonCard rows={4} /></div>;
  if (!partners) return <div className="page"><p>No partners found.</p></div>;

  const byStatus = (status: string) => partners.filter((p) => p.status === status);

  return (
    <div className="page">
      <h1 className="section-title">Partner Pipeline</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {STATUSES.map((status) => (
          <div key={status}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--slate-600)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {STATUS_LABELS[status]} ({byStatus(status).length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {byStatus(status).map((p) => (
                <PartnerCard
                  key={p.id}
                  partner={p}
                  onMove={(newStatus) => moveMutation.mutate({ id: p.id, status: newStatus })}
                  isMoving={moveMutation.isPending}
                />
              ))}
              {byStatus(status).length === 0 && (
                <div style={{ fontSize: 13, color: "var(--slate-300)", border: "2px dashed var(--slate-200)", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  None
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerCard({ partner, onMove, isMoving }: { partner: PartnerOut; onMove: (s: string) => void; isMoving: boolean }) {
  const nextStatus = STATUSES[STATUSES.indexOf(partner.status) + 1];
  return (
    <div className="card" style={{ padding: 12, borderLeft: partner.days_late ? "3px solid var(--orange-600)" : "3px solid var(--slate-200)" }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{partner.name}</div>
      <div style={{ fontSize: 12, color: "var(--slate-400)", marginBottom: 8 }}>{partner.tier}</div>
      {partner.days_late && (
        <div style={{ fontSize: 12, color: "var(--orange-600)", fontWeight: 500, marginBottom: 6 }}>
          ⏰ {partner.days_late} days overdue
        </div>
      )}
      {partner.confirmation_due_date && !partner.days_late && (
        <div style={{ fontSize: 12, color: "var(--slate-400)", marginBottom: 6 }}>
          Due: {new Date(partner.confirmation_due_date).toLocaleDateString()}
        </div>
      )}
      {nextStatus && (
        <button
          className="btn-secondary"
          style={{ fontSize: 12, padding: "4px 10px", width: "100%" }}
          disabled={isMoving}
          onClick={() => onMove(nextStatus)}
        >
          Move to {STATUS_LABELS[nextStatus]}
        </button>
      )}
    </div>
  );
}
