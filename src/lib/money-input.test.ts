import { expect, test } from "vitest";
import { keepMoneyTyping, normalizeMoney } from "./money-input";

test("keeps digits, one decimal point, and at most two decimal places", () => {
  expect(keepMoneyTyping("1500.5")).toBe("1500.5");
  expect(keepMoneyTyping("1,500.25")).toBe("1,500.25");
  expect(keepMoneyTyping("12.345")).toBe("12.34");
  expect(keepMoneyTyping("12.3.4")).toBe("12.34");
});

test("drops letters and a leading minus", () => {
  expect(keepMoneyTyping("12a")).toBe("12");
  expect(keepMoneyTyping("abc")).toBe("");
  expect(keepMoneyTyping("-50")).toBe("50");
});

test("normalizes a draft to a savable amount without failing", () => {
  expect(normalizeMoney("12a")).toBe("12");
  expect(normalizeMoney("abc")).toBe("");
  expect(normalizeMoney("12.")).toBe("12");
  expect(normalizeMoney("1,500.25")).toBe("1,500.25");
});
