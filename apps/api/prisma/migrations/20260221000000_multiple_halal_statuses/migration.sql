-- Add new column with default empty array
ALTER TABLE "Restaurant" ADD COLUMN "halalStatuses" "HalalStatus"[] NOT NULL DEFAULT '{}';

-- Backfill from existing halalStatus (one-element array per row)
UPDATE "Restaurant" SET "halalStatuses" = ARRAY["halalStatus"]::"HalalStatus"[];

-- Drop old column
ALTER TABLE "Restaurant" DROP COLUMN "halalStatus";
