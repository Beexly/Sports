-- Per-rusher season run-direction profile (gap + location distribution + EPA/run)
-- from nflverse play-by-play. Additive.

-- CreateTable
CREATE TABLE "player_rush_profiles" (
    "id" TEXT NOT NULL,
    "gsisId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "team" TEXT,
    "runs" INTEGER NOT NULL,
    "guardRuns" INTEGER NOT NULL DEFAULT 0,
    "tackleRuns" INTEGER NOT NULL DEFAULT 0,
    "endRuns" INTEGER NOT NULL DEFAULT 0,
    "leftRuns" INTEGER NOT NULL DEFAULT 0,
    "middleRuns" INTEGER NOT NULL DEFAULT 0,
    "rightRuns" INTEGER NOT NULL DEFAULT 0,
    "epaPerRun" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_rush_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_rush_profiles_season_idx" ON "player_rush_profiles"("season");

-- CreateIndex
CREATE UNIQUE INDEX "player_rush_profiles_gsisId_season_key" ON "player_rush_profiles"("gsisId", "season");

