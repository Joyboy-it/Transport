import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import {
  ANALYSIS_DIMENSIONS,
  groupAnalysis,
  summarizeAnalysis,
  type AnalysisBucket,
  type AnalysisDimension,
  type AnalysisJob,
} from "@/domain/analysis";
import { addCalendarDays, currentDate, fromDateInput } from "@/lib/format";
import { db } from "./db";

export type AnalysisFilters = {
  from: string;
  to: string;
  by: AnalysisDimension;
  transporterId?: string;
  originId?: string;
  destinationFactoryId?: string;
  commodityId?: string;
};

export function readAnalysisFilters(
  params: Record<string, string | string[] | undefined>,
  defaultBy: AnalysisDimension,
): AnalysisFilters {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
  };
  const today = currentDate();
  const by = one("by");
  return {
    from: one("from") ?? addCalendarDays(today, -15),
    to: one("to") ?? today,
    by: ANALYSIS_DIMENSIONS.find((item) => item === by) ?? defaultBy,
    transporterId: one("transporterId"),
    originId: one("originId"),
    destinationFactoryId: one("destinationFactoryId"),
    commodityId: one("commodityId"),
  };
}

/** Issued jobs only. Cancelled jobs are not payable, and drafts were never issued. */
export function analysisWhere(filters: AnalysisFilters): Prisma.TransportJobWhereInput {
  const from = fromDateInput(filters.from);
  const to = fromDateInput(filters.to);
  return {
    status: { notIn: ["DRAFT", "CANCELLED"] },
    ...(from || to ? { hireDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    transporterId: filters.transporterId,
    originId: filters.originId,
    destinationFactoryId: filters.destinationFactoryId,
    ...(filters.commodityId
      ? {
          OR: [
            { commodityId: filters.commodityId },
            { originWeighings: { some: { commodityId: filters.commodityId } } },
          ],
        }
      : {}),
  };
}

const jobSelect = {
  hireDate: true,
  transporterId: true,
  vehicleId: true,
  driverId: true,
  originId: true,
  destinationFactoryId: true,
  commodityId: true,
  responsibleUserId: true,
  freightAmount: true,
  collectAmount: true,
  collectedAt: true,
  variance: true,
  reconciliationStatus: true,
  transporter: { select: { name: true } },
  vehicle: { select: { plate: true } },
  driver: { select: { name: true } },
  origin: { select: { name: true } },
  destinationFactory: { select: { name: true } },
  commodity: { select: { name: true } },
  responsibleUser: { select: { displayName: true } },
  originWeighings: { select: { commodityId: true, net: true, impurity: true, commodity: { select: { name: true } } } },
  destinationWeighings: {
    select: { commodityId: true, net: true, impurity: true, commodity: { select: { name: true } } },
  },
} satisfies Prisma.TransportJobSelect;

type JobRow = Prisma.TransportJobGetPayload<{ select: typeof jobSelect }>;

function toAnalysisJob(row: JobRow): AnalysisJob {
  return {
    hireDate: row.hireDate,
    transporterId: row.transporterId,
    transporterName: row.transporter?.name ?? null,
    vehicleId: row.vehicleId,
    vehiclePlate: row.vehicle?.plate ?? null,
    driverId: row.driverId,
    driverName: row.driver?.name ?? null,
    originId: row.originId,
    originName: row.origin?.name ?? null,
    destinationFactoryId: row.destinationFactoryId,
    destinationFactoryName: row.destinationFactory?.name ?? null,
    commodityId: row.commodityId,
    commodityName: row.commodity?.name ?? null,
    responsibleUserId: row.responsibleUserId,
    responsibleName: row.responsibleUser?.displayName ?? null,
    freightAmount: row.freightAmount,
    collectAmount: row.collectAmount,
    collected: row.collectedAt !== null,
    variance: row.variance,
    reconciliationStatus: row.reconciliationStatus,
    originLines: row.originWeighings.map((line) => ({
      commodityId: line.commodityId,
      commodityName: line.commodity.name,
      net: line.net,
      impurity: line.impurity,
    })),
    destinationLines: row.destinationWeighings.map((line) => ({
      commodityId: line.commodityId,
      commodityName: line.commodity.name,
      net: line.net,
      impurity: line.impurity,
    })),
  };
}

export async function loadAnalysis(filters: AnalysisFilters): Promise<{ total: AnalysisBucket; rows: AnalysisBucket[] }> {
  const jobs = await db.transportJob.findMany({ where: analysisWhere(filters), select: jobSelect });
  const mapped = jobs.map(toAnalysisJob);
  return { total: summarizeAnalysis(mapped), rows: groupAnalysis(mapped, filters.by) };
}
