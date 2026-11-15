-- AlterTable
ALTER TABLE "TransportJob" ADD COLUMN     "collectAmount" DECIMAL(14,2),
ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "collectedById" TEXT;

-- AddForeignKey
ALTER TABLE "TransportJob" ADD CONSTRAINT "TransportJob_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
