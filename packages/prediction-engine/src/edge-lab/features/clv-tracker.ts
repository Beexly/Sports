/**
 * Closing-line-value tracker with ABSOLUTE normalization — the STRONG variant
 * from handoff/research/forecasting/review-academic-bibliography.md (Simon 2024
 * CLV section, corrected per the adversarial review).
 *
 * EDGE THESIS: the bibliography's relative CLV ((closing − bet)/bet) explodes
 * for small bet probabilities — a longshot moving 0.01→0.02 reports +100% and
 * dominates any average. The review's corrected variant uses the absolute
 * difference of VIG-STRIPPED closing vs bet fair probabilities:
 *
 *   clv_abs = closing_fair − bet_fair        (>0 = beat the close)
 *
 * Aggregation gates: only books with N ≥ minSamples (default 30) settled bets
 * are summarized; mean CLV is reported with a one-sample z-statistic against 0
 * (σ estimated from the sample) so significance claims are explicit rather than
 * eyeballed. Pre-game vs in-play CLV must be tracked as SEPARATE streams by the
 * caller (they need different timestamps); this module tags nothing.
 *
 * Honesty rules: fail closed on non-finite inputs; both probabilities must be
 * in [0,1]; samples below the gate return `null` stats instead of a number.
 */

export interface ClvSample {
  /** Devigged fair probability at bet time. */
  readonly betFairProb: number;
  /** Devigged fair probability at close. */
  readonly closingFairProb: number;
  /** Optional stake weight; default 1. Used for weighted mean/z. */
  readonly stake?: number;
}

export interface ClvSummary {
  readonly n: number;
  /** Stake-weighted mean absolute CLV. Null below the sample gate. */
  readonly meanClv: number | null;
  /** Sample std-dev of CLV (population-consistent, ddof=1). Null below gate. */
  readonly stdClv: number | null;
  /** One-sample z of mean vs 0. Null below gate or when std = 0. */
  readonly zScore: number | null;
}

/** Absolute CLV of one bet: closing_fair − bet_fair. */
export function clvAbsolute(betFairProb: number, closingFairProb: number): number {
  for (const p of [betFairProb, closingFairProb]) {
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new Error(`fair probability must be in [0,1], got ${String(p)}`);
    }
  }
  return closingFairProb - betFairProb;
}

/**
 * Summarize a stream of settled bets. `minSamples` default 30 per the review's
 * N>30 gate; below it, count is returned but stats are honest nulls.
 */
export function summarizeClv(
  samples: readonly ClvSample[],
  options: { minSamples?: number } = {},
): ClvSummary {
  const minSamples = options.minSamples ?? 30;
  if (!Array.isArray(samples)) {
    throw new Error("samples must be an array");
  }
  const clvs: number[] = [];
  const stakes: number[] = [];
  for (const s of samples) {
    const stake = s.stake ?? 1;
    if (!Number.isFinite(stake) || stake < 0) {
      throw new Error(`stake must be finite and >= 0, got ${String(stake)}`);
    }
    clvs.push(clvAbsolute(s.betFairProb, s.closingFairProb));
    stakes.push(stake);
  }
  const n = clvs.length;
  if (n < minSamples) {
    return { n, meanClv: null, stdClv: null, zScore: null };
  }
  const wSum = stakes.reduce((a, b) => a + b, 0);
  if (!(wSum > 0)) {
    // All-zero stakes: fall back to equal weights rather than fabricating stats.
    for (let i = 0; i < n; i++) stakes[i] = 1;
  }
  const wTot = stakes.reduce((a, b) => a + b, 0);
  const mean = clvs.reduce((a, c, i) => a + c * stakes[i]!, 0) / wTot;
  const varW =
    clvs.reduce((a, c, i) => a + stakes[i]! * (c - mean) ** 2, 0) / Math.max(wTot - stakes.reduce((a, s) => a + s * s, 0) / wTot, Number.MIN_VALUE);
  const std = Math.sqrt(Math.max(varW, 0));
  const z = std > 0 ? mean / (std / Math.sqrt(n)) : null;
  return {
    n,
    meanClv: mean,
    stdClv: std,
    zScore: z,
  };
}
