/**
 * Anytime-valid calibration monitoring — an e-process that tests "the model's
 * STATED probabilities are honest" CONTINUOUSLY, so a calibration drift is
 * caught around the pick where it starts, not a quarter later. R&D, dark,
 * unwired (same posture as anytime-ledger.ts, whose Ville machinery this is
 * the calibration-side sibling of).
 *
 * THE NULL: under honest probabilities, each settled outcome satisfies
 * E[y_t | F_{t-1}] = p_t (the stated probability, which is known BEFORE the
 * outcome). So the residual y_t − p_t is a martingale-difference sequence and
 * any PREDICTABLE bet on it has expectation 1:
 *
 *   M_t = Π (1 + λ_i·(y_i − p_i)),   λ_i chosen from picks 1..i−1 only
 *
 * is a nonnegative martingale with M_0 = 1, and Ville's inequality gives
 * P(sup_t M_t ≥ 1/α) ≤ α — valid under CONTINUOUS monitoring / optional
 * stopping, exactly like the profit ledger's test. No RNG anywhere; any two
 * parties replay the identical trajectory from the settled ledger.
 *
 * TWO-SIDEDNESS: drift has a direction. M⁺ bets λ ≥ 0 (wins landing ABOVE
 * stated probability = UNDERconfidence); M⁻ bets the other side (outcomes
 * falling SHORT of stated probability = OVERconfidence — the dangerous
 * direction for a picks product). The headline process is the mixture
 * M = ½(M⁺ + M⁻), itself a martingale, so one α covers both directions (the
 * ½ costs ln 2 of evidence — the standard price of not pre-committing to a
 * direction).
 *
 * WHAT THIS TESTS — honestly scoped: the martingale/unbiasedness component of
 * calibration (systematic over/under-confidence in the stated numbers, overall
 * and per probability region via the bin layer). It is NOT a full
 * distributional-calibration test; the binned reliability toolkit
 * (probability-calibration.ts) remains the batch-time picture. The two are
 * complements: this one is the tripwire, that one is the autopsy.
 *
 * BINS: an optional layer of per-region sub-processes over FIXED equal-width
 * bins of the stated probability (the bin of pick t is known before y_t, so
 * per-bin betting is predictable; picks outside a bin contribute factor 1,
 * keeping each bin process a martingale on the full filtration). Their mean is
 * again a martingale — a second valid α-level tripwire ("some region drifted")
 * that concentrates evidence when drift is localized. Per-bin trips are also
 * reported at the Bonferroni threshold ln(bins/α) as diagnostics.
 *
 * ORDER MATTERS: `samples` MUST be in settlement order (the same total order
 * public-roi-policy.ts uses: settledAt asc, id asc). This is an order-sensitive
 * sequential statistic — shuffling the ledger voids the guarantee.
 *
 * Deterministic, closed-form, dependency-free. Returns null on refused input.
 */

export interface CalibrationSequenceSample {
  /** Stated win probability in the OPEN interval (0,1), frozen pre-outcome. */
  readonly p: number;
  /** Realized binary outcome (PUSH/VOID excluded upstream). */
  readonly y: 0 | 1;
}

export interface CalibrationSequencePoint {
  /** 1-indexed settled-pick count. */
  readonly t: number;
  /** ln of the two-sided mixture e-value at this point. */
  readonly logEValue: number;
  readonly crossedThreshold: boolean;
}

export interface CalibrationBinDiagnostic {
  readonly binStart: number;
  readonly binEnd: number;
  /** Picks whose stated probability landed in this bin. */
  readonly n: number;
  /** Final ln e-value of this bin's own two-sided process. */
  readonly logEValue: number;
  /**
   * True when this bin's process crossed the Bonferroni-corrected threshold
   * ln(bins/α) — a family-wise-honest per-bin flag (diagnostic tier).
   */
  readonly trippedAtBonferroni: boolean;
}

export interface CalibrationSequenceResult {
  readonly alpha: number;
  readonly n: number;
  readonly points: readonly CalibrationSequencePoint[];
  readonly current: CalibrationSequencePoint;
  /** Did the two-sided mixture EVER cross 1/α (any stopping time)? */
  readonly everTripped: boolean;
  readonly firstTrippedAt: number | null;
  /**
   * Direction of the drift evidence at the end of the ledger: which one-sided
   * process holds more wealth. "overconfident" = outcomes fall short of stated
   * probabilities. null until the mixture has actually tripped.
   */
  readonly direction: "overconfident" | "underconfident" | null;
  /** Per-region diagnostics (empty when bins === 0). */
  readonly bins: readonly CalibrationBinDiagnostic[];
  /** The valid α-level "some region drifted" tripwire (mean of bin processes). */
  readonly binMixture: {
    readonly logEValue: number;
    readonly everTripped: boolean;
    readonly firstTrippedAt: number | null;
  } | null;
}

export interface CalibrationSequenceOptions {
  readonly alpha?: number; // default 0.05
  /** Equal-width stated-probability bins for the regional layer. 0 disables. Default 4. */
  readonly bins?: number;
}

/** Betting cap as a fraction of the positivity limit: factors stay ≥ 1 − CAP. */
const CAP = 0.5;

/**
 * One one-sided betting process over residuals r_i = y_i − p_i.
 * sign=+1 bets on E[y] > p (underconfidence); sign=−1 on E[y] < p
 * (overconfidence). λ_i is predictable: it uses residuals 0..i−1 only, with
 * one pseudo-observation of 0 as the mean prior and 1/4 (max variance of a
 * bounded-[−1,1] residual's Bernoulli core) as the variance prior — smoothing
 * choices that affect POWER only; validity holds for ANY predictable λ within
 * the positivity cap. `active[i]` masks picks outside a bin (factor 1).
 */
function replayOneSided(
  samples: readonly CalibrationSequenceSample[],
  sign: 1 | -1,
  active: readonly boolean[] | null,
): number[] {
  const n = samples.length;
  const logs = new Array<number>(n);
  let sumResid = 0;
  let sumSq = 0;
  let seen = 0;
  let logM = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i]!;
    if (active && !active[i]) {
      logs[i] = logM; // factor 1: no bet outside the region
      continue;
    }
    const muHat = sumResid / (seen + 1); // prior pseudo-observation of 0
    const varHat = (0.25 + sumSq) / (seen + 1);
    // Positivity: for sign=+1 the worst residual is −p (y=0), so λ ≤ CAP/p;
    // for sign=−1 the worst is +(1−p) (y=1), so |λ| ≤ CAP/(1−p). Either way the
    // step factor stays ≥ 1 − CAP > 0.
    const capLambda = sign === 1 ? CAP / s.p : CAP / (1 - s.p);
    const rawLambda = (sign * muHat) / (varHat + 1e-9);
    const lambda = Math.min(Math.max(rawLambda, 0), capLambda);
    const resid = s.y - s.p;
    const factor = 1 + sign * lambda * resid;
    logM += Math.log(Math.max(factor, 1e-12)); // guard is float dust only
    logs[i] = logM;
    sumSq += (resid - muHat) * (resid - muHat);
    sumResid += resid;
    seen += 1;
  }
  return logs;
}

/** ln(½(e^a + e^b)) computed stably. */
function logHalfSumExp(a: number, b: number): number {
  const m = Math.max(a, b);
  return m + Math.log(0.5 * (Math.exp(a - m) + Math.exp(b - m)));
}

export function anytimeCalibrationMonitor(
  samples: readonly CalibrationSequenceSample[],
  opts: CalibrationSequenceOptions = {},
): CalibrationSequenceResult | null {
  const alpha = opts.alpha ?? 0.05;
  const binCount = opts.bins ?? 4;
  const n = samples.length;
  if (n < 1) return null;
  if (!(alpha > 0 && alpha < 1)) return null;
  if (!Number.isInteger(binCount) || binCount < 0 || binCount > 100) return null;
  for (const s of samples) {
    if (!Number.isFinite(s.p) || s.p <= 0 || s.p >= 1) return null; // OPEN interval
    if (s.y !== 0 && s.y !== 1) return null;
  }

  const logThreshold = Math.log(1 / alpha);

  // Headline: two one-sided processes over the whole ledger, mixed 50/50.
  const logPlus = replayOneSided(samples, 1, null);
  const logMinus = replayOneSided(samples, -1, null);
  const points: CalibrationSequencePoint[] = new Array(n);
  let everTripped = false;
  let firstTrippedAt: number | null = null;
  for (let i = 0; i < n; i++) {
    const logE = logHalfSumExp(logPlus[i]!, logMinus[i]!);
    const crossed = logE >= logThreshold;
    if (crossed && firstTrippedAt === null) {
      everTripped = true;
      firstTrippedAt = i + 1;
    }
    points[i] = { t: i + 1, logEValue: logE, crossedThreshold: crossed };
  }
  const direction: CalibrationSequenceResult["direction"] = everTripped
    ? logMinus[n - 1]! > logPlus[n - 1]!
      ? "overconfident"
      : "underconfident"
    : null;

  // Regional layer: fixed equal-width bins over the STATED probability.
  let bins: CalibrationBinDiagnostic[] = [];
  let binMixture: CalibrationSequenceResult["binMixture"] = null;
  if (binCount > 0) {
    const bonferroniThreshold = Math.log(binCount / alpha);
    const perBinLog: number[][] = [];
    bins = [];
    for (let b = 0; b < binCount; b++) {
      const lo = b / binCount;
      const hi = (b + 1) / binCount;
      const active = samples.map((s) => (b === binCount - 1 ? s.p >= lo && s.p < 1 : s.p >= lo && s.p < hi));
      const cnt = active.reduce((acc, a) => acc + (a ? 1 : 0), 0);
      const lp = replayOneSided(samples, 1, active);
      const lm = replayOneSided(samples, -1, active);
      const combined = lp.map((v, i) => logHalfSumExp(v, lm[i]!));
      perBinLog.push(combined);
      bins.push({
        binStart: lo,
        binEnd: hi,
        n: cnt,
        logEValue: combined[n - 1]!,
        trippedAtBonferroni: combined.some((v) => v >= bonferroniThreshold),
      });
    }
    // Mean of the bin martingales — itself a martingale, so Ville at α holds.
    let mixEver = false;
    let mixFirst: number | null = null;
    let mixLast = 0;
    for (let i = 0; i < n; i++) {
      let m = -Infinity;
      for (const col of perBinLog) m = Math.max(m, col[i]!);
      let sum = 0;
      for (const col of perBinLog) sum += Math.exp(col[i]! - m);
      const logMix = m + Math.log(sum / binCount);
      if (logMix >= logThreshold && mixFirst === null) {
        mixEver = true;
        mixFirst = i + 1;
      }
      mixLast = logMix;
    }
    binMixture = { logEValue: mixLast, everTripped: mixEver, firstTrippedAt: mixFirst };
  }

  return {
    alpha,
    n,
    points,
    current: points[n - 1]!,
    everTripped,
    firstTrippedAt,
    direction,
    bins,
    binMixture,
  };
}
