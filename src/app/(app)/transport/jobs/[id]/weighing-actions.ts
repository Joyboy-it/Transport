"use server";

import { revalidatePath } from "next/cache";
import type { WeighingSide } from "@/domain/job-status";
import { weighingSchema, type WeighingFormInput } from "@/lib/weighing-schema";
import { fieldErrors, runAction, RuleError, type ActionState } from "@/server/action";
import { confirmWarning, deleteWeighing, saveWeighing } from "@/server/weighing";

function assertSide(side: WeighingSide) {
  if (side !== "ORIGIN" && side !== "DESTINATION") throw new RuleError("ไม่รู้จักฝั่งการชั่ง");
}

function revalidateJob(jobId: string) {
  revalidatePath(`/transport/jobs/${jobId}`);
  revalidatePath("/transport/jobs");
}

export async function saveWeighingAction(
  jobId: string,
  side: WeighingSide,
  lineId: string,
  expectedUpdatedAt: string,
  input: WeighingFormInput,
): Promise<ActionState> {
  return runAction("weighing.record", async (user) => {
    assertSide(side);
    const parsed = weighingSchema.safeParse(input);
    if (!parsed.success) return fieldErrors(parsed.error);
    await saveWeighing(user, jobId, side, lineId, parsed.data, expectedUpdatedAt);
    revalidateJob(jobId);
    return { ok: true, message: side === "ORIGIN" ? "บันทึกน้ำหนักต้นทางแล้ว" : "บันทึกน้ำหนักปลายทางแล้ว" };
  });
}

export async function deleteWeighingAction(
  jobId: string,
  side: WeighingSide,
  lineId: string,
  expectedUpdatedAt: string,
  reason: string,
): Promise<ActionState> {
  return runAction("weighing.record", async (user) => {
    assertSide(side);
    const trimmed = String(reason ?? "").trim();
    if (trimmed.length > 500) throw new RuleError("เหตุผลยาวเกิน 500 ตัวอักษร");
    await deleteWeighing(user, jobId, side, lineId, expectedUpdatedAt, trimmed);
    revalidateJob(jobId);
    return { ok: true, message: "ลบรายการชั่งแล้ว" };
  });
}

export async function confirmWarningAction(jobId: string, expectedJobUpdatedAt: string): Promise<ActionState> {
  return runAction("reconciliation.confirm", async (user) => {
    await confirmWarning(user, jobId, expectedJobUpdatedAt);
    revalidatePath(`/transport/jobs/${jobId}`);
    return { ok: true, message: "ยืนยันส่วนต่างน้ำหนักแล้ว" };
  });
}
