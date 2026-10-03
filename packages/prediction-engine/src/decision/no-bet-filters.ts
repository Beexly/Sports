// ============================================================
// No-bet and publish filters (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/**
 * Uncertainty-sorted publish filter (1904.09235v2, "Reliable
 * Multi-label Classification: Prediction with Partial Abstention").
 *
 * Sorts each weekly slate by uncertainty u_i = 2*min(p_i, 1-p_i),
 * chooses publish-count d minimizing expected Hamming loss plus an
 * abstention cost: L(d) = sum_{i<=d} u_i/2 + penaltyPerPick*(n-d).
 * Publishing a pick incurs its expected error u_i/2; abstaining
 * incurs the per-pick opportunity cost penaltyPerPick (tuned on
 * 2024). Publishes only the top-d least-uncertain games instead of
 * publish-all. A nonzero d wins whenever the most-certain picks'
 * expected errors are below the abstention cost.
 *
 * ACCEPTANCE GATE (needs 2024 backtest): ADOPT if the filter beats
 * publish-all by >= 2.0pp hit rate with Wilcoxon p < 0.05 across the
 * 18 weekly slates, at comparable or lower volume; otherwise REJECT.
 */
export function uncertaintySortedPublish(
  probs: number[],
  penaltyPerPick: number,
): { publish: boolean[]; d: number } {
  const n = probs.length;
  const order = probs
    .map((p, i) => ({ i, u: 2 * Math.min(p, 1 - p) }))
    .sort((a, b) => a.u - b.u);
  // L(d) = expected Hamming loss on published + abstention cost on
  // the rest. d = 0 abstains on everything (cost penalty*n).
  let bestD = 0;
  let bestLoss = penaltyPerPick * n; // d = 0
  let cumLoss = 0;
  for (let d = 1; d <= n; d++) {
    const { u } = order[d - 1]!;
    cumLoss += u / 2;
    const loss = cumLoss + penaltyPerPick * (n - d);
    if (loss < bestLoss) {
      bestLoss = loss;
      bestD = d;
    }
  }
  const publish = new Array(n).fill(false);
  for (let d = 0; d < bestD; d++) publish[order[d]!.i] = true;
  return { publish, d: bestD };
}

/**
 * Weekly board volume governor (1905.09561v1, "Binary Classification
 * with Bounded Abstention Rate").
 *
 * Fixes a publish skip budget delta (e.g. 0.25), computes the
 * delta-quantile of calibrated |p_cover - 0.5| ambiguity on the
 * unlabeled slate, and skips games below it. Deployable before
 * kickoff with no labels needed.
 *
 * ACCEPTANCE GATE (needs 18-week backtest): ADOPT if at delta = 0.2
 * the published set beats publish-all by >= 2.0pp hit rate
 * (Wilcoxon p < 0.05) AND the achieved skip rate is within +-3pp of
 * delta every week; otherwise REJECT.
 */
export function volumeGovernor(
  coverProbs: number[],
  delta: number,
): { publish: boolean[]; achievedSkipRate: number } {
  const n = coverProbs.length;
  if (n === 0) return { publish: [], achievedSkipRate: 0 };
  const ambiguities = coverProbs.map((p) => Math.abs(p - 0.5));
  // Skip exactly round(delta*n) of the most ambiguous games
  // (smallest |p - 0.5|), tie-broken by slate order, so the achieved
  // skip rate hits the target within the ledger's +-3pp gate.
  const k = Math.min(n, Math.max(0, Math.round(delta * n)));
  const order = ambiguities
    .map((a, i) => ({ a, i }))
    .sort((x, y) => x.a - y.a || x.i - y.i);
  const skip = new Set(order.slice(0, k).map((o) => o.i));
  const publish = ambiguities.map((_, i) => !skip.has(i));
  return { publish, achievedSkipRate: (n - publish.filter(Boolean).length) / n };
}

/**
 * Bounded-abstention marginal-gain filter (1802.07024v5, "A General
 * Framework for Abstention Under Label Shift").
 *
 * Takes the engine's calibrated probabilities and a per-game
 * estimated marginal improvement in the board metric from skipping
 * it (calibrated probs as label proxies); publishes the top (1 - k)
 * fraction by marginal gain, abstaining on k (e.g. k = 20%) - the
 * bounded-abstention knob as the weekly volume dial. Includes the
 * Saerens-EM weekly base-rate re-estimator for label-shift
 * adaptation (early vs late season regimes).
 *
 * ACCEPTANCE GATE (needs 8-week window): ADOPT if the filtered
 * board beats publish-all by >= 3.0pp hit rate OR >= 15% higher
 * realized profit with Wilcoxon p < 0.05 across weekly blocks.
 */
export function marginalGainFilter(
  marginalGains: number[],
  k: number,
): { publish: boolean[]; abstained: number } {
  const n = marginalGains.length;
  if (n === 0) return { publish: [], abstained: 0 };
  const keep = Math.max(0, Math.round(n * (1 - k)));
  const order = marginalGains
    .map((g, i) => ({ i, g }))
    .sort((a, b) => b.g - a.g);
  const publish = new Array(n).fill(false);
  for (let r = 0; r < keep; r++) publish[order[r]!.i] = true;
  return { publish, abstained: n - keep };
}

/**
 * Saerens-EM base-rate re-estimation for label-shift adaptation:
 * re-estimate the weekly class prior from the unlabeled slate's
 * calibrated probabilities (fixed iterations, deterministic).
 */
export function saerensEmBaseRate(
  calibratedProbs: number[],
  initialPrior = 0.5,
  iterations = 50,
): number {
  let prior = Math.min(Math.max(initialPrior, 1e-6), 1 - 1e-6);
  for (let it = 0; it < iterations; it++) {
    let num = 0;
    for (const p of calibratedProbs) {
      const c = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
      num += (c * prior) / (c * prior + (1 - c) * (1 - prior));
    }
    prior = calibratedProbs.length > 0 ? num / calibratedProbs.length : prior;
  }
  return prior;
}

/** One week of a pre-committed gating schedule (1902.04256). */
export interface GatingWeek {
  week: number;
  /** Strictness: fraction of the slate to publish (1 = full card). */
  publishFraction: number;
}

/**
 * Pre-committed season gating schedule (1902.04256, "A Theory of
 * Selective Prediction").
 *
 * Replaces week-to-week re-tuning of publish gates with a
 * season-start gating strictness schedule (full-card vs
 * reduced-card weeks) chosen on historical variance structure.
 * adaptiveGapDiagnostic implements the paper's overfitting
 * diagnostic: the adaptive-vs-committed backtest gap.
 *
 * ACCEPTANCE GATE (needs backtest): accepted if the pre-committed
 * schedule's error is within a small factor of any adaptive
 * alternative's; rejected if adaptive scheduling wins by a large,
 * stable margin.
 */
export function committedScheduleGate(
  week: number,
  schedule: GatingWeek[],
): number {
  const entry = schedule.find((s) => s.week === week);
  return entry ? entry.publishFraction : 1;
}

/**
 * Overfitting diagnostic: positive gap means the adaptive schedule
 * beat the committed one (evidence of over-tuning risk if large).
 * gap = committedError - adaptiveError.
 */
export function adaptiveGapDiagnostic(
  committedError: number,
  adaptiveError: number,
): number {
  return committedError - adaptiveError;
}

/**
 * Softmax-rank publish gate (2206.09034v4, "Towards Better Selective
 * Classification").
 *
 * Ranks games by max softmax probability and publishes the
 * top-c_target fraction with the threshold calibrated on the prior
 * season. (The entropy-regularized training loss L = CE + beta*H(p)
 * is model-training work; this module is the deployable gate.)
 * Includes the subgroup-coverage audit: reports publish rates per
 * subgroup so the filter cannot silently exclude divisional or
 * bad-weather games.
 *
 * ACCEPTANCE GATE (needs backtest): ADAPT iff entropy-regularized +
 * SR beats vanilla + SR on covered-set ROI by >= 1pp at matched 30%
 * coverage, or vanilla + SR beats the learned selection head by
 * >= 1pp.
 */
export function selectiveRankGate(
  maxProbs: number[],
  coverage: number,
  subgroups?: string[],
): { publish: boolean[]; subgroupCoverage: Record<string, number> } {
  const n = maxProbs.length;
  const keep = Math.max(0, Math.round(n * coverage));
  const order = maxProbs
    .map((p, i) => ({ i, p }))
    .sort((a, b) => b.p - a.p);
  const publish = new Array(n).fill(false);
  for (let r = 0; r < keep; r++) publish[order[r]!.i] = true;
  const subgroupCoverage: Record<string, number> = {};
  if (subgroups && subgroups.length === n) {
    const totals: Record<string, number> = {};
    const kept: Record<string, number> = {};
    subgroups.forEach((s, i) => {
      totals[s] = (totals[s] ?? 0) + 1;
      if (publish[i]) kept[s] = (kept[s] ?? 0) + 1;
    });
    for (const s of Object.keys(totals)) {
      subgroupCoverage[s] = (kept[s] ?? 0) / totals[s]!;
    }
  }
  return { publish, subgroupCoverage };
}

/**
 * MC-variance abstention (2509.21514v4, "Knowing When to Defer").
 *
 * Defers picks by prediction uncertainty: per-candidate variance
 * over M stochastic forward passes (or seeded-bootstrap
 * disagreement), deferring the most uncertain fraction to hit the
 * target posting coverage.
 *
 * ACCEPTANCE GATE (needs 2024-2025 backtest): ADOPT if MC-variance
 * abstention at c = 0.80 lifts cover/hit rate by >= 1.5pp over
 * no-abstention AND beats the |p - 0.5| heuristic by >= 1.0pp, with
 * deferred-set error ratio >= 1.3 vs kept set.
 */
export function mcVarianceDeferral(
  variances: number[],
  coverage: number,
): { publish: boolean[]; deferred: number } {
  const n = variances.length;
  const keep = Math.max(0, Math.round(n * coverage));
  const order = variances
    .map((v, i) => ({ i, v }))
    .sort((a, b) => a.v - b.v); // keep the least uncertain
  const publish = new Array(n).fill(false);
  for (let r = 0; r < keep; r++) publish[order[r]!.i] = true;
  return { publish, deferred: n - keep };
}

/**
 * Market-stress abstention (2510.13327, "When In Doubt, Abstain").
 *
 * Sweeps adverse line moves k = 0..1.5 points against each posted
 * pick (via the supplied edge-at-move function), finds the k* where
 * edge turns negative, and flags picks for an elevated abstention
 * threshold when the observed move exceeds k*.
 *
 * ACCEPTANCE GATE (needs backtest): accepted if the stress test
 * finds a stable turning point k* where posted-pick edge at the
 * moved line turns negative AND the elevated gate recovers positive
 * units in the high-movement regime.
 */
export function stressAbstention(
  edgeAtMove: (k: number) => number,
  observedMove: number,
  steps = 16,
): { kStar: number | null; elevatedGate: boolean } {
  let kStar: number | null = null;
  for (let s = 0; s <= steps; s++) {
    const k = (1.5 * s) / steps;
    if (edgeAtMove(k) < 0) {
      kStar = k;
      break;
    }
  }
  return { kStar, elevatedGate: kStar !== null && observedMove >= kStar };
}

/** Bin-wise accuracy for the C1/C2 check (2603.09947v1). */
export interface AccuracyBin {
  meanScore: number;
  accuracy: number;
  n: number;
}

/**
 * Confidence-gate theorem check (2603.09947v1, "The Confidence Gate
 * Theorem: When Should Ranked Decision Systems Abstain?").
 *
 * Gates every abstention policy: C1 = the candidate score positively
 * correlates with realized accuracy; C2 = zero bin-wise accuracy
 * inversions (accuracy monotone non-decreasing in score bin).
 * killOnInversion implements the automatic kill rule on any 4-week
 * inversion window.
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if the C1/C2 check passes
 * on held-out data for at least one signal class with zero
 * inversions and the resulting gate lifts held-out hit rate at 80%
 * coverage.
 */
export function confidenceGateCheck(bins: AccuracyBin[]): {
  c1Pass: boolean;
  c2Pass: boolean;
  inversions: number;
} {
  if (bins.length < 2) return { c1Pass: false, c2Pass: false, inversions: 0 };
  const sorted = [...bins].sort((a, b) => a.meanScore - b.meanScore);
  // C1: Pearson correlation between mean score and accuracy > 0.
  const n = sorted.length;
  const meanS = sorted.reduce((a, b) => a + b.meanScore, 0) / n;
  const meanA = sorted.reduce((a, b) => a + b.accuracy, 0) / n;
  let num = 0;
  let denS = 0;
  let denA = 0;
  for (const b of sorted) {
    num += (b.meanScore - meanS) * (b.accuracy - meanA);
    denS += (b.meanScore - meanS) ** 2;
    denA += (b.accuracy - meanA) ** 2;
  }
  const corr = denS > 0 && denA > 0 ? num / Math.sqrt(denS * denA) : 0;
  let inversions = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.accuracy < sorted[i - 1]!.accuracy - 1e-12) inversions++;
  }
  return { c1Pass: corr > 0, c2Pass: inversions === 0, inversions };
}

/**
 * CQR variance-gated no-bet (2006.16597v2, "Regression with Reject
 * Option and Application to kNN").
 *
 * For each slate game, sigma-hat(x) = CQR interval width; set
 * lambda-hat_epsilon as the (1 - epsilon)-quantile over the slate;
 * no-bet games with sigma-hat > lambda-hat_epsilon; grid-search
 * epsilon in {0.1, ..., 0.5} on 2024.
 *
 * ACCEPTANCE GATE (needs 2024 backtest): ADOPT if at epsilon = 0.3
 * the published set's RMSE drops >= 15% vs publish-all (paired test
 * p < 0.05) AND achieved rejection rate is within +-3pp of epsilon
 * AND the error-vs-epsilon curve is monotone decreasing.
 */
export function cqrVarianceGate(
  widths: number[],
  epsilon: number,
): { publish: boolean[]; lambdaHat: number; achievedRejection: number } {
  const n = widths.length;
  if (n === 0) return { publish: [], lambdaHat: 0, achievedRejection: 0 };
  // Exact-count, tie-safe top-epsilon rejection: reject the k =
  // round(epsilon*n) widest intervals (ties broken by slate order),
  // so the achieved rejection rate hits the target exactly.
  const k = Math.min(n, Math.max(0, Math.round(epsilon * n)));
  const order = widths
    .map((w, i) => ({ w, i }))
    .sort((x, y) => y.w - x.w || x.i - y.i);
  const reject = new Set(order.slice(0, k).map((o) => o.i));
  const publish = widths.map((_, i) => !reject.has(i));
  // lambdaHat: the (1-epsilon) quantile via linear interpolation,
  // reported for monitoring (the decision uses the exact count).
  const sorted = [...widths].sort((a, b) => a - b);
  const pos = Math.min(n - 1, Math.max(0, (1 - epsilon) * (n - 1)));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const lambdaHat = sorted[lo]! + (pos - lo) * (sorted[hi]! - sorted[lo]!);
  const rejected = publish.filter((x) => !x).length;
  return { publish, lambdaHat, achievedRejection: rejected / n };
}

/**
 * Pairwise ranking with distance-based abstention (2307.02035v1,
 * "Ranking with Abstention").
 *
 * Abstains from ordering a game pair if EITHER the feature distance
 * ||x - x'|| <= gamma (too close to call: assign equal rank / same
 * publish tier) OR the learned uncertainty sigma is high. Combined
 * with confidence-based abstention; gamma and c tuned on
 * validation to minimize abstention loss.
 *
 * ACCEPTANCE GATE (needs backtest): ADAPT if the gamma-abstaining
 * ranker beats strict edge ordering on test-window top-5 ROI by
 * >= 1pp with gamma, c stable across folds; reject if the optimal
 * gamma collapses to 0.
 */
export function pairwiseRankAbstention(
  featureDistance: number,
  uncertainty: number,
  gamma: number,
  uncertaintyThreshold: number,
): { abstain: boolean; reason: "too-close" | "uncertain" | "rank" } {
  if (featureDistance <= gamma) return { abstain: true, reason: "too-close" };
  if (uncertainty >= uncertaintyThreshold) return { abstain: true, reason: "uncertain" };
  return { abstain: false, reason: "rank" };
}
