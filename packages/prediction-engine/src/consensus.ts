/**
 * Consensus / divergence aggregator — reduces the independent referees (Kalshi,
 * Elo, Poisson, …; each an IndependentMarketFairValue) into a single consensus
 * probability plus DIVERGENCE metrics: dispersion, agreement score, outliers, and
 * the gap to the market line. This is the data layer behind the first-of-kind
 * public glass-box "consensus surface" — show where the referees AGREE (confidence)
 * and where they DIVERGE (the edge) — and a divergence feature the edge engine can weight.
 *
 * Distinct from edge-engine.ts (which decides PASS/LEAN/SPEAK on a single side):
 * this summarizes the whole source field for display + as a feature. Pure, no I/O.
 * Sign convention: all probabilities are P(home wins), in [0, 1].
 */
import type { IndependentMarketFairValue } from "@sports/types";

export interface SourceProb {
  readonly source: string;
  readonly homeProb: number;
  readonly weight: number;
}

export interface ConsensusOutlier {
  readonly source: string;
  readonly homeProb: number;
  /** Standardized distance from consensus (>0 = sees home as more likely). */
  readonly z: number;
}

export interface ConsensusResult {
  /** Weighted-mean P(home); null if no source had a home quote. */
  readonly consensusHomeProb: number | null;
  /** Weighted std-dev of source home probs (0 = perfect agreement). */
  readonly dispersion: number;
  /** 0–1; 1 = unanimous, 0 = maximally split. */
  readonly agreementScore: number;
  readonly sources: number;
  /**
   * Sources ≥2σ from consensus, standardized against the weighted *population*
   * std-dev (`dispersion`). Scanned only when ≥3 sources and dispersion>0. That
   * ≥3 guard is a conservative floor, not the count at which a flag first becomes
   * feasible: see `computeConsensus` for why an equal-weight field cannot reach
   * the 2σ bar until ≥5 sources (max |z| = √(n−1)).
   */
  readonly outliers: readonly ConsensusOutlier[];
  /** consensus − market P(home); >0 = referees rate home higher than the book. Null if no market. */
  readonly marketDivergence: number | null;
}

/** Pull usable home-prob signals from independent fair values (those with a home quote). */
export function extractSourceProbs(
  fairValues: readonly IndependentMarketFairValue[],
  weightFor: (source: string) => number = () => 1,
): SourceProb[] {
  const out: SourceProb[] = [];
  for (const fv of fairValues) {
    if (fv.homeFairProb != null && Number.isFinite(fv.homeFairProb)) {
      out.push({
        source: fv.source,
        homeProb: clamp01(fv.homeFairProb),
        weight: Math.max(0, weightFor(fv.source)),
      });
    }
  }
  return out;
}

/** Dispersion at/above which agreement is treated as zero. */
const MAX_DISPERSION = 0.25;

export function computeConsensus(probs: readonly SourceProb[], marketHomeProb?: number): ConsensusResult {
  const usable = probs.filter((p) => p.weight > 0);
  if (usable.length === 0) {
    return {
      consensusHomeProb: null,
      dispersion: 0,
      agreementScore: 0,
      sources: 0,
      outliers: [],
      marketDivergence: null,
    };
  }

  const wSum = usable.reduce((s, p) => s + p.weight, 0);
  const mean = usable.reduce((s, p) => s + p.weight * p.homeProb, 0) / wSum;
  const variance = usable.reduce((s, p) => s + p.weight * (p.homeProb - mean) ** 2, 0) / wSum;
  const dispersion = Math.sqrt(variance);
  const agreementScore = clamp01(1 - dispersion / MAX_DISPERSION);

  // Outlier scan: standardized deviation of each source from the weighted mean.
  //
  // The `usable.length >= 3` guard is a conservative FLOOR, not the count at which
  // a flag first becomes attainable. Because `dispersion` is the *population*
  // (not sample) std-dev, |z| is bounded: under equal weights the extreme
  // "n−1 identical + 1 apart" configuration gives max |z| = √(n−1) — i.e. 1.41 at
  // n=3, 1.73 at n=4, and only 2.0 at n=5. So an equal-weight field never crosses
  // the 2σ bar below 5 sources, even though the scan runs from 3. Unequal weights
  // lift this ceiling (a heavily-weighted cluster can push a lightly-weighted
  // source past 2σ with as few as 3 sources), which is why the guard stays at 3
  // rather than being raised — behavior is intentionally unchanged here.
  const outliers: ConsensusOutlier[] =
    usable.length >= 3 && dispersion > 1e-9
      ? usable
          .map((p) => ({ source: p.source, homeProb: round4(p.homeProb), z: round2((p.homeProb - mean) / dispersion) }))
          .filter((o) => Math.abs(o.z) >= 2)
      : [];

  const marketDivergence =
    marketHomeProb != null && Number.isFinite(marketHomeProb) ? round4(mean - clamp01(marketHomeProb)) : null;

  return {
    consensusHomeProb: round4(mean),
    dispersion: round4(dispersion),
    agreementScore: round4(agreementScore),
    sources: usable.length,
    outliers,
    marketDivergence,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function round2(x: number): number {
  return Number(x.toFixed(2));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
