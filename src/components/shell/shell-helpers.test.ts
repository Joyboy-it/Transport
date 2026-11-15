import { Circle } from "lucide-react";
import { describe, expect, test } from "vitest";
import type { MenuCounts, MenuItem, ModuleDef } from "@/modules/types";
import { itemCount, moduleHref, userInitial } from "./shell-helpers";

const open: MenuItem = { label: "รายการ", href: "/demo/list", icon: Circle, countKey: "waiting" };
const adminOnly: MenuItem = { label: "ตั้งค่า", href: "/demo/settings?tab=1", icon: Circle, visible: "user.manage" };
const demo = (sections: ModuleDef["sections"]): ModuleDef => ({
  id: "demo", basePath: "/demo", name: "ทดลอง", shortName: "ทดลอง", description: "", icon: Circle, visible: [], sections,
});

describe("moduleHref", () => {
  test("is the first menu item, query string included", () => {
    expect(moduleHref(demo([{ items: [adminOnly, open] }]), "ADMIN")).toBe("/demo/settings?tab=1");
  });
  test("skips items the role cannot see", () => {
    expect(moduleHref(demo([{ items: [adminOnly, open] }]), "VIEWER")).toBe("/demo/list");
  });
  test("skips a section the role sees nothing of", () => {
    expect(moduleHref(demo([{ items: [adminOnly] }, { title: "กลุ่ม", items: [open] }]), "VIEWER")).toBe("/demo/list");
  });
  test("falls back to the module's base path when the role sees no item", () => {
    expect(moduleHref(demo([{ items: [adminOnly] }]), "VIEWER")).toBe("/demo");
  });
});

describe("itemCount", () => {
  const mod = demo([{ items: [open, adminOnly] }]);
  const counts: MenuCounts = { demo: { waiting: 3, empty: 0 } };

  test("is the module's number for the item's count key", () => {
    expect(itemCount(counts, mod, open)).toBe(3);
  });
  test("keeps zero as a number", () => {
    expect(itemCount(counts, mod, { ...open, countKey: "empty" })).toBe(0);
  });
  test("is null for an item without a count key", () => {
    expect(itemCount(counts, mod, adminOnly)).toBeNull();
  });
  test("is null when the module loaded no counts", () => {
    expect(itemCount({}, mod, open)).toBeNull();
  });
  test("is null when the count key is missing", () => {
    expect(itemCount(counts, mod, { ...open, countKey: "missing" })).toBeNull();
  });
  test("is null when the value is not a number", () => {
    expect(itemCount(counts, mod, { ...open, countKey: "toString" })).toBeNull();
    expect(itemCount({ demo: { waiting: "3" } } as unknown as MenuCounts, mod, open)).toBeNull();
  });
});

describe("userInitial", () => {
  test("is the first letter, without the marks above or below it", () => {
    expect(userInitial("ผู้ดูแลระบบ")).toBe("ผ");
  });
  test("keeps a leading vowel together with its consonant", () => {
    expect(userInitial("เอกชัย")).toBe("เอ");
  });
  test("is upper case for a Latin name", () => {
    expect(userInitial("  admin")).toBe("A");
  });
  test("is empty for an empty name", () => {
    expect(userInitial("  ")).toBe("");
  });
});
