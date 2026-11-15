import { parseAmount } from "./decimal";
import type { Role } from "./permissions";
import type { ComputedReconciliationStatus, ReconciliationStatus } from "./reconciliation";

export const JOB_STATUSES = [
  "DRAFT",
  "WAITING_ORIGIN",
  "WAITING_DESTINATION",
  "WEIGHT_REVIEW",
  "WEIGHT_CONFIRMED",
  "WAITING_PAYMENT",
  "PAID",
  "CANCELLED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  DRAFT: "ร่าง",
  WAITING_ORIGIN: "รอชั่งต้นทาง",
  WAITING_DESTINATION: "รอชั่งปลายทาง",
  WEIGHT_REVIEW: "รอตรวจสอบน้ำหนัก",
  WEIGHT_CONFIRMED: "ยืนยันน้ำหนักแล้ว",
  WAITING_PAYMENT: "รอจ่ายเงิน",
  PAID: "จ่ายแล้ว",
  CANCELLED: "ยกเลิก",
};

export type WeighingSide = "ORIGIN" | "DESTINATION";

export const ISSUE_FIELDS = [
  "hireDate",
  "transporterId",
  "vehicleId",
  "driverId",
  "commodityId",
  "originId",
  "destinationFactoryId",
  "responsibleUserId",
  "freightAmount",
] as const;
export type IssueField = (typeof ISSUE_FIELDS)[number];

export const ISSUE_FIELD_LABEL: Record<IssueField, string> = {
  hireDate: "วันที่จ้าง",
  transporterId: "ผู้รับจ้าง",
  vehicleId: "ทะเบียนรถ",
  driverId: "คนขับ",
  commodityId: "ประเภทสินค้า",
  originId: "ต้นทาง",
  destinationFactoryId: "โรงงานปลายทาง",
  responsibleUserId: "ผู้รับผิดชอบ",
  freightAmount: "ค่าจ้างต่อเที่ยว",
};

type HeaderForIssue = Record<IssueField, unknown>;

export function missingForIssue(header: HeaderForIssue): IssueField[] {
  return ISSUE_FIELDS.filter((field) => {
    const value = header[field];
    if (field === "freightAmount") {
      const amount = value === null || value === undefined ? null : parseAmount(value);
      return amount === null || amount.isNegative();
    }
    return value === null || value === undefined || value === "";
  });
}

const WEIGHABLE: readonly JobStatus[] = [
  "WAITING_ORIGIN",
  "WAITING_DESTINATION",
  "WEIGHT_REVIEW",
  "WEIGHT_CONFIRMED",
];

export function canRecordWeighing(side: WeighingSide, status: JobStatus, hasOrigin: boolean) {
  if (!WEIGHABLE.includes(status)) return false;
  return side === "ORIGIN" || hasOrigin;
}

export function weighingEditNeedsReason(status: JobStatus) {
  return status === "WEIGHT_CONFIRMED";
}

/** Status and stored reconciliation after any weighing change, computed from all current lines. */
export function settleAfterWeighing(input: {
  hasOrigin: boolean;
  /** Every origin commodity has its destination line. */
  destinationComplete: boolean;
  reconciliation: ComputedReconciliationStatus;
}): { status: JobStatus; reconciliation: ComputedReconciliationStatus | null } {
  if (!input.hasOrigin) return { status: "WAITING_ORIGIN", reconciliation: null };
  if (!input.destinationComplete) return { status: "WAITING_DESTINATION", reconciliation: null };
  const confirmed = input.reconciliation === "MATCH" || input.reconciliation === "NORMAL";
  return {
    status: confirmed ? "WEIGHT_CONFIRMED" : "WEIGHT_REVIEW",
    reconciliation: input.reconciliation,
  };
}

export function canConfirmWarning(status: JobStatus, reconciliation: ReconciliationStatus | null) {
  return status === "WEIGHT_REVIEW" && reconciliation === "WARNING";
}

const HEADER_EDITABLE: readonly JobStatus[] = [
  "DRAFT",
  "WAITING_ORIGIN",
  "WAITING_DESTINATION",
  "WEIGHT_REVIEW",
];

export function canEditHeader(status: JobStatus) {
  return HEADER_EDITABLE.includes(status);
}

export function canEditNote(status: JobStatus) {
  return status !== "CANCELLED";
}

export function canCancel(status: JobStatus, role: Role) {
  if (role !== "ADMIN" && role !== "TRANSPORT") return false;
  if (HEADER_EDITABLE.includes(status)) return true;
  return status === "WEIGHT_CONFIRMED" && role === "ADMIN";
}

export function canDelete(status: JobStatus, counts: { weighings: number; files: number }) {
  return status === "DRAFT" && counts.weighings === 0 && counts.files === 0;
}
