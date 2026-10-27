/**
 * Split-conformal residual diagnostic (pre-seal only).
 *
 * Residual definition:
 *   residual = model_total - external_trueOdds
 *
 * where external_trueOdds is the market's closing/consensus total for the game
 * (or the DraftKings trueOdds when present). For games absent from the master
 * slate — notably PHI@WAS and KC@DEN in week 7 — the public board total is used
 * as the proxy and the game is tagged `proxy: true` so the evidence is honest.
 *
 * Split-conformal band at alpha = 0.1:
 *   1. Sort |residual| ascending.
 *   2. q = ceil((n + 1) * (1 - alpha)) / n  -> the empirical quantile level.
 *   3. band = [-qHat, +qHat] where qHat is the q-th smallest |residual|.
 *
 * Outliers are residuals whose absolute value exceeds the band. The full
 * residual vector is persisted as evidence in the candidate baseline.
 */

import type { ConformalResult } from "./types.js";
import { devigTotalToFairLine } from "./devig-helper.js";

export interface ResidualObservation {
  game: string;
  modelTotal: number;
  /**
   * The external "true" total. When `trueOdds` is supplied this is ignored and
   * recomputed from the devigged, bias-corrected pair.
   */
  externalTrueOdds?: number;
  /**
   * DK trueOdds over/under pair. When present the diagnostic devigs it and
   * subtracts the measured +0.0537 favorite residual before comparing, so the
   * reader never treats a vigged number as fair.
   */
  trueOdds?: { over: number; under: number };
  /** Model P10/P90 for the total, used to invert a corrected probability. */
  p10?: number | null;
  p90?: number | null;
  /** Raw market total, used as the fallback when devig inputs are missing. */
  rawMarketTotal?: number;
  /** True when the external total came from a public board proxy. */
  proxy?: boolean;
  /**
   * Output tag set by `resolveExternalTotal`. True when the observation was
   * resolved from a devigged DK trueOdds pair; false when it fell back to the
   * single-total residual path. Input values are ignored.
   */
  devig?: boolean;
}

export interface ResolvedExternalTotal {
  total: number;
  proxy: boolean;
  devig: boolean;
}

/**
 * Resolve the external "true" total for an observation.
 *
 * If a trueOdds pair plus P10/P90 is present, devig and bias-correct it and
 * invert back to a total line (`devig: true`). Otherwise fall back to
 * externalTrueOdds, and finally to the raw market total (`devig: false`).
 * The returned `proxy` flag is true whenever the devigged path was unavailable.
 */
export function resolveExternalTotal(o: ResidualObservation): ResolvedExternalTotal {
  if (o.trueOdds && o.p10 != null && o.p90 != null) {
    const raw = o.rawMarketTotal ?? o.externalTrueOdds ?? 0;
    const fair = devigTotalToFairLine(o.trueOdds.over, o.trueOdds.under, o.p10, o.p90, raw);
    return { total: fair, proxy: fair === raw, devig: true };
  }
  return { total: o.externalTrueOdds ?? o.rawMarketTotal ?? 0, proxy: true, devig: false };
}

/** Empirical quantile of an already-sorted ascending array. */
function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  const frac = pos - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/**
 * Run the split-conformal diagnostic.
 *
 * Pure function: no seal() call, no tau mutation. Returns the band, the
 * residual vector, and the outlier flags. Caller persists into the candidate.
 */
export function runConformalDiagnostic(
  observations: ResidualObservation[],
  alpha = 0.1,
): ConformalResult {
  // Every observation is resolved through the devig path first. A reader that
  // still treats trueOdds as fair would silently understate the residual.
  // The resolved copy carries `devig: true` when a pair was devigged and
  // `devig: false` when the single-total residual path was used.
  const resolved = observations.map((o) => ({ ...o, ...resolveExternalTotal(o) }));
  const residuals = resolved.map(({ modelTotal, total }) => Number((modelTotal - total).toFixed(4)));
  const absSorted = residuals.map(Math.abs).sort((a, b) => a - b);

  const n = residuals.length;
  const qLevel = n > 0 ? Math.min(1, Math.ceil((n + 1) * (1 - alpha)) / n) : 0;
  const qHat = quantileSorted(absSorted, qLevel);

  const flagged: ConformalResult["flagged"] = [];
  resolved.forEach(({ proxy, devig }, i) => {
    const r = residuals[i]!;
    if (Math.abs(r) > qHat) {
      const tags = [
        devig ? "devig: true" : "devig: false",
        ...(proxy ? ["proxy trueOdds"] : []),
      ].join(", ");
      flagged.push({
        index: i,
        residual: r,
        reason: `|${r}| > band ${qHat.toFixed(2)} (${tags})`,
      });
    }
  });

  const coverage = n > 0 ? 1 - flagged.length / n : 0;

  return {
    alpha,
    band: { lower: Number((-qHat).toFixed(4)), upper: Number(qHat.toFixed(4)) },
    residuals,
    flagged,
    n,
    coverage: Number(coverage.toFixed(4)),
  };
}
