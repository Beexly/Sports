-- Historical games (nflverse schedules / games.csv): one settled row per game
-- since 1999 with closing line/total/moneylines + final score. Additive.

-- CreateTable
CREATE TABLE "historical_games" (
    "id" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "gameType" TEXT NOT NULL DEFAULT 'REG',
    "awayTeam" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayScore" INTEGER,
    "homeScore" INTEGER,
    "result" DOUBLE PRECISION,
    "spreadLine" DOUBLE PRECISION,
    "totalLine" DOUBLE PRECISION,
    "awayMoneyline" INTEGER,
    "homeMoneyline" INTEGER,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "historical_games_gameKey_key" ON "historical_games"("gameKey");

-- CreateIndex
CREATE INDEX "historical_games_season_week_idx" ON "historical_games"("season", "week");

-- CreateIndex
CREATE INDEX "historical_games_season_idx" ON "historical_games"("season");

