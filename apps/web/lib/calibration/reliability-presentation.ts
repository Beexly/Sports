/**
 * Reliability-diagram PRESENTATION model — the honest accuracy-proof surface.
 *
 * The codebase already computes the raw calibration math (`confidenceBuckets`,
 * `brierScore`, ECE). This module adds the *presentation* layer that the research
 * on credible forecasters (Manifold, Metaculus, Good Judgment, FiveThirtyEight)
 * shows is what makes a track record trustworthy rather than just shown:
 *
 *   1. Per-bin CONSISTENCY BANDS — the interval the observed frequency would fall in
 *      IF the model were perfectly calibrated, given that bin's sample size. Lets a
 *      viewer (and us) tell real miscalibration from small-sample noise. (Metaculus's
 *      grey bands; 538's "within the confidence interval" language.)
 *   2. OVER/UNDER-CONFIDENCE labels per bin (below the band = overconfident; above =
 *      underconfident; inside = consistent with perfect calibration).
 *   3. The PLAIN-LANGUAGE readout 538/538-style: "We rated N picks ~70%; they won 71%."
 *   4. BRIER + a BRIER SKILL SCORE vs the honest 0.25 "always-50%" baseline (Good
 *      Judgment / Metaculus convention; >0 = better than a coin flip).
 *   5. The overall hit-rate with a WILSON confidence interval — never a bare point stat.
 *   6. A SAMPLE-SIZE GATE using the research thresholds (<100 proves little; ~250 a
 *      first gauge; 500+ credible) so nothing is over-claimed on thin data.
 *   7. A "truth in advertising" calibration VERDICT — what share of the (sample-weighted)
 *      record sits inside its consistency band.
 *
 * PURE module: no I/O, no fabrication. It computes only from real settled samples; with
 * too few samples it returns an honest "building the record" verdict rather than a number.
 * The reliability/performance page consumes this; it never invents a value.
 */

import { confidenceBuckets, type CalibrationBucket } from "./ece";
import { brierScore } from "./brier";

/** One settled, gradeable pick: a probability in [0,1] and a binary outcome. */
export interface ReliabilitySample {
  readonly probability: number;
  readonly outcome: 0 | 1;
}

/** z-multipliers for the two intervals we use. */
const Z_90 = 1.645; // consistency bands (per-bin)
const Z_95 = 1.96; // Wilson CI (overall hit-rate)

/** Always-50% baseline Brier — the "no skill / coin flip" reference. */
export const BASELINE_BRIER = 0.25;

/**
 * Research-backed sample-size gate. Below the floor a calibration claim is
 * variance, not skill; thresholds follow the betting-stats consensus.
 */
export type SampleGate = "building" | "early" | "developing" | "credible";
export const SAMPLE_FLOOR_BUILDING = 100; // < 100: proves little
export const SAMPLE_FLOOR_DEVELOPING = 250; // ~250: a first gauge (still ~25% down with a real edge)
export const SAMPLE_FLOOR_CREDIBLE = 500; // 500+: skill starts to separate from luck

export function sampleGate(n: number): SampleGate {
  if (n >= SAMPLE_FLOOR_CREDIBLE) return "credible";
  if (n >= SAMPLE_FLOOR_DEVELOPING) return "developing";
  if (n >= SAMPLE_FLOOR_BUILDING) return "early";
  return "building";
}

export type BinVerdict = "consistent" | "overconfident" | "underconfident" | "insufficient";

export interface ReliabilityBin {
  readonly lower: number;
  readonly upper: number;
  readonly count: number;
  /** Mean predicted probability in the bin (x-axis). */
  readonly predicted: number;
  /** Observed win frequency in the bin (y-axis). */
  readonly observed: number;
  /** Consistency band [lo,hi] the observed freq would fall in under perfect calibration. */
  readonly bandLo: number;
  readonly bandHi: number;
  /** Is the observed frequency inside the consistency band? */
  readonly withinBand: boolean;
  readonly verdict: BinVerdict;
  /** Plain-language readout, e.g. "We rated 142 picks ~70%; they won 71%." */
  readonly readout: string;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

const pct = (x: number): number => Math.round(x * 100);

/**
 * Consistency band for a bin: under perfect calibration the observed frequency is
 * ~ Normal(p, sqrt(p(1-p)/n)). Returns the 90% band, clamped to [0,1]. A degenerate
 * bin (n=0, or p at 0/1) collapses to the point p.
 */
export function consistencyBand(predicted: number, n: number): { lo: number; hi: number } {
  if (n <= 0) return { lo: predicted, hi: predicted };
  const se = Math.sqrt(Math.max(0, predicted * (1 - predicted)) / n);
  return { lo: clamp01(predicted - Z_90 * se), hi: clamp01(predicted + Z_90 * se) };
}

/** Wilson score interval for k successes in n trials (defaults to 95%). */
export function wilsonInterval(
  k: number,
  n: number,
  z: number = Z_95,
): { point: number; lo: number; hi: number } {
  if (n <= 0) return { point: 0, lo: 0, hi: 0 };
  const phat = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (phat + z2 / (2 * n)) / denom;
  const half = (z / denom) * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n));
  return { point: phat, lo: clamp01(center - half), hi: clamp01(center + half) };
}

function enrichBin(b: CalibrationBucket): ReliabilityBin {
  const predicted = b.avgConfidence;
  const observed = b.accuracy;
  if (b.count === 0) {
    return {
      lower: b.lower,
      upper: b.upper,
      count: 0,
      predicted,
      observed,
      bandLo: predicted,
      bandHi: predicted,
      withinBand: true,
      verdict: "insufficient",
      readout: `No settled picks rated ~${pct((b.lower + b.upper) / 2)}% yet.`,
    };
  }
  const { lo, hi } = consistencyBand(predicted, b.count);
  const withinBand = observed >= lo && observed <= hi;
  // Below the band → we predicted higher than it happened → overconfident.
  // Above the band → we predicted lower than it happened → underconfident.
  const verdict: BinVerdict = withinBand
    ? "consistent"
    : observed < lo
      ? "overconfident"
      : "underconfident";
  return {
    lower: b.lower,
    upper: b.upper,
    count: b.count,
    predicted,
    observed,
    bandLo: lo,
    bandHi: hi,
    withinBand,
    verdict,
    readout: `We rated ${b.count} pick${b.count === 1 ? "" : "s"} ~${pct(predicted)}%; ${
      b.count === 1 ? "it" : "they"
    } won ${pct(observed)}%.`,
  };
}

export interface ReliabilityPresentation {
  readonly sampleSize: number;
  readonly gate: SampleGate;
  /** True once the sample clears the floor where a calibration claim means something. */
  readonly displayReady: boolean;
  readonly bins: readonly ReliabilityBin[];
  readonly brier: number;
  /** Brier skill vs the always-50% baseline: 1 - brier/0.25. >0 = better than a coin flip. */
  readonly brierSkillVsBaseline: number;
  /** Overall observed win rate with a 95% Wilson interval (null until any picks settle). */
  readonly hitRate: { point: number; lo: number; hi: number } | null;
  /** Share of the sample-weighted record sitting inside its consistency band [0,1]. */
  readonly withinBandShare: number;
  /** One honest line summarizing the calibration verdict for the current sample. */
  readonly verdictLine: string;
}

/**
 * Build the full presentation model from real settled samples. Honest by construction:
 * below the sample floor it reports "building the record" rather than drawing conclusions.
 * `bucketCount` defaults to 20 (binning to the nearest 5%, the 538/Manifold convention).
 */
export function buildReliabilityPresentation(
  samples: readonly ReliabilitySample[],
  bucketCount = 20,
): ReliabilityPresentation {
  const n = samples.length;
  const gate = sampleGate(n);
  const displayReady = n >= SAMPLE_FLOOR_BUILDING;
  const bins = confidenceBuckets(samples, bucketCount).map(enrichBin);

  const brier = brierScore(samples);
  const brierSkillVsBaseline = BASELINE_BRIER > 0 ? 1 - brier / BASELINE_BRIER : 0;

  const wins = samples.reduce((s, x) => s + x.outcome, 0);
  const hitRate = n > 0 ? wilsonInterval(wins, n) : null;

  const populated = bins.filter((b) => b.count > 0);
  const weighted = populated.reduce((s, b) => s + b.count, 0);
  const withinWeighted = populated
    .filter((b) => b.withinBand)
    .reduce((s, b) => s + b.count, 0);
  const withinBandShare = weighted > 0 ? withinWeighted / weighted : 0;

  let verdictLine: string;
  if (!displayReady) {
    verdictLine = `Building the record — ${n} of ${SAMPLE_FLOOR_BUILDING} settled picks. We don't draw the curve on a thin sample.`;
  } else {
    const sharePct = Math.round(withinBandShare * 100);
    const skill = brierSkillVsBaseline;
    const skillNote =
      skill > 0
        ? `beats the always-50% baseline (Brier ${brier.toFixed(3)} vs ${BASELINE_BRIER})`
        : `does not yet beat the always-50% baseline (Brier ${brier.toFixed(3)})`;
    verdictLine = `${sharePct}% of the record sits inside its consistency band, and the model ${skillNote}. ${
      gate === "credible"
        ? "Sample is large enough to separate skill from luck."
        : "Read with its sample size — the record is still maturing."
    }`;
  }

  return {
    sampleSize: n,
    gate,
    displayReady,
    bins,
    brier,
    brierSkillVsBaseline,
    hitRate,
    withinBandShare,
    verdictLine,
  };
}
