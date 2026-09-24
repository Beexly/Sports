// ============================================================
// Mispricing and miscalibration monitors (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/**
 * Bayes-Kelly miscalibration monitor (2402.03035, "An Optimality
 * Property of the Bayes-Kelly Algorithm", ledger 1626).
 *
 * Defines a conformity score on each settled pick (signed log-loss
 * residual of engine probability vs outcome), implements the
 * tractable Bayes-Kelly special case with a simple parametric
 * alternative (Beta-family miscalibration), and runs the test
 * martingale over the settled-pick stream per market. Wire
 * thresholds: martingale crossing L1 -> halve stakes; crossing
 * L2 -> abstain until mean-reversion. Empirical-Bayes prior refit
 * monthly on GSE's own miscalibration history (offline; this
 * function runs the stream).
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if the monitor detects
 * injected miscalibration regimes at least 30% faster (fewer bets
 * to L1) than the rolling-calibration-error baseline at equal
 * false-alarm rates; otherwise REJECT.
 */
export function bayesKellyMartingale(
  engineProbs: number[],
  outcomes: (0 | 1)[],
  l1: number,
  l2: number,
  miscalibrationAlt = 0.05,
): { martingale: number[]; crossedL1: boolean; crossedL2: boolean } {
  const n = Math.min(engineProbs.length, outcomes.length);
  const martingale: number[] = [1];
  let m = 1;
  let crossedL1 = false;
  let crossedL2 = false;
  for (let i = 0; i < n; i++) {
    const p = Math.min(Math.max(engineProbs[i]!, 1e-9), 1 - 1e-9);
    const y = outcomes[i];
    // Likelihood ratio: null = engine p; alternative = a fixed
    // parametric miscalibration (p shifted up by miscalibrationAlt),
    // chosen BEFORE seeing the outcome. A fixed alternative keeps
    // the martingale a valid test martingale under the null: for
    // calibrated data it drifts down (or stays flat), while a
    // systematic underestimation by the engine makes it grow.
    const pAlt = Math.min(Math.max(p + miscalibrationAlt, 1e-9), 1 - 1e-9);
    const lr = y === 1 ? pAlt / p : (1 - pAlt) / (1 - p);
    m *= lr;
    martingale.push(m);
    if (m >= l1) crossedL1 = true;
    if (m >= l2) crossedL2 = true;
  }
  return { martingale, crossedL1, crossedL2 };
}

/**
 * Stake multiplier implied by the martingale thresholds:
 * 1 normally, 0.5 after L1, 0 after L2 (abstain until
 * mean-reversion, which the caller detects offline).
 */
export function martingaleStakeMultiplier(
  martingaleValue: number,
  l1: number,
  l2: number,
): number {
  if (martingaleValue >= l2) return 0;
  if (martingaleValue >= l1) return 0.5;
  return 1;
}

/**
 * FTL fair-odds consensus baseline (2406.04062v1, "Online Learning
 * in Betting Markets: Profit versus Prediction", eq. 27).
 *
 * Implements the fair-odds follow-the-leader price a-star as a
 * market-consensus baseline: given a simulated crowd's probability
 * beliefs, the FTL consensus is the belief-weighted geometric mean
 * of the odds-implied probabilities, renormalized. Persistent
 * deviations between GSE's model probabilities and the
 * FTL-implied consensus indicate either GSE edge or model bias.
 */
export function ftlConsensus(beliefs: number[]): number {
  const ps = beliefs.map((p) => Math.min(Math.max(p, 1e-9), 1 - 1e-9));
  if (ps.length === 0) return 0.5;
  // Geometric-mean consensus on the odds scale, mapped back.
  const logOdds = ps.map((p) => Math.log(p / (1 - p)));
  const mean = logOdds.reduce((a, b) => a + b, 0) / logOdds.length;
  return 1 / (1 + Math.exp(-mean));
}

/**
 * Defensive book-shading monitor (2406.04062v1).
 *
 * Given GSE's own released picks flow as a proxy for
 * informed-bettor beliefs, predicts when books will move lines
 * against GSE-style positions: flag markets where the book's
 * margin already prices in the informed flow (no edge left), so
 * GSE times releases to precede anticipated shading. The inverse
 * model estimates the bookmaker's belief g from the observed price
 * path (inverse SA): g per market from opening -> closing line
 * movement, compared against GSE's model probability as a direct
 * edge-detection signal.
 *
 * ACCEPTANCE GATE (needs one full NFL season): ADAPT the
 * shading-monitor if games flagged "book already shaded against
 * informed flow" show GSE's realized CLV >= 2 points worse than
 * unflagged games; otherwise REJECT the defensive application and
 * keep only the FTL-consensus benchmark.
 */
export function bookShadingFlag(
  openImplied: number,
  closeImplied: number,
  modelProb: number,
  informedDirection: 1 | -1,
  shadeThreshold = 0.02,
): { shaded: boolean; bookBeliefG: number; edgeVsBook: number } {
  // Inverse SA: the book's belief g revealed by the price path.
  // Exponentially weight the close (the book's latest belief).
  const bookBeliefG = 0.3 * openImplied + 0.7 * closeImplied;
  const move = (closeImplied - openImplied) * informedDirection;
  const shaded = move >= shadeThreshold;
  const edgeVsBook = modelProb - bookBeliefG;
  return { shaded, bookBeliefG, edgeVsBook };
}

/**
 * Feed-pricing rule (2104.14277v1, "Kelly Bets and Single-Letter
 * Codes: Optimal Information Processing in Natural Systems").
 *
 * For each candidate data feed/feature family F, estimate its
 * incremental mutual information I(F; Y | current features) on a
 * historical window (k-NN or variational estimators - offline).
 * The bound (32) implies the feed can reduce achievable
 * log-loss-distortion by at most that many nats: buy iff expected
 * profit lift (nats x avg stake x edge conversion) exceeds feed
 * cost.
 *
 * ACCEPTANCE GATE (needs two-season backtest): ADAPT the
 * feed-pricing rule if incremental-MI rank correlates with ablation
 * log-loss lift at Spearman rho >= 0.6 on two separate seasons AND
 * at least one feed decision made by the rule would have been
 * profitable ex post; otherwise REJECT the pricing use and keep
 * only the staking-gap diagnostic.
 */
export function feedPricingDecision(
  incrementalNats: number,
  avgStake: number,
  edgeConversion: number,
  feedCost: number,
): { buy: boolean; expectedLift: number } {
  const expectedLift = incrementalNats * avgStake * edgeConversion;
  return { buy: expectedLift > feedCost, expectedLift };
}

/**
 * Staking-gap diagnostic (2104.14277v1): the gap between GSE's
 * realized (D, R) operating point and the bound (32) implied by its
 * estimated outcome model flags non-proportional
 * (over/under-confident) staking before it shows up in P&L.
 * Positive gap = staking off the proportional line.
 */
export function stakingGapDiagnostic(
  realizedGrowth: number,
  boundGrowth: number,
): number {
  return boundGrowth - realizedGrowth;
}
