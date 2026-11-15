/*
  Warnings:

  - Made the column `transporterId` on table `Driver` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_transporterId_fkey";

-- AlterTable
ALTER TABLE "Driver" ALTER COLUMN "transporterId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
