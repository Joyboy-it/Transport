import { z } from "zod";
import { parseAmount } from "@/domain/decimal";

const id = z.string().trim().max(50);

function money(label: string) {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") return true;
      const amount = parseAmount(value);
      return amount !== null && !amount.isNegative() && amount.abs().lessThan(1e12);
    }, `${label}ต้องเป็นตัวเลขไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง`);
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
  freightAmount: money("ค่าจ้าง"),
  collectAmount: money("เงินเก็บจากปลายทาง"),
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
