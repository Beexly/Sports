-- Settlement quarantine for completed-but-scoreless games. A single feed sighting
-- of "completed=true, no usable score" is indistinguishable between a genuinely
-- postponed/cancelled game and a transient feed drop or team-name-mapping miss, so
-- it is never acted on; corroboration across settlement runs is required, and even
-- then the pipeline only FLAGS the game for owner review (it never auto-voids picks
-- or infers a status). Both columns are additive and nullable/defaulted — existing
-- rows read as "never quarantined".
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "scorelessCompletedSightings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "settlementReviewFlaggedAt" TIMESTAMP(3);
