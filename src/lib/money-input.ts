import { parseAmount } from "@/domain/decimal";

/** Keeps a money draft: digits, thousands commas, and at most two decimal places. */
export function keepMoneyTyping(raw: string): string {
  let text = "";
  let dot = false;
  let decimals = 0;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (dot) {
        if (decimals >= 2) continue;
        decimals += 1;
      }
      text += ch;
    } else if (ch === "," && !dot) {
      text += ch;
    } else if (ch === "." && !dot) {
      dot = true;
      text += ".";
    }
  }
  return text;
}

/** A savable amount, or blank when the draft is not a number. Never raises a message. */
export function normalizeMoney(raw: string): string {
  const kept = keepMoneyTyping(raw.trim()).replace(/\.$/, "");
  const amount = parseAmount(kept);
  if (!amount || amount.isNegative() || !amount.abs().lessThan(1e12)) return "";
  return kept;
}
