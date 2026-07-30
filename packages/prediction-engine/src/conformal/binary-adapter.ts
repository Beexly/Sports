/**
 * binary-adapter.ts — shadow pure functions only.
 *
 * Maps settled binary picks onto the existing Mondrian residual stack so
 * published SPREAD/TOTAL/ML picks can receive set-valued uncertainty under
 * the same finite-sample and hierarchical guarantees as fantasy-point intervals.
 *
 * THEORY
 * ------
 * - Split conformal (Vovk): empirical (n+1)-quantile of nonconformity scores
 *   yields P(cover) ≥ 1−α under exchangeability, finite sample.
 * - Mondrian: the same guarantee holds conditionally on each taxonomy category
 *   when residuals remain exchangeable inside that category.
 * - Hierarchical fallback (leaf → parent → "*") keeps lookups above minSamples;
 *   coverage attaches to the category actually used.
 * - ACI (tweedie-aci / conformal-intervals) adapts α online under shift;
 *   this adapter supplies the score function only.
 *
 * Nonconformity: s(p,y) = |p − y|  (= 1 − p_true). Stored as absolute residual.
 * Width on probability scale ≈ 2 × residual quantile (symmetric interval).
 *
 * SAFETY
 * ------
 * priced: false forever until a founder MODEL_VERSION gate.
 * Never imports live scoring, confidence, or public-copy modules.
 * PUSH/VOID excluded upstream (same contract as CalibrationSample).
 */

import {
  MondrianResidualManager,
  type QuantileLookupResult,
} from "./mondrian.js";
import {
  assignMondrianCategory,
  type SportsGameContext,
  type TaxonomyCategory,
} from "./sports-taxonomy.js";

/** Settled binary pick (PUSH/VOID excluded upstream). */
export interface BinaryPickSample {
  readonly sampleId: string;
  /** Modelled win probability in [0, 1]. */
  readonly p: number;
  /** Realized outcome: 1 = win, 0 = loss. */
  readonly y: 0 | 1;
  readonly ctx: SportsGameContext;
}

export interface BinaryConformalFit {
  readonly manager: MondrianResidualManager;
  readonly sampleSize: number;
  readonly level: 1 | 2;
  readonly priced: false;
  readonly status: "shadow";
}

export interface BinaryConformalLookup extends QuantileLookupResult {
  readonly width: number;
  readonly targetCoverage: number;
  readonly priced: false;
  readonly status: "shadow";
}

export interface AdaptiveBinaryInterval {
  readonly sampleId: string;
  readonly alpha: number;
  readonly residualQuantile: number;
  readonly covered: boolean;
  readonly priced: false;
  readonly status: "shadow";
}

/**
 * Absolute residual on the probability scale.
 * Non-finite p → 1 (maximally nonconforming) so bad forecasts cannot shrink intervals.
 */
export function nonconformityBinary(p: number, y: 0 | 1): number {
  if (!Number.isFinite(p)) return 1;
  const clamped = Math.max(0, Math.min(1, p));
  return Math.abs(clamped - y);
}

/**
 * Fit Mondrian residual stores from a calibration window of settled binary picks.
 * level=1 → "home|favorite" (default, sample-efficient)
 * level=2 → home|fav|rest (only when n is large enough per leaf)
 */
export function fitBinaryMondrian(
  samples: readonly BinaryPickSample[],
  options?: { readonly minSamples?: number; readonly level?: 1 | 2 },
): BinaryConformalFit {
  const level = options?.level ?? 1;
  const manager = new MondrianResidualManager({
    minSamples: options?.minSamples ?? 10,
    useGlobalFallback: true,
  });

  for (const s of samples) {
    const category: TaxonomyCategory = assignMondrianCategory(s.ctx, level);
    manager.add(category, nonconformityBinary(s.p, s.y));
  }

  return {
    manager,
    sampleSize: samples.length,
    level,
    priced: false,
    status: "shadow",
  };
}

/**
 * Lookup residual quantile for a new pick context.
 * width = 2 × quantile (symmetric half-width on [0,1]).
 * Large width or heavy fallback → natural abstention cue; never a price signal.
 */
export function binaryConformalLookup(
  fit: BinaryConformalFit,
  ctx: SportsGameContext,
  targetCoverage = 0.8,
): BinaryConformalLookup {
  const category = assignMondrianCategory(ctx, fit.level);
  const result = fit.manager.quantile(category, targetCoverage);
  return {
    ...result,
    width: 2 * result.quantile,
    targetCoverage,
    priced: false,
    status: "shadow",
  };
}

/**
 * Stream ACI-style α adaptation on binary residuals (same update rule as
 * tweedie-aci, on |p−y|). Still shadow; optional alternative to Mondrian fit.
 */
export function adaptiveBinaryConformal(
  samples: readonly BinaryPickSample[],
  targetCoverage = 0.8,
  learningRate = 0.05,
): readonly AdaptiveBinaryInterval[] {
  const state = new Map<string, { alpha: number; residuals: number[] }>();
  const targetError = 1 - targetCoverage;

  return samples.map((s) => {
    const cat = assignMondrianCategory(s.ctx, 1);
    const current = state.get(cat) ?? { alpha: targetError, residuals: [] };
    const sorted = [...current.residuals].sort((a, b) => a - b);
    const rank = Math.ceil((sorted.length + 1) * (1 - current.alpha));
    const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
    const residualQuantile = sorted.length === 0 ? 0 : sorted[idx]!;
    const residual = nonconformityBinary(s.p, s.y);
    const covered = residual <= residualQuantile;
    const miss = covered ? 0 : 1;
    const alpha = Math.min(
      0.5,
      Math.max(0.02, current.alpha + learningRate * (targetError - miss)),
    );
    state.set(cat, {
      alpha,
      residuals: [...current.residuals, residual],
    });
    return {
      sampleId: s.sampleId,
      alpha,
      residualQuantile,
      covered,
      priced: false as const,
      status: "shadow" as const,
    };
  });
}
