"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrors, runAction, RuleError, type ActionState } from "@/server/action";
import { createTransporterWithCrew, saveMaster, setTransporterActive } from "@/server/masters";
import { isMasterKind, MASTER_CONFIG, VEHICLE_TYPES } from "@/lib/masters";

function schemaFor(kind: keyof typeof MASTER_CONFIG) {
  const shape: Record<string, z.ZodType<string>> = {};
  for (const field of MASTER_CONFIG[kind].fields) {
    const max = field.name === "note" ? 2000 : field.type === "textarea" ? 500 : 200;
    const base = z.string().trim().max(max, `${field.label} ยาวเกิน ${max} ตัวอักษร`);
    shape[field.name] = field.required ? base.min(1, `กรอก${field.label}`) : base;
  }
  return z.object(shape);
}

export async function saveMasterAction(
  kind: string,
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction("master.manage", async (user) => {
    if (!isMasterKind(kind)) throw new RuleError("ไม่รู้จักข้อมูลหลักนี้");
    const raw: Record<string, string> = {};
    for (const field of MASTER_CONFIG[kind].fields) raw[field.name] = String(formData.get(field.name) ?? "");
    const parsed = schemaFor(kind).safeParse(raw);
    if (!parsed.success) return fieldErrors(parsed.error);

    const active = id ? formData.get("active") === "on" : true;
    await saveMaster(kind, id, parsed.data as Record<string, string>, active, user.id);
    revalidatePath(kind === "vehicles" || kind === "drivers" ? "/transport/masters/transporters" : `/transport/masters/${kind}`);
    return { ok: true, message: id ? "บันทึกการแก้ไขแล้ว" : "เพิ่มข้อมูลแล้ว" };
  });
}

const crewText = (label: string, max = 200) =>
  z.string().trim().max(max, `${label} ยาวเกิน ${max} ตัวอักษร`);

const transporterCrewSchema = z
  .object({
    name: crewText("ชื่อบริษัท / บุคคล").min(1, "กรอกชื่อบริษัท / บุคคล"),
    taxId: crewText("เลขประจำตัวผู้เสียภาษี"),
    phone: crewText("โทรศัพท์"),
    contactName: crewText("ผู้ติดต่อ"),
    address: crewText("ที่อยู่", 500),
    note: crewText("หมายเหตุ", 2000),
    plate: crewText("ทะเบียนรถ"),
    vehicleType: crewText("ประเภทรถ").refine(
      (value) => value === "" || (VEHICLE_TYPES as readonly string[]).includes(value),
      "เลือกประเภทรถ",
    ),
    driverName: crewText("ชื่อคนขับ"),
    driverPhone: crewText("โทรศัพท์คนขับ"),
    nationalId: crewText("เลขประจำตัว"),
  })
  .superRefine((value, ctx) => {
    if (value.vehicleType && !value.plate) {
      ctx.addIssue({ code: "custom", path: ["plate"], message: "กรอกทะเบียนรถ" });
    }
    if ((value.driverPhone || value.nationalId) && !value.driverName) {
      ctx.addIssue({ code: "custom", path: ["driverName"], message: "กรอกชื่อคนขับ" });
    }
  });

export async function setTransporterActiveAction(id: string, active: boolean): Promise<ActionState> {
  return runAction("master.manage", async (user) => {
    await setTransporterActive(id, active, user.id);
    revalidatePath("/transport/masters/transporters");
    return { ok: true, message: active ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว" };
  });
}

export async function createTransporterWithCrewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction("master.manage", async (user) => {
    const raw = Object.fromEntries(
      Object.keys(transporterCrewSchema.shape).map((name) => [name, String(formData.get(name) ?? "")]),
    );
    const parsed = transporterCrewSchema.safeParse(raw);
    if (!parsed.success) return fieldErrors(parsed.error);

    const { plate, vehicleType, driverName, driverPhone, nationalId, ...transporter } = parsed.data;
    await createTransporterWithCrew(
      {
        transporter,
        vehicle: plate ? { plate, vehicleType } : null,
        driver: driverName ? { name: driverName, phone: driverPhone, nationalId } : null,
      },
      user.id,
    );
    revalidatePath("/transport/masters/transporters");
    return { ok: true, message: "เพิ่มผู้รับจ้างแล้ว" };
  });
}
