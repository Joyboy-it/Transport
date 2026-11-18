import { expect, test } from "vitest";
import { addCalendarDays } from "./format";

test("moves a calendar date across month boundaries", () => {
  expect(addCalendarDays("2026-11-18", -15)).toBe("2026-11-03");
  expect(addCalendarDays("2026-03-01", -15)).toBe("2026-02-14");
});
