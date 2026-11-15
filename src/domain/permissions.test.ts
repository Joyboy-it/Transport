import { describe, expect, it } from "vitest";
import { can, ROLES } from "./permissions";

describe("permission matrix", () => {
  it("lets everyone read jobs", () => {
    for (const role of ROLES) expect(can(role, "job.read")).toBe(true);
  });

  it("hides freight from weighing only", () => {
    for (const role of ROLES) expect(can(role, "job.viewFreight")).toBe(role !== "WEIGHING");
  });

  it("gives weighing to WEIGHING and ADMIN", () => {
    expect(can("WEIGHING", "weighing.record")).toBe(true);
    expect(can("ADMIN", "weighing.record")).toBe(true);
    expect(can("TRANSPORT", "weighing.record")).toBe(false);
    expect(can("APPROVER", "weighing.record")).toBe(false);
  });

  it("gives warning confirmation to APPROVER and ADMIN", () => {
    expect(can("APPROVER", "reconciliation.confirm")).toBe(true);
    expect(can("ADMIN", "reconciliation.confirm")).toBe(true);
    expect(can("TRANSPORT", "reconciliation.confirm")).toBe(false);
    expect(can("WEIGHING", "reconciliation.confirm")).toBe(false);
  });

  it("gives job header and masters to TRANSPORT and ADMIN", () => {
    for (const action of ["job.create", "job.editHeader", "job.cancel", "master.manage"] as const) {
      expect(can("TRANSPORT", action)).toBe(true);
      expect(can("ADMIN", action)).toBe(true);
      expect(can("WEIGHING", action)).toBe(false);
      expect(can("APPROVER", action)).toBe(false);
      expect(can("VIEWER", action)).toBe(false);
    }
  });

  it("lets accounting record destination collection without editing the header", () => {
    for (const role of ["ADMIN", "TRANSPORT", "ACCOUNTING"] as const) {
      expect(can(role, "job.recordCollection")).toBe(true);
    }
    for (const role of ["WEIGHING", "APPROVER", "VIEWER"] as const) {
      expect(can(role, "job.recordCollection")).toBe(false);
    }
    expect(can("ACCOUNTING", "job.editHeader")).toBe(false);
  });

  it("keeps ACCOUNTING and VIEWER read-only", () => {
    for (const role of ["ACCOUNTING", "VIEWER"] as const) {
      expect(can(role, "job.read")).toBe(true);
      expect(can(role, "file.read")).toBe(true);
      expect(can(role, "weighing.record")).toBe(false);
      expect(can(role, "job.editHeader")).toBe(false);
      expect(can(role, "settings.manage")).toBe(false);
    }
  });

  it("reserves users and settings for ADMIN", () => {
    for (const role of ROLES) {
      expect(can(role, "user.manage")).toBe(role === "ADMIN");
      expect(can(role, "settings.manage")).toBe(role === "ADMIN");
    }
  });
});
