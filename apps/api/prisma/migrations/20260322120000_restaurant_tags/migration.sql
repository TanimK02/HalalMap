-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPublishedTag" (
    "restaurantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "RestaurantPublishedTag_pkey" PRIMARY KEY ("restaurantId","tagId")
);

-- CreateTable
CREATE TABLE "RestaurantTagDraft" (
    "restaurantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "RestaurantTagDraft_pkey" PRIMARY KEY ("restaurantId","tagId")
);

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "hasPendingTagChanges" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- AddForeignKey
ALTER TABLE "RestaurantPublishedTag" ADD CONSTRAINT "RestaurantPublishedTag_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPublishedTag" ADD CONSTRAINT "RestaurantPublishedTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTagDraft" ADD CONSTRAINT "RestaurantTagDraft_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTagDraft" ADD CONSTRAINT "RestaurantTagDraft_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
