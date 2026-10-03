-- Book-line dispersion (max-min across books) at lock, in the pick kind's unit.
-- The CLV decomposition's liquidity regressor. Nullable + additive: existing
-- rows stay valid (null = not captured / <2 books), no backfill, no rewrite of
-- immutable history. Populated write-once at publish going forward.
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "bookDisagreementAtLock" DOUBLE PRECISION;
