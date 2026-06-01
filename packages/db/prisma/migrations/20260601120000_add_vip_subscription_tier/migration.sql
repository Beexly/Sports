-- Add the VIP anchor tier to the subscription value ladder.
-- Postgres allows ALTER TYPE ... ADD VALUE as long as the new value is not
-- used within the same migration (it isn't here), so this runs cleanly.
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'VIP';
