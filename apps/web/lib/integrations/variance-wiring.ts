/**
 * Variance model wiring: production data -> a registered provider.
 *
 * THE TWO GATES THIS FILE ENFORCES.
 *  1. `canPublishProjections` on the process grade stays false. The grade is
 *     context. Nothing here flips it, and a test asserts it.
 *  2. The training window must be fresh. A stale window THROWS rather than
 *     returning a quiet number — the two-seasons-stale graded pool is exactly
 *     the failure that this check exists to make loud.
 */
import { db } from "@sports/db";
import { loadPlayerModel } from "../intelligence/player-model";
import {
  loadVarianceProjections,
  StaleTrainingWindowError,
  type PlayerWeekClient,
} from "./variance-projections";
import {
  registerVarianceProvider,
  varianceRowsToPlayers,
  type VariancePlayer,
} from "./variance-provider";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { isConfigured } from "./providers";

export interface RegisterVarianceResult {
  readonly registered: boolean;
  readonly count: number;
  readonly trainThroughSeason: number;
  /** Set when the pool refused to register. A reason, never a silent null. */
  readonly reason: string | null;
}

/** Regular-season games in a full NFL season. Named, not inlined. */
export const FULL_SEASON_GAMES = 17;

/**
 * Remaining games for the target season. During the season this is what is
 * left; the caller supplies it because it owns the schedule. No default: a
 * wrong remaining-game count silently rescales every projection.
 */
export function remainingGamesFor(
  players: readonly { id: string }[],
  gamesPlayedThisSeason: number,
  fullSeason: number = FULL_SEASON_GAMES,
): Record<string, number> {
  const remaining = Math.max(0, fullSeason - gamesPlayedThisSeason);
  const out: Record<string, number> = {};
  for (const p of players) out[p.id] = remaining;
  return out;
}

/**
 * Load, build, and register. Pure orchestration — the client is injectable so
 * tests never touch the network or a real database.
 */
export async function loadAndRegisterVariancePool(opts: {
  client?: PlayerWeekClient;
  evalSeason?: number;
  gamesPlayedThisSeason?: number;
  register?: boolean;
} = {}): Promise<RegisterVarianceResult> {
  const client = (opts.client ?? db) as unknown as PlayerWeekClient;

  // The season we are FORECASTING. Not the season the process grade renders.
  const evalSeason = opts.evalSeason ?? latestNflverseInspectionSeason();
  const gamesPlayed = opts.gamesPlayedThisSeason ?? 0;

  // Identity comes from the player table, read through the same client shape.
  const identities = await (
    client as unknown as {
      player: { findMany(args: unknown): Promise<{ id: string; fullName: string; recentTeam: string | null }[]> };
    }
  ).player.findMany({
    select: { id: true, fullName: true, recentTeam: true },
  });
  const nameById = new Map(identities.map((p) => [p.id, { name: p.fullName, team: p.recentTeam ?? "" }]));

  const remaining = remainingGamesFor(identities, gamesPlayed);

  const result = await loadVarianceProjections(client, { evalSeason, remainingGames: remaining });
  const players: readonly VariancePlayer[] = varianceRowsToPlayers(result.rows, nameById);

  if (opts.register === false) {
    return { registered: false, count: players.length, trainThroughSeason: result.trainThroughSeason, reason: "register=false" };
  }
  if (!isConfigured("projections")) {
    return { registered: false, count: players.length, trainThroughSeason: result.trainThroughSeason, reason: "PROJECTIONS_PROVIDER not configured" };
  }
  const registered = registerVarianceProvider(players, new Date().toISOString());
  return {
    registered,
    count: players.length,
    trainThroughSeason: result.trainThroughSeason,
    reason: registered ? null : "no players survived the variance model",
  };
}

/**
 * The process grade, loaded for CONTEXT. Returns the model untouched and
 * asserts nothing about it beyond what it already reports — this file exists
 * to prove the grade is still not a projection.
 */
export async function loadProcessGradeAsContext(fetcher?: typeof fetch) {
  return loadPlayerModel(fetcher ? { fetcher } : {});
}

export { StaleTrainingWindowError };
