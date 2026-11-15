"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseAmount } from "@/domain/decimal";
import { fieldErrors, runAction, type ActionState } from "@/server/action";
import { db } from "@/server/db";

const companySchema = z.object({
  name: z.string().trim().max(200),
  address: z.string().trim().max(500),
  taxId: z.string().trim().max(20),
  phone: z.string().trim().max(50),
});

export async function saveCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction("settings.manage", async (user) => {
    const parsed = companySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    await db.companyProfile.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data, updatedById: user.id },
      update: { ...parsed.data, updatedById: user.id },
    });
    revalidatePath("/settings");
    return { ok: true, message: "บันทึกข้อมูลบริษัทแล้ว" };
  });
}

const amount = (label: string, max: number) =>
  z.string().transform((value, ctx) => {
    const parsed = parseAmount(value);
    if (!parsed || parsed.isNegative() || parsed.greaterThan(max)) {
      ctx.addIssue({ code: "custom", message: `${label} ต้องเป็นตัวเลข 0–${max} ทศนิยมไม่เกิน 2 ตำแหน่ง` });
      return z.NEVER;
    }
    return parsed.toFixed(2);
  });

const thresholdSchema = z.object({
  maxVarianceKg: amount("กิโลกรัม", 999_999),
  maxVariancePercent: amount("เปอร์เซ็นต์", 100),
});

export async function saveThresholdsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction("settings.manage", async (user) => {
    const parsed = thresholdSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    await db.varianceThreshold.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data, updatedById: user.id },
      update: { ...parsed.data, updatedById: user.id },
    });
    revalidatePath("/settings");
    return { ok: true, message: "บันทึกเกณฑ์แล้ว มีผลกับการบันทึกน้ำหนักครั้งถัดไป ใบงานเดิมไม่เปลี่ยน" };
  });
}
