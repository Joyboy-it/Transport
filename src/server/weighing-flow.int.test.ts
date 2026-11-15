import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { WeighingFormInput } from "@/lib/weighing-schema";
import { StaleError } from "./action";
import type { CurrentUser } from "./auth";
import { db } from "./db";
import { cancelJob, createJob, updateJobHeader } from "./jobs";
import { confirmWarning, deleteWeighing, saveWeighing } from "./weighing";

let admin: CurrentUser;
let transport: CurrentUser;
let refs: Record<string, string>;

const weigh = (gross: string, tare: string, extra: Partial<WeighingFormInput> = {}): WeighingFormInput => ({
  commodityId: refs.commodityId,
  weighedAt: "2026-11-06T09:30",
  ticketNumber: "T-1",
  gross,
  tare,
  impurity: "0",
  reason: "",
  ...extra,
});

async function issuedJob() {
  const job = await createJob(
    transport,
    {
      hireDate: "2026-11-06",
      transporterId: refs.transporterId,
      vehicleId: refs.vehicleId,
      driverId: refs.driverId,
      commodityId: refs.commodityId,
      originId: refs.originId,
      destinationFactoryId: refs.factoryId,
      responsibleUserId: transport.id,
      freightAmount: "3500",
      collectAmount: "",
      note: "",
    },
    true,
  );
  return job.id;
}

const load = (id: string) =>
  db.transportJob.findUniqueOrThrow({
    where: { id },
    include: {
      originWeighings: { orderBy: { createdAt: "asc" } },
      destinationWeighings: { orderBy: { createdAt: "asc" } },
      weighingRevisions: true,
    },
  });

async function weighBoth(id: string, origin: [string, string], destination: [string, string]) {
  await saveWeighing(admin, id, "ORIGIN", "", weigh(...origin), "");
  await saveWeighing(admin, id, "DESTINATION", "", weigh(...destination, { ticketNumber: "F-9" }), "");
  return load(id);
}

beforeAll(async () => {
  await db.$executeRawUnsafe(
    `TRUNCATE "Attachment","WeighingRevision","OriginWeighing","DestinationWeighing","TransportJob","DocumentSequence","Vehicle","Driver","Transporter","Origin","DestinationFactory","Commodity","Session","User","VarianceThreshold" CASCADE`,
  );
  const mk = async (username: string, role: CurrentUser["role"]) => {
    const u = await db.user.create({ data: { username, displayName: username, role, passwordHash: "x" } });
    return { id: u.id, username, displayName: username, role };
  };
  admin = await mk("admin", "ADMIN");
  transport = await mk("transport", "TRANSPORT");
  const transporter = await db.transporter.create({ data: { code: "T01", name: "สมชายขนส่ง" } });
  const other = await db.transporter.create({ data: { code: "T02", name: "อื่น" } });
  refs = {
    transporterId: transporter.id,
    otherTransporterId: other.id,
    vehicleId: (await db.vehicle.create({ data: { plate: "กท-1234", transporterId: transporter.id } })).id,
    driverId: (await db.driver.create({ data: { name: "สมศักดิ์", transporterId: transporter.id } })).id,
    commodityId: (await db.commodity.create({ data: { name: "มันสำปะหลัง" } })).id,
    secondCommodityId: (await db.commodity.create({ data: { name: "ข้าวโพด" } })).id,
    originId: (await db.origin.create({ data: { name: "ลาน A" } })).id,
    factoryId: (await db.destinationFactory.create({ data: { name: "โรงงาน B" } })).id,
  };
});

beforeEach(async () => {
  await db.varianceThreshold.upsert({
    where: { id: 1 },
    create: { id: 1, maxVarianceKg: "100", maxVariancePercent: "1.00" },
    update: { maxVarianceKg: "100", maxVariancePercent: "1.00" },
  });
});

afterAll(() => db.$disconnect());

describe("job numbers", () => {
  it("never repeats under concurrent creation", async () => {
    const ids = await Promise.all(Array.from({ length: 20 }, () => issuedJob()));
    const jobs = await db.transportJob.findMany({ where: { id: { in: ids } }, select: { jobNumber: true } });
    const numbers = jobs.map((j) => j.jobNumber);
    expect(new Set(numbers).size).toBe(20);
    expect(numbers.every((n) => /^JOB-\d{4}-\d{5}$/.test(n))).toBe(true);
  });
});

describe("weighing flow", () => {
  it("keeps origin and destination separate and flags the spec example", async () => {
    const id = await issuedJob();
    await saveWeighing(admin, id, "ORIGIN", "", weigh("25000", "10000"), "");
    let job = await load(id);
    expect(job.status).toBe("WAITING_DESTINATION");
    expect(job.reconciliationStatus).toBeNull();

    await saveWeighing(admin, id, "DESTINATION", "", weigh("24800", "10000", { ticketNumber: "F-9" }), "");
    job = await load(id);
    expect(job.originWeighings[0].net.toFixed(2)).toBe("15000.00");
    expect(job.destinationWeighings[0].net.toFixed(2)).toBe("14800.00");
    expect(job.originWeighings[0].ticketNumber).toBe("T-1");
    expect(job.destinationWeighings[0].ticketNumber).toBe("F-9");
    expect(job.variance?.toFixed(2)).toBe("200.00");
    expect(job.variancePercent?.toFixed(2)).toBe("1.33");
    expect(job.reconciliationStatus).toBe("WARNING");
    expect(job.status).toBe("WEIGHT_REVIEW");

    await confirmWarning(admin, id, job.updatedAt.toISOString());
    job = await load(id);
    expect(job.status).toBe("WEIGHT_CONFIRMED");
    expect(job.reconciliationStatus).toBe("CONFIRMED");
    expect(job.confirmedById).toBe(admin.id);
  });

  it("auto-confirms NORMAL and MATCH without an approver", async () => {
    const normal = await weighBoth(await issuedJob(), ["25000", "10000"], ["24950", "10000"]);
    expect([normal.reconciliationStatus, normal.status]).toEqual(["NORMAL", "WEIGHT_CONFIRMED"]);
    const match = await weighBoth(await issuedJob(), ["25000", "10000"], ["25000", "10000"]);
    expect([match.reconciliationStatus, match.status]).toEqual(["MATCH", "WEIGHT_CONFIRMED"]);
  });

  it("requires destination after origin and a reason after confirmation", async () => {
    const id = await issuedJob();
    await expect(saveWeighing(admin, id, "DESTINATION", "", weigh("2", "1"), "")).rejects.toThrow("ต้นทางก่อน");

    const job = await weighBoth(id, ["25000", "10000"], ["24950", "10000"]);
    const line = job.destinationWeighings[0];
    const stamp = line.updatedAt.toISOString();
    await expect(
      saveWeighing(admin, id, "DESTINATION", line.id, weigh("24700", "10000"), stamp),
    ).rejects.toThrow("เหตุผล");

    await saveWeighing(
      admin,
      id,
      "DESTINATION",
      line.id,
      weigh("24700", "10000", { reason: "ใบชั่งโรงงานพิมพ์ผิด" }),
      stamp,
    );
    const after = await load(id);
    expect(after.status).toBe("WEIGHT_REVIEW");
    expect(after.reconciliationStatus).toBe("WARNING");
    expect(after.weighingRevisions).toHaveLength(1);
    expect(after.weighingRevisions[0].net.toFixed(2)).toBe("14950.00");
    expect(after.weighingRevisions[0].reason).toBe("ใบชั่งโรงงานพิมพ์ผิด");
  });

  it("rejects a save based on stale data and a second line for the same commodity", async () => {
    const id = await issuedJob();
    await saveWeighing(admin, id, "ORIGIN", "", weigh("25000", "10000"), "");
    const lineId = (await load(id)).originWeighings[0].id;
    await expect(saveWeighing(admin, id, "ORIGIN", "", weigh("25001", "10000"), "")).rejects.toThrow("อยู่แล้ว");
    await expect(
      saveWeighing(admin, id, "ORIGIN", lineId, weigh("25001", "10000"), "2000-01-01T00:00:00.000Z"),
    ).rejects.toBeInstanceOf(StaleError);
    await expect(
      deleteWeighing(admin, id, "ORIGIN", lineId, "2000-01-01T00:00:00.000Z", ""),
    ).rejects.toBeInstanceOf(StaleError);
  });

  it("compares each commodity separately and flags the job when any line exceeds the limit", async () => {
    const id = await issuedJob();
    const corn = refs.secondCommodityId;
    await saveWeighing(admin, id, "ORIGIN", "", weigh("25000", "10000"), "");
    await saveWeighing(admin, id, "ORIGIN", "", weigh("15000", "10000", { commodityId: corn, ticketNumber: "T-2" }), "");
    await saveWeighing(admin, id, "DESTINATION", "", weigh("24950", "10000"), "");
    let job = await load(id);
    expect(job.status).toBe("WAITING_DESTINATION");
    expect(job.reconciliationStatus).toBeNull();

    await saveWeighing(admin, id, "DESTINATION", "", weigh("14900", "10000", { commodityId: corn }), "");
    job = await load(id);
    // Rice is 50 kg off (NORMAL) and corn 100 kg of 5000 (2%, WARNING); totals are 150 kg of 20000 (0.75%).
    expect(job.variance?.toFixed(2)).toBe("150.00");
    expect(job.variancePercent?.toFixed(2)).toBe("0.75");
    expect([job.reconciliationStatus, job.status]).toEqual(["WARNING", "WEIGHT_REVIEW"]);
  });

  it("only weighs destination commodities that the origin has", async () => {
    const id = await issuedJob();
    await saveWeighing(admin, id, "ORIGIN", "", weigh("25000", "10000"), "");
    await expect(
      saveWeighing(admin, id, "DESTINATION", "", weigh("2", "1", { commodityId: refs.secondCommodityId }), ""),
    ).rejects.toThrow("ต้นทางยังไม่มี");
  });

  it("recomputes after deleting a line and needs a reason once confirmed", async () => {
    const id = await issuedJob();
    const corn = refs.secondCommodityId;
    await saveWeighing(admin, id, "ORIGIN", "", weigh("25000", "10000"), "");
    await saveWeighing(admin, id, "ORIGIN", "", weigh("15000", "10000", { commodityId: corn }), "");
    await saveWeighing(admin, id, "DESTINATION", "", weigh("25000", "10000"), "");
    let job = await load(id);
    expect(job.status).toBe("WAITING_DESTINATION");

    const cornLine = job.originWeighings.find((w) => w.commodityId === corn)!;
    await deleteWeighing(admin, id, "ORIGIN", cornLine.id, cornLine.updatedAt.toISOString(), "");
    job = await load(id);
    expect([job.reconciliationStatus, job.status]).toEqual(["MATCH", "WEIGHT_CONFIRMED"]);
    expect(job.weighingRevisions).toHaveLength(0);

    const dest = job.destinationWeighings[0];
    await expect(
      deleteWeighing(admin, id, "DESTINATION", dest.id, dest.updatedAt.toISOString(), ""),
    ).rejects.toThrow("เหตุผล");
    await deleteWeighing(admin, id, "DESTINATION", dest.id, dest.updatedAt.toISOString(), "ชั่งซ้ำผิดคัน");
    job = await load(id);
    expect([job.reconciliationStatus, job.status, job.variance]).toEqual([null, "WAITING_DESTINATION", null]);
    expect(job.weighingRevisions).toMatchObject([{ side: "DESTINATION", removed: true, reason: "ชั่งซ้ำผิดคัน" }]);
  });

  it("does not re-judge old jobs when thresholds change", async () => {
    const job = await weighBoth(await issuedJob(), ["25000", "10000"], ["24950", "10000"]);
    await db.varianceThreshold.update({ where: { id: 1 }, data: { maxVarianceKg: "10" } });
    const later = await load(job.id);
    expect([later.reconciliationStatus, later.status]).toEqual(["NORMAL", "WEIGHT_CONFIRMED"]);
  });
});

describe("header and cancel rules", () => {
  it("locks the header after confirmation and limits cancel to admin", async () => {
    const job = await weighBoth(await issuedJob(), ["25000", "10000"], ["25000", "10000"]);
    const header = {
      hireDate: "2026-11-06",
      transporterId: refs.transporterId,
      vehicleId: refs.vehicleId,
      driverId: refs.driverId,
      commodityId: refs.commodityId,
      originId: refs.originId,
      destinationFactoryId: refs.factoryId,
      responsibleUserId: transport.id,
      freightAmount: "9999",
      collectAmount: "",
      note: "",
    };
    await expect(
      updateJobHeader(transport, job.id, header, job.updatedAt.toISOString(), false),
    ).rejects.toThrow("แก้หัวใบงานไม่ได้");
    await expect(cancelJob(transport, job.id, "ไม่ใช้แล้ว", job.updatedAt.toISOString())).rejects.toThrow(
      "ผู้ดูแลระบบ",
    );
    await cancelJob(admin, job.id, "ลูกค้ายกเลิก", job.updatedAt.toISOString());
    expect((await load(job.id)).status).toBe("CANCELLED");
  });

  it("rejects a vehicle that belongs to another transporter", async () => {
    const id = await issuedJob();
    const job = await load(id);
    await expect(
      updateJobHeader(
        transport,
        id,
        {
          hireDate: "2026-11-06",
          transporterId: refs.otherTransporterId,
          vehicleId: refs.vehicleId,
          driverId: refs.driverId,
          commodityId: refs.commodityId,
          originId: refs.originId,
          destinationFactoryId: refs.factoryId,
          responsibleUserId: transport.id,
          freightAmount: "1",
          collectAmount: "",
          note: "",
        },
        job.updatedAt.toISOString(),
        false,
      ),
    ).rejects.toThrow("ไม่ได้สังกัด");
  });
});
