-- CreateTable
CREATE TABLE "pfr_adv_stats" (
    "id" TEXT NOT NULL,
    "pfrPlayerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "opponent" TEXT,
    "gameKey" TEXT NOT NULL,
    "statType" TEXT NOT NULL,
    "timesSacked" INTEGER,
    "timesBlitzed" INTEGER,
    "timesHurried" INTEGER,
    "timesHit" INTEGER,
    "timesPressured" INTEGER,
    "timesPressuredPct" DOUBLE PRECISION,
    "passingBadThrows" INTEGER,
    "passingBadThrowPct" DOUBLE PRECISION,
    "passingDrops" INTEGER,
    "passingDropPct" DOUBLE PRECISION,
    "receivingBrokenTackles" INTEGER,
    "receivingDrop" INTEGER,
    "receivingDropPct" DOUBLE PRECISION,
    "receivingInt" INTEGER,
    "receivingRat" DOUBLE PRECISION,
    "carries" INTEGER,
    "rushingYardsBeforeContact" DOUBLE PRECISION,
    "rushingYardsBeforeContactAvg" DOUBLE PRECISION,
    "rushingYardsAfterContact" DOUBLE PRECISION,
    "rushingYardsAfterContactAvg" DOUBLE PRECISION,
    "rushingBrokenTackles" INTEGER,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pfr_adv_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pfr_adv_stats_season_week_idx" ON "pfr_adv_stats"("season", "week");

-- CreateIndex
CREATE INDEX "pfr_adv_stats_statType_season_idx" ON "pfr_adv_stats"("statType", "season");

-- CreateIndex
CREATE UNIQUE INDEX "pfr_adv_stats_pfrPlayerId_gameKey_statType_key" ON "pfr_adv_stats"("pfrPlayerId", "gameKey", "statType");

