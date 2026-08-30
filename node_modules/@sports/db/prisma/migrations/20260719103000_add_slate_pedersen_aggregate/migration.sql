-- Pedersen aggregate commitment over the sealed slate's published edge scores.
-- Additive + nullable: old commitments stay valid. pedersenAggregateHex is the
-- public opener; value + blindingSum stay server-side until a post-slate open.
ALTER TABLE "slate_commitments" ADD COLUMN IF NOT EXISTS "pedersenAggregateHex" TEXT;
ALTER TABLE "slate_commitments" ADD COLUMN IF NOT EXISTS "pedersenAggregateValue" TEXT;
ALTER TABLE "slate_commitments" ADD COLUMN IF NOT EXISTS "pedersenBlindingSum" TEXT;
