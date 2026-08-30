/**
 * Buy-low / sell-high hit-rate — the DISPLAY-SAFETY boundary.
 *
 * `predictiveness.ts` reports the raw fraction of buy-low/sell-high calls that
 * paid off, with no floor: at n=3, a single lucky call prints a colored "100%"
 * headline. That is exactly the shape of claim the FTC has sanctioned services
 * for (RagingBull — performance numbers "without written evidence those claims
 * are typical"), and it fails CLAUDE.md's "no fabricated stats" rule even
 * though every input is real — a thin sample dressed as a rate IS the
 * fabrication.
 *
 * This module is the pure decision layer `engine-view.tsx` renders through:
 *   - below MIN_HIT_RATE_SAMPLE decided calls, withhold the percentage
 *     entirely and show only the honest sample count (no tone color — there is
 *     nothing calibrated enough to color).
 *   - at/above the floor, show the point estimate AND the Wilson 95% lower
 *     bound side by side, and color by the LOWER BOUND, not the point
 *     estimate — matching /performance's standard (apps/web/lib/performance/
 *     wilson-interval.ts, apps/web/app/performance/page.tsx SportCard).
 *
 * The Wilson math itself is NOT duplicated here: `wilsonInterval` is the one
 * canonical implementation in `@sports/prediction-engine` (model-limitations.ts),
 * the same function `apps/web/lib/airwave/grade.ts` and (via the apps/web
 * count-based wrapper) `apps/web/lib/performance/wilson-interval.ts` both call.
 */

import { wilsonInterval } from "@sports/prediction-engine";
import { hitRateTone, type SignalTone } from "./colors";

/**
 * Minimum decided calls before a hit-rate is substantiated enough to publish
 * as a headline percentage. Mirrors the sample floor used on /performance;
 * below it we show the raw n instead of a rate that a single flip can swing
 * by double digits.
 */
export const MIN_HIT_RATE_SAMPLE = 25;

export interface InsufficientHitRate {
  readonly status: "insufficient";
  readonly n: number;
  /** e.g. "n=3 — too few to rate". No percentage, no tone. */
  readonly label: string;
}

export interface RatedHitRate {
  readonly status: "rated";
  readonly n: number;
  /** Point estimate, rounded to a whole percent (0-100). */
  readonly pct: number;
  /** Wilson 95% lower-confidence-bound, rounded to a whole percent (0-100). */
  readonly lcbPct: number;
  /** e.g. "62% (LCB 51%)". */
  readonly label: string;
  /** Driven by the LOWER BOUND, never the point estimate. */
  readonly tone: SignalTone;
}

export type HitRateDisplay = InsufficientHitRate | RatedHitRate;

/**
 * Decide how a buy-low / sell-high hit-rate should render for a given sample
 * size. Pure and side-effect-free so it is unit-testable without mounting
 * `engine-view.tsx`.
 */
export function describeHitRate(rate: number | null, n: number): HitRateDisplay {
  if (rate == null || n < MIN_HIT_RATE_SAMPLE) {
    return {
      status: "insufficient",
      n,
      label: `n=${n} — too few to rate`,
    };
  }

  const { low } = wilsonInterval(rate, n);
  const pct = Math.round(rate * 100);
  const lcbPct = Math.round(low * 100);

  return {
    status: "rated",
    n,
    pct,
    lcbPct,
    label: `${pct}% (LCB ${lcbPct}%)`,
    tone: hitRateTone(low),
  };
}
