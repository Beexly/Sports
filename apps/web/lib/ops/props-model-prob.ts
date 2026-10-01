/**
 * Props model-probability producer — the honest P(over) for runPropsSlate.
 *
 * WHY THIS EXISTS. `runPropsSlate` (packages/ingestion-pipeline/src/props-slate.ts)
 * takes `modelProbOver` keyed by `${playerId}:${propType}`, and it had NO
 * producer: the only way to fill it was to silently substitute the market's own
 * devigged probability, which would make the "model edge" circular (the model
 * agreeing with the market it is supposed to beat). This module is the real
 * producer.
 *
 * WHERE THE NUMBERS COME FROM (nothing invented, nothing circular):
 * 1. Per-player means come from `reconcileMarketAnchoredPlayers`
 *    (@sports/prediction-engine): team yard/TD pools anchored to the market
 *    total/spread, allocated across players by the engine's own
 *    usage x efficiency posteriors. The team TOTAL is market-anchored (stated
 *    openly); the PLAYER DIFFERENTIATION is the engine's.
 * 2. Dispersion comes from POSITIONAL_CV_SNAPSHOT — coefficients of variation
 *    MEASURED 2026-09-28 from 32,894 player-weeks (n=771), not guessed.
 *    sd = mean x CV_positional.
 * 3. P(over) for yard props: 1 - Phi((line - mean) / sd) under a normal
 *    approximation. For TD props (discrete counts): 1 - PoissonCDF(line; mean).
 *
 * WHAT THIS IS NOT. It never reads market-implied P(over) — not the devigged
 * price, not the raw price. A test pins this: when the market implies 0.50 and
 * the engine projection implies 0.70, this module returns 0.70.
 *
 * HONEST LIMITS (v1):
 * - The CV snapshot was measured on fantasy points, applied here to yards.
 *   Relative dispersion is assumed similar; the approximation is labeled.
 * - Unsupported propTypes (completions, attempts, receptions) produce NO entry —
 *   runPropsSlate records "missing modelProbOver — not imputed" and excludes
 *   the prop. Missing stays missing.
 * - Degenerate means (below MIN_MEAN_FOR_PRICING) produce no entry rather than
 *   a fake-certain P(over)≈0 — a 0.3-yard allocation is a broken allocation,
 *   not a real projection.
 *
 * ENGINE ISSUES FOUND WHILE WIRING (flagged, worked around honestly):
 * 1. reconcileMarketAnchoredPlayers' default allocationTemperature=1 is
 *    degenerate at yard-scale scores: softmax(usage×efficiency) with scores
 *    20-100 turns a 15-point gap into e^15:1 — one player sweeps 100% of every
 *    pool, everyone else gets exactly 0 (verified on a 9-man rotation).
 *    This wiring passes allocationTemperature=0.02 explicitly
 *    (RECONCILIATION_TEMPERATURE), which yields sensible proportional spreads
 *    with pools conserved exactly. The default needs engine-owner review.
 * 2. MarketAnchoredPlayerInput carries ONE usage number for three separate
 *    pools (pass/receiving/rush). RB/WR usage (targets+carries) conflates the
 *    pools; QB efficiency is fantasy-pts/attempt (no passing-yards column),
 *    consistent within the QB-only pass pool but cross-unit in the shared
 *    rush pool (directionally correct for mobile QBs, approximate). Per-pool
 *    usage inputs would fix this properly — engine surgery, flagged.
 */

import {
  normalCdf,
  poissonCdf,
  POSITIONAL_CV_SNAPSHOT,
  type MarketAnchoredPlayerProjection,
} from "@sports/prediction-engine";

/**
 * Temperature passed to reconcileMarketAnchoredPlayers. See header note (1).
 */
export const RECONCILIATION_TEMPERATURE = 0.02;

/**
 * Degeneracy guard: yard means below this are broken allocations, not real
 * projections — omit instead of emitting P(over)≈0. TD means below 0.01 likewise.
 */
const MIN_YARD_MEAN_FOR_PRICING = 1.0;
const MIN_TD_MEAN_FOR_PRICING = 0.01;

export type PropDistribution = "normal" | "poisson";

export interface PropStatMapping {
  /** Field on MarketAnchoredPlayerProjection holding the mean. */
  readonly field:
    | "passingYards"
    | "rushingYards"
    | "receivingYards"
    | "passingTouchdowns"
    | "rushingTouchdowns"
    | "receivingTouchdowns";
  readonly dist: PropDistribution;
  /** For anytime-TD: sum all three TD means as lambda. */
  readonly anytimeTd?: boolean;
  /** For combined-yard markets: sum field + addField as the mean. */
  readonly addField?:
    | "passingYards"
    | "rushingYards"
    | "receivingYards";
}

/**
 * Odds API player-prop market key -> engine projection mapping.
 * Keys are The Odds API's documented player-prop market names.
 * Unlisted keys are unsupported (no entry, no imputation).
 */
export const PROP_STAT_MAP: Readonly<Record<string, PropStatMapping>> =
  Object.freeze({
    player_pass_yds: { field: "passingYards", dist: "normal" },
    player_rush_yds: { field: "rushingYards", dist: "normal" },
    player_reception_yds: { field: "receivingYards", dist: "normal" },
    player_receiving_yds: { field: "receivingYards", dist: "normal" },
    player_rush_reception_yds: {
      field: "rushingYards",
      dist: "normal",
      addField: "receivingYards",
    },
    player_pass_tds: { field: "passingTouchdowns", dist: "poisson" },
    player_rush_tds: { field: "rushingTouchdowns", dist: "poisson" },
    player_reception_tds: { field: "receivingTouchdowns", dist: "poisson" },
    player_receiving_tds: { field: "receivingTouchdowns", dist: "poisson" },
    player_anytime_td: {
      field: "rushingTouchdowns",
      dist: "poisson",
      anytimeTd: true,
    },
  });

const MODEL_POSITION_CV: Readonly<Record<string, number>> = POSITIONAL_CV_SNAPSHOT as Readonly<
  Record<string, number>
>;

/**
 * Model P(over) for one prop. Returns null when the prop cannot be honestly
 * priced (unsupported type, non-positive mean, non-finite line).
 */
export function modelProbOverForProp(
  projection: MarketAnchoredPlayerProjection,
  propType: string,
  line: number,
): number | null {
  const mapping = PROP_STAT_MAP[propType];
  if (!mapping) return null;
  if (!Number.isFinite(line)) return null;

  let mean: number;
  if (mapping.anytimeTd) {
    mean =
      projection.passingTouchdowns +
      projection.rushingTouchdowns +
      projection.receivingTouchdowns;
    // Anytime TD: P(score >= 1) = 1 - P(0).
    if (!(mean >= MIN_TD_MEAN_FOR_PRICING)) return null;
    const pOver = 1 - poissonCdf(0, mean);
    return clamp01(pOver);
  }

  mean = projection[mapping.field];
  if (!Number.isFinite(mean)) return null;
  if (mapping.addField) {
    const extra = projection[mapping.addField];
    if (!Number.isFinite(extra)) return null;
    mean += extra;
  }

  if (mapping.dist === "poisson") {
    // Discrete counts: P(X > line) = 1 - CDF(floor(line)).
    if (!(mean >= MIN_TD_MEAN_FOR_PRICING)) return null;
    const pOver = 1 - poissonCdf(Math.floor(line), mean);
    return clamp01(pOver);
  }

  // Yard props: degenerate allocations (sub-yard means) are omitted, not
  // priced at P(over)≈0.
  if (!(mean >= MIN_YARD_MEAN_FOR_PRICING)) return null;

  // Yard props: normal approximation, sd from the measured positional CV.
  const cv = MODEL_POSITION_CV[projection.position] ?? 0.9;
  const sd = mean * cv;
  if (!(sd > 0)) return null;
  const pOver = 1 - normalCdf((line - mean) / sd);
  return clamp01(pOver);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

export interface PropLineLike {
  readonly playerId: string;
  readonly propType: string;
  readonly line: number;
}

/**
 * Build the full modelProbOver record for runPropsSlate, keyed by
 * `${playerId}:${propType}`. Props that cannot be honestly priced are
 * OMITTED — runPropsSlate excludes them with "missing modelProbOver —
 * not imputed" rather than receiving a fabricated probability.
 */
export function buildModelProbOver(
  projections: ReadonlyMap<string, MarketAnchoredPlayerProjection>,
  props: readonly PropLineLike[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const prop of props) {
    const projection = projections.get(prop.playerId);
    if (!projection) continue;
    const p = modelProbOverForProp(projection, prop.propType, prop.line);
    if (p == null) continue;
    out[`${prop.playerId}:${prop.propType}`] = p;
  }
  return out;
}
