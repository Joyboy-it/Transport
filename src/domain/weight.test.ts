import { describe, expect, it } from "vitest";
import { computeWeighing } from "./weight";

describe("computeWeighing", () => {
  it("computes net before deduction and net", () => {
    const result = computeWeighing({ gross: "25000", tare: "10000", impurity: "0" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.netBeforeDeduction.toFixed(2)).toBe("15000.00");
    expect(result.value.net.toFixed(2)).toBe("15000.00");
  });

  it("subtracts impurity", () => {
    const result = computeWeighing({ gross: "25000.50", tare: "10000.25", impurity: "200.25" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.netBeforeDeduction.toFixed(2)).toBe("15000.25");
    expect(result.value.net.toFixed(2)).toBe("14800.00");
  });

  it("does not drift like floating point", () => {
    const result = computeWeighing({ gross: "0.3", tare: "0.1", impurity: "0.1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.net.toString()).toBe("0.1");
  });

  it("rejects negative values", () => {
    const result = computeWeighing({ gross: "-1", tare: "-5", impurity: "-2" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { field: "gross", code: "NEGATIVE" },
        { field: "tare", code: "NEGATIVE" },
        { field: "impurity", code: "NEGATIVE" },
      ]),
    );
  });

  it("requires gross strictly greater than tare", () => {
    const result = computeWeighing({ gross: "10000", tare: "10000", impurity: "0" });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "gross", code: "GROSS_NOT_ABOVE_TARE" }],
    });
  });

  it("allows impurity equal to net before deduction", () => {
    const result = computeWeighing({ gross: "300", tare: "100", impurity: "200" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.net.toFixed(2)).toBe("0.00");
  });

  it("rejects impurity above net before deduction", () => {
    const result = computeWeighing({ gross: "300", tare: "100", impurity: "200.01" });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "impurity", code: "IMPURITY_EXCEEDS_NET" }],
    });
  });

  it("rejects blank, non-numeric, and more than two decimals", () => {
    const result = computeWeighing({ gross: "", tare: "abc", impurity: "1.234" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      { field: "gross", code: "INVALID" },
      { field: "tare", code: "INVALID" },
      { field: "impurity", code: "INVALID" },
    ]);
  });

  it("accepts thousands separators typed from a weigh ticket", () => {
    const result = computeWeighing({ gross: "25,000", tare: "10,000", impurity: "0" });
    expect(result.ok).toBe(true);
  });
});
