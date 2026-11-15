export const ROLES = ["ADMIN", "TRANSPORT", "WEIGHING", "ACCOUNTING", "APPROVER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  TRANSPORT: "ฝ่ายขนส่ง",
  WEIGHING: "ฝ่ายชั่งน้ำหนัก",
  ACCOUNTING: "ฝ่ายบัญชี",
  APPROVER: "ผู้อนุมัติ",
  VIEWER: "ผู้ดูข้อมูล",
};

export type Action =
  | "job.read"
  | "job.viewFreight"
  | "job.create"
  | "job.editHeader"
  | "job.editNote"
  | "job.recordCollection"
  | "job.cancel"
  | "job.delete"
  | "weighing.record"
  | "reconciliation.confirm"
  | "file.read"
  | "master.manage"
  | "settings.manage"
  | "user.manage";

const EVERYONE: readonly Role[] = ROLES;
const JOB_OWNERS: readonly Role[] = ["ADMIN", "TRANSPORT"];

const MATRIX: Record<Action, readonly Role[]> = {
  "job.read": EVERYONE,
  "job.viewFreight": ["ADMIN", "TRANSPORT", "ACCOUNTING", "APPROVER", "VIEWER"],
  "job.create": JOB_OWNERS,
  "job.editHeader": JOB_OWNERS,
  "job.editNote": JOB_OWNERS,
  "job.recordCollection": ["ADMIN", "TRANSPORT", "ACCOUNTING"],
  "job.cancel": JOB_OWNERS,
  "job.delete": JOB_OWNERS,
  "weighing.record": ["ADMIN", "WEIGHING"],
  "reconciliation.confirm": ["ADMIN", "APPROVER"],
  "file.read": EVERYONE,
  "master.manage": JOB_OWNERS,
  "settings.manage": ["ADMIN"],
  "user.manage": ["ADMIN"],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[action].includes(role);
}
