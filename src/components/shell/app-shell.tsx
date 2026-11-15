"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Role } from "@/domain/permissions";
import { cn } from "@/lib/utils";
import { resolveLocation } from "@/modules/registry";
import type { MenuCounts } from "@/modules/types";
import { ModuleMenu } from "./module-menu";
import { ModuleRail } from "./module-rail";
import { TopBar } from "./top-bar";
import { useMenuCollapsed } from "./use-menu-collapsed";

export function AppShell({
  role,
  user,
  counts,
  logoutAction,
  children,
}: {
  role: Role;
  user: { displayName: string; username: string; roleLabel: string };
  counts: MenuCounts;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const { module: current, item } = resolveLocation(pathname, role);
  const [collapsed, setCollapsed] = useMenuCollapsed();
  // The drawer only exists below 768px; from there up the same element is the fixed side columns.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const side = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    side.current?.querySelector("a")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawerOpen(false);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen flex-1">
      {drawerOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 animate-in bg-foreground/40 duration-200 fade-in motion-reduce:animate-none md:hidden print:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        ref={side}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex shadow-overlay duration-200 ease-out motion-reduce:transition-none md:visible md:sticky md:top-0 md:bottom-auto md:z-auto md:h-screen md:shrink-0 md:translate-x-0 md:shadow-none md:transition-none print:hidden",
          // Closing keeps the panel visible until it has slid out; opening shows it at once so it can take focus.
          drawerOpen ? "translate-x-0 transition-[translate]" : "invisible -translate-x-full transition-[translate,visibility]",
        )}
        onClick={(event) => {
          if ((event.target as Element).closest("a")) setDrawerOpen(false);
        }}
      >
        <ModuleRail role={role} pathname={pathname} current={current} />
        {current && (
          <ModuleMenu
            mod={current}
            role={role}
            pathname={pathname}
            counts={counts}
            className={cn(collapsed && "md:hidden")}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          pathname={pathname}
          current={current}
          item={item}
          user={user}
          logoutAction={logoutAction}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => {
            opener.current = document.activeElement;
            setDrawerOpen(true);
          }}
        />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
