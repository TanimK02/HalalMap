-- Normalize removed halal statuses to HALAL_FRIENDLY before enum change.
UPDATE "Restaurant"
SET "halalStatuses" = (
  SELECT ARRAY(
    SELECT DISTINCT
      CASE
        WHEN s IN ('PROCLAIMED_HALAL', 'SOME_HALAL') THEN 'HALAL_FRIENDLY'
        ELSE s
      END
    FROM unnest("halalStatuses"::text[]) AS s
  )
)::"HalalStatus"[];

-- Recreate enum without legacy values.
ALTER TYPE "HalalStatus" RENAME TO "HalalStatus_old";
CREATE TYPE "HalalStatus" AS ENUM ('CERTIFIED_HALAL', 'MUSLIM_OWNED', 'HALAL_FRIENDLY');

ALTER TABLE "Restaurant"
ALTER COLUMN "halalStatuses" DROP DEFAULT;

ALTER TABLE "Restaurant"
ALTER COLUMN "halalStatuses" TYPE "HalalStatus"[]
USING "halalStatuses"::text[]::"HalalStatus"[];

ALTER TABLE "Restaurant"
ALTER COLUMN "halalStatuses" SET DEFAULT ARRAY[]::"HalalStatus"[];

DROP TYPE "HalalStatus_old";
