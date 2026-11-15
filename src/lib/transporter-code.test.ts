import { describe, expect, it } from "vitest";
import { nextTransporterCode } from "./transporter-code";

describe("nextTransporterCode", () => {
  it("starts at TR001 when nothing is numbered yet", () => {
    expect(nextTransporterCode([])).toBe("TR001");
    expect(nextTransporterCode(["STK"])).toBe("TR001");
  });

  it("continues after the highest TR number", () => {
    expect(nextTransporterCode(["TR001", "TR010", "tr2", "STK"])).toBe("TR011");
  });
});
