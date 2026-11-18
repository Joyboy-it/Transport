import type { AnalysisDimension } from "@/domain/analysis";

export type AnalysisQuery = {
  from: string;
  to: string;
  by: AnalysisDimension;
  transporterId?: string;
  originId?: string;
  destinationFactoryId?: string;
  commodityId?: string;
};

const ROW_FILTER: Partial<Record<AnalysisDimension, string>> = {
  transporter: "transporterId",
  origin: "originId",
  factory: "destinationFactoryId",
  commodity: "commodityId",
};

export function analysisSearch(filters: AnalysisQuery, by: AnalysisDimension | null = filters.by) {
  const params = new URLSearchParams();
  params.set("from", filters.from);
  params.set("to", filters.to);
  if (by) params.set("by", by);
  if (filters.transporterId) params.set("transporterId", filters.transporterId);
  if (filters.originId) params.set("originId", filters.originId);
  if (filters.destinationFactoryId) params.set("destinationFactoryId", filters.destinationFactoryId);
  if (filters.commodityId) params.set("commodityId", filters.commodityId);
  return params.toString();
}

/** Job-list link for a breakdown row. Vehicle, driver, route, month, and responsible have no list filter. */
export function jobsSearch(filters: AnalysisQuery, dimension: AnalysisDimension, key: string) {
  const field = ROW_FILTER[dimension];
  if (!field || key === "") return null;
  const params = new URLSearchParams(analysisSearch(filters, null));
  params.set(field, key);
  return `/transport/jobs?${params}`;
}
