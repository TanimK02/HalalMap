-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "availableForDelivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableForPickup" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "feeCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "deliveryFeeCents" INTEGER,
ADD COLUMN     "pickupFeeCents" INTEGER;
