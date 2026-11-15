"use client";

import { LogOut, Menu, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MenuItem, ModuleDef } from "@/modules/types";
import { userInitial } from "./shell-helpers";

export function TopBar({
  pathname,
  current,
  item,
  user,
  logoutAction,
  collapsed,
  onCollapsedChange,
  drawerOpen,
  onOpenDrawer,
}: {
  pathname: string;
  current: ModuleDef | null;
  item: MenuItem | null;
  user: { displayName: string; username: string; roleLabel: string };
  logoutAction: () => Promise<void>;
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[54px] shrink-0 items-center gap-2.5 border-b border-border bg-card pr-3 pl-3 md:pr-5 print:hidden",
        // Without the collapse button the location lines up with the page content.
        !current && "md:pl-6",
      )}
    >
      {current && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="hidden text-muted-foreground md:inline-flex"
          aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <PanelLeft className="size-[18px]" aria-hidden="true" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="text-muted-foreground md:hidden"
        aria-label="เปิดเมนู"
        aria-expanded={drawerOpen}
        onClick={onOpenDrawer}
      >
        <Menu className="size-[18px]" aria-hidden="true" />
      </Button>

      <div className="min-w-0 flex-1 truncate text-[0.8125rem] text-muted-foreground">
        {pathname === "/" ? (
          <span className="font-semibold text-foreground">หน้าแรก</span>
        ) : current && item ? (
          <>
            {current.name}
            <span aria-hidden="true">{" › "}</span>
            <span className="font-semibold text-foreground">{item.label}</span>
          </>
        ) : (
          current && <span className="font-semibold text-foreground">{current.name}</span>
        )}
      </div>

      <div className="flex max-w-[60%] min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="hidden size-[34px] shrink-0 place-items-center rounded-full bg-sidebar-accent font-bold text-sidebar-accent-foreground sm:grid"
        >
          {userInitial(user.displayName)}
        </span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-medium">{user.displayName}</div>
          <div className="hidden truncate text-xs text-muted-foreground sm:block">
            {user.username} · {user.roleLabel}
          </div>
        </div>
        <form action={logoutAction} className="shrink-0">
          <Button
            type="submit"
            variant="ghost"
            size="icon-lg"
            className="text-muted-foreground"
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </header>
  );
}
