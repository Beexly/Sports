/**
 * Kickoff return-yards covariate bind: game-script (pre-game win probability).
 *
 * H1 Edge #5 — Tier 1 Special Teams: dynamic kickoff returns (74.5% rate in
 * 2025) + game-script WP asymmetry (models too conservative at 70-80% WP).
 *
 * EDGE: Books price kickoff return TDs only — return YARDS are the uncovered
 * edge — and game-script (pre-game win probability) is the dominant confounder
 * for that uncovered edge. A returner's team's pre-game win probability shifts
 * BOTH legs of the two-part model:
 *   - Returns per game: when a team is heavily favored (high WP), the opposition
 *     may squib/poof/directional-kick to suppress returns, and the returner
 *     plays more conservative (more fair catches, fewer returns). When a team
 *     is a heavy underdog (low WP), return volume trends HIGHER (returner
 *     goes for broke, opposition avoids touchback-range kicks).
 *   - Yards per return: high-WP teams take shorter, safer returns; low-WP
 *     teams attempt deeper returns with higher variance.
 *
 * DATA SOURCE: pre-game win probability derived from the book's point spread
 * (The Odds API spreads market), available BEFORE kickoff. This is NOT
 * same-game realized data — the spread is a pre-game line, so same-week
 * binding is leak-safe by construction (the line is fixed at kickoff, not
 * realized during the game). Provenance: market_implied.
 *
 * HONESTY:
 *  - `preGameWinProb` is the team's market-implied win probability entering the
 *    game, in [0, 1]. Not a post-game adjustment.
 *  - Grain is `pregame_for_kickoff` — a pre-game market line, not a weekly
 *    mean or a realized outcome.
 *  - Fail-closed: if no GameScriptRow exists for the returner's team at the
 *    kickoff game, or if preGameWinProb is null/non-finite, the sample is
 *    DROPPED. Never 0.5. Never imputed. The caller must not bet on a model
 *    whose game-script covariate is missing.
 *
 * MODEL ADJUSTMENT: the game-script covariate scales the Gamma posterior's
 * mean rate (yards-per-return and returns-per-game) via a linear elasticity,
 * shifting the posterior mean while preserving the shrinkage strength (beta
 * is held constant). `scriptAdjustedPosterior` and
 * `scriptProbOverKickoffReturnYards` close the loop: attach the covariate
 * via the bind, then pass the bound cell into the probability.
 *
 * Pure. No I/O. No Prisma. No model inference. priced:false.
 */

import type { GammaPosterior } from "./props-hb.js";
import { probOverKickoffReturnYards } from "./kickoff-return-yards.js";
import type { KickoffReturnSample } from "./kickoff-return-yards.js";

export const KICKOFF_RETURN_YARDS_BIND_METHOD_TAG = "kickoff_return_yards_bind_v1" as const;

/**
 * Grain tag for pre-game market-implied covariates.
 * Unlike the NGS bus (`week_t_for_tplus1`), this is the pre-game line for the
 * kickoff game itself — the spread is known at kickoff, not a realized outcome.
 */
export type GameScriptGrain = "pregame_for_kickoff";

/**
 * Provenance for market-implied game-script covariates.
 * Derived from the book's pre-game point spread / moneyline (The Odds API),
 * de-vigged to a fair win probability.
 */
export type GameScriptProvenance = "market_implied";

/**
 * Game-level pre-game covariate row. One row per team-game — keyed by
 * (team, season, week). The win probability is the returner's TEAM's
 * pre-game win probability (the team on offense receiving the kickoff).
 *
 * `preGameWinProb` in [0, 1]: the team's fair probability of winning
 * derived from the point spread before kickoff. null when no line is
 * available (e.g. unquoted game).
 */
export interface GameScriptRow {
  readonly season: number;
  /** NFL week number (1–18 regular season, 19+ playoffs). */
  readonly week: number;
  /** NFL team abbreviation (e.g. "KC", "BUF") — the returner's team. */
  readonly team: string;
  /** Team's market-implied win probability entering the game, [0, 1]. */
  readonly preGameWinProb: number | null;
  /** Point spread from this team's perspective (neg = favored). */
  readonly spread: number | null;
  /** Game total (over/under). */
  readonly total: number | null;
}

/**
 * A bound game-script covariate cell, carried on a kickoff return sample.
 * Mirrors the `CovariateCell` interface (value + grain + provenance) from
 * `covariate-bus.ts` but with its own grain/provenance enums — the game-script
 * covariate is a pre-game market line, not a weekly NGS mean.
 */
export interface GameScriptCell {
  readonly value: number;
  readonly grain: GameScriptGrain;
  readonly provenance: GameScriptProvenance;
}

/**
 * One kickoff return target that needs the game-script covariate bound.
 *
 * The caller supplies the returner's identity (gsisId for traceability),
 * the team they return for, and the kickoff week. The game-script covariate
 * is the returner's team's pre-game win probability for the game being
 * predicted.
 */
export interface KickoffReturnYardsBindRequest {
  /** Player gsis id — for traceability, not used as a lookup key. */
  readonly gsisId: string;
  readonly season: number;
  /** Week of the game being predicted. */
  readonly kickoffWeek: number;
  /** NFL team abbreviation — the returner's team (receiving team on kickoff). */
  readonly team: string;
  /** The kickoff return sample (returns / yards) to enrich. */
  readonly returns: KickoffReturnSample;
}

/**
 * `KickoffReturnSample` enriched with the game-script covariate. The
 * `attempts` / `yards` fields are the model's existing realized inputs
 * (unchanged); `preGameWinProb` is the pre-game win probability of the
 * returner's team, week `kickoffWeek` — an honest market-implied covariate.
 */
export interface BoundKickoffReturnSample extends KickoffReturnSample {
  /** Returner's team pre-game win probability entering the kickoff game. */
  readonly preGameWinProb: GameScriptCell;
}

/**
 * Result of binding game-script covariates to a request.
 *  - `ok: true`  → `sample` is a fully-honest BoundKickoffReturnSample whose
 *                 win probability came from the game-script rows.
 *  - `ok: false` → the covariate was missing (fail-closed). The sample is
 *                 DROPPED. `refuse` is diagnostic, never a guess.
 */
export type KickoffReturnYardsBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof KICKOFF_RETURN_YARDS_BIND_METHOD_TAG;
      readonly sample: BoundKickoffReturnSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof KICKOFF_RETURN_YARDS_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_game_script_row";
    };

/**
 * Default elasticity: the multiplier is `1 - elasticity * (winProb - 0.5)`,
 * so the rate shifts by `elasticity` per 1.0 of win-probability deviation —
 * the maximum shift at the extreme (WP=0 or WP=1, Δ=0.5 from neutral) is
 * `elasticity / 2`, i.e. 10% for the default 0.2. A team at WP=0.90 (Δ=0.4
 * from neutral) sees an 8% reduction in expected yards-per-return vs an
 * even game. Tunable — see H1 Edge #5 calibration in
 * CARDS_INCENTIVE_CALENDAR.md (game-script WP asymmetry at 70-80% WP).
 */
export const DEFAULT_KICKOFF_SCRIPT_ELASTICITY = 0.2;

/**
 * Shared cell template matching the game-script bus contract — single source
 * of truth for the grain/provenance on every emitted cell.
 */
const GAME_SCRIPT_CELL: GameScriptCell = {
  value: 0,
  grain: "pregame_for_kickoff",
  provenance: "market_implied",
};

/**
 * Look up the returner's team's pre-game win probability for the kickoff
 * game. The game-script row for the SAME week is valid — the pre-game spread
 * is set before kickoff, so this is not a realized-data leak.
 *
 * Returns the cell (value in [0,1], grain, provenance) when a finite,
 * in-range win probability is available, otherwise `null` (fail-closed —
 * no imputation, no 0.5 invention).
 */
export function winProbForKickoff(
  rows: readonly GameScriptRow[],
  team: string,
  season: number,
  kickoffWeek: number,
): GameScriptCell | null {
  for (const r of rows) {
    if (r.team !== team) continue;
    if (r.season !== season) continue;
    if (r.week !== kickoffWeek) continue;
    const wp = r.preGameWinProb;
    if (wp === null || !Number.isFinite(wp)) return null;
    if (wp < 0 || wp > 1) return null; // sanity: probability must be in [0,1]
    return { ...GAME_SCRIPT_CELL, value: wp };
  }
  return null;
}

/**
 * Bind the game-script covariate (returner's team pre-game win probability)
 * into a batch of kickoff return samples.
 *
 * For each request:
 *   1. `winProbForKickoff(rows, team, season, kickoffWeek)` — look up the
 *      pre-game win probability row for the returner's team at the kickoff
 *      game. Same-week is leak-safe: the spread is set before kickoff.
 *   2. If no row / null / non-finite / out-of-range WP → refuse
 *      `no_game_script_row` (fail-closed).
 *   3. If valid → build BoundKickoffReturnSample with the cell metadata
 *      (grain + provenance).
 *
 * The win probability is a pre-game MARKET line, not a weekly mean or
 * realized outcome — the grain tags it honestly.
 */
export function bindKickoffReturnYardsSamples(
  rows: readonly GameScriptRow[],
  requests: readonly KickoffReturnYardsBindRequest[],
): KickoffReturnYardsBindResult[] {
  const out: KickoffReturnYardsBindResult[] = [];
  for (const req of requests) {
    const cell = winProbForKickoff(rows, req.team, req.season, req.kickoffWeek);
    if (cell === null) {
      out.push({
        ok: false,
        methodTag: KICKOFF_RETURN_YARDS_BIND_METHOD_TAG,
        priced: false,
        refuse: "no_game_script_row",
      });
      continue;
    }

    out.push({
      ok: true,
      methodTag: KICKOFF_RETURN_YARDS_BIND_METHOD_TAG,
      priced: false,
      sample: {
        // Realized model inputs — passed through unchanged.
        attempts: req.returns.attempts,
        yards: req.returns.yards,
        // Pre-game win probability — market-implied, leak-safe (pre-kickoff).
        preGameWinProb: cell,
      },
    });
  }
  return out;
}

/** Convenience: collect only the bound samples (drops the refused ones). */
export function boundKickoffReturnYardsSamples(
  rows: readonly GameScriptRow[],
  requests: readonly KickoffReturnYardsBindRequest[],
): BoundKickoffReturnSample[] {
  return bindKickoffReturnYardsSamples(rows, requests)
    .filter((r): r is Extract<KickoffReturnYardsBindResult, { ok: true }> => r.ok)
    .map((r) => r.sample);
}

// ── game-script influence: posterior adjustment ─────────────────────────────

/**
 * Scale a Gamma posterior's mean rate by the game-script elasticity.
 *
 * When the returner's team is heavily favored (high WP), return aggression
 * drops — fewer returns and shorter yards. When heavily underdog (low WP),
 * aggression rises. The elasticity maps the win-probability deviation from
 * neutral (0.5) to a rate multiplier:
 *
 *   multiplier = 1 - elasticity * (winProb - 0.5)
 *
 *   WP = 0.5 (even) → multiplier = 1.0 (no adjustment)
 *   WP = 0.8 (favored) → multiplier = 1 - 0.3*elasticity (rate reduced)
 *   WP = 0.2 (underdog) → multiplier = 1 + 0.3*elasticity (rate raised)
 *
 * The multiplier scales alpha (the Gamma shape) while holding beta constant,
 * so the posterior mean shifts (alpha/beta) but the shrinkage strength
 * (beta, which controls how much the player's own data pulls away from the
 * group prior) is preserved. The NB dispersion follows because alpha drives
 * both the mean and the variance (Var = alpha/beta^2).
 *
 * Clamps the multiplier to [0.25, 4.0] — beyond that the model is
 * extrapolating outside observed game-script range.
 */
export function scriptAdjustedPosterior(
  post: GammaPosterior,
  cell: GameScriptCell,
  elasticity: number = DEFAULT_KICKOFF_SCRIPT_ELASTICITY,
): GammaPosterior {
  if (
    !Number.isFinite(post.alpha) ||
    !Number.isFinite(post.beta) ||
    post.alpha <= 0 ||
    post.beta <= 0
  ) {
    throw new RangeError("scriptAdjustedPosterior: posterior must have finite positive alpha/beta");
  }
  if (!Number.isFinite(elasticity) || elasticity < 0) {
    throw new RangeError(`scriptAdjustedPosterior: elasticity must be finite and ≥ 0 (got ${elasticity})`);
  }
  if (!Number.isFinite(cell.value) || cell.value < 0 || cell.value > 1) {
    throw new RangeError(`scriptAdjustedPosterior: winProb must be finite in [0,1] (got ${cell.value})`);
  }

  const multiplier = clamp(1 - elasticity * (cell.value - 0.5), 0.25, 4.0);
  const adjustedAlpha = post.alpha * multiplier;
  const adjustedBeta = post.beta;
  return {
    mean: adjustedAlpha / adjustedBeta,
    alpha: adjustedAlpha,
    beta: adjustedBeta,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * P(kickoff return yards > line | game-script covariate), with the
 * game-script elasticity applied to BOTH the yards-per-return posterior
 * and the returns-per-game posterior.
 *
 * This is the full edge pipeline:
 *   1. Adjust yardPost and retPost by the game-script win probability.
 *   2. Mix P(Y > line | T=k) over T ~ NB(adjustedRetPost, 1 game).
 *
 * `elasticity` defaults to `DEFAULT_KICKOFF_SCRIPT_ELASTICITY`. Pass 0 for
 * the unadjusted baseline (identity).
 */
export function scriptProbOverKickoffReturnYards(
  yardPost: GammaPosterior,
  retPost: GammaPosterior,
  cell: GameScriptCell,
  line: number,
  elasticity: number = DEFAULT_KICKOFF_SCRIPT_ELASTICITY,
): number {
  const adjYard = scriptAdjustedPosterior(yardPost, cell, elasticity);
  const adjRet = scriptAdjustedPosterior(retPost, cell, elasticity);
  return probOverKickoffReturnYards(adjYard, adjRet, line);
}
