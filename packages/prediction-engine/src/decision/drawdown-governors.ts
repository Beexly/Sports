// ============================================================
// Drawdown governors and bankroll safety (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/**
 * Numeraire-style alpha-governor (1206.2305, "The Numeraire Property
 * and Long-Term Growth Optimality for Drawdown-Constrained
 * Investments").
 *
 * Tracks bankroll B_t and running max M_t; each slate scales the
 * unconstrained portfolio's stakes by the drawdown-state risky
 * fraction pi = 1 - alpha/d_t where d_t = B_t/M_t. Risks only the
 * cushion above the alpha floor (start alpha = 0.7 so peak drawdown
 * never exceeds 30%); the remainder stays in cash. A pathwise
 * drawdown guarantee by construction.
 *
 * ACCEPTANCE GATE (needs replay): ADOPT if the guaranteed drawdown
 * bound holds empirically (min B_t/M_t >= alpha - 0.02) while
 * terminal log growth is >= 80% of the unconstrained sizer's.
 */
export function alphaGovernorStake(
  bankroll: number,
  runningMax: number,
  alpha: number,
  unconstrainedStake: number,
): { stake: number; atFloor: boolean } {
  if (bankroll <= 0 || runningMax <= 0 || unconstrainedStake <= 0) {
    return { stake: 0, atFloor: true };
  }
  const d = Math.min(bankroll / runningMax, 1);
  if (d <= alpha) return { stake: 0, atFloor: true };
  const pi = 1 - alpha / d;
  return { stake: unconstrainedStake * pi, atFloor: false };
}

/**
 * Asymptotically-free bankroll floor via epsilon-mixture
 * (1305.6831, "Optimal portfolios of a long-term investor with floor
 * or drawdown constraints").
 *
 * Each slate allocates epsilon of capital to the growth-optimal
 * sizer (start epsilon = 0.8, tuned over {0.5, 0.8, 0.9}) and
 * (1 - epsilon) to cash reserved against the floor G = initial
 * bankroll, hard-guaranteeing "never lose the initial bankroll" via
 * the epsilon-mixture without sacrificing the long-run growth rate
 * (Theorem 2.2).
 *
 * ACCEPTANCE GATE (needs 3-season replay): ADOPT if the floored sizer
 * keeps min(B_t/B_0) >= 0.99 always and 3-season terminal log growth
 * is within 90% of the unfloored sizer's; REJECT if cash drag costs
 * > 15% growth on finite NFL horizons.
 */
export function epsilonMixtureStake(
  unconstrainedStake: number,
  epsilon: number,
): { stake: number; cashReservedFraction: number } {
  const e = Math.min(Math.max(epsilon, 0), 1);
  return { stake: unconstrainedStake * e, cashReservedFraction: 1 - e };
}

/**
 * Drawdown-probability-minimizing risk-dollar budget (1506.00166v2,
 * "Optimal Investment to Minimize the Probability of Drawdown").
 *
 * Given running-max bankroll M, stop fraction alpha (drawdown
 * declared at alpha * M), current bankroll w, safe level w_s, drift
 * mu, and risk-free rate r: the per-slate risk-dollar budget is
 *   R(w) = 2 * (c(w) - r*w) / (mu - r)
 * where c(w) is the consumption/withdrawal rate at wealth w. R(w)
 * auto-derisks as w approaches the safe level. Split R across the
 * slate's approved edges proportionally to edge/vol^2, and monitor
 * the implied drawdown probability phi each slate.
 *
 * ACCEPTANCE GATE (needs replay): accept if drawdown frequency falls
 * by >= 40% with <= 10% log-growth cost vs baseline Kelly; monitor
 * that implied phi tracks realized drawdown frequency.
 */
export function riskDollarBudget(
  bankroll: number,
  safeLevel: number,
  mu: number,
  riskFreeRate: number,
  consumptionRate: number,
  edges: { edge: number; vol: number }[],
): { riskDollars: number; perPick: number[]; derisked: boolean } {
  const w = bankroll;
  if (w <= 0 || mu <= riskFreeRate) return { riskDollars: 0, perPick: [], derisked: true };
  // Distance-to-safety scaling: budget vanishes at the safe level.
  const distance = Math.max(0, (w - safeLevel) / Math.max(w, 1e-300));
  const r = 2 * (consumptionRate - riskFreeRate * w) / (mu - riskFreeRate);
  const riskDollars = Math.max(0, r) * distance;
  const weights = edges.map((e) => (e.vol > 0 ? e.edge / (e.vol * e.vol) : 0));
  const wSum = weights.reduce((a, b2) => a + b2, 0);
  const perPick =
    wSum > 0 ? weights.map((x) => (riskDollars * x) / wSum) : edges.map(() => 0);
  return { riskDollars, perPick, derisked: distance === 0 };
}

/** Lifetime-drawdown mode output (1507.08713). */
export interface SafetyModeStake {
  stake: number;
  /** True when the high-water mark is frozen (B_t < S regime). */
  maxFrozen: boolean;
  /** High-water mark to carry forward. */
  nextMax: number;
}

/**
 * Lifetime-drawdown-probability mode (1507.08713, "Minimizing the
 * Probability of Lifetime Drawdown under Constant Consumption").
 *
 * Safe level S = weekly withdrawal target / risk-free rate. When
 * B_t < S: size stakes by the distance-to-safety rule, stake
 * proportional to (S - B_t) * edge (capped), and FREEZE the
 * high-water mark M (do not raise the drawdown trigger on new peaks
 * until B_t > m*). When B_t >= S: the caller reverts to the
 * alpha-governor with normal ratcheting. Garrett's actual lumpy
 * withdrawal schedule would replace constant consumption in a
 * GSE-native discrete DP (documented, not implemented here).
 *
 * ACCEPTANCE GATE (needs replay): ADOPT if this mode cuts empirical
 * drawdown frequency (weeks with B_t < 0.7*M) by >= 30% vs the
 * baseline while terminal log growth stays >= 85% of baseline's.
 */
export function lifetimeDrawdownStake(
  bankroll: number,
  safeLevel: number,
  highWaterMark: number,
  edge: number,
  stakeCap: number,
  recoveryMultiple = 1,
): SafetyModeStake {
  if (bankroll >= safeLevel) {
    return {
      stake: 0, // caller reverts to the alpha-governor in this regime
      maxFrozen: false,
      nextMax: Math.max(highWaterMark, bankroll),
    };
  }
  const distance = safeLevel - bankroll;
  const stake = Math.min(Math.max(0, distance * edge), stakeCap);
  void recoveryMultiple;
  return { stake, maxFrozen: true, nextMax: highWaterMark };
}

/** Stake-throttle trigger from Bayesian drawdown binning. */
export interface ThrottleTrigger {
  /** Drawdown depth maximizing cumulative conditional forward value. */
  triggerDepth: number;
  /** Second, deeper trigger (2x) where stakes stop entirely. */
  stopDepth: number;
  /** Per-bin forward values, for audit. */
  binValues: number[];
}

/**
 * Bayesian drawdown-distribution throttle (1609.00869, "Determining
 * Optimal Stop-Loss Thresholds via Bayesian Analysis of Drawdown
 * Distributions").
 *
 * Engine-honesty infrastructure (the paper's own +0.65% warns the
 * effect may not survive): bin bankroll drawdown depths from
 * settled-pick history, per bin compute forward 4-week ROI
 * conditioned on the bin, and find the drawdown depth maximizing
 * cumulative conditional forward value as the stake-throttle trigger
 * (halve stakes beyond it, stop beyond a deeper second trigger).
 * Re-run monthly.
 *
 * ACCEPTANCE GATE (needs 2025-2026 replay): ADOPT if the trigger
 * replay improves the Sharpe of weekly bankroll P&L by >= 15% vs the
 * no-trigger baseline with no worse final bankroll.
 */
export function bayesianThrottleTrigger(
  drawdownDepths: number[],
  forwardRois: number[],
  numBins = 10,
): ThrottleTrigger {
  const n = Math.min(drawdownDepths.length, forwardRois.length);
  const empty: ThrottleTrigger = { triggerDepth: 0, stopDepth: 0, binValues: [] };
  if (n === 0 || numBins < 1) return empty;
  const depths = drawdownDepths.slice(0, n);
  const maxD = Math.max(...depths, 1e-9);
  const binValues = new Array(numBins).fill(0);
  const binCounts = new Array(numBins).fill(0);
  for (let i = 0; i < n; i++) {
    const b = Math.min(numBins - 1, Math.floor((depths[i]! / maxD) * numBins));
    binValues[b]! += forwardRois[i]!;
    binCounts[b]! += 1;
  }
  const means = binValues.map((v, i) => (binCounts[i] > 0 ? v / binCounts[i] : 0));
  // Cumulative conditional forward value from the deepest bin upward;
  // the trigger is the depth where continuing deeper stops adding value.
  let cum = 0;
  let bestBin = numBins - 1;
  let bestCum = -Infinity;
  for (let b = numBins - 1; b >= 0; b--) {
    cum += means[b]!;
    if (cum > bestCum) {
      bestCum = cum;
      bestBin = b;
    }
  }
  const triggerDepth = ((bestBin + 1) / numBins) * maxD;
  return { triggerDepth, stopDepth: triggerDepth * 2, binValues: means };
}

/**
 * Apply the throttle trigger to a stake.
 */
export function throttledStake(
  stake: number,
  currentDrawdown: number,
  trigger: ThrottleTrigger,
): number {
  if (currentDrawdown >= trigger.stopDepth) return 0;
  if (currentDrawdown >= trigger.triggerDepth) return stake / 2;
  return stake;
}

/**
 * Drawdown-constrained scaling with volatility regime (1610.08558,
 * "Portfolio Benchmarking under Drawdown Constraint and Stochastic
 * Sharpe Ratio").
 *
 * Tracks xi = current bankroll / peak bankroll as first-class state.
 * Stakes scale down as xi -> alpha following the paper's qualitative
 * drawdown-constraint shape (gradual near the peak, sharp near the
 * barrier): scale = ((xi - alpha)/(1 - alpha))^k, halted at
 * xi <= alpha until recovery. The volatility-regime input (trailing
 * realized vol of pick returns vs its long-run mean, the stochastic
 * Sharpe ratio y-vs-theta input) shifts the curve: high vol steepens
 * k, low vol flattens it. Logs xi at every slate for post-hoc
 * analysis (the caller persists the returned xi).
 *
 * ACCEPTANCE GATE (needs 2025-2026 replay): ADOPT if the xi-scaled
 * replay keeps realized drawdown above the alpha barrier (no breach)
 * while retaining >= 90% of flat staking's final bankroll.
 */
export function xiScaledStake(
  bankroll: number,
  peak: number,
  alpha: number,
  volRegime: number,
  baseStake: number,
): { stake: number; xi: number } {
  if (bankroll <= 0 || peak <= 0 || baseStake <= 0) return { stake: 0, xi: 0 };
  const xi = Math.min(bankroll / peak, 1);
  if (xi <= alpha) return { stake: 0, xi };
  // k = 1 at neutral regime; > 1 when trailing vol exceeds its mean.
  const k = Math.max(0.25, volRegime);
  const scale = Math.pow((xi - alpha) / (1 - alpha), k);
  return { stake: baseStake * scale, xi };
}

/** Worry-dashboards states (1707.01457). */
export type WorryState = "GREEN" | "YELLOW" | "RED";

/**
 * Live drawdown worry dashboard (1707.01457, "You Are in a Drawdown.
 * When Should You Start Worrying?").
 *
 * From the bankroll's trailing realized Sharpe: the 5% worry
 * thresholds are 2.14 * SR^-2 (duration) and 1.50 * SR^-1 (depth,
 * scaled by bankroll vol). States: GREEN (inside the median, taken
 * as half the 5% tail as a dashboard design choice), YELLOW
 * (beyond median, inside the 5% tail: halve stakes), RED (beyond the
 * 5% tail: stop and run the Bayes-Kelly miscalibration check from
 * 1626). Apply the 1627 non-Gaussian inflation factor to the
 * thresholds via the `tailInflation` parameter.
 *
 * ACCEPTANCE GATE (needs 2025-2026 replay): ADOPT if post-RED-trip
 * 4-week forward ROI is worse than unconditional ROI with p < 0.05
 * (trips carry signal); otherwise REJECT as noise.
 */
export function worryDashboard(
  drawdownDepth: number,
  drawdownDuration: number,
  sharpe: number,
  bankrollVol: number,
  tailInflation = 1,
): WorryState {
  const sr = Math.max(sharpe, 1e-9);
  const vol = Math.max(bankrollVol, 1e-9);
  const depthMedian = (0.75 / sr) * vol * tailInflation;
  const depthTail = (1.5 / sr) * vol * tailInflation;
  const durMedian = (1.07 / (sr * sr)) * tailInflation;
  const durTail = (2.14 / (sr * sr)) * tailInflation;
  const beyondTail = drawdownDepth >= depthTail || drawdownDuration >= durTail;
  const beyondMedian = drawdownDepth >= depthMedian || drawdownDuration >= durMedian;
  if (beyondTail) return "RED";
  if (beyondMedian) return "YELLOW";
  return "GREEN";
}

/**
 * Drawdown-modulated feedback governor (1710.01503, "On
 * Drawdown-Modulated Feedback Control in Stock Trading").
 *
 * Bankroll safety infrastructure (not the staking objective):
 * d(k) = 1 - V(k)/max_{j<=k} V(j); scale every posted stake by
 * M(k) = (dmax - d(k))/(1 - d(k)) each slate; if d(k) >= dmax,
 * stakes go to zero until recovery. The automatic drawdown governor
 * that fires when the 1627/1629 circuit-breaker thresholds trip, so
 * no regime can silently eat the bankroll. Tune the Kelly-fraction
 * multiplier by Monte Carlo over GSE's historical pick returns
 * (offline; this function applies the modulator).
 *
 * ACCEPTANCE GATE (needs 2025-2026 replay): ADOPT if the modulator
 * holds realized max drawdown <= dmax while retaining >= 85% of
 * unmodulated final bankroll; otherwise REJECT.
 */
export function drawdownModulatedStake(
  bankroll: number,
  runningMax: number,
  dmax: number,
  stake: number,
): number {
  if (bankroll <= 0 || runningMax <= 0 || stake <= 0) return 0;
  const d = 1 - bankroll / runningMax;
  // Tolerance around d >= dmax: floating point at the boundary (e.g.
  // bankroll 80, running max 100, dmax 0.2) can yield a tiny positive
  // stake instead of exactly 0.
  if (d >= dmax - 1e-9) return 0;
  const m = (dmax - d) / (1 - d);
  return stake * Math.min(Math.max(m, 0), 1);
}

/** One archetype bootstrap sample for reserve setting. */
export interface ArchetypeDrawdown {
  archetype: string;
  /** 90th-percentile max drawdown under this archetype. */
  p90MaxDrawdown: number;
}

/**
 * Stationary block-bootstrap drawdown reserve (2608.00127,
 * "Drawdown Risk Beyond Brownian Motion").
 *
 * Replaces the Gaussian drawdown assumption in bankroll-reserve and
 * circuit-breaker setting with archetype tables (trend,
 * mean-reversion, short-vol, stationary block bootstrap of GSE's own
 * pick-level P&L): resample the P&L series in geometric-length blocks
 * (seeded, deterministic), record max drawdown per path, and key the
 * reserve off the worst archetype's 90th percentile.
 *
 * ACCEPTANCE GATE (needs bootstrap on GSE returns): ADOPT if the
 * block-bootstrap 90th-percentile max drawdown exceeds the Brownian
 * prediction by >= 15% (the paper's non-Gaussian warning applies);
 * if the bootstrap matches Brownian within 15%, REJECT as
 * unnecessary for GSE.
 */
export function blockBootstrapMaxDrawdown(
  pnl: number[],
  numPaths: number,
  meanBlockLength: number,
  quantile = 0.9,
  seed = 12345,
): number {
  const n = pnl.length;
  if (n === 0 || numPaths < 1) return 0;
  let s = seed >>> 0;
  const rand = (): number => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const drawdowns: number[] = [];
  for (let path = 0; path < numPaths; path++) {
    let wealth = 1;
    let peak = 1;
    let maxDd = 0;
    let produced = 0;
    while (produced < n) {
      // Geometric block length (stationary bootstrap).
      const L = 1 + Math.floor(-Math.log(1 - rand()) * meanBlockLength);
      const start = Math.floor(rand() * n);
      for (let k = 0; k < L && produced < n; k++) {
        wealth += pnl[(start + k) % n]!;
        if (wealth > peak) peak = wealth;
        if (peak > 0) maxDd = Math.max(maxDd, 1 - wealth / peak);
        produced++;
      }
    }
    drawdowns.push(maxDd);
  }
  drawdowns.sort((a, b2) => a - b2);
  const idx = Math.min(drawdowns.length - 1, Math.floor(quantile * drawdowns.length));
  return drawdowns[idx]!;
}

/**
 * Pick the reserve off the worst archetype's 90th percentile.
 */
export function archetypeReserve(archetypes: ArchetypeDrawdown[]): number {
  if (archetypes.length === 0) return 0;
  return Math.max(...archetypes.map((a) => a.p90MaxDrawdown));
}
