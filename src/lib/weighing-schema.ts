import { z } from "zod";
import { computeWeighing, WEIGHING_ERROR_TEXT } from "@/domain/weight";

export const weighingSchema = z
  .object({
    commodityId: z.string().min(1, "เลือกประเภทสินค้า"),
    weighedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "ระบุวันที่และเวลาชั่ง"),
    ticketNumber: z.string().trim().max(50, "เลขที่ใบชั่งยาวเกิน 50 ตัวอักษร"),
    gross: z.string(),
    tare: z.string(),
    impurity: z.string(),
    reason: z.string().trim().max(500, "เหตุผลยาวเกิน 500 ตัวอักษร"),
  })
  .superRefine((value, ctx) => {
    const result = computeWeighing({
      gross: value.gross,
      tare: value.tare,
      impurity: value.impurity === "" ? "0" : value.impurity,
    });
    if (!result.ok) {
      for (const error of result.errors) {
        ctx.addIssue({ code: "custom", path: [error.field], message: WEIGHING_ERROR_TEXT[error.code] });
      }
    }
  });

export type WeighingFormInput = z.infer<typeof weighingSchema>;
