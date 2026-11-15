import Decimal from "decimal.js";

export { Decimal };

export type DecimalLike = Decimal.Value | { toString(): string };

const TWO_DECIMALS = /^-?\d+(\.\d{1,2})?$/;

/** Parses user input with at most two decimal places. Commas are thousands separators. */
export function parseAmount(raw: unknown): Decimal | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().replace(/,/g, "");
  if (!TWO_DECIMALS.test(text)) return null;
  return new Decimal(text);
}

export function toDecimal(value: DecimalLike): Decimal {
  return value instanceof Decimal ? value : new Decimal(value.toString());
}
