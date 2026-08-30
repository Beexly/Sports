-- CreateTable
CREATE TABLE "next_gen_stats" (
    "id" TEXT NOT NULL,
    "gsisId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "statType" TEXT NOT NULL,
    "avgTimeToThrow" DOUBLE PRECISION,
    "avgCompletedAirYards" DOUBLE PRECISION,
    "avgIntendedAirYards" DOUBLE PRECISION,
    "aggressiveness" DOUBLE PRECISION,
    "avgAirYardsToSticks" DOUBLE PRECISION,
    "completionPct" DOUBLE PRECISION,
    "expectedCompletionPct" DOUBLE PRECISION,
    "cpoe" DOUBLE PRECISION,
    "passerRating" DOUBLE PRECISION,
    "avgCushion" DOUBLE PRECISION,
    "avgSeparation" DOUBLE PRECISION,
    "pctShareIntendedAirYards" DOUBLE PRECISION,
    "catchPct" DOUBLE PRECISION,
    "avgYac" DOUBLE PRECISION,
    "avgExpectedYac" DOUBLE PRECISION,
    "avgYacAboveExpectation" DOUBLE PRECISION,
    "rushEfficiency" DOUBLE PRECISION,
    "pctAttemptsGte8Defenders" DOUBLE PRECISION,
    "avgTimeToLos" DOUBLE PRECISION,
    "expectedRushYards" DOUBLE PRECISION,
    "rushYardsOverExpected" DOUBLE PRECISION,
    "rushYardsOverExpectedPerAtt" DOUBLE PRECISION,
    "rushPctOverExpected" DOUBLE PRECISION,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "next_gen_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "next_gen_stats_season_week_idx" ON "next_gen_stats"("season", "week");

-- CreateIndex
CREATE INDEX "next_gen_stats_statType_season_idx" ON "next_gen_stats"("statType", "season");

-- CreateIndex
CREATE UNIQUE INDEX "next_gen_stats_gsisId_season_week_seasonType_statType_key" ON "next_gen_stats"("gsisId", "season", "week", "seasonType", "statType");

