"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { jobHeaderSchema, reasonSchema, type JobHeaderInput } from "@/lib/job-schema";
import { fieldErrors, runAction, type ActionState } from "@/server/action";
import { cancelJob, createJob, deleteDraftJob, recordCollection, updateJobHeader, updateJobNote } from "@/server/jobs";
import { addDriverByName, addTransporterByName, addVehicleByPlate } from "@/server/masters";

export type QuickDriverResult =
  | { ok: true; driver: { id: string; name: string; transporterId: string } }
  | { ok: false; message: string };

type Quick<T> = { ok: true; row: T } | { ok: false; message: string };

async function quickAdd<T>(check: () => string | null, create: (userId: string) => Promise<T>): Promise<Quick<T>> {
  let row: T | null = null;
  const result = await runAction("master.manage", async (user) => {
    const problem = check();
    if (problem) return { ok: false, message: problem };
    row = await create(user.id);
    revalidatePath("/transport/masters/transporters");
  });
  if (row) return { ok: true, row };
  return { ok: false, message: result?.message ?? "เพิ่มข้อมูลไม่สำเร็จ" };
}

export async function addTransporterAction(name: string) {
  const trimmed = name.trim();
  return quickAdd(
    () => (!trimmed ? "กรอกชื่อผู้รับจ้าง" : trimmed.length > 200 ? "ชื่อผู้รับจ้างยาวเกิน 200 ตัวอักษร" : null),
    (userId) => addTransporterByName(trimmed, userId),
  );
}

export async function addVehicleAction(transporterId: string, plate: string) {
  const trimmed = plate.trim();
  return quickAdd(
    () =>
      !transporterId
        ? "เลือกผู้รับจ้างก่อนเพิ่มรถ"
        : !trimmed
          ? "กรอกทะเบียนรถ"
          : trimmed.length > 200
            ? "ทะเบียนรถยาวเกิน 200 ตัวอักษร"
            : null,
    (userId) => addVehicleByPlate(transporterId, trimmed, userId),
  );
}

export async function addDriverAction(transporterId: string, name: string): Promise<QuickDriverResult> {
  let driver: { id: string; name: string; transporterId: string } | null = null;
  const result = await runAction("master.manage", async (user) => {
    const trimmed = name.trim();
    if (!transporterId) return { ok: false, message: "เลือกผู้รับจ้างก่อนเพิ่มคนขับ" };
    if (!trimmed) return { ok: false, message: "กรอกชื่อคนขับ" };
    if (trimmed.length > 200) return { ok: false, message: "ชื่อคนขับยาวเกิน 200 ตัวอักษร" };
    driver = await addDriverByName(transporterId, trimmed, user.id);
    revalidatePath("/transport/masters/transporters");
  });
  if (driver) return { ok: true, driver };
  return { ok: false, message: result?.message ?? "เพิ่มคนขับไม่สำเร็จ" };
}

export async function createJobAction(input: JobHeaderInput, issue: boolean): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction("job.create", async (user) => {
    const parsed = jobHeaderSchema.safeParse(input);
    if (!parsed.success) return fieldErrors(parsed.error);
    const job = await createJob(user, parsed.data, issue);
    createdId = job.id;
  });
  if (createdId) {
    revalidatePath("/transport/jobs");
    redirect(`/transport/jobs/${createdId}`);
  }
  return result;
}

export async function updateJobHeaderAction(
  jobId: string,
  expectedUpdatedAt: string,
  input: JobHeaderInput,
  issue: boolean,
): Promise<ActionState> {
  return runAction("job.editHeader", async (user) => {
    const parsed = jobHeaderSchema.safeParse(input);
    if (!parsed.success) return fieldErrors(parsed.error);
    await updateJobHeader(user, jobId, parsed.data, expectedUpdatedAt, issue);
    revalidatePath(`/transport/jobs/${jobId}`);
    return { ok: true, message: issue ? "ออกใบงานแล้ว รอชั่งต้นทาง" : "บันทึกหัวใบงานแล้ว" };
  });
}

export async function updateNoteAction(
  jobId: string,
  expectedUpdatedAt: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction("job.editNote", async (user) => {
    const note = z.string().max(2000, "หมายเหตุยาวเกิน 2000 ตัวอักษร").safeParse(formData.get("note") ?? "");
    if (!note.success) return fieldErrors(note.error);
    await updateJobNote(user, jobId, note.data, expectedUpdatedAt);
    revalidatePath(`/transport/jobs/${jobId}`);
    return { ok: true, message: "บันทึกหมายเหตุแล้ว" };
  });
}

export async function recordCollectionAction(
  jobId: string,
  expectedUpdatedAt: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction("job.recordCollection", async (user) => {
    const amount = jobHeaderSchema.shape.collectAmount.safeParse(String(formData.get("collectAmount") ?? ""));
    if (!amount.success) return fieldErrors(amount.error);
    const intent = String(formData.get("intent") ?? "save");
    const received = intent === "receive" ? true : intent === "unreceive" ? false : formData.get("wasReceived") === "1";
    await recordCollection(user, jobId, expectedUpdatedAt, amount.data, received);
    revalidatePath(`/transport/jobs/${jobId}`);
    revalidatePath("/transport/jobs");
    return { ok: true, message: received ? "บันทึกว่ารับเงินแล้ว" : "บันทึกเงินเก็บจากปลายทางแล้ว" };
  });
}

export async function cancelJobAction(
  jobId: string,
  expectedUpdatedAt: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction("job.cancel", async (user) => {
    const reason = z.object({ reason: reasonSchema }).safeParse({ reason: formData.get("reason") ?? "" });
    if (!reason.success) return fieldErrors(reason.error);
    await cancelJob(user, jobId, reason.data.reason, expectedUpdatedAt);
    revalidatePath(`/transport/jobs/${jobId}`);
    revalidatePath("/transport/jobs");
    return { ok: true, message: "ยกเลิกใบงานแล้ว" };
  });
}

export async function deleteDraftAction(jobId: string): Promise<ActionState> {
  let deleted = false;
  const result = await runAction("job.delete", async () => {
    await deleteDraftJob(jobId);
    deleted = true;
  });
  if (deleted) {
    revalidatePath("/transport/jobs");
    redirect("/transport/jobs");
  }
  return result;
}
