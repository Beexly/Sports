-- CreateTable
CREATE TABLE "team_week_stats" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT NOT NULL,
    "opponent" TEXT,
    "completions" INTEGER,
    "attempts" INTEGER,
    "passYards" DOUBLE PRECISION,
    "passTds" INTEGER,
    "passInt" INTEGER,
    "sacksSuffered" INTEGER,
    "passAirYards" DOUBLE PRECISION,
    "passYac" DOUBLE PRECISION,
    "passFirstDowns" INTEGER,
    "passEpa" DOUBLE PRECISION,
    "passCpoe" DOUBLE PRECISION,
    "carries" INTEGER,
    "rushYards" DOUBLE PRECISION,
    "rushTds" INTEGER,
    "rushFirstDowns" INTEGER,
    "rushEpa" DOUBLE PRECISION,
    "receptions" INTEGER,
    "targets" INTEGER,
    "recYards" DOUBLE PRECISION,
    "recEpa" DOUBLE PRECISION,
    "defSacks" DOUBLE PRECISION,
    "defInterceptions" INTEGER,
    "defQbHits" INTEGER,
    "defTacklesForLoss" INTEGER,
    "defPassDefended" INTEGER,
    "defTds" INTEGER,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_week_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_week_stats_season_week_idx" ON "team_week_stats"("season", "week");

-- CreateIndex
CREATE UNIQUE INDEX "team_week_stats_team_season_week_seasonType_key" ON "team_week_stats"("team", "season", "week", "seasonType");

