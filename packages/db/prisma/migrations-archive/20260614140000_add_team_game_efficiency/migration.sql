-- Team-game efficiency aggregated from nflverse play-by-play (offense produced
-- + defense allowed, EPA/play + success rate). Additive.

-- CreateTable
CREATE TABLE "team_game_efficiency" (
    "id" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "plays" INTEGER NOT NULL,
    "offEpaPerPlay" DOUBLE PRECISION NOT NULL,
    "offSuccess" DOUBLE PRECISION NOT NULL,
    "defEpaPerPlay" DOUBLE PRECISION NOT NULL,
    "defSuccess" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_game_efficiency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_game_efficiency_season_week_idx" ON "team_game_efficiency"("season", "week");

-- CreateIndex
CREATE INDEX "team_game_efficiency_team_season_idx" ON "team_game_efficiency"("team", "season");

-- CreateIndex
CREATE UNIQUE INDEX "team_game_efficiency_team_gameKey_key" ON "team_game_efficiency"("team", "gameKey");

