// ============================================================
// Forecast aggregation and agreement gates (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/** Clamp a probability away from the 0/1 boundaries. */
function clampP(p: number): number {
  return Math.min(Math.max(p, 1e-9), 1 - 1e-9);
}

function logit(p: number): number {
  const c = clampP(p);
  return Math.log(c / (1 - c));
}

function expit(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Precision-weighted forecast aggregation (1710.02838, "Robust
 * Forecast Aggregation").
 *
 * Replaces any simple average of GSE probability p_G and
 * market-implied p_M: weights w_i proportional to 1/(p_i(1-p_i))
 * when |p_G - p_M| <= 0.4, proportional to 1/sqrt(p_i(1-p_i))
 * beyond; snaps to 0/1 at extremes. Where a base rate is
 * unavailable, the average-prior scheme uses dummy prior
 * mu-hat = mean(p) in Bordley's formula. Ensemble guardrail: for
 * combining > 2 correlated sub-model probabilities without a fitted
 * prior, do NOT average - select the single best-calibrated expert
 * or fit the joint structure first (flagged, not averaged).
 *
 * ACCEPTANCE GATE (needs backtest): ADAPT the precision scheme iff
 * it beats simple averaging on backtested Brier score; ADAPT the
 * average-prior scheme iff it beats or matches precision-weighting
 * when the base rate is unstable. REJECT "follow the most extreme
 * forecast" as a combination rule.
 */
export function precisionWeightedAggregate(
  probs: number[],
  baseRate?: number,
  correlatedWithoutPrior = false,
): { aggregate: number; scheme: "precision" | "average-prior" | "single-expert" } {
  if (probs.length === 0) return { aggregate: 0.5, scheme: "precision" };
  if (correlatedWithoutPrior && probs.length > 2) {
    // Guardrail: do not average correlated experts without a prior.
    return { aggregate: probs[0]!, scheme: "single-expert" };
  }
  const ps = probs.map(clampP);
  // Snap to 0/1 at extremes.
  if (ps.some((p) => p <= 0.01 || p >= 0.99)) {
    const snapped = ps.map((p) => (p <= 0.01 ? 0 : p >= 0.99 ? 1 : p));
    if (snapped.some((p) => p === 0 || p === 1)) {
      return { aggregate: snapped.reduce((a, b) => a + b, 0) / snapped.length, scheme: "precision" };
    }
  }
  if (baseRate === undefined) {
    // Average-prior scheme: Bordley with mu-hat = mean.
    const muHat = ps.reduce((a, b) => a + b, 0) / ps.length;
    const odds = ps.map((p) => (p / (1 - p)) / (muHat / (1 - muHat)));
    const prod = odds.reduce((a, b) => a * b, 1);
    const aggOdds = Math.pow(prod, 1 / ps.length) * (muHat / (1 - muHat));
    return { aggregate: aggOdds / (1 + aggOdds), scheme: "average-prior" };
  }
  const maxSpread = Math.max(...ps) - Math.min(...ps);
  const weights = ps.map((p) =>
    maxSpread <= 0.4 ? 1 / (p * (1 - p)) : 1 / Math.sqrt(p * (1 - p)),
  );
  const wSum = weights.reduce((a, b) => a + b, 0);
  const agg = ps.reduce((a, p, i) => a + (weights[i]! / wSum) * p, 0);
  return { aggregate: agg, scheme: "precision" };
}

/** One OGD blending step state (1802.07107). */
export interface OgdBlendState {
  /** Weight vector h over the log-odds deviations. */
  h: number[];
  /** Learning rate. */
  eta: number;
}

/**
 * Log-odds-linear OGD blending layer (1802.07107, "Learning of
 * Optimal Forecast Aggregation in Partial Evidence Environments").
 *
 * For each game, component probabilities become log-odds deviations
 * z-tilde_i = logit(p_i) - logit(mu-hat) (mu-hat = empirical base
 * rate per market); final probability =
 * logit(h . z-tilde + logit(mu-hat)) with h learned by online
 * gradient descent on log loss over historical slates (one pass over
 * history, closed-form-ish update). Extreme-forecast rule: when any
 * source posts p outside [tau, 1-tau] (tau from sample size), blend
 * toward it aggressively, capped at the n-alpha influence bound.
 * Injectivity audit: if two components are deterministic functions
 * of the same evidence (identical inputs), drop the duplicate.
 *
 * ACCEPTANCE GATE (needs backtest): ADAPT iff the OGD layer beats
 * simple averaging on out-of-sample log loss. ADOPT the injectivity
 * audit as a standing rule.
 */
export function ogdBlendStep(
  state: OgdBlendState,
  components: number[],
  baseRate: number,
  outcome: 0 | 1,
): OgdBlendState {
  const mu = clampP(baseRate);
  const z = components.map((p) => logit(p) - logit(mu));
  const h = state.h.length === z.length ? state.h : new Array(z.length).fill(1 / Math.max(z.length, 1));
  const score = h.reduce((a, hi, i) => a + hi * z[i]!, 0) + logit(mu);
  const pred = expit(score);
  // Gradient of log loss wrt h: (pred - y) * z.
  const grad = z.map((zi) => (pred - outcome) * zi);
  const hNext = h.map((hi, i) => hi - state.eta * grad[i]!);
  return { h: hNext, eta: state.eta };
}

/**
 * Blend with the current weights (no learning).
 */
export function ogdBlendPredict(
  h: number[],
  components: number[],
  baseRate: number,
  sampleSize = 100,
): number {
  const mu = clampP(baseRate);
  const tau = 1 / Math.max(sampleSize, 2); // tau from sample size
  const nAlpha = Math.min(0.9, 1 - 1 / Math.max(sampleSize, 2));
  const z = components.map((p) => logit(p) - logit(mu));
  const score = h.reduce((a, hi, i) => a + hi * z[i]!, 0) + logit(mu);
  let pred = expit(score);
  // Extreme-forecast rule with the n-alpha influence cap: if any
  // component is extreme (beyond 1 - 1/n), pull the blended prediction
  // toward the base rate, keeping only nAlpha of the blended signal.
  // nAlpha grows with sample size (up to 0.9): more data => trust the
  // extreme more; less data => pull harder toward the base rate.
  const extreme = components.find((p) => p < tau || p > 1 - tau);
  if (extreme !== undefined) {
    pred = pred * nAlpha + mu * (1 - nAlpha);
  }
  return clampP(pred);
}

/**
 * Injectivity audit: drop components that are deterministic
 * duplicates of another component's evidence (identical values).
 * Returns the kept indices.
 */
export function injectivityAudit(components: number[][]): number[] {
  const kept: number[] = [];
  for (let i = 0; i < components.length; i++) {
    const dup = kept.some(
      (k) =>
        components[k]!.length === components[i]!.length &&
        components[k]!.every((v, j) => v === components[i]![j]),
    );
    if (!dup) kept.push(i);
  }
  return kept;
}

/**
 * Binomial majority gate over seed-varied models (2111.08230v1,
 * "Selective Ensembles for Consistent Predictions").
 *
 * Publish the majority pick from n = 10-15 seed-varied models only
 * when the binomial p-value for the majority share clears alpha
 * (tune alpha to GSE's target publish volume); otherwise withhold
 * as "model disagreement".
 *
 * ACCEPTANCE GATE (needs backtest): ADAPT iff the binomial-gated
 * ensemble beats plain majority vote on test-window covered-set ROI
 * by >= 2pp with abstention <= 35%.
 */
export function binomialMajorityGate(
  votes: boolean[],
  alpha: number,
): { publish: boolean; majority: boolean; pValue: number } {
  const n = votes.length;
  if (n === 0) return { publish: false, majority: false, pValue: 1 };
  const k = votes.filter(Boolean).length;
  const majority = k > n / 2;
  const m = Math.max(k, n - k);
  // One-sided binomial tail P(X >= m) under p = 0.5.
  let tail = 0;
  for (let j = m; j <= n; j++) {
    tail += binom(n, j) * Math.pow(0.5, n);
  }
  return { publish: tail <= alpha, majority, pValue: tail };
}

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
}

/**
 * Agreement gate as the reject option (1312.3989v1, "Classifiers
 * With a Reject Option for Early Time-Series Classification").
 *
 * A pick is postable only if two diverse engine configurations
 * (structurally different, not just different seeds) agree on the
 * side AND both clear the edge threshold; disagreement means
 * abstain (logged, not posted).
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT only if (a)
 * agreement-conditioned ROI beats single-model ROI out-of-sample by
 * >= 3 points, (b) the gate retains >= 30% of picks, and (c)
 * disagreement cases are genuinely coin-flips (win rate 45-55%).
 */
export function agreementGate(
  sideA: "home" | "away",
  sideB: "home" | "away",
  edgeA: number,
  edgeB: number,
  edgeThreshold: number,
): { postable: boolean; reason: string } {
  if (sideA !== sideB) return { postable: false, reason: "config-disagreement" };
  if (edgeA < edgeThreshold || edgeB < edgeThreshold) {
    return { postable: false, reason: "edge-below-threshold" };
  }
  return { postable: true, reason: "agreement" };
}

/**
 * Expert-disagreement no-bet rule (2001.10623v2, "Fast Rates for
 * Online Prediction with Abstention").
 *
 * Exponentially-weighted (by recent Brier) consensus p* over engine
 * model variants + signal experts; no-bet with probability
 * alpha = 2(1 - p*) (publish only when p* >= 1 - tau/2),
 * calibrating tau on 2024 to a target no-bet rate.
 *
 * ACCEPTANCE GATE (needs 2024 backtest): ADOPT if the alpha-rule's
 * cumulative regret vs the best expert is <= 50% of publish-all's
 * AND the no-bet rate is <= 40%.
 */
export function disagreementNoBet(
  expertProbs: number[],
  recentBriers: number[],
  tau: number,
): { pStar: number; noBetProb: number; publish: boolean } {
  const n = expertProbs.length;
  if (n === 0) return { pStar: 0.5, noBetProb: 0, publish: false };
  const weights = recentBriers.map((b) => Math.exp(-Math.max(b, 0) * 10));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const pStar =
    wSum > 0
      ? expertProbs.reduce((a, p, i) => a + (weights[i]! / wSum) * p, 0)
      : 0.5;
  const noBetProb = 2 * (1 - pStar);
  const publish = pStar >= 1 - tau / 2;
  return { pStar, noBetProb: Math.min(Math.max(noBetProb, 0), 1), publish };
}

/** One ensemble member's track record (1710.09901v1). */
export interface EnsembleMember {
  /** Abstention rate m-hat over history. */
  abstentionRate: number;
  /** Hit rate given a pick, mu-hat. */
  hitRateGivenPick: number;
  /** Number of picks made on the current slate. */
  slatePicks: number;
}

/**
 * Crowdsourced-classification reject option (1710.09901v1, "Optimal
 * Crowdsourced Classification with a Reject Option in the Presence
 * of Spammers").
 *
 * Treats each ensemble member (engine model, analyst signal,
 * market-derived signal) as a "worker" producing pick/no-pick or
 * skip. Flags spammer-like members (always-pick with mu-hat ~= 0.5)
 * with a completing-spammer discount, then aggregates board picks
 * with the reliability-weighted majority rule.
 *
 * ACCEPTANCE GATE (needs Weeks 4-8 window): ADOPT if the
 * reliability-weighted aggregation beats the baseline by >= 2.0pp
 * hit rate with one-sided binomial p < 0.05; otherwise REJECT.
 */
export function crowdsourcedReject(
  members: EnsembleMember[],
  memberPicks: boolean[],
): { aggregate: boolean; weights: number[] } {
  const n = members.length;
  if (n === 0 || memberPicks.length !== n) return { aggregate: false, weights: [] };
  const weights = members.map((m) => {
    // Spammer discount: always-pick (abstention ~ 0) with edge ~ 0.
    const spammer = m.abstentionRate < 0.05 && Math.abs(m.hitRateGivenPick - 0.5) < 0.03;
    const reliability = Math.max(m.hitRateGivenPick - 0.5, 0);
    const base = reliability / Math.max(n - members.length, 1);
    void base;
    const w = reliability * Math.pow(0.5, m.slatePicks / 10);
    return spammer ? w * 0.25 : w;
  });
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return { aggregate: false, weights };
  const yes = memberPicks.reduce((a, pick, i) => a + (pick ? weights[i]! / wSum : 0), 0);
  return { aggregate: yes > 0.5, weights };
}
