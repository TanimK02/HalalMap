-- Enum for Stripe Connect status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StripeConnectStatus') THEN
    CREATE TYPE "StripeConnectStatus" AS ENUM ('UNINITIALIZED', 'ONBOARDING', 'ACTIVE', 'RESTRICTED', 'DISABLED');
  END IF;
END$$;

-- AlterTable Restaurant: add Stripe Connect columns
ALTER TABLE "Restaurant"
  ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "stripeConnectStatus" "StripeConnectStatus" NOT NULL DEFAULT 'UNINITIALIZED',
  ADD COLUMN IF NOT EXISTS "stripeConnectRequirements" JSONB,
  ADD COLUMN IF NOT EXISTS "stripeConnectLastSyncedAt" TIMESTAMP;

-- AlterTable Order: denormalized Stripe Connect account
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT;

