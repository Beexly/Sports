/**
 * Lineup tools (start/sit + trade value) — interpretations of the ONE score.
 *
 * These read the central player Galaxy Index and project it into tool-specific
 * views. They run NO independent player model, so the start/sit call and the
 * trade tier can never contradict the Galaxy Index (or each other) — the single
 * source of truth, by construction.
 */
import { loadPlayerCompositeScores } from "@/lib/scoring/player-composite";
import type { SignalContribution } from "@sports/prediction-engine";

export type StartSitRec = "start" | "flex" | "sit";
export type TradeTier = "elite" | "high" | "mid" | "depth";

export interface LineupPick {
  readonly playerId: string;
  readonly name: string;
  readonly position: string | null;
  readonly team: string | null;
  readonly score: number;
  readonly recommendation: StartSitRec;
  readonly tradeTier: TradeTier;
  readonly drivers: readonly SignalContribution[];
}

export interface LineupComparison {
  readonly status: "ok" | "no-data" | "not-found";
  readonly season: number;
  readonly picks: readonly LineupPick[];
  readonly missing: readonly string[];
  readonly note: string;
}

/** Start/sit tier from the Galaxy Index — a pure projection of the one score. */
export function startSitRecommendation(score: number): StartSitRec {
  if (score >= 60) return "start";
  if (score >= 45) return "flex";
  return "sit";
}

/** Trade-value tier from the Galaxy Index. */
export function tradeTier(score: number): TradeTier {
  if (score >= 70) return "elite";
  if (score >= 58) return "high";
  if (score >= 46) return "mid";
  return "depth";
}

export async function compareLineup(season: number, playerIds: readonly string[]): Promise<LineupComparison> {
  const central = await loadPlayerCompositeScores(season, Number.MAX_SAFE_INTEGER);
  if (central.status !== "ok") {
    return { status: "no-data", season, picks: [], missing: [...playerIds], note: "No player scores yet. Run the player-data backfill." };
  }

  const byId = new Map(central.top.map((p) => [p.playerId, p]));
  const picks: LineupPick[] = [];
  const missing: string[] = [];
  for (const id of playerIds) {
    const p = byId.get(id);
    if (!p) {
      missing.push(id);
      continue;
    }
    picks.push({
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      team: p.team,
      score: p.score,
      recommendation: startSitRecommendation(p.score),
      tradeTier: tradeTier(p.score),
      drivers: p.drivers,
    });
  }
  picks.sort((a, b) => b.score - a.score);

  return {
    status: picks.length > 0 ? "ok" : "not-found",
    season,
    picks,
    missing,
    note: "Start/sit + trade tiers derived from the central Galaxy Index — the same score every tool reads, so they never contradict.",
  };
}
