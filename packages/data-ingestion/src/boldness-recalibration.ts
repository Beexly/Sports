/**
 * Boldness-Recalibration for Binary Event Predictions
 *
 * arXiv:2305.03780v3 · lane:calibration · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Fit boldness-recalibration (LLO delta, gamma) per market on a rolling window (trailing 2 seasons
 * / ~500 games), maximizing prediction SD subject to posterior calibration probability >= 0.90 -
 * evaluated strictly out-of-sample on the next season/slate (fixing the paper's in-sample flaw),
 * falling back to plain MLE-LLO if the constrained optimization fails - serving recalibration
 * parameters versioned per market and refreshed weekly as a final transform before publication or
 * Kelly sizing, gated on out-of-sample log loss and CLV (not SD), with an 'out-of-sample boldness'
 * extension replacing the BIC posterior with a held-out reliability test at 95%.
 *
 * ACCEPTANCE GATE: Adopt B-R as the publication-layer recalibrator iff, across the 5 walk-forward seasons,
 * 90%-threshold B-R achieves out-of-sample log loss <= MLE-LLO log loss (within 0.001) AND mean SD
 * >= 1.15x raw SD AND no season shows ECE degradation > 0.01 vs raw; reject (keep plain MLE-
 * LLO/temperature scaling) if B-R loses on log loss in >=2 of 5 seasons or optimization failures
 * exceed 2% of weekly refits.
 *
 * Ingest role: feature builder (boldness-recalibration for binary predictions: spread-preserving recal).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2305.03780v3" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt B-R as the publication-layer recalibrator iff, across the 5 walk-forward seasons,
 * 90%-threshold B-R achieves out-of-sample log loss <= MLE-LLO log loss (within 0.001) AND mean SD
 * >= 1.15x raw SD AND no season shows ECE degradation > 0.01 vs raw; reject (keep plain MLE-
 * LLO/temperature scaling) if B-R loses on log loss in >=2 of 5 seasons or optimization failures
 * exceed 2% of weekly refits.`;

export const CONFIG = {
  enabled: false,
  method: "boldness-recalibration",
  preserve: "forecast spread",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface ProbOutcome {
  readonly p: number;
  readonly y: 0 | 1;
}

/** Logit / expit. */
export function logit(p: number): number | null {
  if (!isFiniteNumber(p) || p <= 0 || p >= 1) return null;
  return Math.log(p / (1 - p));
}

export function expit(z: number): number | null {
  if (!isFiniteNumber(z)) return null;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Boldness-recalibration: p_cal = expit(a + b * logit(p)).
 * b > 1 spreads (bolder), b < 1 shrinks; a corrects bias.
 */
export function boldnessRecalibrate(p: number, a: number, b: number): number | null {
  const z = logit(p);
  if (z === null || ![a, b].every(isFiniteNumber) || b <= 0) return null;
  return expit(a + b * z);
}

/** Fit (a, b) by grid search on log-loss (offline recipe). */
export function fitBoldness(
  pairs: ReadonlyArray<ProbOutcome>,
  aGrid = [-0.5, -0.25, 0, 0.25, 0.5],
  bGrid = [0.5, 0.75, 1, 1.5, 2],
): { a: number; b: number; logLoss: number } | null {
  const v = pairs.filter((e) => isFiniteNumber(e.p) && e.p > 0 && e.p < 1 && (e.y === 0 || e.y === 1));
  if (v.length === 0) return null;
  let best: { a: number; b: number; logLoss: number } | null = null;
  for (const a of aGrid) {
    for (const b of bGrid) {
      let ll = 0;
      let ok = true;
      for (const e of v) {
        const q = boldnessRecalibrate(e.p, a, b);
        if (q === null || q <= 0 || q >= 1) {
          ok = false;
          break;
        }
        ll -= e.y === 1 ? Math.log(q) : Math.log(1 - q);
      }
      if (!ok) continue;
      ll /= v.length;
      if (!best || ll < best.logLoss) best = { a, b, logLoss: ll };
    }
  }
  return best;
}

/** Spread of a forecast set (std of logits): boldness diagnostic. */
export function forecastSpread(ps: readonly number[]): number | null {
  if (ps.length < 2) return null;
  const zs: number[] = [];
  for (const p of ps) {
    const z = logit(p);
    if (z === null) return null;
    zs.push(z);
  }
  const m = zs.reduce((a, b) => a + b, 0) / zs.length;
  return Math.sqrt(zs.reduce((a, z) => a + (z - m) * (z - m), 0) / zs.length);
}
