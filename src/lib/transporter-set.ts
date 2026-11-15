import { z } from "zod";
import { VEHICLE_TYPES } from "@/lib/masters";

const text = (max: number) => z.string().trim().max(max);

const schema = z
  .object({
    code: text(200).min(1, "กรอกรหัสผู้รับจ้าง"),
    name: text(200).min(1, "กรอกชื่อบริษัท / บุคคล"),
    taxId: text(200),
    phone: text(200),
    contactName: text(200),
    address: text(500),
    vehiclePlate: text(200),
    vehicleType: text(200).refine(
      (value) => value === "" || (VEHICLE_TYPES as readonly string[]).includes(value),
      "เลือกประเภทรถ",
    ),
    driverName: text(200),
    driverPhone: text(200),
    driverNationalId: text(200),
  })
  .superRefine((value, ctx) => {
    if (!value.vehiclePlate && value.vehicleType) {
      ctx.addIssue({ code: "custom", path: ["vehiclePlate"], message: "กรอกทะเบียนรถ" });
    }
    if (!value.driverName && (value.driverPhone || value.driverNationalId)) {
      ctx.addIssue({ code: "custom", path: ["driverName"], message: "กรอกชื่อคนขับ" });
    }
  });

export type TransporterSetInput = {
  transporter: {
    code: string;
    name: string;
    taxId: string;
    phone: string;
    contactName: string;
    address: string;
  };
  vehicle: { plate: string; vehicleType: string } | null;
  driver: { name: string; phone: string; nationalId: string } | null;
};

export function parseTransporterSet(
  raw: Record<string, string>,
): { ok: true } & TransporterSetInput | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const value = parsed.data;
  return {
    ok: true,
    transporter: {
      code: value.code,
      name: value.name,
      taxId: value.taxId,
      phone: value.phone,
      contactName: value.contactName,
      address: value.address,
    },
    vehicle: value.vehiclePlate ? { plate: value.vehiclePlate, vehicleType: value.vehicleType } : null,
    driver: value.driverName
      ? { name: value.driverName, phone: value.driverPhone, nationalId: value.driverNationalId }
      : null,
  };
}
