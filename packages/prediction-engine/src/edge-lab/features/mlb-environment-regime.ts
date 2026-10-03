/**
 * MLB league run-environment regime detector.
 *
 * WHAT THIS IS
 * Detects step-changes in the league run environment (HR per game, runs per game)
 * from chronological league-average data. The motivating lead is the 2026-06-24
 * @dugoutforever save ("Is MLB juicing the balls again?", citing Action Network):
 * that claim is UNVERIFIED and this module does NOT assert it. What it does is
 * the honest, data-driven version: if the ball (or anything else) ever changes
 * the run environment mid-season, this detector flags the era boundary from the
 * numbers — no claim ingestion required.
 *
 * Method: CUSUM on the per-period league rate vs a trailing baseline. A regime
 * shift fires only when the cumulative deviation exceeds a threshold AND the new
 * level sustains for `minSustain` periods — a step, not a flip-flop or a spike.
 * Pure function; produces leak-safe era flags for the context matrix. It never
 * computes a pick, never fires a bet, never recommends one.
 */

export interface EnvRegimePoint {
  /** Period label, e.g. "2026-W18". */
  readonly period: string;
  /** League HR per game (or runs per game) in this period. */
  readonly rate: number;
  /** Games (or plate appearances) behind this period's rate — precision weight. */
  readonly weight?: number;
}

export interface EnvRegimeShift {
  readonly period: string;
  /** Index in the input series where the new regime starts. */
  readonly index: number;
  readonly direction: "up" | "down";
  /** New-regime mean minus old-regime mean, in rate units. */
  readonly magnitude: number;
  /** New-regime mean rate. */
  readonly newMean: number;
  /** Old-regime mean rate. */
  readonly oldMean: number;
}

export interface EnvRegimeOptions {
  /** Trailing periods used for the baseline mean. Default 8. */
  readonly baselineWindow?: number;
  /** CUSUM trigger in baseline-std units. Default 4. */
  readonly cusumThreshold?: number;
  /** Periods the new level must sustain before firing. Default 3. */
  readonly minSustain?: number;
  /** Minimum absolute rate change to count (avoids dust). Default 0.02 HR/G. */
  readonly minMagnitude?: number;
}

export interface EnvRegimeResult {
  readonly shifts: readonly EnvRegimeShift[];
  /** Mean rate of the current (most recent) era. */
  readonly currentMean: number;
  /** Period where the current era started (or the first period if no shift). */
  readonly currentEraStart: string;
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function std(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1));
}

export function detectEnvRegime(series: readonly EnvRegimePoint[], opts: EnvRegimeOptions = {}): EnvRegimeResult {
  const baselineWindow = opts.baselineWindow ?? 8;
  const cusumThreshold = opts.cusumThreshold ?? 4;
  const minSustain = opts.minSustain ?? 3;
  const minMagnitude = opts.minMagnitude ?? 0.02;

  const shifts: EnvRegimeShift[] = [];
  if (series.length < baselineWindow + minSustain + 1) {
    const m = series.length ? mean(series.map((p) => p.rate)) : 0;
    return { shifts, currentMean: m, currentEraStart: series[0]?.period ?? "" };
  }

  let eraStart = 0;
  let i = baselineWindow;
  while (i < series.length) {
    const baseline = series.slice(eraStart, i).map((p) => p.rate);
    const mu = mean(baseline);
    const sigma = std(baseline, mu) || 1e-9;

    // CUSUM scan forward from i for a sustained step.
    let cumPos = 0;
    let cumNeg = 0;
    let fired: EnvRegimeShift | null = null;
    for (let j = i; j < series.length; j++) {
      const dev = (series[j]!.rate - mu) / sigma;
      cumPos = Math.max(0, cumPos + dev - 0.5);
      cumNeg = Math.min(0, cumNeg + dev + 0.5);
      if (cumPos > cusumThreshold || cumNeg < -cusumThreshold) {
        // Candidate step at j: the new level must sustain in the periods AFTER j.
        // (Excluding the trigger point itself, so a lone spike can't confirm itself.)
        const dir = cumPos > cusumThreshold ? "up" : "down";
        const sustainEnd = Math.min(series.length, j + 1 + minSustain);
        const newSeg = series.slice(j + 1, sustainEnd).map((p) => p.rate);
        if (newSeg.length < minSustain) break; // not enough future to confirm
        const newMean = mean(newSeg);
        const magnitude = newMean - mu;
        if (Math.abs(magnitude) >= minMagnitude && (dir === "up") === magnitude > 0) {
          fired = {
            period: series[j]!.period,
            index: j,
            direction: dir,
            magnitude,
            newMean,
            oldMean: mu,
          };
        }
        break;
      }
    }
    if (!fired) break;
    shifts.push(fired);
    eraStart = fired.index;
    i = fired.index + baselineWindow;
  }

  const current = series.slice(eraStart).map((p) => p.rate);
  return {
    shifts,
    currentMean: mean(current),
    currentEraStart: series[eraStart]!.period,
  };
}
