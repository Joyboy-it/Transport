import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { MASTER_CONFIG, type MasterKind, type MasterRow } from "@/lib/masters";
import { nextTransporterCode } from "@/lib/transporter-code";
import { RuleError } from "./action";
import { db } from "./db";

type Values = Record<string, string>;

function pick(kind: MasterKind, row: Record<string, unknown>): Values {
  const values: Values = {};
  for (const field of MASTER_CONFIG[kind].fields) values[field.name] = String(row[field.name] ?? "");
  return values;
}

export async function listMaster(kind: MasterKind): Promise<MasterRow[]> {
  const order = [{ active: "desc" as const }];
  switch (kind) {
    case "transporters": {
      const rows = await db.transporter.findMany({ orderBy: [...order, { code: "asc" }] });
      return rows.map((r) => ({ id: r.id, active: r.active, values: pick(kind, r), display: {} }));
    }
    case "vehicles": {
      const rows = await db.vehicle.findMany({
        include: { transporter: true },
        orderBy: [...order, { plate: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        active: r.active,
        values: pick(kind, r),
        display: { transporterId: r.transporter.name },
      }));
    }
    case "drivers": {
      const rows = await db.driver.findMany({
        include: { transporter: true },
        orderBy: [...order, { name: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        active: r.active,
        values: pick(kind, r),
        display: { transporterId: r.transporter.name },
      }));
    }
    case "origins":
    case "factories":
    case "commodities": {
      const rows = await simpleDelegate(kind).findMany({ orderBy: [...order, { name: "asc" }] });
      return rows.map((r) => ({ id: r.id, active: r.active, values: pick(kind, r), display: {} }));
    }
  }
}

function simpleDelegate(kind: "origins" | "factories" | "commodities") {
  // The three delegates share a shape; the cast keeps one code path for them.
  const delegates = { origins: db.origin, factories: db.destinationFactory, commodities: db.commodity };
  return delegates[kind] as unknown as typeof db.origin;
}

export async function saveMaster(
  kind: MasterKind,
  id: string | null,
  values: Values,
  active: boolean,
  userId: string,
) {
  const audit = id ? { updatedById: userId } : { createdById: userId, updatedById: userId };

  if (kind === "vehicles" || kind === "drivers") {
    if (!values.transporterId) throw new RuleError("คนขับและรถต้องสังกัดผู้รับจ้าง");
    const exists = await db.transporter.findUnique({ where: { id: values.transporterId } });
    if (!exists) throw new RuleError("ไม่พบผู้รับจ้างที่เลือก");
  }

  switch (kind) {
    case "transporters": {
      const data = {
        code: values.code,
        name: values.name,
        taxId: values.taxId,
        phone: values.phone,
        contactName: values.contactName,
        address: values.address,
        note: values.note,
        active,
        ...audit,
      };
      return id
        ? db.transporter.update({ where: { id }, data })
        : db.transporter.create({ data });
    }
    case "vehicles": {
      const data = {
        plate: values.plate,
        vehicleType: values.vehicleType,
        transporterId: values.transporterId,
        active,
        ...audit,
      };
      return id ? db.vehicle.update({ where: { id }, data }) : db.vehicle.create({ data });
    }
    case "drivers": {
      const data = {
        name: values.name,
        phone: values.phone,
        nationalId: values.nationalId,
        transporterId: values.transporterId,
        active,
        ...audit,
      };
      return id ? db.driver.update({ where: { id }, data }) : db.driver.create({ data });
    }
    case "origins":
    case "factories":
    case "commodities": {
      const data = { name: values.name, active, ...audit };
      const delegate = simpleDelegate(kind);
      return id ? delegate.update({ where: { id }, data }) : delegate.create({ data });
    }
  }
}

/** Creates a transporter and, when provided, its first vehicle and driver together. */
export async function createTransporterWithCrew(
  input: {
    transporter: Values;
    vehicle: { plate: string; vehicleType: string } | null;
    driver: { name: string; phone: string; nationalId: string } | null;
  },
  userId: string,
) {
  const audit = { createdById: userId, updatedById: userId };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.transporter.findMany({ select: { code: true } });
        const transporter = await tx.transporter.create({
          data: {
            code: nextTransporterCode(existing.map((row) => row.code)),
            name: input.transporter.name,
            taxId: input.transporter.taxId,
            phone: input.transporter.phone,
            contactName: input.transporter.contactName,
            address: input.transporter.address,
            note: input.transporter.note,
            ...audit,
          },
        });
        if (input.vehicle) {
          await tx.vehicle.create({
            data: {
              plate: input.vehicle.plate,
              vehicleType: input.vehicle.vehicleType,
              transporterId: transporter.id,
              ...audit,
            },
          });
        }
        if (input.driver) {
          await tx.driver.create({
            data: {
              name: input.driver.name,
              phone: input.driver.phone,
              nationalId: input.driver.nationalId,
              transporterId: transporter.id,
              ...audit,
            },
          });
        }
        return transporter;
      });
    } catch (error) {
      const target = error instanceof Prisma.PrismaClientKnownRequestError ? String(error.meta?.target ?? "") : "";
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && target.includes("code")) {
        continue;
      }
      throw error;
    }
  }
  throw new RuleError("ออกเลขรหัสผู้รับจ้างไม่สำเร็จ กรุณาลองใหม่");
}

/** Adds a transporter by name only, reusing an existing one with that name. */
export async function addTransporterByName(name: string, userId: string) {
  const existing = await db.transporter.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, code: true, name: true, active: true },
  });
  if (existing) {
    if (!existing.active) await db.transporter.update({ where: { id: existing.id }, data: { active: true, updatedById: userId } });
    return { id: existing.id, code: existing.code, name: existing.name };
  }
  const empty = { taxId: "", phone: "", contactName: "", address: "", note: "" };
  const created = await createTransporterWithCrew({ transporter: { name, ...empty }, vehicle: null, driver: null }, userId);
  return { id: created.id, code: created.code, name: created.name };
}

/** Adds a vehicle by plate only under the given company. Plates are unique across companies. */
export async function addVehicleByPlate(transporterId: string, plate: string, userId: string) {
  const existing = await db.vehicle.findFirst({
    where: { plate: { equals: plate, mode: "insensitive" } },
    select: { id: true, plate: true, vehicleType: true, transporterId: true, active: true },
  });
  if (existing) {
    if (existing.transporterId !== transporterId) throw new RuleError(`ทะเบียน ${existing.plate} สังกัดผู้รับจ้างรายอื่นอยู่แล้ว`);
    if (!existing.active) await db.vehicle.update({ where: { id: existing.id }, data: { active: true, updatedById: userId } });
    return { id: existing.id, plate: existing.plate, vehicleType: existing.vehicleType, transporterId };
  }
  const vehicle = await saveMaster("vehicles", null, { plate, vehicleType: "", transporterId }, true, userId);
  return { id: vehicle.id, plate, vehicleType: "", transporterId };
}

/** Adds a driver by name only, reusing an existing driver of the same company with that name. */
export async function addDriverByName(transporterId: string, name: string, userId: string) {
  const existing = await db.driver.findFirst({
    where: { transporterId, name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true, transporterId: true, active: true },
  });
  if (existing) {
    if (!existing.active) await db.driver.update({ where: { id: existing.id }, data: { active: true, updatedById: userId } });
    return { id: existing.id, name: existing.name, transporterId: existing.transporterId };
  }
  const driver = await saveMaster("drivers", null, { name, phone: "", nationalId: "", transporterId }, true, userId);
  return { id: driver.id, name, transporterId };
}

export async function setTransporterActive(id: string, active: boolean, userId: string) {
  const row = await db.transporter.findUnique({ where: { id } });
  if (!row) throw new RuleError("ไม่พบผู้รับจ้าง");
  await db.transporter.update({ where: { id }, data: { active, updatedById: userId } });
}

export async function transporterOptions(includeId?: string | null) {
  return db.transporter.findMany({
    where: includeId ? { OR: [{ active: true }, { id: includeId }] } : { active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}
