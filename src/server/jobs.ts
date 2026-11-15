import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { parseAmount } from "@/domain/decimal";
import {
  canCancel,
  canDelete,
  canEditHeader,
  canEditNote,
  ISSUE_FIELD_LABEL,
  missingForIssue,
  type JobStatus,
} from "@/domain/job-status";
import { fromDateInput } from "@/lib/format";
import { jobHeaderSchema, type JobHeaderInput } from "@/lib/job-schema";
import { RuleError, StaleError } from "./action";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { nextJobNumber } from "./sequences";

type HeaderData = {
  hireDate: Date | null;
  transporterId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  commodityId: string | null;
  originId: string | null;
  destinationFactoryId: string | null;
  responsibleUserId: string | null;
  freightAmount: string | null;
  collectAmount: string | null;
  note: string;
};

type CurrentRefs = Partial<Record<keyof HeaderData, unknown>>;

function optionalAmount(value: string) {
  if (value === "") return null;
  const amount = parseAmount(value);
  return amount ? amount.toFixed(2) : null;
}

function blankCollection(value: string) {
  const amount = optionalAmount(value);
  return amount === "0.00" ? null : amount;
}

function toHeaderData(input: JobHeaderInput): HeaderData {
  const ref = (v: string) => (v === "" ? null : v);
  return {
    hireDate: input.hireDate === "" ? null : fromDateInput(input.hireDate),
    transporterId: ref(input.transporterId),
    vehicleId: ref(input.vehicleId),
    driverId: ref(input.driverId),
    commodityId: ref(input.commodityId),
    originId: ref(input.originId),
    destinationFactoryId: ref(input.destinationFactoryId),
    responsibleUserId: ref(input.responsibleUserId),
    freightAmount: optionalAmount(input.freightAmount),
    collectAmount: blankCollection(input.collectAmount),
    note: input.note.trim(),
  };
}

/** Inactive masters may stay on a job that already uses them, but cannot be newly chosen. */
async function checkReferences(data: HeaderData, current: CurrentRefs) {
  const usable = (field: keyof HeaderData, row: { active: boolean } | null, label: string) => {
    if (!row) throw new RuleError(`ไม่พบ${label}ที่เลือก`);
    if (!row.active && current[field] !== data[field]) throw new RuleError(`${label}ที่เลือกถูกปิดใช้งานแล้ว`);
  };

  if (data.transporterId) {
    usable("transporterId", await db.transporter.findUnique({ where: { id: data.transporterId } }), "ผู้รับจ้าง");
  }
  if (data.vehicleId) {
    const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
    usable("vehicleId", vehicle, "รถ");
    if (data.transporterId && vehicle!.transporterId !== data.transporterId) {
      throw new RuleError("ทะเบียนรถที่เลือกไม่ได้สังกัดผู้รับจ้างนี้");
    }
  }
  if (data.driverId) {
    const driver = await db.driver.findUnique({ where: { id: data.driverId } });
    usable("driverId", driver, "คนขับ");
    if (data.transporterId && driver!.transporterId !== data.transporterId) {
      throw new RuleError("คนขับที่เลือกสังกัดผู้รับจ้างรายอื่น");
    }
  }
  if (data.commodityId) {
    usable("commodityId", await db.commodity.findUnique({ where: { id: data.commodityId } }), "ประเภทสินค้า");
  }
  if (data.originId) {
    usable("originId", await db.origin.findUnique({ where: { id: data.originId } }), "ต้นทาง");
  }
  if (data.destinationFactoryId) {
    usable(
      "destinationFactoryId",
      await db.destinationFactory.findUnique({ where: { id: data.destinationFactoryId } }),
      "โรงงานปลายทาง",
    );
  }
  if (data.responsibleUserId) {
    usable("responsibleUserId", await db.user.findUnique({ where: { id: data.responsibleUserId } }), "ผู้รับผิดชอบ");
  }
}

function assertIssuable(data: HeaderData) {
  const missing = missingForIssue(data);
  if (missing.length > 0) {
    throw new RuleError(`ออกใบงานไม่ได้ ยังขาด: ${missing.map((f) => ISSUE_FIELD_LABEL[f]).join(", ")}`);
  }
}

export async function createJob(user: CurrentUser, input: JobHeaderInput, issue: boolean) {
  const data = toHeaderData(input);
  await checkReferences(data, {});
  if (issue) assertIssuable(data);

  return db.$transaction(async (tx) => {
    const jobNumber = await nextJobNumber(tx);
    return tx.transportJob.create({
      data: {
        ...data,
        jobNumber,
        status: issue ? "WAITING_ORIGIN" : "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true, jobNumber: true },
    });
  });
}

/** Updates only if nobody saved the job since `expectedUpdatedAt`. */
async function guardedJobUpdate(
  tx: Prisma.TransactionClient,
  jobId: string,
  expectedUpdatedAt: string,
  data: Prisma.TransportJobUncheckedUpdateManyInput,
) {
  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) throw new StaleError();
  const { count } = await tx.transportJob.updateMany({
    where: { id: jobId, updatedAt: expected },
    data,
  });
  if (count === 0) throw new StaleError();
}

async function loadJob(jobId: string) {
  const job = await db.transportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new RuleError("ไม่พบใบงาน");
  return job;
}

export async function updateJobHeader(
  user: CurrentUser,
  jobId: string,
  input: JobHeaderInput,
  expectedUpdatedAt: string,
  issue: boolean,
) {
  const job = await loadJob(jobId);
  if (!canEditHeader(job.status)) {
    throw new RuleError("ใบงานยืนยันน้ำหนักแล้วหรือถูกยกเลิก แก้หัวใบงานไม่ได้");
  }
  const data = toHeaderData(input);
  await checkReferences(data, job);

  const issuing = issue && job.status === "DRAFT";
  if (issuing || job.status !== "DRAFT") assertIssuable(data);

  await db.$transaction((tx) =>
    guardedJobUpdate(tx, jobId, expectedUpdatedAt, {
      ...data,
      note: job.note,
      ...(data.collectAmount === null ? { collectedAt: null, collectedById: null } : {}),
      ...(issuing ? { status: "WAITING_ORIGIN" as const } : {}),
      updatedById: user.id,
    }),
  );
}

export async function recordCollection(
  user: CurrentUser,
  jobId: string,
  expectedUpdatedAt: string,
  collectAmount: string,
  received: boolean,
) {
  const job = await loadJob(jobId);
  if (job.status === "CANCELLED") throw new RuleError("ใบงานถูกยกเลิกแล้ว");
  const parsed = jobHeaderSchema.shape.collectAmount.safeParse(collectAmount);
  if (!parsed.success) throw new RuleError(parsed.error.issues[0]?.message ?? "จำนวนเงินไม่ถูกต้อง");
  const stored = blankCollection(parsed.data);
  if (received && !stored) throw new RuleError("ระบุจำนวนเงินก่อนรับเงิน");
  const keepReceipt = Boolean(stored) && received;
  await db.$transaction((tx) =>
    guardedJobUpdate(tx, jobId, expectedUpdatedAt, {
      collectAmount: stored,
      collectedAt: keepReceipt ? (job.collectedAt ?? new Date()) : null,
      collectedById: keepReceipt ? (job.collectedById ?? user.id) : null,
      updatedById: user.id,
    }),
  );
}

export async function updateJobNote(user: CurrentUser, jobId: string, note: string, expectedUpdatedAt: string) {
  const job = await loadJob(jobId);
  if (!canEditNote(job.status)) throw new RuleError("ใบงานถูกยกเลิกแล้ว");
  await db.$transaction((tx) =>
    guardedJobUpdate(tx, jobId, expectedUpdatedAt, { note: note.trim(), updatedById: user.id }),
  );
}

export async function cancelJob(user: CurrentUser, jobId: string, reason: string, expectedUpdatedAt: string) {
  const job = await loadJob(jobId);
  if (!canCancel(job.status, user.role)) {
    throw new RuleError(
      job.status === "WEIGHT_CONFIRMED"
        ? "ใบงานยืนยันน้ำหนักแล้ว ต้องให้ผู้ดูแลระบบเป็นผู้ยกเลิก"
        : "ยกเลิกใบงานในสถานะนี้ไม่ได้",
    );
  }
  await db.$transaction((tx) =>
    guardedJobUpdate(tx, jobId, expectedUpdatedAt, {
      status: "CANCELLED",
      cancelReason: reason,
      cancelledById: user.id,
      cancelledAt: new Date(),
      updatedById: user.id,
    }),
  );
}

export async function deleteDraftJob(jobId: string) {
  await db.$transaction(async (tx) => {
    const job = await tx.transportJob.findUnique({
      where: { id: jobId },
      include: {
        _count: { select: { attachments: true, originWeighings: true, destinationWeighings: true } },
      },
    });
    if (!job) throw new RuleError("ไม่พบใบงาน");
    const weighings = job._count.originWeighings + job._count.destinationWeighings;
    if (!canDelete(job.status as JobStatus, { weighings, files: job._count.attachments })) {
      throw new RuleError("ลบได้เฉพาะใบงานร่างที่ยังไม่มีน้ำหนักและไฟล์ ใบงานอื่นให้ใช้การยกเลิก");
    }
    await tx.transportJob.delete({ where: { id: jobId } });
  });
}
