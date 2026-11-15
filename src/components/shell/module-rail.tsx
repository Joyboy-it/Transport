"use client";

import { Home, LayoutGrid, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Role } from "@/domain/permissions";
import { cn } from "@/lib/utils";
import { APP_NAME, visibleModules } from "@/modules/registry";
import type { ModuleDef } from "@/modules/types";
import { moduleHref } from "./shell-helpers";

/** The shared ring is too faint on the dark rail, so rail links also get a light outline. */
const railFocus =
  "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-2 focus-visible:outline-rail-active-foreground";

function RailLink({ href, icon: Icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-[3px] rounded-[12px] px-1 text-xs transition-colors duration-200 motion-reduce:transition-none",
        railFocus,
        active
          ? "bg-rail-active font-semibold text-rail-active-foreground"
          : "hover:bg-rail-hover hover:text-rail-active-foreground",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="w-full truncate text-center">{label}</span>
    </Link>
  );
}

export function ModuleRail({ role, pathname, current }: { role: Role; pathname: string; current: ModuleDef | null }) {
  const modules = visibleModules(role);
  const pinned = modules.filter((mod) => mod.pinBottom);
  const link = (mod: ModuleDef) => (
    <RailLink
      key={mod.id}
      href={moduleHref(mod, role)}
      icon={mod.icon}
      label={mod.shortName}
      active={mod.id === current?.id}
    />
  );

  return (
    <nav
      aria-label="ระบบ"
      className="flex w-[76px] shrink-0 flex-col items-center gap-1 overflow-y-auto bg-rail py-3 text-rail-foreground print:hidden"
    >
      <Link
        href="/"
        aria-label={APP_NAME}
        className={cn(
          "mb-2.5 grid size-10 shrink-0 place-items-center rounded-[12px] bg-rail-active text-rail-active-foreground",
          railFocus,
        )}
      >
        <LayoutGrid className="size-[22px]" aria-hidden="true" />
      </Link>
      <RailLink href="/" icon={Home} label="หน้าแรก" active={pathname === "/"} />
      {modules.filter((mod) => !mod.pinBottom).map(link)}
      {pinned.length > 0 && <div className="mt-auto flex flex-col gap-1 pt-1">{pinned.map(link)}</div>}
    </nav>
  );
}
