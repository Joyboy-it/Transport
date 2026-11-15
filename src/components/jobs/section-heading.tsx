import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeading({
  icon: Icon,
  title,
  tone = "bg-primary/10 text-primary",
}: {
  icon: LucideIcon;
  title: ReactNode;
  tone?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span>{title}</span>
      <span className="h-px min-w-8 flex-1 bg-border" />
    </span>
  );
}
