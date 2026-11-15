import { ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[1.375rem] leading-snug font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "neutral" | "info" | "progress" | "warning" | "success" | "pending" | "done" | "danger";

export const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-tone-neutral text-tone-neutral-foreground",
  info: "bg-tone-info text-tone-info-foreground",
  progress: "bg-tone-progress text-tone-progress-foreground",
  warning: "bg-tone-warning text-tone-warning-foreground",
  success: "bg-tone-success text-tone-success-foreground",
  pending: "bg-tone-pending text-tone-pending-foreground",
  done: "bg-tone-done text-tone-done-foreground",
  danger: "bg-tone-danger text-tone-danger-foreground",
};

const TONE_OUTLINE_CLASS: Record<Tone, string> = {
  neutral: "border-tone-neutral-foreground/30 text-tone-neutral-foreground",
  info: "border-tone-info-foreground/30 text-tone-info-foreground",
  progress: "border-tone-progress-foreground/30 text-tone-progress-foreground",
  warning: "border-tone-warning-foreground/30 text-tone-warning-foreground",
  success: "border-tone-success-foreground/30 text-tone-success-foreground",
  pending: "border-tone-pending-foreground/30 text-tone-pending-foreground",
  done: "border-tone-done-foreground/30 text-tone-done-foreground",
  danger: "border-tone-danger-foreground/30 text-tone-danger-foreground",
};

export function Pill({
  tone,
  outline = false,
  dot = true,
  className,
  children,
}: {
  tone: Tone;
  outline?: boolean;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        outline && "border bg-card",
        outline ? TONE_OUTLINE_CLASS[tone] : TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function NoAccess() {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
      <ShieldX className="size-10" />
      <p className="text-lg font-medium text-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      <p className="text-sm">ติดต่อผู้ดูแลระบบหากต้องการสิทธิ์เพิ่ม</p>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

const selectClass =
  "h-11 w-full min-w-0 rounded-md border border-input bg-card px-3.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30";

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(selectClass, className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return (
    <p role="alert" className={cn("text-sm", state.ok ? "text-success" : "text-destructive")}>
      {state.message}
    </p>
  );
}
