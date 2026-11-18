import { Circle } from "lucide-react";
import { describe, expect, test } from "vitest";
import { ROLES, type Role } from "@/domain/permissions";
import { isItemActive, MODULES, resolveLocation, visibleModules, visibleSections } from "./registry";
import type { ModuleDef } from "./types";

const hrefs = (role: Role, id: string) => {
  const mod = visibleModules(role).find((m) => m.id === id);
  return mod ? visibleSections(mod, role).flatMap((s) => s.items.map((i) => i.href)) : null;
};
const queues = ["/transport/queues/origin", "/transport/queues/destination", "/transport/queues/variance"];
const analysis = ["/transport/analysis", "/transport/analysis/variance", "/transport/analysis/freight", "/transport/analysis/collection"];
const weighingAnalysis = ["/transport/analysis", "/transport/analysis/variance"];
const masters = ["/transport/masters/transporters", "/transport/masters/origins", "/transport/masters/factories", "/transport/masters/commodities"];
const owner = ["/transport/jobs", "/transport/jobs?new=1", ...queues, ...analysis, ...masters];
const weighing = ["/transport/jobs", ...queues, ...weighingAnalysis];
const reader = ["/transport/jobs", ...queues, ...analysis];

describe("menu per role matches the pre-ERP sidebar", () => {
  test.each([
    ["ADMIN", [...owner, "/transport/settings"], ["/admin/users", "/admin/company"]],
    ["TRANSPORT", owner, null],
    ["WEIGHING", weighing, null],
    ["ACCOUNTING", reader, null],
    ["APPROVER", reader, null],
    ["VIEWER", reader, null],
  ] as const)("%s", (role, transport, admin) => {
    expect(hrefs(role, "transport")).toEqual(transport);
    expect(hrefs(role, "admin")).toEqual(admin);
  });
  test("covers every role", () => expect(ROLES).toHaveLength(6));
});

describe("current page", () => {
  const at = (pathname: string, role: Role = "ADMIN") => {
    const { module, item } = resolveLocation(pathname, role);
    return [module?.id ?? null, item?.label ?? null];
  };
  test.each([
    ["/", [null, null]],
    ["/transport/jobs", ["transport", "ใบงาน"]],
    ["/transport/jobs/cm1abc", ["transport", "ใบงาน"]],
    ["/transport/jobs/new", ["transport", null]],
    ["/transport/queues/variance", ["transport", "ส่วนต่างรอตรวจสอบ"]],
    ["/transport/masters/transporters", ["transport", "ผู้รับจ้าง รถ คนขับ"]],
    ["/transport/settings", ["transport", "เกณฑ์ส่วนต่าง"]],
    ["/transport/analysis", ["transport", "ภาพรวม"]],
    ["/transport/analysis/variance", ["transport", "ส่วนต่างน้ำหนัก"]],
    ["/transport/analysis/freight", ["transport", "ค่าจ้าง"]],
    ["/transport/analysis/collection", ["transport", "เงินเก็บปลายทาง"]],
    ["/transport/unknown", ["transport", null]],
    ["/transportation", [null, null]],
    ["/admin/users/cm1abc", ["admin", "ผู้ใช้งาน"]],
    ["/admin/company", ["admin", "ข้อมูลบริษัท"]],
  ])("%s", (pathname, expected) => expect(at(pathname)).toEqual(expected));

  test("a module the role cannot see is never current", () => {
    expect(at("/admin/users", "VIEWER")).toEqual([null, null]);
  });
  test("the create shortcut is never current", () => {
    const create = MODULES[0].sections[0].items[1];
    expect(isItemActive("/transport/jobs", create)).toBe(false);
  });
  test("the overview item does not stay current on a child analysis page", () => {
    const overview = MODULES[0].sections.flatMap((section) => section.items).find((item) => item.href === "/transport/analysis");
    expect(overview?.exact).toBe(true);
    expect(isItemActive("/transport/analysis/variance", overview!)).toBe(false);
    expect(isItemActive("/transport/analysis", overview!)).toBe(true);
  });
});

describe("registry shape", () => {
  test("ids and base paths are unique and every item lives under its module", () => {
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length);
    expect(new Set(MODULES.map((m) => m.basePath)).size).toBe(MODULES.length);
    for (const mod of MODULES)
      for (const item of mod.sections.flatMap((s) => s.items)) expect(item.href.startsWith(`${mod.basePath}/`)).toBe(true);
  });
  test("a new module needs nothing but its definition", () => {
    const demo: ModuleDef = {
      id: "demo", basePath: "/demo", name: "ทดลอง", shortName: "ทดลอง", description: "", icon: Circle, visible: [],
      sections: [{ items: [{ label: "หน้าทดลอง", href: "/demo/page", icon: Circle }] }],
    };
    const all = [...MODULES, demo];
    expect(visibleModules("VIEWER", all).map((m) => m.id)).toEqual(["transport", "demo"]);
    expect(resolveLocation("/demo/page", "VIEWER", all).item?.label).toBe("หน้าทดลอง");
  });
});
