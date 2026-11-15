import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 8) {
    throw new Error("Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 8 characters in .env");
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (!existing) {
    await db.user.create({
      data: {
        username,
        displayName: "ผู้ดูแลระบบ",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    console.log(`Created admin user "${username}".`);
  } else {
    console.log(`Admin user "${username}" already exists; password left unchanged.`);
  }

  await db.companyProfile.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  await db.varianceThreshold.upsert({
    where: { id: 1 },
    create: { id: 1, maxVarianceKg: "100", maxVariancePercent: "1.00" },
    update: {},
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
