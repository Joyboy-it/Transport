import { describe, expect, it } from "vitest";
import { bangkokYear, formatJobNumber } from "./job-number";

describe("job number", () => {
  it("pads to five digits", () => {
    expect(formatJobNumber(2026, 1)).toBe("JOB-2026-00001");
    expect(formatJobNumber(2026, 12345)).toBe("JOB-2026-12345");
  });

  it("rolls the year at Bangkok midnight", () => {
    expect(bangkokYear(new Date("2026-12-31T16:59:59Z"))).toBe(2026);
    expect(bangkokYear(new Date("2026-12-31T17:00:00Z"))).toBe(2027);
  });
});
