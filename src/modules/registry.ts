import { can, type Role } from "@/domain/permissions";
import { adminModule } from "./admin/module";
import { transportModule } from "./transport/module";
import type { MenuItem, MenuSection, ModuleDef } from "./types";

export const APP_NAME = "ระบบงานบริษัท";

export const MODULES: ModuleDef[] = [transportModule, adminModule];

export function visibleModules(role: Role, modules: ModuleDef[] = MODULES): ModuleDef[] {
  return modules.filter((mod) => mod.visible.length === 0 || mod.visible.some((action) => can(role, action)));
}

/** The module's menu for the role; sections left with no items are dropped. */
export function visibleSections(mod: ModuleDef, role: Role): MenuSection[] {
  return mod.sections
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.visible || can(role, item.visible)) }))
    .filter((section) => section.items.length > 0);
}

export function isItemActive(pathname: string, item: MenuItem): boolean {
  if (item.neverActive || item.exclude?.includes(pathname)) return false;
  const path = item.href.split("?")[0];
  if (item.exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** The module and menu item the pathname belongs to, among what the role can see. */
export function resolveLocation(
  pathname: string,
  role: Role,
  modules: ModuleDef[] = MODULES,
): { module: ModuleDef | null; item: MenuItem | null } {
  const mod = visibleModules(role, modules).find(
    (m) => pathname === m.basePath || pathname.startsWith(`${m.basePath}/`),
  );
  if (!mod) return { module: null, item: null };
  const items = visibleSections(mod, role).flatMap((section) => section.items);
  return { module: mod, item: items.find((item) => isItemActive(pathname, item)) ?? null };
}
