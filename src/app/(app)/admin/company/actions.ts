"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
    revalidatePath("/admin/company");
    return { ok: true, message: "บันทึกข้อมูลบริษัทแล้ว" };
  });
}
