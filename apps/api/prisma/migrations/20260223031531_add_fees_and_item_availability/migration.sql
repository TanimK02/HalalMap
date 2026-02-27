/*
  Warnings:

  - You are about to drop the column `deliveryFeeCents` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `pickupFeeCents` on the `Restaurant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Restaurant" DROP COLUMN "deliveryFeeCents",
DROP COLUMN "pickupFeeCents",
ADD COLUMN     "deliveryFeeType" TEXT,
ADD COLUMN     "deliveryFeeValue" INTEGER,
ADD COLUMN     "pickupFeeType" TEXT,
ADD COLUMN     "pickupFeeValue" INTEGER;
