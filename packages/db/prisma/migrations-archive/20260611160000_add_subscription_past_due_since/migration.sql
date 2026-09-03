-- PAST_DUE grace period: stamp the first failed payment so entitlements
-- can keep premium access for a bounded window while Stripe retries the
-- charge. Stamped once on the first invoice.payment_failed, cleared when
-- the subscription recovers to active/trialing.
ALTER TABLE "subscriptions" ADD COLUMN "pastDueSince" TIMESTAMP(3);
