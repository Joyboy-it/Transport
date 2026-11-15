type DecimalText = { toString(): string } | null | undefined;

const kgFormat = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatKg(value: DecimalText) {
  if (value === null || value === undefined) return "–";
  return kgFormat.format(Number(value.toString()));
}

export function formatSignedKg(value: DecimalText) {
  if (value === null || value === undefined) return "–";
  const n = Number(value.toString());
  return `${n > 0 ? "+" : ""}${kgFormat.format(n)}`;
}

export function formatPercent(value: DecimalText) {
  if (value === null || value === undefined) return "–";
  const n = Number(value.toString());
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export const formatMoney = formatKg;

const dateFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

/** Hire dates are calendar dates stored at UTC midnight. */
export function formatDate(value: Date | null | undefined) {
  if (!value) return "–";
  return dateFormat.format(value);
}

export function formatDateTime(value: Date | null | undefined) {
  if (!value) return "–";
  return dateTimeFormat.format(value);
}

/** yyyy-mm-dd for <input type="date"> from a UTC-midnight date. */
export function toDateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

/** yyyy-mm-ddThh:mm in Bangkok time for <input type="datetime-local">. */
export function toDateTimeInput(value: Date | null | undefined) {
  if (!value) return "";
  const bangkok = new Date(value.getTime() + 7 * 60 * 60 * 1000);
  return bangkok.toISOString().slice(0, 16);
}

/** Parses a datetime-local value as Bangkok time (UTC+7, no daylight saving). */
export function fromDateTimeInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fromDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** yyyy-mm-dd for today in Thailand. */
export function currentDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
