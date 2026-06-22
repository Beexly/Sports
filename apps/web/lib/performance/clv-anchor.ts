/**
 * Anchor CLV — grade closing-line value against a HARD third-party close (a sharp
 * book / exchange like Kalshi or Pinnacle) instead of our own consensus, and flag
 * when our consensus close diverged from the sharp anchor (our close may be soft).
 * Answers the hostile-quant attack: "you graded CLV against a soft close you control."
 *
 * INPUT DISCIPLINE (load-bearing): every probability passed here must be on a
 * CONSISTENT vig basis — all de-vigged (fair) OR all raw-implied. The caller prepares
 * them; this module never mixes bases. Mixing a vig'd entry with a fair anchor would
 * manufacture edge out of the vig — the exact fabrication we refuse.
 *
 * Sign convention matches tracker/clv.ts: price-beat CLV = close − entry (in
 * probability points). Positive means the market moved to a SHORTER price than we got
 * — we beat the close. Pure; bad input returns null rather than a fabricated grade.
 */

export type AnchorVerdict = "BEAT_ANCHOR" | "MATCHED_ANCHOR" | "LOST_TO_ANCHOR";

export interface AnchorClvInput {
  /** Implied prob of the price WE locked at entry, 0..1. */
  readonly entryProb: number;
  /** Our own consensus CLOSING prob for the side, 0..1. */
  readonly consensusCloseProb: number;
  /** The hard third-party (sharp) CLOSING prob for the side, 0..1. */
  readonly anchorCloseProb: number;
  /** Divergence (prob points) above which our consensus close is flagged soft. Default 0.02. */
  readonly softCloseThreshold?: number;
}

export interface AnchorClvResult {
  /** Prob points beaten vs OUR consensus close (consensus − entry). >0 = beat. */
  readonly clvVsConsensus: number;
  /** Prob points beaten vs the THIRD-PARTY anchor (anchor − entry). The skeptic-proof number. */
  readonly clvVsAnchor: number;
  /** Signed gap between our consensus close and the sharp anchor (consensus − anchor). */
  readonly consensusMinusAnchor: number;
  /** |consensus − anchor| — divergence magnitude. */
  readonly divergence: number;
  /** True when our consensus close diverged from the anchor beyond the threshold. */
  readonly softClose: boolean;
  /** Graded against the HARD anchor — the verdict a skeptic can't wave off. */
  readonly verdict: AnchorVerdict;
}

const DEFAULT_SOFT_CLOSE = 0.02;

function isProb(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

function round(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Grade one pick's CLV against both our consensus close and a hard third-party anchor.
 * Returns null if any probability is out of range (never fabricates a grade).
 */
export function gradeAnchorClv(input: AnchorClvInput): AnchorClvResult | null {
  if (!isProb(input.entryProb) || !isProb(input.consensusCloseProb) || !isProb(input.anchorCloseProb)) {
    return null;
  }
  const threshold = Number.isFinite(input.softCloseThreshold ?? NaN)
    ? Math.max(0, input.softCloseThreshold as number)
    : DEFAULT_SOFT_CLOSE;

  const clvVsConsensus = input.consensusCloseProb - input.entryProb;
  const clvVsAnchor = input.anchorCloseProb - input.entryProb;
  const consensusMinusAnchor = input.consensusCloseProb - input.anchorCloseProb;
  const divergence = Math.abs(consensusMinusAnchor);

  const verdict: AnchorVerdict =
    clvVsAnchor > 0 ? "BEAT_ANCHOR" : clvVsAnchor < 0 ? "LOST_TO_ANCHOR" : "MATCHED_ANCHOR";

  return {
    clvVsConsensus: round(clvVsConsensus),
    clvVsAnchor: round(clvVsAnchor),
    consensusMinusAnchor: round(consensusMinusAnchor),
    divergence: round(divergence),
    softClose: divergence > threshold,
    verdict,
  };
}

export interface AnchorClvRollup {
  readonly count: number;
  /** Mean CLV vs the hard anchor — the headline anchor-graded number. */
  readonly meanClvVsAnchor: number;
  /** Share that beat the anchor close (0–1). */
  readonly beatAnchorRate: number;
  /** Share whose consensus close was soft vs the anchor (0–1) — a data-quality signal. */
  readonly softCloseRate: number;
  /** Mean absolute divergence between our consensus and the anchor. */
  readonly meanDivergence: number;
  readonly note: string;
}

/** Aggregate anchor grades. Pure; bad inputs already dropped (callers pass results). */
export function rollupAnchorClv(results: readonly AnchorClvResult[]): AnchorClvRollup {
  const count = results.length;
  if (count === 0) {
    return {
      count: 0,
      meanClvVsAnchor: 0,
      beatAnchorRate: 0,
      softCloseRate: 0,
      meanDivergence: 0,
      note: "No anchor-graded picks yet — empty rather than a fabricated anchor CLV.",
    };
  }
  const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
  const meanClvVsAnchor = sum(results.map((r) => r.clvVsAnchor)) / count;
  const beatAnchorRate = results.filter((r) => r.verdict === "BEAT_ANCHOR").length / count;
  const softCloseRate = results.filter((r) => r.softClose).length / count;
  const meanDivergence = sum(results.map((r) => r.divergence)) / count;

  const note =
    softCloseRate > 0.25
      ? "Our consensus close often diverges from the sharp anchor — grade against the anchor, not ourselves."
      : meanClvVsAnchor > 0
        ? "Beat the sharp third-party close on average — the skeptic-proof CLV signal."
        : "Did not beat the sharp third-party close on average — no demonstrated edge vs the anchor.";

  return {
    count,
    meanClvVsAnchor: round(meanClvVsAnchor),
    beatAnchorRate: round(beatAnchorRate),
    softCloseRate: round(softCloseRate),
    meanDivergence: round(meanDivergence),
    note,
  };
}
