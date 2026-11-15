import type { LucideIcon } from "lucide-react";
import type { Action } from "@/domain/permissions";

export type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the role has this action. Omitted: everyone who sees the module. */
  visible?: Action;
  /** Key into the module's counts; the menu and the home card show the number. */
  countKey?: string;
  /** Pathnames under href that must not light this item up. */
  exclude?: string[];
  /** A shortcut that is never shown as the current page. */
  neverActive?: boolean;
  /** Listed as a link on the module's home card. */
  shortcut?: boolean;
};
export type MenuSection = { title?: string; items: MenuItem[] };
export type ModuleDef = {
  id: string;
  basePath: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  /** Shown when the role has any of these. Empty: every role. */
  visible: Action[];
  /** Kept at the bottom of the rail. */
  pinBottom?: boolean;
  sections: MenuSection[];
};
export type MenuCounts = Record<string, Record<string, number>>;
