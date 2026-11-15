import { NextResponse, type NextRequest } from "next/server";
import { can } from "@/domain/permissions";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { readStoredFile } from "@/server/storage";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("กรุณาเข้าสู่ระบบ", { status: 401 });
  if (!can(user.role, "file.read")) return new NextResponse("ไม่มีสิทธิ์", { status: 403 });

  const { id } = await ctx.params;
  const attachment = await db.attachment.findUnique({ where: { id } });
  if (!attachment) return new NextResponse("ไม่พบไฟล์", { status: 404 });

  const data = await readStoredFile(attachment.relativePath).catch(() => null);
  if (!data) return new NextResponse("ไฟล์หายจากที่จัดเก็บ", { status: 410 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
