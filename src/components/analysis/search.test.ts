import { describe, expect, it } from "vitest";
import { analysisSearch, jobsSearch } from "./search";

const filters = {
  from: "2026-11-01",
  to: "2026-11-18",
  by: "transporter" as const,
  originId: "o1",
};

describe("analysis links", () => {
  it("keeps the period and drops the breakdown when opening the job list", () => {
    expect(jobsSearch(filters, "transporter", "t1")).toBe("/transport/jobs?from=2026-11-01&to=2026-11-18&originId=o1&transporterId=t1");
    expect(jobsSearch(filters, "vehicle", "v1")).toBeNull();
    expect(jobsSearch(filters, "transporter", "")).toBeNull();
  });

  it("omits the breakdown on the overview link", () => {
    expect(analysisSearch(filters, null)).toBe("from=2026-11-01&to=2026-11-18&originId=o1");
  });
});
