import { z } from "zod";
import { normalizeMoney } from "@/lib/money-input";

const id = z.string().trim().max(50);

function money() {
  return z.string().transform((value) => normalizeMoney(value));
}

export const jobHeaderSchema = z.object({
  hireDate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "วันที่ไม่ถูกต้อง"),
  transporterId: id,
  vehicleId: id,
  driverId: id,
  commodityId: id,
  originId: id,
  destinationFactoryId: id,
  responsibleUserId: id,
  freightAmount: money(),
  collectAmount: money(),
  note: z.string().max(2000, "หมายเหตุยาวเกิน 2000 ตัวอักษร"),
});

export type JobHeaderInput = z.infer<typeof jobHeaderSchema>;

export const EMPTY_JOB_HEADER: JobHeaderInput = {
  hireDate: "",
  transporterId: "",
  vehicleId: "",
  driverId: "",
  commodityId: "",
  originId: "",
  destinationFactoryId: "",
  responsibleUserId: "",
  freightAmount: "",
  collectAmount: "",
  note: "",
};

export const reasonSchema = z.string().trim().min(3, "ระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500);
