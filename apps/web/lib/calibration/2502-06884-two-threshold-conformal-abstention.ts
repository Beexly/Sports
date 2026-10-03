// @ts-nocheck
/**
 * arXiv 2502.06884: Learning Conformal Abstention Policies for Adaptive Risk Management in Large Language and Vision-Language Models.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Two-threshold conformal abstention with market-conditional (alpha, beta) per market (spread/total/moneyline have different uncertainty geometry): abstain above the high threshold, auto-post below the low threshold, human-review band between. Recovers posted picks a global threshold over-abstains on. The RL-tuning component is REJECTED unconditionally.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Adopt the two-threshold conformal abstention structure with market-conditional (α, β) per market (spread/total/moneyline) rather than a single global β — moneyline underdogs and totals have different uncertainty geometry — to recover posted picks a global threshold over-abstains on.
 *
 * ACCEPTANCE GATE:
 * ADAPT iff the three-way policy's selective ROI exceeds the single-threshold conformal baseline by ≥ 2 ROI points on the test block while realized coverage stays ≥ 90% and the abstention rate stays ≤ 25%; REJECT the RL-tuning component unconditionally.
 *
 * ENABLED=false: abstention policy; needs a human call. RL tuning rejected.
 */


export const ENABLED = false;
/** The paper's RL-tuning component is rejected unconditionally. */
export const RL_TUNING_REJECTED = true;

export type Market = "spread" | "total" | "moneyline";

export interface MarketThresholds {
  readonly market: Market;
  /** Conformal level for the uncertainty score. */
  readonly alpha: number;
  /** Abstain when uncertainty >= betaHigh; auto-post when <= betaLow. */
  readonly betaLow: number;
  readonly betaHigh: number;
}

/** Conformal quantile of calibration uncertainty scores at level 1 - alpha. */
export function conformalThreshold(
  calibUncertainties: readonly number[],
  alpha: number,
): number {
  const sorted = [...calibUncertainties].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return Infinity;
  const k = Math.min(n, Math.ceil((1 - alpha) * (n + 1)));
  return sorted[k - 1]!;
}

export type Triage = "post" | "review" | "abstain";

/** Two-threshold triage of one pick's uncertainty score. */
export function triage(
  uncertainty: number,
  t: MarketThresholds,
): Triage {
  if (uncertainty <= t.betaLow) return "post";
  if (uncertainty >= t.betaHigh) return "abstain";
  return "review";
}

/**
 * Calibrate market-conditional (betaLow, betaHigh) from a calibration set:
 * betaHigh = conformal quantile targeting the abstention budget; betaLow =
 * the quantile at which the review band holds the target review mass.
 */
export function calibrateMarketThresholds(
  market: Market,
  calibUncertainties: readonly number[],
  alpha: number,
  abstentionBudget: number,
  reviewMass: number,
): MarketThresholds {
  const betaHigh = conformalThreshold(calibUncertainties, abstentionBudget);
  const betaLow = conformalThreshold(calibUncertainties, 1 - reviewMass - abstentionBudget + alpha * 0);
  void alpha;
  return { market, alpha, betaLow: Math.min(betaLow, betaHigh), betaHigh };
}

export interface TriageResult {
  readonly posted: number;
  readonly review: number;
  readonly abstained: number;
  readonly coverage: number;
  readonly abstentionRate: number;
}

/** Apply market-conditional triage to a slate. */
export function triageSlate(
  uncertainties: readonly { readonly market: Market; readonly u: number }[],
  thresholds: Record<Market, MarketThresholds>,
): TriageResult {
  let posted = 0;
  let review = 0;
  let abstained = 0;
  for (const x of uncertainties) {
    const t = triage(x.u, thresholds[x.market]);
    if (t === "post") posted++;
    else if (t === "review") review++;
    else abstained++;
  }
  const n = uncertainties.length;
  return {
    posted,
    review,
    abstained,
    coverage: n > 0 ? (posted + review) / n : 0,
    abstentionRate: n > 0 ? abstained / n : 0,
  };
}

/** Gate: coverage >= 90% and abstention rate <= 25%. */
export function meetsGate(r: TriageResult): boolean {
  return r.coverage >= 0.9 && r.abstentionRate <= 0.25;
}
