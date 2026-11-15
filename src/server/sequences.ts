import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { bangkokYear, formatJobNumber } from "@/domain/job-number";

/**
 * Allocates the next job number inside the caller's transaction.
 * The upsert takes a row lock on the year's sequence, so concurrent creators queue
 * on it and a rolled-back job gives its number back.
 */
export async function nextJobNumber(tx: Prisma.TransactionClient, now = new Date()) {
  const year = bangkokYear(now);
  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "DocumentSequence" ("prefix", "year", "lastNumber")
    VALUES ('JOB', ${year}, 1)
    ON CONFLICT ("prefix", "year")
    DO UPDATE SET "lastNumber" = "DocumentSequence"."lastNumber" + 1
    RETURNING "lastNumber"`;
  return formatJobNumber(year, rows[0].lastNumber);
}
