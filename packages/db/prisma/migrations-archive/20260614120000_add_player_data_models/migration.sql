-- Player data (nflverse) system-of-record: Player + weekly stats, snap counts,
-- injuries, depth charts. Additive; every row carries provenance + rights snapshot
-- + fetchedAt. Does not alter existing tables.

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "gsisId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "recentTeam" TEXT,
    "headshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_game_stats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "opponent" TEXT,
    "attempts" INTEGER,
    "carries" INTEGER,
    "receptions" INTEGER,
    "targets" INTEGER,
    "targetShare" DOUBLE PRECISION,
    "receivingYards" DOUBLE PRECISION,
    "rushingYards" DOUBLE PRECISION,
    "fantasyPointsPpr" DOUBLE PRECISION,
    "passingEpa" DOUBLE PRECISION,
    "rushingEpa" DOUBLE PRECISION,
    "receivingEpa" DOUBLE PRECISION,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snap_counts" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "pfrPlayerId" TEXT,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'REG',
    "team" TEXT,
    "opponent" TEXT,
    "position" TEXT,
    "offenseSnaps" INTEGER,
    "offensePct" DOUBLE PRECISION,
    "defenseSnaps" INTEGER,
    "defensePct" DOUBLE PRECISION,
    "stSnaps" INTEGER,
    "stPct" DOUBLE PRECISION,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snap_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "injuries" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "gsisId" TEXT,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "team" TEXT,
    "position" TEXT,
    "reportStatus" TEXT,
    "practiceStatus" TEXT,
    "primaryInjury" TEXT,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "injuries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depth_chart_entries" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "gsisId" TEXT,
    "playerName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "team" TEXT,
    "position" TEXT,
    "depthRank" INTEGER,
    "role" TEXT,
    "sourceId" TEXT NOT NULL DEFAULT 'nflverse',
    "rightsSnapshot" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depth_chart_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_gsisId_key" ON "players"("gsisId");

-- CreateIndex
CREATE INDEX "players_position_idx" ON "players"("position");

-- CreateIndex
CREATE INDEX "players_recentTeam_idx" ON "players"("recentTeam");

-- CreateIndex
CREATE INDEX "player_game_stats_season_week_idx" ON "player_game_stats"("season", "week");

-- CreateIndex
CREATE INDEX "player_game_stats_playerId_idx" ON "player_game_stats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_game_stats_playerId_season_week_seasonType_key" ON "player_game_stats"("playerId", "season", "week", "seasonType");

-- CreateIndex
CREATE INDEX "snap_counts_season_week_idx" ON "snap_counts"("season", "week");

-- CreateIndex
CREATE INDEX "snap_counts_playerId_idx" ON "snap_counts"("playerId");

-- CreateIndex
CREATE INDEX "injuries_season_week_idx" ON "injuries"("season", "week");

-- CreateIndex
CREATE INDEX "injuries_playerId_idx" ON "injuries"("playerId");

-- CreateIndex
CREATE INDEX "depth_chart_entries_season_week_team_idx" ON "depth_chart_entries"("season", "week", "team");

-- CreateIndex
CREATE INDEX "depth_chart_entries_playerId_idx" ON "depth_chart_entries"("playerId");

-- AddForeignKey
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snap_counts" ADD CONSTRAINT "snap_counts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depth_chart_entries" ADD CONSTRAINT "depth_chart_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

