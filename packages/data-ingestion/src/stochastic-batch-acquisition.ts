/**
 * Stochastic Batch Acquisition: A Simple Baseline for Deep Active Learning
 *
 * arXiv:2106.12059v3 · lane:active_learning · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Replace top-K charting acquisition with stochastic batch acquisition: wherever GSE takes top-K
 * games by any acquisition/uncertainty score for charting, sample with power sampling p(game) ~
 * s(game)^beta (beta=1, Gumbel-top-K, 5 lines); formalize a season-aware charting-intensity
 * calendar (small batches weeks 1-6 when scores decorrelate fastest, larger late season); score
 * cost-adjusted (s_i/c_i); then run an adaptive beta schedule beta_t = f(estimated total
 * correlation) from the ensemble's joint-vs-marginal prediction entropy — high beta late season
 * when TC->0, low beta in weeks 1-4.
 *
 * ACCEPTANCE GATE: ADOPT power acquisition as the default batch rule iff it is never worse than top-K on weekly ATS
 * log-loss across the 2024 season (stochastic mean >= top-K in >= 12 of 18 weeks) AND increases
 * mean within-batch pairwise distance by >= 10%.
 *
 * Ingest role: feature builder (active-learning batch acquisition: power-sampling + diversity).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2106.12059v3" as const;
export const LANE = "active_learning" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT power acquisition as the default batch rule iff it is never worse than top-K on weekly ATS
 * log-loss across the 2024 season (stochastic mean >= top-K in >= 12 of 18 weeks) AND increases
 * mean within-batch pairwise distance by >= 10%.`;

export const CONFIG = {
  enabled: false,
  acquisition: "stochastic batch (power sampling)",
  batchSize: 32,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uncertainty scores -> power-sampling probabilities (p^power normalized). */
export function powerSampleProbs(scores: readonly number[], power = 2): number[] | null {
  if (scores.length === 0 || !isFiniteNumber(power) || power < 0) return null;
  if (!scores.every((s) => isFiniteNumber(s) && s >= 0)) return null;
  const pw = scores.map((s) => Math.pow(s, power));
  const tot = pw.reduce((a, b) => a + b, 0);
  if (tot === 0) return new Array<number>(scores.length).fill(1 / scores.length);
  return pw.map((v) => v / tot);
}

/** Sample a batch without replacement from the pool. */
export function sampleBatch(
  probs: readonly number[],
  batchSize: number,
  seed = 7,
): number[] | null {
  if (probs.length === 0 || !Number.isInteger(batchSize) || batchSize <= 0 || batchSize > probs.length) return null;
  if (!probs.every((p) => isFiniteNumber(p) && p >= 0)) return null;
  const tot = probs.reduce((a, b) => a + b, 0);
  if (tot === 0) return null;
  const rng = mulberry32(seed);
  const remaining = probs.map((p, i) => ({ i, p: p / tot }));
  const out: number[] = [];
  for (let b = 0; b < batchSize; b++) {
    const r = rng();
    let acc = 0;
    let pick = remaining.length - 1;
    for (let k = 0; k < remaining.length; k++) {
      acc += (remaining[k]?.p ?? 0) / remaining.reduce((s, x) => s + x.p, 0);
      if (r <= acc) {
        pick = k;
        break;
      }
    }
    out.push(remaining[pick]?.i ?? -1);
    remaining.splice(pick, 1);
  }
  return out;
}

/** Entropy uncertainty from a class-probability vector. */
export function entropyUncertainty(probs: readonly number[]): number | null {
  if (probs.length === 0 || !probs.every((p) => isFiniteNumber(p) && p >= 0)) return null;
  const tot = probs.reduce((a, b) => a + b, 0);
  if (tot === 0) return null;
  let h = 0;
  for (const p of probs) {
    const q = p / tot;
    if (q > 0) h -= q * Math.log(q);
  }
  return h;
}

/** Margin uncertainty: 1 - (p1 - p2). */
export function marginUncertainty(probs: readonly number[]): number | null {
  if (probs.length < 2 || !probs.every((p) => isFiniteNumber(p) && p >= 0)) return null;
  const s = [...probs].sort((a, b) => b - a);
  return 1 - ((s[0] ?? 0) - (s[1] ?? 0));
}
