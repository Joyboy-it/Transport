import { describe, expect, it } from "vitest";
import {
  canCancel,
  canConfirmWarning,
  canDelete,
  canEditHeader,
  canEditNote,
  canRecordWeighing,
  missingForIssue,
  settleAfterWeighing,
  weighingEditNeedsReason,
} from "./job-status";

const completeHeader = {
  hireDate: new Date("2026-11-06"),
  transporterId: "t",
  vehicleId: "v",
  driverId: "d",
  commodityId: "c",
  originId: "o",
  destinationFactoryId: "f",
  responsibleUserId: "u",
  freightAmount: "0",
};

describe("missingForIssue", () => {
  it("accepts a complete header with zero freight", () => {
    expect(missingForIssue(completeHeader)).toEqual([]);
  });

  it("lists every missing field", () => {
    expect(missingForIssue({ ...completeHeader, vehicleId: null, hireDate: null })).toEqual([
      "hireDate",
      "vehicleId",
    ]);
  });

  it("rejects negative or missing freight", () => {
    expect(missingForIssue({ ...completeHeader, freightAmount: "-1" })).toEqual(["freightAmount"]);
    expect(missingForIssue({ ...completeHeader, freightAmount: null })).toEqual(["freightAmount"]);
  });
});

describe("settleAfterWeighing", () => {
  it("waits for destination until every origin commodity has a destination line", () => {
    expect(
      settleAfterWeighing({ hasOrigin: true, destinationComplete: false, reconciliation: "REVIEW" }),
    ).toEqual({ status: "WAITING_DESTINATION", reconciliation: null });
  });

  it("goes back to waiting for origin when every origin line is removed", () => {
    expect(
      settleAfterWeighing({ hasOrigin: false, destinationComplete: false, reconciliation: "REVIEW" }),
    ).toEqual({ status: "WAITING_ORIGIN", reconciliation: null });
  });

  it("confirms MATCH and NORMAL immediately", () => {
    for (const r of ["MATCH", "NORMAL"] as const) {
      expect(
        settleAfterWeighing({ hasOrigin: true, destinationComplete: true, reconciliation: r }),
      ).toEqual({ status: "WEIGHT_CONFIRMED", reconciliation: r });
    }
  });

  it("holds WARNING and REVIEW for review", () => {
    for (const r of ["WARNING", "REVIEW"] as const) {
      expect(
        settleAfterWeighing({ hasOrigin: true, destinationComplete: true, reconciliation: r }),
      ).toEqual({ status: "WEIGHT_REVIEW", reconciliation: r });
    }
  });
});

describe("weighing guards", () => {
  it("records origin only after issue and before cancel", () => {
    expect(canRecordWeighing("ORIGIN", "DRAFT", false)).toBe(false);
    expect(canRecordWeighing("ORIGIN", "WAITING_ORIGIN", false)).toBe(true);
    expect(canRecordWeighing("ORIGIN", "WEIGHT_CONFIRMED", true)).toBe(true);
    expect(canRecordWeighing("ORIGIN", "CANCELLED", true)).toBe(false);
    expect(canRecordWeighing("ORIGIN", "PAID", true)).toBe(false);
  });

  it("records destination only when origin exists", () => {
    expect(canRecordWeighing("DESTINATION", "WAITING_ORIGIN", false)).toBe(false);
    expect(canRecordWeighing("DESTINATION", "WAITING_DESTINATION", true)).toBe(true);
    expect(canRecordWeighing("DESTINATION", "WEIGHT_REVIEW", true)).toBe(true);
  });

  it("needs a reason only after confirmation", () => {
    expect(weighingEditNeedsReason("WEIGHT_REVIEW")).toBe(false);
    expect(weighingEditNeedsReason("WEIGHT_CONFIRMED")).toBe(true);
  });

  it("confirms only a WARNING under review", () => {
    expect(canConfirmWarning("WEIGHT_REVIEW", "WARNING")).toBe(true);
    expect(canConfirmWarning("WEIGHT_REVIEW", "REVIEW")).toBe(false);
    expect(canConfirmWarning("WEIGHT_CONFIRMED", "WARNING")).toBe(false);
  });
});

describe("header, note, cancel, delete", () => {
  it("locks the header at confirmation", () => {
    expect(canEditHeader("DRAFT")).toBe(true);
    expect(canEditHeader("WEIGHT_REVIEW")).toBe(true);
    expect(canEditHeader("WEIGHT_CONFIRMED")).toBe(false);
    expect(canEditHeader("CANCELLED")).toBe(false);
  });

  it("keeps the note editable until cancel", () => {
    expect(canEditNote("WEIGHT_CONFIRMED")).toBe(true);
    expect(canEditNote("CANCELLED")).toBe(false);
  });

  it("lets transport cancel before confirmation and only admin after", () => {
    expect(canCancel("WEIGHT_REVIEW", "TRANSPORT")).toBe(true);
    expect(canCancel("WEIGHT_CONFIRMED", "TRANSPORT")).toBe(false);
    expect(canCancel("WEIGHT_CONFIRMED", "ADMIN")).toBe(true);
    expect(canCancel("WEIGHT_REVIEW", "WEIGHING")).toBe(false);
    expect(canCancel("CANCELLED", "ADMIN")).toBe(false);
    expect(canCancel("PAID", "ADMIN")).toBe(false);
  });

  it("deletes only an empty draft", () => {
    expect(canDelete("DRAFT", { weighings: 0, files: 0 })).toBe(true);
    expect(canDelete("DRAFT", { weighings: 0, files: 1 })).toBe(false);
    expect(canDelete("WAITING_ORIGIN", { weighings: 0, files: 0 })).toBe(false);
  });
});
