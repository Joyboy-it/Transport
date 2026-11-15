import type { Role } from "@/domain/permissions";
import { visibleSections } from "@/modules/registry";
import type { MenuCounts, MenuItem, ModuleDef } from "@/modules/types";

/** Where a link to the module leads: the first menu item the role can see. */
export function moduleHref(mod: ModuleDef, role: Role): string {
  return visibleSections(mod, role)[0]?.items[0]?.href ?? mod.basePath;
}

/** The number to show beside a menu item, or null when the module loaded none for it. */
export function itemCount(counts: MenuCounts, mod: ModuleDef, item: MenuItem): number | null {
  if (!item.countKey) return null;
  const value: unknown = counts[mod.id]?.[item.countKey];
  return typeof value === "number" ? value : null;
}

/** The letter for the user's avatar. Thai leading vowels (เ แ โ ใ ไ) stay with their consonant. */
export function userInitial(displayName: string): string {
  const [first = "", second = ""] = Array.from(displayName.trim());
  return (/[\u0E40-\u0E44]/.test(first) ? first + second : first).toUpperCase();
}
