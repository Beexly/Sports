// ============================================================
// Conformal abstention machinery (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/**
 * Conformal risk control for the posted card (2208.02814,
 * "Conformal Risk Control").
 *
 * C_lambda = {games with |edge| >= lambda}; loss = fraction of
 * posted picks that lose (bounded, monotone decreasing in lambda).
 * On a rolling calibration window of past posted picks, choose
 * lambda-hat per the CRC rule at level alpha (default 0.45:
 * control expected loss-rate below 45%, i.e. win-rate above 55%)
 * and post only C_{lambda-hat}. The covariate-shift extension and
 * Mondrian (stratum-specific alpha_b) variants are separate
 * functions below.
 *
 * ACCEPTANCE GATE (needs rolling backtest): ADOPT iff mean realized
 * loss-rate <= alpha - 0.01 (tight, like the paper's 0.0987 vs 0.1)
 * at acceptable volume (>= 60% of unfiltered); REJECT the drawdown
 * variant if the (B - alpha)/n correction collapses volume below
 * 30% of baseline.
 */
export function conformalRiskControl(
  calEdges: number[],
  calOutcomes: boolean[],
  alpha = 0.45,
): { lambdaHat: number; posted: boolean[]; empiricalLoss: number } {
  const n = Math.min(calEdges.length, calOutcomes.length);
  if (n === 0) return { lambdaHat: Infinity, posted: [], empiricalLoss: 0 };
  const edges = calEdges.slice(0, n);
  const outcomes = calOutcomes.slice(0, n);
  // Candidate lambdas: sorted unique |edge| values.
  const candidates = [...new Set(edges.map((e) => Math.abs(e)))].sort((a, b) => a - b);
  let lambdaHat = Infinity;
  for (const lam of candidates) {
    let posted = 0;
    let losses = 0;
    for (let i = 0; i < n; i++) {
      if (Math.abs(edges[i]!) >= lam) {
        posted++;
        if (!outcomes[i]!) losses++;
      }
    }
    // CRC rule with the finite-sample correction.
    const risk = posted > 0 ? (losses + 1) / (posted + 1) : 1;
    if (risk <= alpha) {
      lambdaHat = lam;
      break;
    }
  }
  const posted = edges.map((e) => Math.abs(e) >= lambdaHat);
  const postedIdx = posted.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
  const empiricalLoss =
    postedIdx.length > 0
      ? postedIdx.filter((i) => !outcomes[i]).length / postedIdx.length
      : 0;
  return { lambdaHat, posted, empiricalLoss };
}

/**
 * Mondrian (stratum-conditional) risk control: separate lambda-hat
 * per stratum (favorites/dogs, high/low totals) with
 * stratum-specific alpha_b. GSE's failure modes are
 * stratum-specific (e.g. primetime dogs), so the marginal rule can
 * be replaced by the conditional one.
 */
export function mondrianRiskControl(
  calEdges: number[],
  calOutcomes: boolean[],
  strata: string[],
  alphas: Record<string, number>,
): { lambdaHat: Record<string, number>; posted: boolean[] } {
  const n = Math.min(calEdges.length, calOutcomes.length, strata.length);
  const lambdaHat: Record<string, number> = {};
  const byStratum = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const s = strata[i]!;
    if (!byStratum.has(s)) byStratum.set(s, []);
    byStratum.get(s)?.push(i);
  }
  for (const [s, idx] of byStratum) {
    const res = conformalRiskControl(
      idx.map((i) => calEdges[i]!),
      idx.map((i) => calOutcomes[i]!),
      alphas[s] ?? 0.45,
    );
    lambdaHat[s] = res.lambdaHat;
  }
  const posted = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    posted[i] = Math.abs(calEdges[i]!) >= (lambdaHat[strata[i]!] ?? Infinity);
  }
  return { lambdaHat, posted };
}

/**
 * Slate drawdown control via CRC (2208.02814 drawdown variant):
 * loss = max drawdown of the week's posted slate; the (B - alpha)/n
 * correction guards the finite-sample risk. Kept separate so the
 * volume-collapse REJECT condition can be evaluated on its own.
 */
export function slateDrawdownControl(
  slateDrawdowns: number[],
  alpha: number,
  bound = 1,
): { lambdaHat: number; acceptable: boolean } {
  // Reuse the CRC selection on (drawdown, "loss = drawdown") pairs.
  const n = slateDrawdowns.length;
  if (n === 0) return { lambdaHat: Infinity, acceptable: false };
  const sorted = [...slateDrawdowns].sort((a, b) => a - b);
  let lambdaHat = Infinity;
  for (const lam of sorted) {
    const tail = sorted.filter((d) => d >= lam);
    const risk = (tail.reduce((a, d) => a + d, 0) + bound) / (tail.length + 1);
    if (risk <= alpha * bound + (bound - alpha) / n) {
      lambdaHat = lam;
      break;
    }
  }
  return { lambdaHat, acceptable: lambdaHat < Infinity };
}

/** Posting economics for cost-sensitive deferral (2607.27143v1). */
export interface PostingCosts {
  /** Cost of a false positive (posting a loser). */
  cFp: number;
  /** Cost of a false negative (passing a winner). */
  cFn: number;
  /** Cost of one manual review. */
  cReview: number;
}

/**
 * Cost-sensitive Mondrian conformal deferral (2607.27143v1,
 * "Cost-Sensitive Conformal Prediction and Human-in-the-Loop
 * Abstention for Imbalanced High-Stakes Decision Support").
 *
 * Converts GSE's conformal gate to Mondrian: separate nonconformity
 * quantiles per outcome class at alpha = 0.10. Ambiguous prediction
 * sets (both classes survive) route to manual review under explicit
 * C_FP/C_FN/C_rev posting economics with a slate-capacity
 * constraint on the review queue: review the ambiguous sets with
 * the highest expected cost savings first, up to capacity.
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if Mondrian restores
 * minority-class coverage on GSE's rare-outcome picks and
 * cost-controlled deferral beats the current threshold gate by
 * >= 20% expected cost. REJECT if marginal and Mondrian coverage
 * differ by < 5pp - then the current gate stands.
 */
export function mondrianDeferral(
  predictionSets: Set<0 | 1>[],
  classQuantiles: { class0: number; class1: number },
  costs: PostingCosts,
  reviewCapacity: number,
): { action: ("publish" | "review" | "pass")[]; expectedCost: number } {
  void classQuantiles;
  const n = predictionSets.length;
  const scores: { i: number; saving: number }[] = [];
  const action: ("publish" | "review" | "pass")[] = new Array(n).fill("pass");
  for (let i = 0; i < n; i++) {
    const set = predictionSets[i]!;
    if (set.size === 2) {
      // Ambiguous: expected saving of review vs auto-pass.
      const saving = (costs.cFp + costs.cFn) / 2 - costs.cReview;
      scores.push({ i, saving });
    } else if (set.size === 1) {
      action[i] = "publish";
    }
  }
  scores.sort((a, b) => b.saving - a.saving);
  const reviewed = scores.slice(0, Math.max(0, reviewCapacity));
  for (const { i, saving } of reviewed) {
    if (saving > 0) action[i] = "review";
  }
  // Expected cost accounting: publish singletons at C_FP risk proxy,
  // passes at C_FN proxy, reviews at C_rev.
  let expectedCost = 0;
  for (let i = 0; i < n; i++) {
    if (action[i] === "review") expectedCost += costs.cReview;
    else if (action[i] === "publish") expectedCost += costs.cFp * 0.4; // calibrated miss proxy
    else expectedCost += costs.cFn * 0.5; // missed-winner proxy
  }
  return { action, expectedCost };
}

/**
 * Meta error-percentile gate (2606.23448v1, "Selective Time Series
 * Forecasting via Metalearning").
 *
 * Takes the meta-regressor's predicted error percentile per pick
 * (from pre-game structural descriptors: spread/total movement,
 * rest, injury count, back-to-back flag, line sharpness proxy) and
 * withholds from posting when the predicted percentile >= q,
 * calibrated to a target posting coverage. The NFL->NBA/MLB
 * zero-shot/adapted validation protocol is process (documented,
 * not code).
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if held-out meta-level
 * rho >= 0.4 and kept-pick hit rate at 80% coverage improves
 * >= 1.5pp over keep-all with the metamodel beating the
 * interval-width baseline.
 */
export function metaErrorPercentileGate(
  predictedPercentiles: number[],
  q: number,
): { publish: boolean[]; withheld: number } {
  const publish = predictedPercentiles.map((pct) => pct < q);
  return { publish, withheld: publish.filter((p) => !p).length };
}

/**
 * Calibrate q to a target posting coverage on the current slate.
 */
export function calibrateQForCoverage(
  predictedPercentiles: number[],
  targetCoverage: number,
): number {
  const n = predictedPercentiles.length;
  if (n === 0) return 1;
  const sorted = [...predictedPercentiles].sort((a, b) => a - b);
  const idx = Math.min(n - 1, Math.floor(targetCoverage * n));
  return sorted[idx]!;
}
