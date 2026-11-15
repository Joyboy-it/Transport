import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { can, type Action } from "@/domain/permissions";
import { ForbiddenError, requireUser, type CurrentUser } from "./auth";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

/** Thrown when the record changed since the form was opened. */
export class StaleError extends Error {
  constructor() {
    super("ข้อมูลนี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณาโหลดหน้าใหม่ก่อนบันทึก");
  }
}

/** A rule violation whose message is safe to show the user. */
export class RuleError extends Error {}

export async function runAction(
  action: Action | null,
  fn: (user: CurrentUser) => Promise<ActionState | void>,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (action && !can(user.role, action)) throw new ForbiddenError();
    return (await fn(user)) ?? { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ForbiddenError || error instanceof StaleError || error instanceof RuleError) {
      return { ok: false, message: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "มีข้อมูลนี้อยู่แล้ว (ห้ามซ้ำ)" };
    }
    console.error(error);
    return { ok: false, message: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export function fieldErrors(error: z.ZodError): ActionState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    errors[key] ??= issue.message;
  }
  return { ok: false, message: "กรุณาตรวจสอบข้อมูลที่กรอก", fieldErrors: errors };
}
