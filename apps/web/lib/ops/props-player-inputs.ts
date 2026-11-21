/**
 * Props player-input builder — feeds reconcileMarketAnchoredPlayers from the DB.
 *
 * WHY THIS EXISTS. The market-anchored reconciliation needs per-player
 * `usagePosteriorMean` x `efficiencyPosteriorMean` to allocate team yard/TD
 * pools. Those posteriors had no production builder (estimateNormalNormalRate-
 * Posterior was export-only). This module builds them from real
 * PlayerGameStat rows: the last 4 REG weeks, recency-weighted, shrunk toward
 * a positional prior via the engine's empirical-Bayes normal-normal posterior.
 *
 * DEFINITIONS (v1, stated openly):
 * - usage (opportunities/game) = targets + carries + pass attempts, per game,
 *   averaged over the trailing 4 weeks with recency weights [0.4, 0.3, 0.2, 0.1].
 * - efficiency (yards/opportunity) = (receivingYards + rushingYards) / usage.
 *   PlayerGameStat carries no passing-yards column, so for QBs efficiency is
 *   fantasyPointsPpr per attempt — a RELATIVE ranking signal only. The
 *   allocation uses usage x efficiency to RANK players within a team; absolute
 *   yards come from the market-anchored team pool. The approximation is labeled
 *   here, not hidden.
 * - prior: positional mean usage/efficiency computed from the same 4-week
 *   window across all players at the position (empirical Bayes); shrinkage
 *   k = 2 games.
 *
 * HONEST LIMITS:
 * - Players with zero games in the window get NO input (not imputed, not
 *   prior-only) — they simply cannot be priced by the engine this week.
 * - Only QB/RB/WR/TE are built; other positions are skipped.
 */

import {
  estimateNormalNormalRatePosterior,
  type MarketAnchoredPlayerInput,
  type MarketAnchorTeamSide,
} from "@sports/prediction-engine";

const RECENCY_WEIGHTS = [0.4, 0.3, 0.2, 0.1] as const;
const SHRINKAGE_K_GAMES = 2;
const ELIGIBLE_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

export interface PlayerGameStatLike {
  readonly playerId: string;
  readonly position: string | null;
  readonly teamSide: MarketAnchorTeamSide;
  readonly season?: number;
  readonly week: number;
  readonly targets: number | null;
  readonly carries: number | null;
  readonly attempts: number | null;
  readonly receivingYards: number | null;
  readonly rushingYards: number | null;
  readonly fantasyPointsPpr: number | null;
}

export interface PropPlayerInputReport {
  readonly inputs: readonly MarketAnchoredPlayerInput[];
  /** playerIds skipped: zero games in window. */
  readonly skippedNoGames: readonly string[];
  /** playerIds skipped: ineligible position. */
  readonly skippedPosition: readonly string[];
}

const REG_SEASON_WEEKS = 18;

function chronoRegWeek(season: number, week: number): number {
  return Math.trunc(season) * REG_SEASON_WEEKS + (Math.min(REG_SEASON_WEEKS, Math.trunc(week)) - 1);
}

function opportunities(s: PlayerGameStatLike): number {
  return (s.targets ?? 0) + (s.carries ?? 0) + (s.attempts ?? 0);
}

function yards(s: PlayerGameStatLike): number {
  return (s.receivingYards ?? 0) + (s.rushingYards ?? 0);
}

/**
 * Pure builder: player-week stat rows -> MarketAnchoredPlayerInput[].
 * `week` is the target (upcoming) week; rows must be valid REG weeks (`week >= 1`).
 * Uses dense 18-week chronological spacing so Weeks 1-4 bridge `targetSeason - 1`
 * Weeks 15-18 seamlessly instead of starving early-season lookbacks.
 * DB access lives in the caller; this function is unit-testable.
 */
export function buildPropPlayerInputs(
  rows: readonly PlayerGameStatLike[],
  week: number,
  targetSeason?: number,
): PropPlayerInputReport {
  const skippedNoGames: string[] = [];
  const skippedPosition: string[] = [];
  const inputs: MarketAnchoredPlayerInput[] = [];

  let maxObservedSeason = 2026;
  for (const r of rows) {
    if (typeof r.season === "number" && Number.isFinite(r.season) && r.season > maxObservedSeason) {
      maxObservedSeason = r.season;
    }
  }
  const effTargetSeason = targetSeason ?? maxObservedSeason;
  const targetChrono = chronoRegWeek(effTargetSeason, week);

  // Group by player; keep trailing-4 chronological REG weeks (gap 1..4).
  const byPlayer = new Map<string, Array<{ row: PlayerGameStatLike; weight: number }>>();
  for (const r of rows) {
    if (!Number.isFinite(r.week) || r.week < 1 || r.week > REG_SEASON_WEEKS) continue;
    const rowSeason = typeof r.season === "number" && Number.isFinite(r.season) ? r.season : effTargetSeason;
    const gap = targetChrono - chronoRegWeek(rowSeason, r.week);
    if (gap < 1 || gap > 4) continue;
    const w = RECENCY_WEIGHTS[gap - 1] ?? 0;
    if (w <= 0) continue;
    const list = byPlayer.get(r.playerId) ?? [];
    list.push({ row: r, weight: w });
    byPlayer.set(r.playerId, list);
  }

  // Positional priors from the same window (empirical Bayes).
  const posUsage = new Map<string, number[]>();
  const posEff = new Map<string, number[]>();
  for (const rs of byPlayer.values()) {
    const pos = (rs[0]?.row.position ?? "").toUpperCase();
    if (!ELIGIBLE_POSITIONS.has(pos)) continue;
    let wSum = 0;
    let usageSum = 0;
    let effSum = 0;
    let effW = 0;
    for (const { row: r, weight: w } of rs) {
      const opp = opportunities(r);
      wSum += w;
      usageSum += w * opp;
      if (opp > 0) {
        const eff =
          pos === "QB"
            ? (r.fantasyPointsPpr ?? 0) / opp
            : yards(r) / opp;
        effSum += w * eff;
        effW += w;
      }
    }
    if (wSum <= 0) continue;
    posUsage.set(pos, [...(posUsage.get(pos) ?? []), usageSum / wSum]);
    if (effW > 0) posEff.set(pos, [...(posEff.get(pos) ?? []), effSum / effW]);
  }
  const posUsagePrior = new Map<string, number>();
  const posEffPrior = new Map<string, number>();
  for (const [pos, vals] of posUsage) {
    posUsagePrior.set(pos, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  for (const [pos, vals] of posEff) {
    posEffPrior.set(pos, vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  for (const [pid, rs] of byPlayer) {
    const pos = (rs[0]?.row.position ?? "").toUpperCase();
    if (!ELIGIBLE_POSITIONS.has(pos)) {
      skippedPosition.push(pid);
      continue;
    }
    let wSum = 0;
    let usageSum = 0;
    let effSum = 0;
    let effW = 0;
    let games = 0;
    for (const { row: r, weight: w } of rs) {
      const opp = opportunities(r);
      games += 1;
      wSum += w;
      usageSum += w * opp;
      if (opp > 0) {
        const eff =
          pos === "QB"
            ? (r.fantasyPointsPpr ?? 0) / opp
            : yards(r) / opp;
        effSum += w * eff;
        effW += w;
      }
    }
    if (games === 0 || wSum <= 0) {
      skippedNoGames.push(pid);
      continue;
    }
    const usageMean = usageSum / wSum;
    const effMean = effW > 0 ? effSum / effW : (posEffPrior.get(pos) ?? 0);

    const usagePosterior = estimateNormalNormalRatePosterior({
      playerId: pid,
      metricId: "props.usage_per_game",
      sampleMean: usageMean,
      sampleSize: games,
      observationVariance: 4,
      prior: {
        mean: posUsagePrior.get(pos) ?? usageMean,
        sampleSize: SHRINKAGE_K_GAMES,
        source: "position-prior",
      },
    });
    const effPosterior = estimateNormalNormalRatePosterior({
      playerId: pid,
      metricId: "props.efficiency",
      sampleMean: effMean,
      sampleSize: games,
      observationVariance: 1,
      prior: {
        mean: posEffPrior.get(pos) ?? effMean,
        sampleSize: SHRINKAGE_K_GAMES,
        source: "position-prior",
      },
    });

    inputs.push({
      playerId: pid,
      teamSide: rs[0]!.row.teamSide,
      position: pos,
      usagePosteriorMean: usagePosterior.posteriorMean,
      efficiencyPosteriorMean: Math.max(0, effPosterior.posteriorMean),
    });
  }

  return { inputs, skippedNoGames, skippedPosition };
}
