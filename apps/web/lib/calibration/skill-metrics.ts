/**
 * Skill metrics for the public calibration report (ASTRA A-12 / DeepSeek Phase 0).
 *
 * ADDITIVE ONLY. This module never changes a floor, a gate, a bin count, or an
 * env flag. It computes the honest skill picture next to the existing Brier /
 * ECE so a reader (or a future founder-approved gate) can see:
 *
 *   - BSS          Brier Skill Score vs the no-skill (base-rate) forecast
 *   - NLL          negative log-likelihood (Bregman companion to Brier)
 *   - Murphy       REL / RES / UNC on the same equal-width bins
 *   - nullBand     how much ECE a perfectly calibrated forecaster would show
 *                  on THIS sample, plus whether the observed ECE sits inside it
 *
 * Synthetic-forecaster contract (tested in skill-metrics.test.ts):
 *   - A perfectly calibrated forecaster has BSS ≈ 0, RES ≈ 0, ECE inside the
 *     null band, and NLL ≈ the entropy of the base rate.
 *   - A constant base-rate forecaster has BSS = 0, RES = 0 exactly, and ECE
 *     inside the null band (it is calibrated, just useless).
 *   - An overconfident forecaster has BSS < 0 and ECE outside the null band.
 */

import { brierDecomposition } from "@sports/prediction-engine";
import { debiasedExpectedCalibrationError } from "./ece-debiased";

export interface SkillSample {
  readonly p: number;
  readonly y: 0 | 1;
}

export interface MurphySplit {
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly baseRate: number;
  /** REL − RES + UNC. Equals Brier only when p is constant inside bins. */
  readonly brier: number;
}

export interface NullBandEce {
  readonly raw: number;
  readonly debiased: number;
  /** Mean ECE of a perfectly calibrated forecaster on these forecasts. */
  readonly nullMean: number;
  /**
   * 95th percentile of the null ECE distribution. Observed raw ECE at or below
   * this is indistinguishable from perfect calibration at this n.
   */
  readonly nullQ95: number;
  /** Diagnostic only — never a gate. True when raw <= nullQ95. */
  readonly withinNullBand: boolean;
  readonly bins: number;
}

export interface SkillMetrics {
  readonly sampleSize: number;
  readonly brier: number;
  /** BSS = 1 − Brier / UNC. Null when UNC is 0 (degenerate sample). */
  readonly bss: number | null;
  /** Negative log-likelihood, averaged. Lower is better. */
  readonly nll: number;
  /** NLL of the no-skill base-rate forecast, for comparison. */
  readonly nllReference: number | null;
  readonly murphy: MurphySplit;
  readonly nullBand: NullBandEce;
  /** One-line plain-English read. Never invents a skill claim. */
  readonly note: string;
}

const EPS = 1e-12;
const DEFAULT_BINS = 10;
const NULL_REPS = 400;
const NULL_SEED = 0x5eed_a57a;

function clamp01(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function binIndex(p: number, bins: number): number {
  const clamped = Math.min(1, Math.max(0, p));
  return Math.min(bins - 1, Math.floor(clamped * bins));
}

function eceFromSums(
  n: number,
  count: readonly number[],
  forecastSum: readonly number[],
  outcomeSum: readonly number[],
): number {
  let ece = 0;
  for (let b = 0; b < count.length; b += 1) {
    const nk = count[b] ?? 0;
    if (nk === 0) continue;
    ece += (nk / n) * Math.abs((forecastSum[b] ?? 0) / nk - (outcomeSum[b] ?? 0) / nk);
  }
  return ece;
}

function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx]!;
}

/**
 * Null-band ECE: keep every forecast p_i, redraw y_i ~ Bernoulli(p_i) many
 * times, collect the binned ECE of each draw, and report the mean and q95.
 * The observed raw ECE sitting inside this band means "indistinguishable from
 * perfect calibration at this sample size" — it does NOT mean the model is good.
 */
function nullBandEce(
  samples: readonly SkillSample[],
  bins: number,
  reps: number,
  seed: number,
): { nullMean: number; nullQ95: number } {
  const n = samples.length;
  if (n === 0) return { nullMean: 0, nullQ95: 0 };

  const count = new Array<number>(bins).fill(0);
  const forecastSum = new Array<number>(bins).fill(0);
  for (const s of samples) {
    const b = binIndex(s.p, bins);
    count[b] = (count[b] ?? 0) + 1;
    forecastSum[b] = (forecastSum[b] ?? 0) + s.p;
  }

  const rand = mulberry32(seed);
  const nullEces: number[] = [];
  for (let r = 0; r < reps; r += 1) {
    const outcomeSum = new Array<number>(bins).fill(0);
    for (let i = 0; i < n; i += 1) {
      const s = samples[i]!;
      const y = rand() < s.p ? 1 : 0;
      const b = binIndex(s.p, bins);
      outcomeSum[b] = (outcomeSum[b] ?? 0) + y;
    }
    nullEces.push(eceFromSums(n, count, forecastSum, outcomeSum));
  }
  nullEces.sort((a, b) => a - b);
  const nullMean = nullEces.reduce((sum, v) => sum + v, 0) / nullEces.length;
  return { nullMean: round6(nullMean), nullQ95: round6(percentile(nullEces, 0.95)) };
}

function buildNote(m: {
  bss: number | null;
  resolution: number;
  nullWithin: boolean;
  n: number;
}): string {
  if (m.n === 0) return "No settled sample. Skill metrics stay dark.";
  const bssRead =
    m.bss === null
      ? "BSS undefined (degenerate sample)."
      : m.bss > 0
        ? `BSS ${m.bss.toFixed(3)} — better Brier than the no-skill base-rate forecast.`
        : m.bss === 0
          ? "BSS 0 — matches the no-skill base-rate forecast exactly."
          : `BSS ${m.bss.toFixed(3)} — worse Brier than the no-skill base-rate forecast.`;
  const resRead =
    m.resolution > 0
      ? `RES ${m.resolution.toFixed(4)} — some ranking power across confidence bins.`
      : "RES 0 — no ranking power; a constant-in-disguise forecast.";
  const eceRead = m.nullWithin
    ? "ECE sits inside the calibrated null band (indistinguishable from perfect calibration at this n)."
    : "ECE sits OUTSIDE the calibrated null band — real calibration error, not sampling noise.";
  return `${bssRead} ${resRead} ${eceRead}`;
}

/**
 * Compute the skill picture for a settled (p, y) sample.
 * Pure. Deterministic. Never writes. Never changes a floor.
 */
export function computeSkillMetrics(
  samples: readonly SkillSample[],
  options: { readonly bins?: number; readonly nullReps?: number; readonly seed?: number } = {},
): SkillMetrics {
  const bins = options.bins ?? DEFAULT_BINS;
  const nullReps = options.nullReps ?? NULL_REPS;
  const seed = options.seed ?? NULL_SEED;
  const n = samples.length;

  if (n === 0) {
    return {
      sampleSize: 0,
      brier: 0,
      bss: null,
      nll: 0,
      nllReference: null,
      murphy: { reliability: 0, resolution: 0, uncertainty: 0, baseRate: 0, brier: 0 },
      nullBand: { raw: 0, debiased: 0, nullMean: 0, nullQ95: 0, withinNullBand: true, bins },
      note: "No settled sample. Skill metrics stay dark.",
    };
  }

  const baseRate = samples.reduce((sum, s) => sum + s.y, 0) / n;
  const brier = samples.reduce((sum, s) => sum + (s.p - s.y) ** 2, 0) / n;
  const uncertainty = baseRate * (1 - baseRate);
  const bss = uncertainty > EPS ? 1 - brier / uncertainty : null;

  const nll =
    samples.reduce((sum, s) => {
      const p = clamp01(s.p);
      return sum + (s.y === 1 ? -Math.log(p) : -Math.log(1 - p));
    }, 0) / n;
  const nllReference =
    baseRate > EPS && baseRate < 1 - EPS
      ? -(baseRate * Math.log(baseRate) + (1 - baseRate) * Math.log(1 - baseRate))
      : null;

  const dec = brierDecomposition(
    samples.map((s) => ({ p: s.p, y: s.y })),
    bins,
  );
  const debiased = debiasedExpectedCalibrationError(
    samples.map((s) => ({ p: s.p, y: s.y })),
    bins,
    nullReps,
  );
  const band = nullBandEce(samples, bins, nullReps, seed);
  const withinNullBand = debiased.raw <= band.nullQ95 + EPS;

  return {
    sampleSize: n,
    brier: round6(brier),
    bss: bss === null ? null : round6(bss),
    nll: round6(nll),
    nllReference: nllReference === null ? null : round6(nllReference),
    murphy: {
      reliability: dec.reliability,
      resolution: dec.resolution,
      uncertainty: dec.uncertainty,
      baseRate: dec.baseRate,
      brier: dec.brier,
    },
    nullBand: {
      raw: debiased.raw,
      debiased: debiased.debiased,
      nullMean: band.nullMean,
      nullQ95: band.nullQ95,
      withinNullBand,
      bins,
    },
    note: buildNote({
      bss,
      resolution: dec.resolution,
      nullWithin: withinNullBand,
      n,
    }),
  };
}
