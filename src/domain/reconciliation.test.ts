import { describe, expect, it } from "vitest";
import { reconcile, reconcileLines } from "./reconciliation";

const seed = { maxVarianceKg: "100", maxVariancePercent: "1.00" };

describe("reconcile", () => {
  it("flags the spec example as WARNING", () => {
    const r = reconcile({ originNet: "15000", destinationNet: "14800", thresholds: seed });
    expect(r.variance?.toFixed(2)).toBe("200.00");
    expect(r.percent?.toFixed(2)).toBe("1.33");
    expect(r.status).toBe("WARNING");
  });

  it("is NORMAL inside both limits", () => {
    const r = reconcile({ originNet: "15000", destinationNet: "14950", thresholds: seed });
    expect(r.variance?.toFixed(2)).toBe("50.00");
    expect(r.percent?.toFixed(2)).toBe("0.33");
    expect(r.status).toBe("NORMAL");
  });

  it("is MATCH when equal", () => {
    const r = reconcile({ originNet: "15000", destinationNet: "15000.00", thresholds: seed });
    expect(r.variance?.toFixed(2)).toBe("0.00");
    expect(r.status).toBe("MATCH");
  });

  it("is WARNING when only the percent limit is exceeded", () => {
    const r = reconcile({ originNet: "2000", destinationNet: "1960", thresholds: seed });
    expect(r.variance?.toFixed(2)).toBe("40.00");
    expect(r.percent?.toFixed(2)).toBe("2.00");
    expect(r.status).toBe("WARNING");
  });

  it("keeps the sign and uses the absolute value for limits", () => {
    const r = reconcile({ originNet: "15000", destinationNet: "15100", thresholds: seed });
    expect(r.variance?.toFixed(2)).toBe("-100.00");
    expect(r.status).toBe("NORMAL");
  });

  it("treats exactly the limit as inside", () => {
    const r = reconcile({ originNet: "10000", destinationNet: "9900", thresholds: seed });
    expect(r.status).toBe("NORMAL");
  });

  it("compares the unrounded ratio, so 1.004% is WARNING", () => {
    const r = reconcile({
      originNet: "10000",
      destinationNet: "9899.6",
      thresholds: { maxVarianceKg: "1000", maxVariancePercent: "1.00" },
    });
    expect(r.percent?.toFixed(2)).toBe("1.00");
    expect(r.status).toBe("WARNING");
  });

  it("is REVIEW without a destination weighing", () => {
    const r = reconcile({ originNet: "15000", destinationNet: null, thresholds: seed });
    expect(r).toEqual({ variance: null, percent: null, status: "REVIEW" });
  });

  it("is REVIEW when origin net is zero, without a percent", () => {
    const r = reconcile({ originNet: "0", destinationNet: "0", thresholds: seed });
    expect(r.percent).toBeNull();
    expect(r.status).toBe("REVIEW");
  });

  it("is REVIEW without thresholds", () => {
    const r = reconcile({ originNet: "15000", destinationNet: "14800", thresholds: null });
    expect(r.variance?.toFixed(2)).toBe("200.00");
    expect(r.status).toBe("REVIEW");
  });
});

describe("reconcileLines", () => {
  const line = (commodityId: string, net: string) => ({ commodityId, net });

  it("pairs lines by commodity and judges each one", () => {
    const r = reconcileLines({
      origin: [line("rice", "15000"), line("corn", "5000")],
      destination: [line("corn", "5000"), line("rice", "14950")],
      thresholds: seed,
    });
    expect(r.complete).toBe(true);
    expect(r.lines.map((l) => [l.commodityId, l.status])).toEqual([
      ["rice", "NORMAL"],
      ["corn", "MATCH"],
    ]);
    expect(r.lines[0].variance?.toFixed(2)).toBe("50.00");
    expect(r.status).toBe("NORMAL");
  });

  it("flags the job when any line exceeds the limit, even if the totals do not", () => {
    const r = reconcileLines({
      origin: [line("rice", "15000"), line("corn", "15000")],
      destination: [line("rice", "14800"), line("corn", "15200")],
      thresholds: seed,
    });
    expect(r.variance?.toFixed(2)).toBe("0.00");
    expect(r.lines.map((l) => l.status)).toEqual(["WARNING", "WARNING"]);
    expect(r.status).toBe("WARNING");
  });

  it("uses the totals for job variance and percent", () => {
    const r = reconcileLines({
      origin: [line("rice", "10000"), line("corn", "5000")],
      destination: [line("rice", "9950"), line("corn", "4950")],
      thresholds: seed,
    });
    expect(r.originNet.toFixed(2)).toBe("15000.00");
    expect(r.destinationNet?.toFixed(2)).toBe("14900.00");
    expect(r.variance?.toFixed(2)).toBe("100.00");
    expect(r.percent?.toFixed(2)).toBe("0.67");
  });

  it("is incomplete while an origin commodity has no destination line", () => {
    const r = reconcileLines({
      origin: [line("rice", "15000"), line("corn", "5000")],
      destination: [line("rice", "15000")],
      thresholds: seed,
    });
    expect(r.complete).toBe(false);
    expect(r.status).toBeNull();
    expect(r.lines[1]).toMatchObject({ commodityId: "corn", destinationNet: null, status: null });
  });

  it("is REVIEW when the destination has a commodity the origin never weighed", () => {
    const r = reconcileLines({
      origin: [line("rice", "15000")],
      destination: [line("rice", "15000"), line("corn", "100")],
      thresholds: seed,
    });
    expect(r.complete).toBe(true);
    expect(r.lines[1]).toMatchObject({ commodityId: "corn", originNet: null, status: "REVIEW" });
    expect(r.status).toBe("REVIEW");
  });

  it("is incomplete without any origin line", () => {
    const r = reconcileLines({ origin: [], destination: [], thresholds: seed });
    expect(r.complete).toBe(false);
    expect(r.destinationNet).toBeNull();
    expect(r.variance).toBeNull();
  });
});
