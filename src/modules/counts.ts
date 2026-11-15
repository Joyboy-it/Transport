import "server-only";
import { cache } from "react";
import type { Role } from "@/domain/permissions";
import { visibleModules } from "./registry";
import { transportCounts } from "./transport/counts";
import type { MenuCounts } from "./types";

/** Count loaders by module id. A module without one has no counts. */
const LOADERS: Record<string, () => Promise<Record<string, number>>> = {
  transport: transportCounts,
};

/** Counts for every module the role can see, loaded together and once per request. */
export const loadMenuCounts = cache(async (role: Role): Promise<MenuCounts> => {
  const entries = await Promise.all(
    visibleModules(role).flatMap((mod) => {
      const load = LOADERS[mod.id];
      return load ? [load().then((counts) => [mod.id, counts] as const)] : [];
    }),
  );
  return Object.fromEntries(entries);
});
