import { describe, expect, it } from "vitest";
import { ANALYSIS_DIMENSIONS, ANALYSIS_DIMENSION_LABEL, groupAnalysis, rollupMeasures, type AnalysisJob } from "./analysis";

describe("rollupMeasures", () => {
  it("takes the percent from the summed variance and the summed origin net", () => {
    const result = rollupMeasures({
      variance: "200",
      originNet: "11000",
      freight: null,
      freightTrips: 0,
      collect: null,
      collected: null,
    });
    expect(result.variancePercent?.toFixed(2)).toBe("1.82");
  });

  it("scales freight per ton from kilograms", () => {
    const result = rollupMeasures({
      variance: null,
      originNet: "2000",
      freight: "5000",
      freightTrips: 2,
      collect: null,
      collected: null,
    });
    expect(result.freightPerTon?.toFixed(2)).toBe("2500.00");
    expect(result.freightPerTrip?.toFixed(2)).toBe("2500.00");
  });

  it("subtracts money already collected", () => {
    const result = rollupMeasures({
      variance: null,
      originNet: null,
      freight: null,
      freightTrips: 0,
      collect: "1000",
      collected: "400",
    });
    expect(result.outstanding?.toFixed(2)).toBe("600.00");
  });

  it("treats an empty collection total as nothing owed", () => {
    const result = rollupMeasures({
      variance: null,
      originNet: null,
      freight: null,
      freightTrips: 0,
      collect: null,
      collected: null,
    });
    expect(result.outstanding).toBeNull();
  });

  it("returns null when a divisor is zero", () => {
    const result = rollupMeasures({
      variance: "10",
      originNet: "0",
      freight: "100",
      freightTrips: 0,
      collect: "50",
      collected: null,
    });
    expect(result.variancePercent).toBeNull();
    expect(result.freightPerTon).toBeNull();
    expect(result.freightPerTrip).toBeNull();
    expect(result.outstanding?.toFixed(2)).toBe("50.00");
  });
});

function job(overrides: Partial<AnalysisJob> = {}): AnalysisJob {
  return {
    hireDate: new Date("2026-11-01T00:00:00Z"),
    transporterId: "t1",
    transporterName: "ผู้รับจ้าง ก",
    vehicleId: "v1",
    vehiclePlate: "กข 1",
    driverId: "d1",
    driverName: "คนขับ ก",
    originId: "o1",
    originName: "ต้นทาง ก",
    destinationFactoryId: "f1",
    destinationFactoryName: "โรงงาน ก",
    commodityId: "c1",
    commodityName: "สินค้า ก",
    responsibleUserId: "u1",
    responsibleName: "ผู้รับผิดชอบ ก",
    freightAmount: "1000",
    collectAmount: "500",
    collected: false,
    variance: "100",
    reconciliationStatus: "NORMAL",
    originLines: [{ commodityId: "c1", commodityName: "สินค้า ก", net: "10000", impurity: "0" }],
    destinationLines: [{ commodityId: "c1", commodityName: "สินค้า ก", net: "9900", impurity: "20" }],
    ...overrides,
  };
}

describe("groupAnalysis", () => {
  it("keeps the variance percent on weighed origin net only", () => {
    const [row] = groupAnalysis(
      [
        job(),
        job({
          variance: null,
          reconciliationStatus: null,
          originLines: [{ commodityId: "c1", commodityName: "สินค้า ก", net: "5000", impurity: "0" }],
          destinationLines: [],
        }),
      ],
      "transporter",
    );
    expect(row.trips).toBe(2);
    expect(row.weighedTrips).toBe(1);
    expect(row.unweighedTrips).toBe(1);
    expect(row.variance?.toFixed(2)).toBe("100.00");
    expect(row.weighedOriginNet?.toFixed(2)).toBe("10000.00");
    expect(row.originNet?.toFixed(2)).toBe("15000.00");
    const rates = rollupMeasures({
      variance: row.variance,
      originNet: row.weighedOriginNet,
      freight: row.freight,
      freightTrips: row.freightTrips,
      collect: row.collect,
      collected: row.collected,
    });
    expect(rates.variancePercent?.toFixed(2)).toBe("1.00");
  });

  it("keeps a job's freight on its header commodity when another commodity was weighed", () => {
    const rows = groupAnalysis(
      [
        job({
          freightAmount: "1000",
          originLines: [
            { commodityId: "c1", commodityName: "สินค้า ก", net: "8000", impurity: "0" },
            { commodityId: "c2", commodityName: "สินค้า ข", net: "2000", impurity: "0" },
          ],
          destinationLines: [
            { commodityId: "c1", commodityName: "สินค้า ก", net: "7900", impurity: "10" },
            { commodityId: "c2", commodityName: "สินค้า ข", net: "1900", impurity: "5" },
          ],
        }),
      ],
      "commodity",
    );
    const hired = rows.find((row) => row.key === "c1");
    const extra = rows.find((row) => row.key === "c2");
    expect(hired?.freight?.toFixed(2)).toBe("1000.00");
    expect(hired?.trips).toBe(1);
    expect(hired?.variance?.toFixed(2)).toBe("100.00");
    expect(extra?.freight).toBeNull();
    expect(extra?.trips).toBe(0);
    expect(extra?.variance?.toFixed(2)).toBe("100.00");
    expect(rows.reduce((sum, row) => sum + Number(row.freight?.toString() ?? 0), 0)).toBe(1000);
  });

  it("leaves an empty collection amount out of the money total", () => {
    const [row] = groupAnalysis(
      [job({ collectAmount: null }), job({ collectAmount: "100", collected: true })],
      "transporter",
    );
    expect(row.noCollectTrips).toBe(1);
    expect(row.collect?.toFixed(2)).toBe("100.00");
    expect(row.collected?.toFixed(2)).toBe("100.00");
    expect(rollupMeasures({
      variance: null,
      originNet: null,
      freight: null,
      freightTrips: 0,
      collect: row.collect,
      collected: row.collected,
    }).outstanding?.toFixed(2)).toBe("0.00");
  });

  it("orders months from newest to oldest", () => {
    const rows = groupAnalysis(
      [
        job({ hireDate: new Date("2026-10-02T00:00:00Z") }),
        job({ hireDate: new Date("2026-11-02T00:00:00Z") }),
      ],
      "month",
    );
    expect(rows.map((row) => row.key)).toEqual(["2026-11", "2026-10"]);
  });
});

describe("analysis dimensions", () => {
  it("names every breakdown the pages can switch to", () => {
    expect(ANALYSIS_DIMENSIONS).toEqual([
      "transporter",
      "vehicle",
      "driver",
      "origin",
      "factory",
      "commodity",
      "route",
      "responsible",
      "month",
    ]);
    expect(ANALYSIS_DIMENSION_LABEL.factory).toBe("โรงงานปลายทาง");
    expect(ANALYSIS_DIMENSION_LABEL.month).toBe("เดือน");
  });
});
