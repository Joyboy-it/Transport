import { Decimal, type DecimalLike, toDecimal } from "./decimal";
import type { ReconciliationStatus } from "./reconciliation";

export const ANALYSIS_DIMENSIONS = [
  "transporter",
  "vehicle",
  "driver",
  "origin",
  "factory",
  "commodity",
  "route",
  "responsible",
  "month",
] as const;

export type AnalysisDimension = (typeof ANALYSIS_DIMENSIONS)[number];

export const ANALYSIS_DIMENSION_LABEL: Record<AnalysisDimension, string> = {
  transporter: "ผู้รับจ้าง",
  vehicle: "รถ",
  driver: "คนขับ",
  origin: "ต้นทาง",
  factory: "โรงงานปลายทาง",
  commodity: "ประเภทสินค้า",
  route: "เส้นทาง",
  responsible: "ผู้รับผิดชอบ",
  month: "เดือน",
};

export type RollupInput = {
  variance: DecimalLike | null;
  originNet: DecimalLike | null;
  freight: DecimalLike | null;
  freightTrips: number;
  collect: DecimalLike | null;
  collected: DecimalLike | null;
};

export type Rollup = {
  variancePercent: Decimal | null;
  freightPerTrip: Decimal | null;
  freightPerTon: Decimal | null;
  outstanding: Decimal | null;
};

function present(value: DecimalLike | null): Decimal | null {
  return value === null ? null : toDecimal(value);
}

function divide(numerator: Decimal | null, denominator: Decimal | null): Decimal | null {
  if (numerator === null || denominator === null || denominator.isZero()) return null;
  return numerator.dividedBy(denominator);
}

/** Rates from already-summed totals. Percent and per-ton never average per-job rates. */
export function rollupMeasures(input: RollupInput): Rollup {
  const variance = present(input.variance);
  const originNet = present(input.originNet);
  const freight = present(input.freight);
  const collect = present(input.collect);
  const collected = present(input.collected);
  const trips = input.freightTrips > 0 ? new Decimal(input.freightTrips) : null;
  return {
    variancePercent: divide(variance === null ? null : variance.times(100), originNet),
    freightPerTrip: divide(freight, trips),
    freightPerTon: divide(freight === null ? null : freight.times(1000), originNet),
    outstanding: collect === null ? null : collect.minus(collected ?? 0),
  };
}

export type AnalysisWeightLine = {
  commodityId: string;
  commodityName: string;
  net: DecimalLike;
  impurity: DecimalLike;
};

export type AnalysisJob = {
  hireDate: Date | null;
  transporterId: string | null;
  transporterName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  driverId: string | null;
  driverName: string | null;
  originId: string | null;
  originName: string | null;
  destinationFactoryId: string | null;
  destinationFactoryName: string | null;
  commodityId: string | null;
  commodityName: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  freightAmount: DecimalLike | null;
  collectAmount: DecimalLike | null;
  collected: boolean;
  variance: DecimalLike | null;
  reconciliationStatus: ReconciliationStatus | null;
  originLines: AnalysisWeightLine[];
  destinationLines: AnalysisWeightLine[];
};

export type AnalysisBucket = {
  key: string;
  label: string;
  trips: number;
  freightTrips: number;
  freight: Decimal | null;
  noCollectTrips: number;
  collect: Decimal | null;
  collected: Decimal | null;
  weighedTrips: number;
  unweighedTrips: number;
  /** Origin net of jobs whose stored variance is set. The variance percent divides by this. */
  weighedOriginNet: Decimal | null;
  /** Origin net of every job in the bucket. Freight per ton divides by this. */
  originNet: Decimal | null;
  destinationNet: Decimal | null;
  impurity: Decimal | null;
  variance: Decimal | null;
  match: number;
  normal: number;
  warning: number;
  review: number;
  confirmed: number;
};

const MISSING = "ไม่ระบุ";

function add(total: Decimal | null, value: DecimalLike | null | undefined): Decimal | null {
  if (value === null || value === undefined) return total;
  const next = toDecimal(value);
  return total === null ? next : total.plus(next);
}

function emptyBucket(key: string, label: string): AnalysisBucket {
  return {
    key,
    label,
    trips: 0,
    freightTrips: 0,
    freight: null,
    noCollectTrips: 0,
    collect: null,
    collected: null,
    weighedTrips: 0,
    unweighedTrips: 0,
    weighedOriginNet: null,
    originNet: null,
    destinationNet: null,
    impurity: null,
    variance: null,
    match: 0,
    normal: 0,
    warning: 0,
    review: 0,
    confirmed: 0,
  };
}

function named(id: string | null, name: string | null): { key: string; label: string } {
  if (!id) return { key: "", label: MISSING };
  return { key: id, label: name || MISSING };
}

function slot(job: AnalysisJob, dimension: AnalysisDimension): { key: string; label: string } {
  switch (dimension) {
    case "transporter":
      return named(job.transporterId, job.transporterName);
    case "vehicle":
      return named(job.vehicleId, job.vehiclePlate);
    case "driver":
      return named(job.driverId, job.driverName);
    case "origin":
      return named(job.originId, job.originName);
    case "factory":
      return named(job.destinationFactoryId, job.destinationFactoryName);
    case "commodity":
      return named(job.commodityId, job.commodityName);
    case "responsible":
      return named(job.responsibleUserId, job.responsibleName);
    case "route":
      return {
        key: `${job.originId ?? ""}:${job.destinationFactoryId ?? ""}`,
        label: `${job.originName ?? MISSING} → ${job.destinationFactoryName ?? MISSING}`,
      };
    case "month": {
      if (!job.hireDate) return { key: "", label: MISSING };
      return {
        key: job.hireDate.toISOString().slice(0, 7),
        label: new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" }).format(job.hireDate),
      };
    }
  }
}

function take(map: Map<string, AnalysisBucket>, key: string, label: string) {
  const existing = map.get(key);
  if (existing) return existing;
  const bucket = emptyBucket(key, label || MISSING);
  map.set(key, bucket);
  return bucket;
}

function addMoney(bucket: AnalysisBucket, job: AnalysisJob) {
  bucket.trips += 1;
  if (job.freightAmount !== null) {
    bucket.freightTrips += 1;
    bucket.freight = add(bucket.freight, job.freightAmount);
  }
  if (job.collectAmount === null) bucket.noCollectTrips += 1;
  else bucket.collect = add(bucket.collect, job.collectAmount);
  if (job.collected && job.collectAmount !== null) bucket.collected = add(bucket.collected, job.collectAmount);
  if (job.variance === null) bucket.unweighedTrips += 1;
  else bucket.weighedTrips += 1;
  if (job.reconciliationStatus === "MATCH") bucket.match += 1;
  if (job.reconciliationStatus === "NORMAL") bucket.normal += 1;
  if (job.reconciliationStatus === "WARNING") bucket.warning += 1;
  if (job.reconciliationStatus === "REVIEW") bucket.review += 1;
  if (job.reconciliationStatus === "CONFIRMED") bucket.confirmed += 1;
}

/** Stored job variance, so a later threshold change cannot move a closed job. */
function addStoredWeight(bucket: AnalysisBucket, job: AnalysisJob) {
  const weighed = job.variance !== null;
  if (weighed) bucket.variance = add(bucket.variance, job.variance);
  for (const line of job.originLines) {
    bucket.originNet = add(bucket.originNet, line.net);
    if (weighed) bucket.weighedOriginNet = add(bucket.weighedOriginNet, line.net);
  }
  if (!weighed) return;
  for (const line of job.destinationLines) {
    bucket.destinationNet = add(bucket.destinationNet, line.net);
    bucket.impurity = add(bucket.impurity, line.impurity);
  }
}

/** Line variance for one commodity. Freight stays on the header commodity. */
function addCommodityWeight(map: Map<string, AnalysisBucket>, job: AnalysisJob) {
  const destinationBy = new Map(job.destinationLines.map((line) => [line.commodityId, line]));
  const seen = new Set<string>();
  for (const line of job.originLines) {
    seen.add(line.commodityId);
    const bucket = take(map, line.commodityId, line.commodityName);
    const destination = destinationBy.get(line.commodityId);
    bucket.originNet = add(bucket.originNet, line.net);
    if (!destination) continue;
    bucket.weighedOriginNet = add(bucket.weighedOriginNet, line.net);
    bucket.destinationNet = add(bucket.destinationNet, destination.net);
    bucket.impurity = add(bucket.impurity, destination.impurity);
    bucket.variance = add(bucket.variance, toDecimal(line.net).minus(toDecimal(destination.net)));
  }
  for (const destination of job.destinationLines) {
    if (seen.has(destination.commodityId)) continue;
    const bucket = take(map, destination.commodityId, destination.commodityName);
    bucket.destinationNet = add(bucket.destinationNet, destination.net);
    bucket.impurity = add(bucket.impurity, destination.impurity);
    bucket.variance = add(bucket.variance, toDecimal(destination.net).negated());
  }
}

export function groupAnalysis(jobs: AnalysisJob[], dimension: AnalysisDimension): AnalysisBucket[] {
  const map = new Map<string, AnalysisBucket>();
  for (const job of jobs) {
    const place = slot(job, dimension);
    const bucket = take(map, place.key, place.label);
    addMoney(bucket, job);
    if (dimension === "commodity") addCommodityWeight(map, job);
    else addStoredWeight(bucket, job);
  }
  const rows = [...map.values()];
  if (dimension === "month") return rows.sort((a, b) => b.key.localeCompare(a.key));
  return rows.sort((a, b) => a.label.localeCompare(b.label, "th"));
}

export function summarizeAnalysis(jobs: AnalysisJob[]): AnalysisBucket {
  const bucket = emptyBucket("all", "รวม");
  for (const job of jobs) {
    addMoney(bucket, job);
    addStoredWeight(bucket, job);
  }
  return bucket;
}
