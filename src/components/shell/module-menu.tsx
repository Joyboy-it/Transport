"use client";

import Link from "next/link";
import type { Role } from "@/domain/permissions";
import { cn } from "@/lib/utils";
import { isItemActive, visibleSections } from "@/modules/registry";
import type { MenuCounts, MenuItem, ModuleDef } from "@/modules/types";
import { itemCount } from "./shell-helpers";

function MenuLink({ item, active, count }: { item: MenuItem; active: boolean; count: number | null }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-[38px] items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transition-none",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--primary)]"
          : "hover:bg-muted",
      )}
    >
      <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count !== null && (
        <span
          className={cn(
            "grid h-5 min-w-[22px] shrink-0 place-items-center rounded-full px-1.5 text-xs tabular-nums transition-colors duration-200 motion-reduce:transition-none",
            count > 0 ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "bg-muted font-medium text-muted-foreground",
            // On an active or hovered row the chip's own fill would vanish into the row.
            active ? "bg-card" : "group-hover:bg-card",
          )}
        >
          {count.toLocaleString("th-TH")}
        </span>
      )}
    </Link>
  );
}

export function ModuleMenu({
  mod,
  role,
  pathname,
  counts,
  className,
}: {
  mod: ModuleDef;
  role: Role;
  pathname: string;
  counts: MenuCounts;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex w-[232px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground print:hidden",
        className,
      )}
    >
      <div className="px-4 pt-4 pb-2">
        <div className="text-xs text-muted-foreground">ระบบ</div>
        <div className="text-base leading-snug font-bold text-foreground">{mod.name}</div>
      </div>
      {/* The top padding keeps the first link's focus ring inside the scroll area. */}
      <nav aria-label="เมนูของระบบ" className="min-h-0 flex-1 overflow-y-auto px-2 pt-1 pb-3">
        {visibleSections(mod, role).map((section, index) => (
          <div key={section.title ?? index}>
            {section.title && (
              <div aria-hidden="true" className="px-2.5 pt-3.5 pb-1.5 text-xs font-semibold text-muted-foreground">
                {section.title}
              </div>
            )}
            <ul aria-label={section.title}>
              {section.items.map((item) => (
                <li key={item.href}>
                  <MenuLink item={item} active={isItemActive(pathname, item)} count={itemCount(counts, mod, item)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
