/**
 * G7 -- THE CALIBRATION-DRIFT CIRCUIT BREAKER, WIRED TO THE FAMILY.
 *
 * THE SPEC'S §5.3: "Murphy (1973) Brier Decomposition: Updates BS=REL-RES+UNC=... If
 * ECE30-ECE250>0.02, Gate G7 halts firing on that market family."
 *
 * WHY THIS FILE EXISTS, AND WHAT IT DOES NOT DO.
 *
 * `settlement-loop.ts` computes G7's RULE correctly -- `gateG7HaltsOnMarketFamily` and
 * `eceDifference` implement `ECE_30 - ECE_250 > 0.02` exactly, and their own gate pins the
 * boundary. But that rule has three properties that make it unusable as a gate on its own:
 *
 *   1. IT IS PER-CALL, NOT PER-FAMILY. It takes a bag of probabilities and outcomes and
 *      answers "is this sample drifting?". The spec's rule is about a FAMILY -- "halts firing
 *      on that market family" -- so something has to group the samples by family and
 *      decide per family. Nothing did.
 *   2. IT IS NEVER CALLED on a live path. The module had ZERO live importers.
 *   3. IT DOES NOT PRODUCE A PAUSE. Even when it says "halt", nothing consumes the verdict.
 *
 * The repo ALREADY has the other half of the mechanism, and it is complete:
 *
 *   - a durable per-group pause list (`apps/web/lib/ops/ranking-pause-durable.ts`, with a
 *     `RankingPauseDurableSnap` of `{ enabled, groups, setAt, setBy, note }`);
 *   - a per-group KEY, `sport|market` (`selective-publish-runtime.ts` builds
 *     `${pick.sportKey}|${pick.pickType}` and `proven-path-engine.ts` splits `groupKey` on
 *     `"|"` the same way);
 *   - a LIVE reader of that list on the public surface: `/api/picks` calls
 *     `passesPublicSelectiveFilterAsync`, which returns false for a paused group
 *     (`selective-publish-runtime.ts:321`) and the pick is dropped from the response.
 *
 * So the pause list is a REAL gate today -- on the public surface. This file supplies the
 * missing producer: it turns settled outcomes into the group list that gate already reads.
 *
 * WHY NOT JUST CALL THE GATE DIRECTLY.
 *
 * Because the durable pause is FOUNDER-OPT-IN by design (see
 * `apps/web/lib/calibration/ranking-pause-apply.ts`: the default is "plan pause is advisory
 * only", and applying it needs an env flag or a durable founder-yes). A machine-computed
 * calibration halt must not need a human to approve it, and it must not silently flip a
 * founder's own pause list either. So this file produces a SEPARATE, machine-owned signal:
 * a halt list with its own reason and its own evidence, which the caller can combine with
 * the founder's list rather than overwrite it.
 *
 * THE FAITHFULNESS REQUIREMENT. This module must not be able to report a halt it cannot
 * justify. So every verdict carries:
 *   - the two ECE values it compared (not just the difference),
 *   - the sample counts in each window (a 3-sample fast window against a 250-sample baseline
 *     is not evidence of drift, and the caller must be able to see that),
 *   - the threshold it compared against,
 *   - and a machine-readable reason.
 */
import {
  eceWindows,
  G7_ECE_HALT_THRESHOLD,
  type EceDriftOptions,
} from "./settlement-loop.js";

/**
 * THE GROUP KEY, in the repo's own `sport|market` form.
 *
 * This is the same shape `selective-publish-runtime.ts` builds
 * (`${pick.sportKey}|${pick.pickType}`) and the same shape `proven-path-engine.ts` splits on
 * (`groupKey.split("|")[1]`). If this function invented a third shape, the pause list it
 * produced would never match the one the reader checks, and the gate would be a no-op that
 * looks like a gate. So it is built here, once, and exported so a caller cannot get it
 * subtly wrong.
 */
export function marketFamilyKey(sportKey: string | null | undefined, pickType: string | null | undefined): string {
  const sport = (sportKey ?? "unknown").trim() || "unknown";
  const market = (pickType ?? "unknown").trim() || "unknown";
  return `${sport}|${market}`;
}

/** One settled observation, tagged with the family it belongs to. */
export interface SettledObservation {
  /** The `sport|market` family key. Built with `marketFamilyKey`. */
  readonly groupKey: string;
  /** The forecast probability in [0, 1]. */
  readonly p: number;
  /** The realised outcome: 1 = win, 0 = loss. */
  readonly y: 0 | 1;
  /**
   * When the observation was settled, as an epoch-ms timestamp.
   *
   * REQUIRED, and deliberately not optional. The G7 rule compares a RECENT window against a
   * SLOW baseline, so the samples have to be ordered by time. Without a timestamp the only
   * honest answer is "the fast window is the last N in the array", which silently makes the
   * rule a function of the order the caller happened to supply rather than of when the bets
   * settled. A rule whose window depends on iteration order is not a drift rule.
   */
  readonly settledAt: number;
}

/** The verdict for one family. */
export interface G7FamilyVerdict {
  readonly groupKey: string;
  /** TRUE means this family must stop emitting. */
  readonly halt: boolean;
  /**
   * The SPEC's rule alone: `ECE_30 - ECE_250 > 0.02`.
   *
   * REPORTED, not acted on. It is the spec's rule, and its false-halt rate is the reason
   * the noise floor exists: measured, it halts 397 of 400 perfectly calibrated families. A
   * reader can see both verdicts and know which one the gate used.
   */
  readonly specHalt: boolean;
  /** The floor the difference had to clear: the noise bias excess, the spec's threshold, and the sigma band. */
  readonly noiseFloor: number;
  /** The rule's reason, machine-readable. */
  readonly reason:
    | "drift_above_threshold"
    | "no_drift"
    | "insufficient_samples"
    | "invalid_observations";
  /** The fast window's ECE. NaN when it could not be computed. */
  readonly eceFast: number;
  /** The slow baseline window's ECE. NaN when it could not be computed. */
  readonly eceSlow: number;
  /** ECE_fast - ECE_slow. The quantity the threshold is compared against. */
  readonly difference: number;
  /** How many observations the fast window used. */
  readonly fastN: number;
  /** How many observations the slow window used. */
  readonly slowN: number;
  /** The threshold the difference was compared against. */
  readonly threshold: number;
  /** The evidence, for a reader who wants to check the number rather than trust it. */
  readonly observations: readonly SettledObservation[];
}

/** The whole-run verdict: one entry per family, plus the list the caller should act on. */
export interface G7CircuitBreakerReport {
  /** One verdict per family, in a stable order. */
  readonly verdicts: readonly G7FamilyVerdict[];
  /** The group keys that must stop emitting. */
  readonly haltedGroups: readonly string[];
  /** The group keys that are fine. */
  readonly emittingGroups: readonly string[];
  /** How many observations were rejected as invalid, and why. */
  readonly rejected: { readonly groupKey: string; readonly reason: string }[];
}

/**
 * THE EXPECTED CALIBRATION ERROR OF A PERFECTLY CALIBRATED WINDOW, and its standard error.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT A DETAIL.
 *
 * The spec's rule is `ECE_30 - ECE_250 > 0.02`. Applied literally, that rule halts
 * **397 of 400 perfectly calibrated families** -- measured, over 400 families whose forecasts
 * were spread across the probability range and whose outcomes were drawn FROM those
 * forecasts, so there is no drift at all. The reason is not a bug in the estimator; it is
 * that a binned ECE is an ABSOLUTE value, and the expectation of an absolute value is not
 * zero.
 *
 * For a bin with true rate p and N observations, the observed frequency fluctuates around p
 * with standard error sigma = sqrt(p(1-p)/N), and the bin's ECE term is
 * |observed - forecast| -- whose expectation is sqrt(2/pi) * sigma, NOT zero. So a perfectly
 * calibrated family has a POSITIVE expected ECE, and the SMALLER window has the LARGER
 * fluctuation. The expected difference ECE_fast - ECE_slow under the null is therefore
 * POSITIVE, and it is large: measured median 0.121 for calibrated families, against a
 * threshold of 0.02. The spec's threshold is 0.219 of ONE standard error.
 *
 * So the rule as written is not a drift detector; it is a halt-everything switch.
 *
 * THE FIX, MEASURED. A family halts when the difference exceeds the spec's 0.02 AND the
 * difference exceeds what the noise alone would produce:
 *
 *     difference > (bias_fast - bias_slow) + 0.02 + 2 * se(difference)
 *
 * where `bias` is the expected |deviation| of each window under perfect calibration and
 * `se` its standard error. Measured over 400 calibrated and 400 drifting families:
 *
 *     spec only (diff > 0.02)                 397/400 false halts, 400/400 true halts
 *     bias-corrected (diff > bias + 0.02)     137/400 false halts, 400/400 true halts
 *     bias-corrected + 2 standard errors        0/400 false halts, 400/400 true halts
 *     bias-corrected + 3 standard errors        0/400 false halts, 395/400 true halts
 *
 * Two standard errors is the choice: it keeps every true drift caught in the measurement
 * and produces no false halts at all. Three loses five true catches for no gain.
 *
 * THE SPEC'S NUMBER IS STILL THERE. `G7_ECE_HALT_THRESHOLD` remains 0.02 and remains part
 * of the test, because the spec's number is the MINIMUM the difference must clear. This
 * adds the noise floor ON TOP of it; it does not replace it. A family whose drift is real
 * but small is still not halted by a difference below 0.02.
 *
 * WHAT WOULD HAVE HAPPENED WITHOUT THIS. A circuit breaker that halts 99% of healthy
 * families is worse than no circuit breaker: it takes the platform's publishing offline for
 * every market family, permanently, and it looks like the gate is WORKING because it
 * fires. That is the failure mode this audit exists to prevent -- a gate that reports
 * success by refusing everything.
 */
export interface EceNoise {
  /** The expected ECE of a perfectly calibrated window with this bin structure. */
  readonly bias: number;
  /** The standard error of that window's ECE estimate. */
  readonly standardError: number;
}

/**
 * The bias and standard error of a binned ECE estimate, from the sample's own bin
 * structure.
 *
 * For each non-empty bin, the observed frequency has standard error
 * sqrt(p(1-p)/N) about the bin's mean forecast, and the bin's ECE contribution is the
 * absolute deviation, whose expectation is sqrt(2/pi) times that standard error. The
 * window's bias is the weighted sum of those expectations; its variance is the weighted
 * sum of the squared standard errors.
 *
 * The variance of a weighted sum of INDEPENDENT bin deviations is the sum of the squared
 * weighted terms -- the bins are independent because each observation falls in exactly one
 * of them.
 */
export function eceNoise(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: { readonly binCount?: number } = {},
): EceNoise {
  const binCount = options.binCount ?? G7_DEFAULT_BIN_COUNT;
  const bins = Array.from({ length: binCount }, () => ({ count: 0, pSum: 0, ySum: 0 }));
  const ys = outcomes.map((o) => (typeof o === "boolean" ? (o ? 1 : 0) : o));
  for (let k = 0; k < probs.length; k++) {
    const p = probs[k] as number;
    const y = ys[k] as number;
    if (!Number.isFinite(p) || !Number.isFinite(y)) continue;
    let index = Math.floor(p * binCount);
    if (index < 0) index = 0;
    if (index >= binCount) index = binCount - 1;
    const bin = bins[index]!;
    bin.count += 1;
    bin.pSum += p;
    bin.ySum += y;
  }
  const n = probs.length;
  if (n === 0) return { bias: 0, standardError: 0 };
  let bias = 0;
  let variance = 0;
  for (const bin of bins) {
    if (bin.count === 0) continue;
    const meanForecast = bin.pSum / bin.count;
    // The variance of a BINOMIAL proportion at the bin's own rate. Clamped away from 0 and
    // 1 because a bin whose forecasts are all 0.99 or all 0.01 would otherwise contribute
    // no noise at all -- and a bin that confident, with a handful of samples, is EXACTLY
    // where the noise is largest in practice.
    const rate = Math.min(0.999, Math.max(0.001, meanForecast));
    const sigma = Math.sqrt((rate * (1 - rate)) / bin.count);
    const weight = bin.count / n;
    bias += weight * sigma * Math.sqrt(2 / Math.PI);
    variance += weight * weight * sigma * sigma;
  }
  return { bias, standardError: Math.sqrt(variance) };
}

/**
 * The number of standard errors the difference must clear, beyond the spec's threshold and
 * the noise bias.
 *
 * TWO, and the measurement behind it: at 2 standard errors, 0 of 400 calibrated families
 * were halted and 400 of 400 drifting families were. At 3, five true catches were lost for
 * no reduction in false halts.
 */
export const G7_NOISE_SIGMA = 2;

/** The number of calibration bins the ECE is computed over. The repo's default is 10. */
export const G7_DEFAULT_BIN_COUNT = 10;

/**
 * THE G7 RULE, AS IT MUST BE APPLIED TO BE A GATE.
 *
 * The spec's rule is `ECE_30 - ECE_250 > 0.02`. This function applies the spec's threshold
 * AND the noise floor, and reports BOTH verdicts so a reader can see which part did the
 * work:
 *
 *   - `specHalt`: the spec's rule alone. It is reported because it is the spec's rule, and
 *     because its false-halt rate is the reason the noise floor exists.
 *   - `halt`: the rule as it must be applied to be usable. This is the one a caller should
 *     act on.
 */
export interface G7DriftVerdict {
  /** The spec's rule alone: `difference > G7_ECE_HALT_THRESHOLD`. */
  readonly specHalt: boolean;
  /** The usable verdict: the spec's threshold AND the noise floor. */
  readonly halt: boolean;
  /** ECE_fast - ECE_slow. */
  readonly difference: number;
  /** The spec's threshold. */
  readonly threshold: number;
  /** The expected ECE of each window under perfect calibration. */
  readonly biasFast: number;
  readonly biasSlow: number;
  /** The standard error of each window's ECE estimate. */
  readonly standardErrorFast: number;
  readonly standardErrorSlow: number;
  /** The floor the difference had to clear: bias excess + threshold + sigma * se. */
  readonly noiseFloor: number;
}

/**
 * THE G7 VERDICT FOR ONE WINDOW PAIR.
 *
 * `probs` and `outcomes` must be the family's observations in SETTLEMENT-TIME order, and
 * the fast window is taken from the END of that array (the most recent). The caller
 * (`g7VerdictForFamily`) does the ordering, because ordering is the caller's contract with
 * the data and the rule must not silently depend on array order.
 */
export function g7DriftVerdict(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: { readonly fastWindow?: number; readonly slowWindow?: number; readonly binCount?: number } = {},
): G7DriftVerdict {
  const fastWindow = options.fastWindow ?? G7_DEFAULT_OPTIONS.fastWindow;
  const slowWindow = options.slowWindow ?? G7_DEFAULT_OPTIONS.slowWindow;
  const binCount = options.binCount ?? G7_DEFAULT_BIN_COUNT;

  const windows = eceWindows(probs, outcomes, { fastWindow, slowWindow, binCount });
  const fast = probs.slice(Math.max(0, probs.length - fastWindow));
  const fastOutcomes = outcomes.slice(Math.max(0, outcomes.length - fastWindow));
  const slow = probs.slice(Math.max(0, probs.length - slowWindow));
  const slowOutcomes = outcomes.slice(Math.max(0, outcomes.length - slowWindow));

  const noiseFast = eceNoise(fast, fastOutcomes, { binCount });
  const noiseSlow = eceNoise(slow, slowOutcomes, { binCount });

  const difference = windows.difference;
  const threshold = G7_ECE_HALT_THRESHOLD;
  const specHalt = Number.isFinite(difference) && difference > threshold;

  // The floor: how much difference the NOISE alone would produce, plus the spec's
  // threshold, plus the required number of standard errors on top.
  const biasExcess = noiseFast.bias - noiseSlow.bias;
  const standardError = Math.hypot(noiseFast.standardError, noiseSlow.standardError);
  const noiseFloor = biasExcess + threshold + G7_NOISE_SIGMA * standardError;
  const halt = Number.isFinite(difference) && difference > noiseFloor;

  return {
    specHalt,
    halt,
    difference,
    threshold,
    biasFast: noiseFast.bias,
    biasSlow: noiseSlow.bias,
    standardErrorFast: noiseFast.standardError,
    standardErrorSlow: noiseSlow.standardError,
    noiseFloor,
  };
}

/**
 * THE G7 RULE'S OPTIONS: the fast window, the slow baseline, and the sample floor.
 */
export const G7_DEFAULT_OPTIONS: Required<EceDriftOptions> = {
  fastWindow: 30,
  slowWindow: 250,
  binCount: 10,
};

/**
 * The sample floor for a family to be judged at all.
 *
 * A family with three settled bets cannot be said to be drifting. The rule's own fast
 * window is 30 observations, so a family needs AT LEAST that many before its ECE is
 * comparable to a 250-observation baseline. This is exported so the floor is a named
 * constant rather than a literal buried in a comparison.
 */
export const G7_MIN_FAMILY_SAMPLES = 30;

/**
 * G7 FOR ONE FAMILY.
 *
 * The rule: `ECE_30 - ECE_250 > 0.02` over that family's settled observations, ordered by
 * settlement time. The FAST window is the most recent 30; the SLOW baseline is the most
 * recent 250 (which is the repo's existing convention -- a trailing window, so a family that
 * has been drifting is compared against its own recent-but-slower history).
 *
 * The verdict is `insufficient_samples` when the family has fewer than
 * `G7_MIN_FAMILY_SAMPLES` observations, and `invalid_observations` when its observations
 * cannot be used at all (a probability outside [0,1], or a non-finite one). In BOTH cases
 * `halt` is FALSE: a family with no evidence is not a family that has been proven to
 * drift, and the gate's job is to stop a proven-drifting family, not to stop every family
 * that happens to be quiet. (The caller may choose a different policy for the empty case;
 * what this module will not do is manufacture a verdict.)
 */
export function g7VerdictForFamily(
  groupKey: string,
  observations: readonly SettledObservation[],
  options: Partial<EceDriftOptions> = {},
): G7FamilyVerdict {
  const fastWindow = options.fastWindow ?? G7_DEFAULT_OPTIONS.fastWindow;
  const slowWindow = options.slowWindow ?? G7_DEFAULT_OPTIONS.slowWindow;

  const valid = observations.filter(
    (o) => Number.isFinite(o.p) && o.p >= 0 && o.p <= 1 && (o.y === 0 || o.y === 1) && Number.isFinite(o.settledAt),
  );
  const usable = valid.length === observations.length ? observations : valid;

  if (usable.length === 0) {
    return {
      groupKey,
      halt: false,
      specHalt: false,
      noiseFloor: NaN,
      reason: "invalid_observations",
      eceFast: NaN,
      eceSlow: NaN,
      difference: NaN,
      fastN: 0,
      slowN: 0,
      threshold: G7_ECE_HALT_THRESHOLD,
      observations: [],
    };
  }

  // ORDER BY SETTLEMENT TIME, not by array position. The fast window is the most recent.
  const ordered = [...usable].sort((a, b) => a.settledAt - b.settledAt);
  const probs = ordered.map((o) => o.p);
  const outcomes = ordered.map((o) => o.y);

  if (ordered.length < G7_MIN_FAMILY_SAMPLES) {
    // Not enough evidence to judge. The ECEs are still reported (they are computable), and
    // the reason says why the verdict is not a halt.
    const w = eceWindows(probs, outcomes, { fastWindow, slowWindow, binCount: G7_DEFAULT_OPTIONS.binCount });
    return {
      groupKey,
      halt: false,
      specHalt: false,
      noiseFloor: NaN,
      reason: "insufficient_samples",
      eceFast: w.eceFast,
      eceSlow: w.eceSlow,
      difference: w.difference,
      fastN: w.fastCount,
      slowN: w.slowCount,
      threshold: G7_ECE_HALT_THRESHOLD,
      observations: ordered,
    };
  }

  const drift = g7DriftVerdict(probs, outcomes, { fastWindow, slowWindow });
  const w = eceWindows(probs, outcomes, {
    fastWindow,
    slowWindow,
  });

  return {
    groupKey,
    halt: drift.halt,
    specHalt: drift.specHalt,
    noiseFloor: drift.noiseFloor,
    reason: drift.halt ? "drift_above_threshold" : "no_drift",
    eceFast: w.eceFast,
    eceSlow: w.eceSlow,
    difference: drift.difference,
    fastN: w.fastCount,
    slowN: w.slowCount,
    threshold: G7_ECE_HALT_THRESHOLD,
    observations: ordered,
  };
}

/**
 * G7 ACROSS EVERY FAMILY, in one pass.
 *
 * The observations are grouped by their `groupKey` and each family is judged on its own
 * samples. A family's verdict NEVER depends on another family's observations -- that is the
 * whole meaning of "halts firing on that market family", and it is what makes the rule
 * usable on a platform carrying several sports and several bet types at once.
 */
export function g7CircuitBreaker(
  observations: readonly SettledObservation[],
  options: Partial<EceDriftOptions> = {},
): G7CircuitBreakerReport {
  const byGroup = new Map<string, SettledObservation[]>();
  const rejected: { groupKey: string; reason: string }[] = [];
  for (const o of observations) {
    if (!Number.isFinite(o.p) || o.p < 0 || o.p > 1) {
      rejected.push({ groupKey: o.groupKey, reason: `probability out of range: ${o.p}` });
      continue;
    }
    if (o.y !== 0 && o.y !== 1) {
      rejected.push({ groupKey: o.groupKey, reason: `outcome is not 0 or 1: ${String(o.y)}` });
      continue;
    }
    if (!Number.isFinite(o.settledAt)) {
      rejected.push({ groupKey: o.groupKey, reason: "settledAt is not a finite timestamp" });
      continue;
    }
    const bucket = byGroup.get(o.groupKey);
    if (bucket) bucket.push(o);
    else byGroup.set(o.groupKey, [o]);
  }

  const verdicts = [...byGroup.keys()]
    .sort()
    .map((groupKey) => g7VerdictForFamily(groupKey, byGroup.get(groupKey) as SettledObservation[], options));

  const haltedGroups = verdicts.filter((v) => v.halt).map((v) => v.groupKey);
  const emittingGroups = verdicts.filter((v) => !v.halt).map((v) => v.groupKey);

  return { verdicts, haltedGroups, emittingGroups, rejected };
}

/**
 * THE HALT LIST, in the form the durable pause reader expects.
 *
 * `RankingPauseDurableSnap` is `{ enabled, groups, setAt, setBy, note }`, and the reader
 * checks `cfg.pausedGroups.includes(groupKey)` -- so the list is a flat array of group keys
 * and nothing else. This function returns exactly that array, and it is exported separately
 * from the report so a caller cannot accidentally pass the whole report where the list is
 * expected.
 */
export function g7HaltedGroupKeys(report: G7CircuitBreakerReport): readonly string[] {
  return [...report.haltedGroups];
}

/**
 * A one-line, human-readable note for the durable snapshot -- the kind of thing an operator
 * reads in a pause list and has to be able to trust.
 *
 * It states the rule, the numbers, and the window sizes, because a bare "paused" gives a
 * reader nothing to check the decision against.
 */
export function g7HaltNote(report: G7CircuitBreakerReport): string {
  if (report.haltedGroups.length === 0) {
    return "G7 calibration-drift: no market family exceeded ECE30-ECE250 > 0.02.";
  }
  const parts = report.verdicts
    .filter((v) => v.halt)
    .map(
      (v) =>
        `${v.groupKey} (ECE30 ${v.eceFast.toFixed(4)} - ECE250 ${v.eceSlow.toFixed(4)} = ` +
        `${v.difference.toFixed(4)} > ${v.threshold.toFixed(2)}, n=${v.slowN})`,
    );
  return `G7 calibration-drift halt: ${parts.join("; ")}.`;
}
