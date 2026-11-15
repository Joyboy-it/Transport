import { Decimal, parseAmount } from "./decimal";

export type WeighingField = "gross" | "tare" | "impurity";

export type WeighingErrorCode =
  | "INVALID"
  | "NEGATIVE"
  | "GROSS_NOT_ABOVE_TARE"
  | "IMPURITY_EXCEEDS_NET";

export type WeighingError = { field: WeighingField; code: WeighingErrorCode };

export type WeighingInput = Record<WeighingField, unknown>;

export type WeighingValues = {
  gross: Decimal;
  tare: Decimal;
  impurity: Decimal;
  netBeforeDeduction: Decimal;
  net: Decimal;
};

export type WeighingResult =
  | { ok: true; value: WeighingValues }
  | { ok: false; errors: WeighingError[] };

export const WEIGHING_ERROR_TEXT: Record<WeighingErrorCode, string> = {
  INVALID: "กรอกตัวเลขไม่เกินทศนิยม 2 ตำแหน่ง",
  NEGATIVE: "ห้ามติดลบ",
  GROSS_NOT_ABOVE_TARE: "น้ำหนักหนักต้องมากกว่าน้ำหนักเบา",
  IMPURITY_EXCEEDS_NET: "น้ำหนักหักสิ่งเจือปนต้องไม่เกินน้ำหนักสินค้า",
};

/** net before deduction = gross − tare; net = net before deduction − impurity (kg). */
export function computeWeighing(input: WeighingInput): WeighingResult {
  const fields: WeighingField[] = ["gross", "tare", "impurity"];
  const errors: WeighingError[] = [];
  const parsed = {} as Record<WeighingField, Decimal>;

  for (const field of fields) {
    const value = parseAmount(input[field]);
    if (value === null) errors.push({ field, code: "INVALID" });
    else if (value.isNegative() && !value.isZero()) errors.push({ field, code: "NEGATIVE" });
    else parsed[field] = value;
  }
  if (errors.length > 0) return { ok: false, errors };

  const { gross, tare, impurity } = parsed;
  if (!gross.greaterThan(tare)) {
    return { ok: false, errors: [{ field: "gross", code: "GROSS_NOT_ABOVE_TARE" }] };
  }

  const netBeforeDeduction = gross.minus(tare);
  if (impurity.greaterThan(netBeforeDeduction)) {
    return { ok: false, errors: [{ field: "impurity", code: "IMPURITY_EXCEEDS_NET" }] };
  }

  return {
    ok: true,
    value: { gross, tare, impurity, netBeforeDeduction, net: netBeforeDeduction.minus(impurity) },
  };
}
