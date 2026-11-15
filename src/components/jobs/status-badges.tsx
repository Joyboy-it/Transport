import { cn } from "@/lib/utils";
import { JOB_STATUS_LABEL, type JobStatus } from "@/domain/job-status";
import { RECONCILIATION_LABEL, type ReconciliationStatus } from "@/domain/reconciliation";

const base = "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap";

const JOB_TONE: Record<JobStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  WAITING_ORIGIN: "bg-sky-100 text-sky-800",
  WAITING_DESTINATION: "bg-indigo-100 text-indigo-800",
  WEIGHT_REVIEW: "bg-amber-100 text-amber-900",
  WEIGHT_CONFIRMED: "bg-emerald-100 text-emerald-800",
  WAITING_PAYMENT: "bg-violet-100 text-violet-800",
  PAID: "bg-teal-100 text-teal-800",
  CANCELLED: "bg-rose-100 text-rose-800 line-through",
};

const RECON_TONE: Record<ReconciliationStatus, string> = {
  MATCH: "bg-emerald-100 text-emerald-800",
  NORMAL: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  WARNING: "bg-red-100 text-red-800",
  REVIEW: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-blue-100 text-blue-800",
};

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return <span className={cn(base, JOB_TONE[status], className)}>{JOB_STATUS_LABEL[status]}</span>;
}

export function ReconciliationBadge({ status, className }: { status: ReconciliationStatus | null; className?: string }) {
  if (!status) return <span className={cn("text-sm text-muted-foreground", className)}>–</span>;
  return <span className={cn(base, RECON_TONE[status], className)}>{RECONCILIATION_LABEL[status]}</span>;
}
