/**
 * Signal weight tuner — derives ledger weights from SETTLED OUTCOMES.
 *
 * The strategy doc is explicit that weights are "tuned against outcomes with
 * the backtest/calibration framework, not guessed" and that coachspeak gets
 * "calibrated near zero until it earns weight." This module is that tuner: it
 * scores each signal key by how well its reading actually predicted settled
 * results, and emits a weight multiplier per key.
 *
 * Statistics used are deliberately conservative for tiny samples:
 *  - a key with fewer than MIN_SAMPLES settled observations gets weight ~0
 *    (no evidence, no influence);
 *  - correlation is converted to a bounded multiplier so a single lucky key
 *    cannot dominate the blend;
 *  - sign is preserved — a key that anti-predicts earns NEGATIVE weight, which
 *    is how a known-inverted signal (see confidence z=-10.7) gets represented
 *    honestly instead of being silently dropped.
 */

export const MIN_SAMPLES = 100;

export interface KeyOutcome {
  /** Signal key, e.g. "ngs.separation". */
  readonly key: string;
  /** Normalized directional reading at mint time (−1..1). */
  readonly value: number;
  /** Settled outcome as 1 (good) / 0 (bad); PUSH/VOID are excluded upstream. */
  readonly outcome: 0 | 1;
}

export interface TunedWeight {
  readonly key: string;
  readonly n: number;
  /** Point-biserial correlation between value and outcome, in −1..1. */
  readonly correlation: number;
  /** Bounded multiplier in −1..1. Zero when n < MIN_SAMPLES. */
  readonly multiplier: number;
  /** Plain-language verdict for the founder-facing report. */
  readonly verdict: "earned" | "insufficient-sample" | "anti-predictive" | "inert";
}

/** Clamp helper. */
const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

/**
 * Point-biserial correlation between a continuous reading and a binary
 * outcome. Returns 0 for degenerate input (no variance on either side)
 * rather than NaN, so a flat key is inert rather than explosive.
 */
export function pointBiserial(
  values: readonly number[],
  outcomes: readonly (0 | 1)[],
): number {
  const n = values.length;
  if (n !== outcomes.length || n < 2) return 0;

  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mv = mean(values);
  const ones = outcomes.filter((o) => o === 1).length;
  if (ones === 0 || ones === n) return 0;

  const mo = ones / n;
  let num = 0;
  let sumSqV = 0;
  let sumSqO = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i] as number;
    const o = outcomes[i] as (0 | 1);
    const dv = v - mv;
    const dOut = o - mo;
    num += dv * dOut;
    sumSqV += dv * dv;
    sumSqO += dOut * dOut;
  }
  const denom = Math.sqrt(sumSqV * sumSqO);
  if (denom <= 0) return 0;
  return clamp(num / denom, -1, 1);
}

/**
 * Convert a correlation into a bounded weight multiplier.
 * Below MIN_SAMPLES → 0 (no evidence, no influence).
 * |r| is scaled by sqrt(n / MIN_SAMPLES) so a key needs real sample before it
 * approaches full strength, and the result is capped at 1.
 */
export function correlationToMultiplier(r: number, n: number): number {
  if (n < MIN_SAMPLES) return 0;
  if (!Number.isFinite(r)) return 0;
  const evidence = Math.sqrt(n / MIN_SAMPLES);
  return clamp(r * evidence, -1, 1);
}

/** Tune every distinct key present in the sample. */
export function tuneSignalWeights(sample: readonly KeyOutcome[]): TunedWeight[] {
  const groups = new Map<string, KeyOutcome[]>();
  for (const row of sample) {
    const arr = groups.get(row.key);
    if (arr) arr.push(row);
    else groups.set(row.key, [row]);
  }

  const out: TunedWeight[] = [];
  for (const [key, rows] of groups) {
    const n = rows.length;
    const r = pointBiserial(
      rows.map((x) => x.value),
      rows.map((x) => x.outcome),
    );
    const multiplier = correlationToMultiplier(r, n);
    const verdict: TunedWeight["verdict"] =
      n < MIN_SAMPLES
        ? "insufficient-sample"
        : multiplier <= 0
          ? r < 0
            ? "anti-predictive"
            : "inert"
          : "earned";
    out.push({ key, n, correlation: r, multiplier, verdict });
  }
  // Strongest evidence first so the founder report leads with what works.
  out.sort((a, b) => Math.abs(b.multiplier) - Math.abs(a.multiplier));
  return out;
}
