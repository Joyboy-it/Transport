import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { detectFileType, MAX_FILE_BYTES } from "@/domain/file-type";
import { canRecordWeighing, type WeighingSide } from "@/domain/job-status";
import { can } from "@/domain/permissions";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { removeStoredFile, storeJobFile } from "@/server/storage";

const fail = (status: number, message: string) => NextResponse.json({ ok: false, message }, { status });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/jobs/[id]/files">) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "กรุณาเข้าสู่ระบบ");
  if (!can(user.role, "weighing.record")) return fail(403, "ไม่มีสิทธิ์แนบไฟล์ชั่งน้ำหนัก");

  const { id } = await ctx.params;
  const job = await db.transportJob.findUnique({
    where: { id },
    select: { id: true, jobNumber: true, status: true, _count: { select: { originWeighings: true } } },
  });
  if (!job) return fail(404, "ไม่พบใบงาน");

  const form = await request.formData().catch(() => null);
  const category = form?.get("category");
  const file = form?.get("file");
  if (category !== "ORIGIN" && category !== "DESTINATION") return fail(400, "ระบุประเภทไฟล์");
  if (!(file instanceof File) || file.size === 0) return fail(400, "เลือกไฟล์ที่จะแนบ");
  if (file.size > MAX_FILE_BYTES) return fail(413, "ไฟล์ใหญ่เกิน 10 MB");

  const side: WeighingSide = category;
  if (!canRecordWeighing(side, job.status, job._count.originWeighings > 0)) {
    return fail(409, side === "DESTINATION" ? "ต้องบันทึกน้ำหนักต้นทางก่อนแนบไฟล์ปลายทาง" : "ใบงานสถานะนี้แนบไฟล์ไม่ได้");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const type = detectFileType(file.name, data.subarray(0, 16));
  if (!type.ok) {
    return fail(415, type.reason === "TYPE" ? "รับเฉพาะ JPG, PNG, WEBP และ PDF" : "เนื้อไฟล์ไม่ตรงกับนามสกุล");
  }

  const relativePath = await storeJobFile(job.jobNumber, side, type.ext, data);
  try {
    const attachment = await db.attachment.create({
      data: {
        jobId: job.id,
        category: side,
        relativePath,
        originalName: path.basename(file.name).slice(0, 255),
        mimeType: type.mime,
        sizeBytes: file.size,
        uploadedById: user.id,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: attachment.id });
  } catch (error) {
    await removeStoredFile(relativePath).catch(() => {});
    throw error;
  }
}
