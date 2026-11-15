"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROLES } from "@/domain/permissions";
import { fieldErrors, runAction, RuleError, type ActionState } from "@/server/action";
import { hashPassword } from "@/server/auth";
import { db } from "@/server/db";

const password = z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร");

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]{3,32}$/, "ใช้ a-z 0-9 . _ - ยาว 3–32 ตัว"),
  displayName: z.string().trim().min(1, "กรอกชื่อที่แสดง"),
  role: z.enum(ROLES, { message: "เลือกบทบาท" }),
  password,
});

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction("user.manage", async (user) => {
    const parsed = createSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    const { password: plain, ...data } = parsed.data;
    await db.user.create({
      data: {
        ...data,
        username: data.username.toLowerCase(),
        passwordHash: await hashPassword(plain),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    revalidatePath("/settings/users");
    return { ok: true, message: `สร้างผู้ใช้ ${data.username} แล้ว` };
  });
}

const updateSchema = z.object({
  displayName: z.string().trim().min(1, "กรอกชื่อที่แสดง"),
  role: z.enum(ROLES, { message: "เลือกบทบาท" }),
  active: z.literal("on").optional(),
  password: z.union([z.literal(""), password]),
});

export async function updateUserAction(
  userId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction("user.manage", async (admin) => {
    const parsed = updateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    const { displayName, role, active, password: plain } = parsed.data;

    if (userId === admin.id && (role !== "ADMIN" || !active)) {
      throw new RuleError("ห้ามลดสิทธิ์หรือปิดบัญชีของตัวเอง");
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          displayName,
          role,
          active: Boolean(active),
          updatedById: admin.id,
          ...(plain ? { passwordHash: await hashPassword(plain) } : {}),
        },
      });
      if (!active || plain) await tx.session.deleteMany({ where: { userId } });
    });

    revalidatePath("/settings/users");
    return { ok: true, message: "บันทึกแล้ว" };
  });
}
