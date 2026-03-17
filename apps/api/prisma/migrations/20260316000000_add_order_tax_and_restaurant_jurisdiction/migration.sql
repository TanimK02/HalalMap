-- AlterTable
ALTER TABLE "Order" ADD COLUMN "taxCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "state" TEXT, ADD COLUMN "postalCode" TEXT;
