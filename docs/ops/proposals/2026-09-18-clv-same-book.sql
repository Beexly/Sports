-- Additive same-book CLV columns. Founder applies. Do not run from an agent.
-- Existing clvValue / clvVerdict are unchanged.

ALTER TABLE "picks"
  ADD COLUMN IF NOT EXISTS "clvSameBookValue" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "clvSameBookVerdict" TEXT,
  ADD COLUMN IF NOT EXISTS "clvBookBasis" TEXT;
