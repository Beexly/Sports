-- Crypto fixed-term passes (owner-approved 2026-07-02, CRYPTO-PAYMENTS-SPEC.md).
-- A subscriber now has EITHER a Stripe identity or a provider-external charge,
-- so the Stripe customer id becomes optional. Uniqueness is preserved
-- (Postgres UNIQUE permits multiple NULLs).

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'COINBASE_COMMERCE');

-- AlterTable: Stripe identity becomes optional
ALTER TABLE "subscriptions" ALTER COLUMN "stripeCustomerId" DROP NOT NULL;

-- AlterTable: provider + external charge id (crypto idempotency key)
ALTER TABLE "subscriptions" ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "subscriptions" ADD COLUMN "externalChargeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_externalChargeId_key" ON "subscriptions"("externalChargeId");
