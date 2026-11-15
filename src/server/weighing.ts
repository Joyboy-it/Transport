import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import {
  canConfirmWarning,
  canRecordWeighing,
  settleAfterWeighing,
  weighingEditNeedsReason,
  type WeighingSide,
} from "@/domain/job-status";
import { reconcileLines } from "@/domain/reconciliation";
import { computeWeighing } from "@/domain/weight";
import { fromDateTimeInput } from "@/lib/format";
import type { WeighingFormInput } from "@/lib/weighing-schema";
import { RuleError, StaleError } from "./action";
import type { CurrentUser } from "./auth";
import { db } from "./db";

/** Serializes every weight change on one job so the stored variance always matches all lines. */
async function lockJob(tx: Prisma.TransactionClient, jobId: string) {
  await tx.$queryRaw`SELECT "id" FROM "TransportJob" WHERE "id" = ${jobId} FOR UPDATE`;
  const job = await tx.transportJob.findUnique({
    where: { id: jobId },
    include: { originWeighings: true, destinationWeighings: true },
  });
  if (!job) throw new RuleError("ไม่พบใบงาน");
  return job;
}

type Job = Awaited<ReturnType<typeof lockJob>>;
type Line = Job["originWeighings"][number];

const linesOf = (job: Job, side: WeighingSide): Line[] =>
  side === "ORIGIN" ? job.originWeighings : job.destinationWeighings;

function assertCanChange(job: Job, side: WeighingSide) {
  if (canRecordWeighing(side, job.status, job.originWeighings.length > 0)) return;
  throw new RuleError(
    side === "DESTINATION" && job.originWeighings.length === 0
      ? "ต้องบันทึกน้ำหนักต้นทางก่อน"
      : "ใบงานสถานะนี้บันทึกน้ำหนักไม่ได้",
  );
}

function findLine(job: Job, side: WeighingSide, lineId: string, expectedUpdatedAt: string) {
  const line = linesOf(job, side).find((l) => l.id === lineId);
  if (!line || line.updatedAt.toISOString() !== expectedUpdatedAt) throw new StaleError();
  return line;
}

function requireReason(job: Job, reason: string) {
  const needsReason = weighingEditNeedsReason(job.status);
  if (needsReason && reason.length < 3) {
    throw new RuleError("น้ำหนักยืนยันแล้ว ต้องระบุเหตุผลการแก้ไขอย่างน้อย 3 ตัวอักษร");
  }
  return needsReason;
}

function keepRevision(
  tx: Prisma.TransactionClient,
  line: Line,
  side: WeighingSide,
  reason: string,
  userId: string,
  removed: boolean,
) {
  return tx.weighingRevision.create({
    data: {
      jobId: line.jobId,
      side,
      commodityId: line.commodityId,
      removed,
      weighedAt: line.weighedAt,
      ticketNumber: line.ticketNumber,
      gross: line.gross,
      tare: line.tare,
      netBeforeDeduction: line.netBeforeDeduction,
      impurity: line.impurity,
      net: line.net,
      reason,
      revisedById: userId,
    },
  });
}

/** Recomputes job status and variance from every current line on both sides. */
async function settleJob(tx: Prisma.TransactionClient, jobId: string, userId: string) {
  const [origin, destination, threshold] = await Promise.all([
    tx.originWeighing.findMany({ where: { jobId }, select: { commodityId: true, net: true } }),
    tx.destinationWeighing.findMany({ where: { jobId }, select: { commodityId: true, net: true } }),
    tx.varianceThreshold.findUnique({ where: { id: 1 } }),
  ]);
  const result = reconcileLines({ origin, destination, thresholds: threshold });
  const settled = settleAfterWeighing({
    hasOrigin: origin.length > 0,
    destinationComplete: result.complete,
    reconciliation: result.status ?? "REVIEW",
  });
  const judged = settled.reconciliation !== null;

  await tx.transportJob.update({
    where: { id: jobId },
    data: {
      status: settled.status,
      reconciliationStatus: settled.reconciliation,
      variance: judged ? (result.variance?.toFixed(2) ?? null) : null,
      variancePercent: judged ? (result.percent?.toFixed(6) ?? null) : null,
      thresholdKg: judged ? (threshold?.maxVarianceKg ?? null) : null,
      thresholdPercent: judged ? (threshold?.maxVariancePercent ?? null) : null,
      confirmedById: null,
      confirmedAt: null,
      updatedById: userId,
    },
  });
}

/** Saves one commodity line; an empty lineId adds a new line. */
export async function saveWeighing(
  user: CurrentUser,
  jobId: string,
  side: WeighingSide,
  lineId: string,
  input: WeighingFormInput,
  expectedUpdatedAt: string,
) {
  const computed = computeWeighing({
    gross: input.gross,
    tare: input.tare,
    impurity: input.impurity === "" ? "0" : input.impurity,
  });
  if (!computed.ok) throw new RuleError("น้ำหนักไม่ถูกต้อง");
  const weighedAt = fromDateTimeInput(input.weighedAt);
  if (!weighedAt) throw new RuleError("วันที่และเวลาชั่งไม่ถูกต้อง");

  await db.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    assertCanChange(job, side);
    const existing = lineId ? findLine(job, side, lineId, expectedUpdatedAt) : null;

    if (existing?.commodityId !== input.commodityId) {
      const commodity = await tx.commodity.findUnique({ where: { id: input.commodityId } });
      if (!commodity?.active) throw new RuleError("ไม่พบประเภทสินค้านี้ หรือถูกปิดใช้งานแล้ว");
      if (linesOf(job, side).some((l) => l.commodityId === input.commodityId)) {
        throw new RuleError(`${commodity.name} มีรายการชั่ง${side === "ORIGIN" ? "ต้นทาง" : "ปลายทาง"}อยู่แล้ว`);
      }
      if (side === "DESTINATION" && !job.originWeighings.some((l) => l.commodityId === input.commodityId)) {
        throw new RuleError(`ต้นทางยังไม่มีรายการชั่งของ ${commodity.name}`);
      }
    }

    if (existing && requireReason(job, input.reason)) {
      await keepRevision(tx, existing, side, input.reason, user.id, false);
    }

    const v = computed.value;
    const values = {
      commodityId: input.commodityId,
      weighedAt,
      ticketNumber: input.ticketNumber,
      gross: v.gross.toFixed(2),
      tare: v.tare.toFixed(2),
      netBeforeDeduction: v.netBeforeDeduction.toFixed(2),
      impurity: v.impurity.toFixed(2),
      net: v.net.toFixed(2),
      updatedById: user.id,
    };
    const create = { ...values, jobId, createdById: user.id };
    if (side === "ORIGIN") {
      if (existing) await tx.originWeighing.update({ where: { id: existing.id }, data: values });
      else await tx.originWeighing.create({ data: create });
    } else {
      if (existing) await tx.destinationWeighing.update({ where: { id: existing.id }, data: values });
      else await tx.destinationWeighing.create({ data: create });
    }

    await settleJob(tx, jobId, user.id);
  });
}

export async function deleteWeighing(
  user: CurrentUser,
  jobId: string,
  side: WeighingSide,
  lineId: string,
  expectedUpdatedAt: string,
  reason: string,
) {
  await db.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    assertCanChange(job, side);
    const line = findLine(job, side, lineId, expectedUpdatedAt);
    if (requireReason(job, reason)) await keepRevision(tx, line, side, reason, user.id, true);

    if (side === "ORIGIN") await tx.originWeighing.delete({ where: { id: line.id } });
    else await tx.destinationWeighing.delete({ where: { id: line.id } });

    await settleJob(tx, jobId, user.id);
  });
}

export async function confirmWarning(user: CurrentUser, jobId: string, expectedJobUpdatedAt: string) {
  await db.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    if (job.updatedAt.toISOString() !== expectedJobUpdatedAt) throw new StaleError();
    if (!canConfirmWarning(job.status, job.reconciliationStatus)) {
      throw new RuleError("ยืนยันได้เฉพาะใบงานที่ส่วนต่างเกินเกณฑ์และรอตรวจสอบ");
    }
    await tx.transportJob.update({
      where: { id: jobId },
      data: {
        status: "WEIGHT_CONFIRMED",
        reconciliationStatus: "CONFIRMED",
        confirmedById: user.id,
        confirmedAt: new Date(),
        updatedById: user.id,
      },
    });
  });
}
