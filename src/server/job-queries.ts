import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { Decimal } from "@/domain/decimal";
import { JOB_STATUSES, type JobStatus } from "@/domain/job-status";
import { addCalendarDays, currentDate, fromDateInput } from "@/lib/format";
import { db } from "./db";

type Current = Partial<
  Record<
    | "transporterId"
    | "vehicleId"
    | "driverId"
    | "commodityId"
    | "originId"
    | "destinationFactoryId"
    | "responsibleUserId",
    string | null
  >
>;

const activeOr = (id: string | null | undefined) =>
  id ? { OR: [{ active: true }, { id }] } : { active: true };

export type JobOptions = Awaited<ReturnType<typeof jobOptions>>;

/** Picker contents: active masters, plus whatever the job already uses. */
export async function jobOptions(current: Current = {}) {
  const [transporters, vehicles, drivers, commodities, origins, factories, users] = await Promise.all([
    db.transporter.findMany({
      where: activeOr(current.transporterId),
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.vehicle.findMany({
      where: activeOr(current.vehicleId),
      select: { id: true, plate: true, vehicleType: true, transporterId: true },
      orderBy: { plate: "asc" },
    }),
    db.driver.findMany({
      where: activeOr(current.driverId),
      select: { id: true, name: true, transporterId: true },
      orderBy: { name: "asc" },
    }),
    db.commodity.findMany({ where: activeOr(current.commodityId), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.origin.findMany({ where: activeOr(current.originId), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.destinationFactory.findMany({
      where: activeOr(current.destinationFactoryId),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: activeOr(current.responsibleUserId),
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  return { transporters, vehicles, drivers, commodities, origins, factories, users };
}

export type JobFilters = {
  from?: string;
  to?: string;
  transporterId?: string;
  originId?: string;
  destinationFactoryId?: string;
  commodityId?: string;
  status?: string;
  plate?: string;
  jobNumber?: string;
};

export const PAGE_SIZE = 50;

export function readFilters(params: Record<string, string | string[] | undefined>): JobFilters {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
  };
  const today = currentDate();
  return {
    from: one("from") ?? addCalendarDays(today, -15),
    to: one("to") ?? today,
    transporterId: one("transporterId"),
    originId: one("originId"),
    destinationFactoryId: one("destinationFactoryId"),
    commodityId: one("commodityId"),
    status: one("status"),
    plate: one("plate"),
    jobNumber: one("jobNumber"),
  };
}

function whereFor(filters: JobFilters): Prisma.TransportJobWhereInput {
  const from = filters.from ? fromDateInput(filters.from) : null;
  const to = filters.to ? fromDateInput(filters.to) : null;
  const status = JOB_STATUSES.includes(filters.status as JobStatus) ? (filters.status as JobStatus) : undefined;
  return {
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
    status,
    ...(filters.plate ? { vehicle: { plate: { contains: filters.plate, mode: "insensitive" } } } : {}),
    ...(filters.jobNumber ? { jobNumber: { contains: filters.jobNumber, mode: "insensitive" } } : {}),
  };
}

const listInclude = {
  transporter: { select: { name: true } },
  vehicle: { select: { plate: true } },
  driver: { select: { name: true } },
  origin: { select: { name: true } },
  destinationFactory: { select: { name: true } },
  commodity: { select: { name: true } },
  originWeighings: {
    select: { commodityId: true, net: true, commodity: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  },
  destinationWeighings: {
    select: { commodityId: true, net: true, impurity: true, commodity: { select: { name: true } } },
  },
} satisfies Prisma.TransportJobInclude;

export async function listJobs(filters: JobFilters, page: number) {
  const where = whereFor(filters);
  const [total, jobs] = await Promise.all([
    db.transportJob.count({ where }),
    db.transportJob.findMany({
      where,
      include: listInclude,
      orderBy: [{ hireDate: { sort: "desc", nulls: "first" } }, { jobNumber: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { total, jobs };
}

export type JobListSummary = {
  freightAmount: { toString(): string } | null;
  collectAmount: { toString(): string } | null;
  collectedAmount: { toString(): string } | null;
  originNet: { toString(): string } | null;
  destinationNet: { toString(): string } | null;
  destinationImpurity: { toString(): string } | null;
  variance: { toString(): string } | null;
  variancePercent: { toString(): string } | null;
  /** Every weighed job in the filter is an exact match or within the threshold. */
  withinThreshold: boolean;
};

/** Totals for every job matching the filter, including rows on other pages. */
export async function summarizeJobs(filters: JobFilters): Promise<JobListSummary> {
  const where = whereFor(filters);
  const [sums, collected, origin, destination, outside, weighed] = await Promise.all([
    db.transportJob.aggregate({ where, _sum: { freightAmount: true, collectAmount: true, variance: true } }),
    db.transportJob.aggregate({
      where: { AND: [where, { collectedAt: { not: null } }] },
      _sum: { collectAmount: true },
    }),
    db.originWeighing.aggregate({ where: { job: where }, _sum: { net: true } }),
    db.destinationWeighing.aggregate({ where: { job: where }, _sum: { net: true, impurity: true } }),
    db.transportJob.count({
      where: { AND: [where, { variance: { not: null }, reconciliationStatus: { notIn: ["MATCH", "NORMAL"] } }] },
    }),
    db.transportJob.count({ where: { AND: [where, { variance: { not: null } }] } }),
  ]);
  const originNet = origin._sum.net;
  const variance = sums._sum.variance;
  const variancePercent =
    variance && originNet && !new Decimal(originNet.toString()).isZero()
      ? new Decimal(variance.toString()).dividedBy(originNet.toString()).times(100)
      : null;
  return {
    freightAmount: sums._sum.freightAmount,
    collectAmount: sums._sum.collectAmount,
    collectedAmount: collected._sum.collectAmount,
    originNet,
    destinationNet: destination._sum.net,
    destinationImpurity: destination._sum.impurity,
    variance,
    variancePercent,
    withinThreshold: weighed > 0 && outside === 0,
  };
}

export type JobListRow = Awaited<ReturnType<typeof listJobs>>["jobs"][number];

export type Queue = "origin" | "destination" | "variance";

function queueWhere(queue: Queue): Prisma.TransportJobWhereInput {
  if (queue === "origin") return { status: "WAITING_ORIGIN" };
  if (queue === "destination") return { status: "WAITING_DESTINATION" };
  return { status: "WEIGHT_REVIEW", reconciliationStatus: { in: ["WARNING", "REVIEW"] } };
}

export async function queueCounts() {
  const [origin, destination, variance] = await Promise.all([
    db.transportJob.count({ where: queueWhere("origin") }),
    db.transportJob.count({ where: queueWhere("destination") }),
    db.transportJob.count({ where: queueWhere("variance") }),
  ]);
  return { origin, destination, variance };
}

export async function listQueue(queue: Queue) {
  const where = queueWhere(queue);
  return db.transportJob.findMany({
    where,
    include: listInclude,
    orderBy: [{ hireDate: { sort: "asc", nulls: "last" } }, { jobNumber: "asc" }],
    take: 200,
  });
}

export async function getJobDetail(id: string) {
  return db.transportJob.findUnique({
    where: { id },
    include: {
      transporter: true,
      vehicle: true,
      driver: true,
      origin: true,
      destinationFactory: true,
      commodity: true,
      responsibleUser: { select: { id: true, displayName: true } },
      originWeighings: { include: { commodity: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      destinationWeighings: { include: { commodity: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      weighingRevisions: { include: { commodity: { select: { name: true } } }, orderBy: { revisedAt: "desc" } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type JobDetail = NonNullable<Awaited<ReturnType<typeof getJobDetail>>>;

/** Commodities a new weighing line may use. */
export function activeCommodities() {
  return db.commodity.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export function currentThreshold() {
  return db.varianceThreshold.findUnique({ where: { id: 1 } });
}

/** Display names for the user ids stored in audit fields. */
export async function userNames(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const users = await db.user.findMany({ where: { id: { in: unique } }, select: { id: true, displayName: true } });
  return Object.fromEntries(users.map((u) => [u.id, u.displayName])) as Record<string, string>;
}
