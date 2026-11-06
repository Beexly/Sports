/**
 * Dual-signal honesty helper: multiprobability width × Mondrian residual scale.
 *
 * WHY: The selective gate already treats multiprob width as a first-class
 * No-Bet. Mondrian quantiles answer a different question — how large residuals
 * tend to be *in this subgroup*. Acting only when BOTH signals are calm is
 * stricter than either alone and matches the product doctrine (No-Bet is
 * first-class; apparent edge never overrides honesty).
 *
 * WHAT THIS IS NOT:
 *   - Not a firing authority (applySelectiveGate remains sole FIRE path)
 *   - Not a ledger writer
 *   - Not a replacement for the Risk/Honesty Guardian (it can FEED the guardian)
 *
 * Pure functions. Deterministic. Safe to call from council context builders.
 */

import type { QuantileLookupResult } from "../conformal/mondrian.js";

/** Multiprobability interval already computed by IVAP/CVAP/legacy isotonic. */
export interface MultiprobSignal {
  readonly p0: number;
  readonly p1: number;
  /** upper − lower; must be >= 0 */
  readonly width: number;
}

export interface DualSignalInput {
  readonly multiprob: MultiprobSignal;
  /**
   * Result of MondrianResidualManager.quantile for this row's category.
   * Undefined means "Mondrian residual scale was not computed" — treated as
   * unknown, not as zero risk.
   */
  readonly mondrian?: QuantileLookupResult;
  /** Max acceptable multiprob width (same spirit as maxWidthForFire). */
  readonly maxWidth?: number;
  /**
   * Max acceptable Mondrian residual quantile at the operating probability.
   * e.g. if quantile is abs-residual at 90%, 0.15 means "in this category,
   * 90% of residuals were ≤ 0.15." Undefined disables the residual check.
   */
  readonly maxMondrianQuantile?: number;
  /** Minimum Mondrian sample size before trusting the quantile. Default 10. */
  readonly minMondrianSamples?: number;
}

export type DualSignalVerdict =
  | "clear"
  | "width_veto"
  | "mondrian_veto"
  | "mondrian_underpowered"
  | "mondrian_unknown"
  | "both_veto";

export interface DualSignalResult {
  readonly verdict: DualSignalVerdict;
  readonly noBet: boolean;
  readonly reasons: readonly string[];
  readonly multiprobWidth: number;
  readonly mondrianQuantile: number | null;
  readonly mondrianSampleSize: number | null;
  readonly mondrianCategory: string | null;
  readonly usedMondrianFallback: boolean | null;
}

function orderedWidth(mp: MultiprobSignal): number {
  if (Number.isFinite(mp.width) && mp.width >= 0) return mp.width;
  const lower = Math.min(mp.p0, mp.p1);
  const upper = Math.max(mp.p0, mp.p1);
  return upper - lower;
}

/**
 * Combine multiprob width and Mondrian residual quantile into one honesty verdict.
 *
 * Priority of reasons (all applicable reasons are collected; verdict reflects
 * the strongest combined state):
 *   both_veto > width_veto / mondrian_veto > mondrian_underpowered / unknown > clear
 */
export function evaluateDualSignal(input: DualSignalInput): DualSignalResult {
  const width = orderedWidth(input.multiprob);
  const maxWidth = input.maxWidth;
  const minSamples = input.minMondrianSamples ?? 10;

  const reasons: string[] = [];
  let widthBad = false;
  let mondrianBad = false;
  let mondrianUnderpowered = false;
  let mondrianUnknown = false;

  if (maxWidth !== undefined && width > maxWidth) {
    widthBad = true;
    reasons.push(
      `multiprob width ${width.toFixed(4)} exceeds maxWidth ${maxWidth} — calibration does not pin this probability`,
    );
  }

  let mondrianQuantile: number | null = null;
  let mondrianSampleSize: number | null = null;
  let mondrianCategory: string | null = null;
  let usedMondrianFallback: boolean | null = null;

  if (input.mondrian === undefined) {
    mondrianUnknown = true;
    reasons.push("Mondrian residual scale not supplied — unknown, not zero risk");
  } else {
    mondrianQuantile = input.mondrian.quantile;
    mondrianSampleSize = input.mondrian.sampleSize;
    mondrianCategory = input.mondrian.category;
    usedMondrianFallback = input.mondrian.usedFallback;

    if (input.mondrian.sampleSize < minSamples) {
      mondrianUnderpowered = true;
      reasons.push(
        `Mondrian category "${input.mondrian.category}" has n=${input.mondrian.sampleSize} ` +
          `< minSamples ${minSamples} — insufficient evidence for group-conditional residual scale`,
      );
    } else if (
      input.maxMondrianQuantile !== undefined &&
      input.mondrian.quantile > input.maxMondrianQuantile
    ) {
      mondrianBad = true;
      reasons.push(
        `Mondrian quantile ${input.mondrian.quantile.toFixed(4)} in "${input.mondrian.category}" ` +
          `exceeds maxMondrianQuantile ${input.maxMondrianQuantile} — residual scale too large in this subgroup`,
      );
    }
  }

  let verdict: DualSignalVerdict;
  if (widthBad && mondrianBad) verdict = "both_veto";
  else if (widthBad) verdict = "width_veto";
  else if (mondrianBad) verdict = "mondrian_veto";
  else if (mondrianUnderpowered) verdict = "mondrian_underpowered";
  else if (mondrianUnknown) verdict = "mondrian_unknown";
  else verdict = "clear";

  // noBet: hard veto only on width/mondrian failures. Underpowered/unknown are
  // honesty flags — callers may treat them as no-bet or as "review" depending
  // on product posture. Default: only explicit vetoes force noBet=true so the
  // helper stays composable with the guardian's own sample-size checks.
  const noBet = widthBad || mondrianBad;

  return {
    verdict,
    noBet,
    reasons,
    multiprobWidth: width,
    mondrianQuantile,
    mondrianSampleSize,
    mondrianCategory,
    usedMondrianFallback,
  };
}

/**
 * Map a dual-signal result into fields useful for EdgeLabContext / guardian.
 * Does not construct a full context — caller merges.
 */
export function dualSignalToHonestyHints(result: DualSignalResult): {
  readonly noBetSignal: boolean;
  readonly honestyFlags: readonly string[];
  readonly reviewRecommended: boolean;
} {
  return {
    noBetSignal: result.noBet,
    honestyFlags: result.reasons,
    reviewRecommended:
      result.verdict === "mondrian_underpowered" ||
      result.verdict === "mondrian_unknown",
  };
}
