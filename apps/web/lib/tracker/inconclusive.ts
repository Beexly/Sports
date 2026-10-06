/**
 * Inconclusive disclosure — withhold the verdict when the interval straddles it.
 *
 * WHY THIS EXISTS (wave 4, issue #806). GSE already computes a Wilson 95% band
 * (lib/airwave/grade.ts) but no surface ever *uses* it to withhold a claim: the
 * string "inconclusive" appeared zero times across lib/ app/ components/. A
 * 3-of-7 record and a 300-of-700 record rendered with the same authority.
 *
 * The competitor worth imitating here is wbp318/cfb_2026, which leads its README
 * with the unproven result — n=51, flat ROI −2.1%, 95% CI [−40%, +41%] — and
 * labels every verdict inconclusive. One of 22 profiled repos does this; it is
 * the one whose number we could actually trust.
 *
 * HONESTY RULES:
 *  1. Below the sample floor there is no rate at all — `rate` is null and the
 *     reason states the shortfall. It is never 0%.
 *  2. A band that contains the threshold yields `inconclusive`. That is the
 *     point of the module: the interval we already compute gets a vote.
 *  3. The band always travels with the rate. No point estimate leaves here naked.
 *  4. Reuses the repo's canonical Wilson presentation layer
 *     (lib/performance/wilson-interval.ts, itself delegating to
 *     @sports/prediction-engine) — one numeric core, so the label and the
 *     surface can never disagree about the interval.
 */

import { wilsonInterval } from "@/lib/performance/wilson-interval";

/** Default sample floor. Below this, no rate is reported. */
export const DEFAULT_MIN_SAMPLE = 30;

export type Confidence = "conclusive" | "inconclusive";

export type RateRead = {
  readonly hits: number;
  readonly n: number;
  /** Observed rate, or null below the sample floor. Never 0 as a stand-in. */
  readonly rate: number | null;
  /** Wilson 95% band the verdict was drawn from. */
  readonly low: number;
  readonly high: number;
  /** The value the band is being tested against (e.g. 0 for ROI, 0.5 for a coin flip). */
  readonly threshold: number;
  readonly confidence: Confidence;
  /** Human-readable justification, always present. */
  readonly reason: string;
};

/**
 * Read a hit rate with an explicit confidence verdict.
 *
 * @param hits  successes observed
 * @param n     decided observations
 * @param opts  threshold (default 0.5) and minSample (default 30)
 */
export function readRate(
  hits: number,
  n: number,
  opts: { threshold?: number; minSample?: number } = {},
): RateRead {
  const threshold = opts.threshold ?? 0.5;
  const minSample = opts.minSample ?? DEFAULT_MIN_SAMPLE;

  if (!Number.isFinite(hits) || !Number.isFinite(n) || n < 0 || hits < 0 || hits > n) {
    throw new Error(`readRate: invalid counts (hits=${hits}, n=${n})`);
  }

  if (n < minSample) {
    const band = { low: 0, high: 1 };
    return {
      hits,
      n,
      rate: null,
      low: band.low,
      high: band.high,
      threshold,
      confidence: "inconclusive",
      reason:
        `n=${n}, minimum ${minSample} — no rate is reported below the sample floor. ` +
        `This is "not yet measurable", not a 0% result.`,
    };
  }

  const rate = hits / n;
  const band = wilsonInterval(hits, n);
  if (band === null) {
    // Only reachable if the canonical layer rejects the counts; never invent a band.
    return {
      hits,
      n,
      rate: null,
      low: 0,
      high: 1,
      threshold,
      confidence: "inconclusive",
      reason: `n=${n} — the interval layer returned no band, so no verdict is available.`,
    };
  }
  const { low, high } = band;

  if (low <= threshold && threshold <= high) {
    return {
      hits,
      n,
      rate,
      low,
      high,
      threshold,
      confidence: "inconclusive",
      reason:
        `Observed ${(rate * 100).toFixed(1)}% on n=${n}, but the 95% interval ` +
        `[${(low * 100).toFixed(1)}%, ${(high * 100).toFixed(1)}%] contains the ` +
        `${(threshold * 100).toFixed(1)}% threshold — inconclusive.`,
    };
  }

  const above = rate > threshold;
  return {
    hits,
    n,
    rate,
    low,
    high,
    threshold,
    confidence: "conclusive",
    reason:
      `Observed ${(rate * 100).toFixed(1)}% on n=${n}; the 95% interval ` +
      `[${(low * 100).toFixed(1)}%, ${(high * 100).toFixed(1)}%] lies entirely ` +
      `${above ? "above" : "below"} the ${(threshold * 100).toFixed(1)}% threshold.`,
  };
}

/** Render a rate read for display: band always attached, em-dash when unmeasured. */
export function formatRateRead(read: RateRead): string {
  if (read.rate === null) return `— (${read.reason})`;
  const band = `[${(read.low * 100).toFixed(1)}%, ${(read.high * 100).toFixed(1)}%]`;
  const label = read.confidence === "inconclusive" ? "inconclusive" : "conclusive";
  return `${(read.rate * 100).toFixed(1)}% ${band} (n=${read.n}, ${label})`;
}

/** True when the band is too wide to support a claim either way. */
export function isWideBand(read: RateRead, maxWidth = 0.4): boolean {
  return read.high - read.low > maxWidth;
}
