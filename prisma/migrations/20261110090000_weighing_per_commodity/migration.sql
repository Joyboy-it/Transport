-- Existing weighings belong to the job's single commodity, so every weighed job must have one.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT "jobId" FROM "OriginWeighing"
      UNION SELECT "jobId" FROM "DestinationWeighing"
      UNION SELECT "jobId" FROM "WeighingRevision"
    ) w
    JOIN "TransportJob" j ON j.id = w."jobId"
    WHERE j."commodityId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Some weighed jobs have no commodity. Set TransportJob.commodityId on them before running this migration.';
  END IF;
END $$;

-- DropIndex
DROP INDEX "DestinationWeighing_jobId_key";

-- DropIndex
DROP INDEX "OriginWeighing_jobId_key";

-- AlterTable
ALTER TABLE "DestinationWeighing" ADD COLUMN "commodityId" TEXT;
ALTER TABLE "OriginWeighing" ADD COLUMN "commodityId" TEXT;
ALTER TABLE "WeighingRevision" ADD COLUMN "commodityId" TEXT,
ADD COLUMN "removed" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from the job header
UPDATE "OriginWeighing" w SET "commodityId" = j."commodityId" FROM "TransportJob" j WHERE j.id = w."jobId";
UPDATE "DestinationWeighing" w SET "commodityId" = j."commodityId" FROM "TransportJob" j WHERE j.id = w."jobId";
UPDATE "WeighingRevision" w SET "commodityId" = j."commodityId" FROM "TransportJob" j WHERE j.id = w."jobId";

ALTER TABLE "DestinationWeighing" ALTER COLUMN "commodityId" SET NOT NULL;
ALTER TABLE "OriginWeighing" ALTER COLUMN "commodityId" SET NOT NULL;
ALTER TABLE "WeighingRevision" ALTER COLUMN "commodityId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DestinationWeighing_jobId_commodityId_key" ON "DestinationWeighing"("jobId", "commodityId");

-- CreateIndex
CREATE UNIQUE INDEX "OriginWeighing_jobId_commodityId_key" ON "OriginWeighing"("jobId", "commodityId");

-- AddForeignKey
ALTER TABLE "OriginWeighing" ADD CONSTRAINT "OriginWeighing_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationWeighing" ADD CONSTRAINT "DestinationWeighing_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeighingRevision" ADD CONSTRAINT "WeighingRevision_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
