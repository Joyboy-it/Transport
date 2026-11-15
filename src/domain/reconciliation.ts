import { Decimal, type DecimalLike, toDecimal } from "./decimal";

export const RECONCILIATION_STATUSES = [
  "MATCH",
  "NORMAL",
  "WARNING",
  "REVIEW",
  "CONFIRMED",
] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export type ComputedReconciliationStatus = Exclude<ReconciliationStatus, "CONFIRMED">;

export type Thresholds = { maxVarianceKg: DecimalLike; maxVariancePercent: DecimalLike };

export type Reconciliation = {
  /** origin net − destination net; negative when the destination is heavier. */
  variance: Decimal | null;
  /** Unrounded; round only for display. Null when it cannot be computed. */
  percent: Decimal | null;
  status: ComputedReconciliationStatus;
};

export const RECONCILIATION_LABEL: Record<ReconciliationStatus, string> = {
  MATCH: "ตรงกัน",
  NORMAL: "อยู่ในเกณฑ์",
  WARNING: "เกินเกณฑ์",
  REVIEW: "รอตรวจสอบ",
  CONFIRMED: "ผ่านการตรวจสอบ",
};

export function reconcile(input: {
  originNet: DecimalLike;
  destinationNet: DecimalLike | null;
  thresholds: Thresholds | null;
}): Reconciliation {
  if (input.destinationNet === null) return { variance: null, percent: null, status: "REVIEW" };

  const originNet = toDecimal(input.originNet);
  const variance = originNet.minus(toDecimal(input.destinationNet));
  if (originNet.isZero()) return { variance, percent: null, status: "REVIEW" };

  const percent = variance.dividedBy(originNet).times(100);
  if (input.thresholds === null) return { variance, percent, status: "REVIEW" };
  if (variance.isZero()) return { variance, percent, status: "MATCH" };

  const overKg = variance.abs().greaterThan(toDecimal(input.thresholds.maxVarianceKg));
  const overPercent = percent.abs().greaterThan(toDecimal(input.thresholds.maxVariancePercent));
  return { variance, percent, status: overKg || overPercent ? "WARNING" : "NORMAL" };
}

export type LineNet = { commodityId: string; net: DecimalLike };

export type LineReconciliation = {
  commodityId: string;
  originNet: Decimal | null;
  destinationNet: Decimal | null;
  variance: Decimal | null;
  percent: Decimal | null;
  /** Null while the origin line still waits for its destination line. */
  status: ComputedReconciliationStatus | null;
};

export type JobReconciliation = {
  lines: LineReconciliation[];
  /** Every origin commodity has a destination line. */
  complete: boolean;
  originNet: Decimal;
  destinationNet: Decimal | null;
  variance: Decimal | null;
  percent: Decimal | null;
  /** Worst line status; null until complete. */
  status: ComputedReconciliationStatus | null;
};

const SEVERITY: Record<ComputedReconciliationStatus, number> = { MATCH: 0, NORMAL: 1, WARNING: 2, REVIEW: 3 };

const sum = (lines: LineNet[]) => lines.reduce((total, l) => total.plus(toDecimal(l.net)), new Decimal(0));

/** Compares origin and destination per commodity; the job takes the worst line. */
export function reconcileLines(input: {
  origin: LineNet[];
  destination: LineNet[];
  thresholds: Thresholds | null;
}): JobReconciliation {
  const destinationBy = new Map(input.destination.map((l) => [l.commodityId, l]));
  const originIds = new Set(input.origin.map((l) => l.commodityId));

  const lines: LineReconciliation[] = input.origin.map((o) => {
    const d = destinationBy.get(o.commodityId);
    const originNet = toDecimal(o.net);
    if (!d) return { commodityId: o.commodityId, originNet, destinationNet: null, variance: null, percent: null, status: null };
    return {
      commodityId: o.commodityId,
      originNet,
      destinationNet: toDecimal(d.net),
      ...reconcile({ originNet, destinationNet: d.net, thresholds: input.thresholds }),
    };
  });
  for (const d of input.destination) {
    if (originIds.has(d.commodityId)) continue;
    const destinationNet = toDecimal(d.net);
    lines.push({
      commodityId: d.commodityId,
      originNet: null,
      destinationNet,
      variance: destinationNet.negated(),
      percent: null,
      status: "REVIEW",
    });
  }

  const complete = input.origin.length > 0 && input.origin.every((o) => destinationBy.has(o.commodityId));
  const originNet = sum(input.origin);
  const destinationNet = input.destination.length > 0 ? sum(input.destination) : null;
  const variance = destinationNet === null ? null : originNet.minus(destinationNet);
  const percent = variance === null || originNet.isZero() ? null : variance.dividedBy(originNet).times(100);
  const status = complete
    ? lines.reduce<ComputedReconciliationStatus>(
        (worst, l) => (l.status && SEVERITY[l.status] > SEVERITY[worst] ? l.status : worst),
        "MATCH",
      )
    : null;
  return { lines, complete, originNet, destinationNet, variance, percent, status };
}
