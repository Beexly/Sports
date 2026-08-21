/**
 * Clopper-Pearson presentation layer over the canonical exact interval in
 * `@sports/prediction-engine` (edge-lab/stats). One numeric core, no duplicate
 * formula — same split as wilson-interval.ts.
 *
 * Public surfaces use this for the HEADLINE rate. Wilson stays available for
 * fast approximate bands; Clopper-Pearson is the conservative exact band that
 * never under-covers, which is what a PROVEN page needs.
 */

import { clopperPearsonInterval as clopperPearsonLowHigh } from "../../../../packages/prediction-engine/src/edge-lab/stats";

export interface ClopperPearsonPresentation {
  /** Point estimate p̂ = successes / n, in 0..1. */
  readonly point: number;
  readonly low: number;
  readonly high: number;
  readonly n: number;
  /** Two-sided alpha (0.05 = 95%). */
  readonly alpha: number;
}

const ALPHA_95 = 0.05;

export function clopperPearsonInterval(
  successes: number,
  n: number,
  alpha: number = ALPHA_95,
): ClopperPearsonPresentation | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const total = Math.floor(n);
  const k = Math.min(total, Math.max(0, Math.floor(successes)));
  const { lower, upper, center } = clopperPearsonLowHigh(k, total, alpha);
  return {
    point: round(center, 4),
    low: round(clamp01(lower), 4),
    high: round(clamp01(upper), 4),
    n: total,
    alpha,
  };
}

/** Format as a percentage band, e.g. "48.1–71.9%". */
export function formatClopperPearsonPct(ci: ClopperPearsonPresentation, decimals = 1): string {
  return `${(ci.low * 100).toFixed(decimals)}-${(ci.high * 100).toFixed(decimals)}%`;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
