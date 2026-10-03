/**
 * Team-rate source — reads the REAL final scores the platform already stores in
 * TeamGameLog (teamScore / opponentScore, populated by settleGameLogs from The
 * Odds API /scores) and hands them to the pure team-rate model in
 * @sports/prediction-engine. No new provider, no fabricated stats — just the
 * results we already ingest, turned into the Poisson model's λ inputs.
 *
 * This is the ingestion-side glue for the #11 unlock. It is a thin, deterministic
 * DB wrapper (the gating + math live in the tested pure module). It is NOT wired
 * into the live ingestion cron: doing that — plus setting TEAM_RATES_AVAILABLE=true
 * and bumping MODEL_VERSION so the Poisson estimate can move confidence — is a
 * deliberate, founder-gated step, mirroring the Kalshi fair-value boundary.
 *
 * Leakage-safe: pass `before` (the game's commence time) to exclude any log on
 * or after the game being predicted.
 */

import { db as prisma } from "@sports/db";

/**
 * Real completed-game records for one team, most-recent first. Shape is
 * structurally compatible with prediction-engine's `TeamGameRecord`, so the
 * pure model consumes it without a cross-package value import.
 */
export interface TeamScoringRecord {
  teamScore: number;
  opponentScore: number;
  isBootstrap: boolean;
}

/**
 * Pull a team's last `windowGames` completed games (real scores only). Returns
 * [] when the team has no scored history yet — the pure model then returns null
 * (no opinion), which the edge engine handles by passing.
 */
export async function getTeamScoringRecords(
  teamName: string,
  sport: string,
  windowGames = 20,
  before?: Date,
): Promise<TeamScoringRecord[]> {
  const logs = await prisma.teamGameLog.findMany({
    where: {
      teamName,
      sport,
      teamScore: { not: null },
      opponentScore: { not: null },
      ...(before ? { gameDate: { lt: before } } : {}),
    },
    orderBy: { gameDate: "desc" },
    take: windowGames,
    select: { teamScore: true, opponentScore: true, isBootstrap: true },
  });

  return logs
    .filter((l) => l.teamScore !== null && l.opponentScore !== null)
    .map((l) => ({
      teamScore: l.teamScore as number,
      opponentScore: l.opponentScore as number,
      isBootstrap: l.isBootstrap,
    }));
}

/**
 * League scoring anchor: the average goals/runs a single team scores per game
 * across the sport (every TeamGameLog row is one team's game). Returns null when
 * there is no scored history — the model then declines (no fabricated anchor).
 */
export async function getLeagueAverageScored(
  sport: string,
  before?: Date,
): Promise<number | null> {
  const agg = await prisma.teamGameLog.aggregate({
    where: {
      sport,
      teamScore: { not: null },
      ...(before ? { gameDate: { lt: before } } : {}),
    },
    _avg: { teamScore: true },
  });
  return agg._avg.teamScore ?? null;
}
