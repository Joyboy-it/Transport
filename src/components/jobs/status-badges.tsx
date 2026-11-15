import { Pill, type Tone } from "@/components/app/ui";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABEL, type JobStatus } from "@/domain/job-status";
import { RECONCILIATION_LABEL, type ReconciliationStatus } from "@/domain/reconciliation";

const JOB_TONE: Record<JobStatus, Tone> = {
  DRAFT: "neutral",
  WAITING_ORIGIN: "info",
  WAITING_DESTINATION: "progress",
  WEIGHT_REVIEW: "warning",
  WEIGHT_CONFIRMED: "success",
  WAITING_PAYMENT: "pending",
  PAID: "done",
  CANCELLED: "danger",
};

const RECON_TONE: Record<ReconciliationStatus, Tone> = {
  MATCH: "success",
  NORMAL: "success",
  WARNING: "danger",
  REVIEW: "warning",
  CONFIRMED: "info",
};

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <Pill tone={JOB_TONE[status]} className={cn(status === "CANCELLED" && "line-through", className)}>
      {JOB_STATUS_LABEL[status]}
    </Pill>
  );
}

export function ReconciliationBadge({ status, className }: { status: ReconciliationStatus | null; className?: string }) {
  if (!status) return <span className={cn("text-sm text-muted-foreground", className)}>–</span>;
  return (
    <Pill tone={RECON_TONE[status]} outline={status === "NORMAL"} className={className}>
      {RECONCILIATION_LABEL[status]}
    </Pill>
  );
}
