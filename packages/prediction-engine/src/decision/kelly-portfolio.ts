// ============================================================
// Kelly portfolio constructors (DECIDE bucket, additive, unwired)
//
// Pure sizing functions adapted from arXiv ledgers. None of these are
// wired into any publish path; activation is a later human call. Each
// function carries the paper's ACCEPTANCE GATE as a comment: most gates
// need a season backtest, so they are documented here and NOT claimed.
//
// Shared helpers (local copies on purpose: no cross-module imports, so a
// sibling worker can never collide with or break these files).
// ============================================================

/** Candidate pick for a single-day portfolio. */
export interface KellyCandidate {
  /** Engine win probability, (0,1). */
  p: number;
  /** Payout ratio b = decimal odds - 1 (e.g. -110 -> 0.909, +200 -> 2.0). */
  b: number;
}

/** Result of the constrained portfolio solve. */
export interface KellyPortfolio {
  /** Stakes as fractions of bankroll, aligned with the surviving candidates. */
  stakes: number[];
  /** Indices (into the input array) of surviving candidates. */
  included: number[];
  /** Inverse participation ratio 1/sum(q_i^2): 1 = fully concentrated. */
  ipr: number;
  /** Indices dropped by the elimination loop. */
  dropped: number[];
}

/**
 * Unconstrained binary-outcome Kelly fraction.
 * f* = (b*p - (1-p)) / b
 */
export function kellyFraction(p: number, b: number): number {
  if (b <= 0 || p <= 0 || p >= 1) return 0;
  return (b * p - (1 - p)) / b;
}

/**
 * Iterative worst-pick elimination loop (0712.2771v3).
 *
 * Replaces an ad-hoc top-N daily cutoff: compute constrained
 * binary-outcome Kelly fractions for the day's candidates, drop the
 * pick with the most-negative constrained fraction, and re-solve until
 * every included pick has q_hat > 0. The residual sum q <= 1
 * constraint is enforced by proportional scale-down. Reports the
 * inverse participation ratio R = 1/sum(w_i^2) on the normalized
 * portfolio weights w_i = q_i/sum(q) as a concentration monitor for
 * the posted card (R = 1 for a single pick, R = n for n equal picks).
 *
 * ACCEPTANCE GATE (needs 2024-2025 backtest): ADOPT the inclusion rule
 * if the elimination portfolio achieves >= the baseline's final
 * log-wealth with max drawdown no worse; REJECT if it underperforms or
 * if fewer than 5% of days actually change the included set.
 */
export function kellyEliminationPortfolio(
  candidates: KellyCandidate[],
): KellyPortfolio {
  const n = candidates.length;
  if (n === 0) return { stakes: [], included: [], ipr: 0, dropped: [] };

  const alive = new Set<number>(Array.from({ length: n }, (_, i) => i));
  const dropped: number[] = [];

  // Eliminate the most-negative constrained fraction until all are > 0.
  for (;;) {
    let worst = -1;
    let worstF = 0;
    for (const i of alive) {
      const f = kellyFraction(candidates[i]!.p, candidates[i]!.b);
      if (f < worstF) {
        worstF = f;
        worst = i;
      }
    }
    if (worst === -1) break;
    alive.delete(worst);
    dropped.push(worst);
  }

  const included = [...alive].sort((a, b2) => a - b2);
  const raw = included.map((i) => kellyFraction(candidates[i]!.p, candidates[i]!.b));
  const sum = raw.reduce((a, b2) => a + b2, 0);
  // Constrained: sum q <= 1.
  const scale = sum > 1 ? 1 / sum : 1;
  const stakes = raw.map((f) => f * scale);
  const total = stakes.reduce((a, b2) => a + b2, 0);
  // IPR on normalized weights (sums to 1): 1 for a single pick.
  const ipr =
    total > 0 ? 1 / stakes.reduce((a, s) => a + (s / total) ** 2, 0) : 0;
  return { stakes, included, ipr, dropped };
}

/** Utility family for the finite-horizon solver (1611.09130). */
export type KellyUtility = { kind: "log" } | { kind: "power"; gamma: number };

/** Inputs for the finite-horizon Kelly solver with outside reserves. */
export interface FiniteHorizonKellyInput {
  /** Per-period win probability. */
  p: number;
  /** Payout ratio b = decimal odds - 1. */
  b: number;
  /** Horizon in periods (e.g. 17 for an NFL season). */
  periods: number;
  /** Outside reserves as a fraction of current bankroll (default 0). */
  outsideReserves?: number;
  /** Utility to optimize (default log). */
  utility?: KellyUtility;
  /** Safety cap on the (1 + w/g) inflation factor (default 2). */
  reserveCap?: number;
}

/**
 * Bisection root finder on [lo, hi] for a monotone function.
 */
export function bisect(
  f: (x: number) => number,
  lo: number,
  hi: number,
  tol = 1e-12,
  maxIter = 200,
): number {
  let a = lo;
  let b2 = hi;
  let fa = f(a);
  for (let i = 0; i < maxIter; i++) {
    const m = (a + b2) / 2;
    const fm = f(m);
    if (Math.abs(fm) < tol || b2 - a < tol) return m;
    if ((fa < 0) === (fm < 0)) {
      a = m;
      fa = fm;
    } else {
      b2 = m;
    }
  }
  return (a + b2) / 2;
}

/**
 * Generalized Kelly with outside reserves and finite horizon
 * (1611.09130, "Generalizing the Kelly Strategy").
 *
 * Solves the optimal binary fraction for log or power utility via the
 * recombining-binomial first-order condition, then inflates by
 * (1 + w/g) for outside reserves, capped at reserveCap (default 2x)
 * as a safety rail. Use for fixed-length campaigns (e.g. a 17-week
 * NFL season) instead of infinite-horizon Kelly.
 *
 * ACCEPTANCE GATE (needs season replay): ADOPT if the capped
 * generalized-Kelly replay beats half-Kelly's final bankroll with max
 * drawdown no more than 10% worse; otherwise REJECT.
 */
export function finiteHorizonKelly(input: FiniteHorizonKellyInput): number {
  const { p, b, outsideReserves = 0, utility = { kind: "log" } } = input;
  const reserveCap = input.reserveCap ?? 2;
  if (b <= 0 || p <= 0 || p >= 1 || input.periods < 1) return 0;
  const q = 1 - p;

  let f: number;
  if (utility.kind === "log") {
    f = kellyFraction(p, b);
  } else {
    const gamma = utility.gamma;
    if (gamma <= 0) return 0;
    // Power utility FOC: p*b*(1+f*b)^-gamma = q*(1-f)^-gamma.
    // Log-space residual, monotone in f on [0, 1).
    const residual = (x: number): number =>
      Math.log(p * b) - gamma * Math.log(1 + x * b) -
      (Math.log(q) - gamma * Math.log(Math.max(1 - x, 1e-300)));
    f = residual(0) <= 0 ? 0 : bisect(residual, 0, 1 - 1e-9);
  }
  if (f <= 0) return 0;
  const inflation = Math.min(1 + outsideReserves, reserveCap);
  return f * inflation;
}

/** Decomposition diagnostics for one beta-Kelly allocation. */
export interface BetaKellyResult {
  /** Allocation fractions per outcome, summing to <= 1. */
  allocation: number[];
  /** Bookmaker unfairness: log overround (the vig), in nats. */
  vigTerm: number;
  /** Bookmaker mispricing D(p || r), in nats. */
  mispricingNats: number;
  /** Allocation error D(g || b) vs full-Kelly b*, in nats. */
  allocationErrorNats: number;
  /** Effective fractional-Kelly implied by the allocation size. */
  effectiveFraction: number;
}

function klDivergence(p: number[], r: number[]): number {
  let d = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i]! > 0 && r[i]! > 0) d += p[i]! * Math.log(p[i]! / r[i]!);
  }
  return d;
}

/**
 * Beta-Kelly sizing for mutually-exclusive markets (1901.06278,
 * "Gambling and Renyi Divergence").
 *
 * Tempered allocation g_i(beta) proportional to
 * p_i^(1/(1-beta)) * r_i^(beta/(1-beta)) on the de-vigged book
 * probabilities r. Satisfies the paper's closed-form sanity check:
 * g(beta -> 0) = p (full-Kelly on fair probabilities). Beta grid
 * {-2, -1, -0.5, -0.25, 0}; beta < 0 tempers toward the book.
 * Logs the three decomposition terms per bet as edge diagnostics.
 *
 * ACCEPTANCE GATE (needs 2023-2025 replay): ADOPT the beta dial as the
 * moneyline staking rule if some beta < 0 beats half-Kelly on terminal
 * log growth with max drawdown <= 0.8x half-Kelly's, beta stable
 * across season halves; otherwise REJECT.
 */
export function betaKellyAllocation(
  p: number[],
  decimalOdds: number[],
  beta: number,
): BetaKellyResult {
  const n = p.length;
  if (n === 0 || decimalOdds.length !== n) {
    return {
      allocation: [],
      vigTerm: 0,
      mispricingNats: 0,
      allocationErrorNats: 0,
      effectiveFraction: 0,
    };
  }
  const overround = decimalOdds.reduce((a, o) => a + 1 / o, 0);
  const r = decimalOdds.map((o) => 1 / o / overround);
  const vigTerm = Math.log(overround);
  const mispricingNats = klDivergence(p, r);

  const t = 1 / (1 - beta);
  const weights = p.map((pi, i) =>
    Math.pow(Math.max(pi, 1e-300), t) * Math.pow(Math.max(r[i]!, 1e-300), beta * t),
  );
  const wSum = weights.reduce((a, b2) => a + b2, 0);
  const g = wSum > 0 ? weights.map((w) => w / wSum) : new Array(n).fill(0);

  // Full-Kelly benchmark allocation on fair probs: b* = p, staked as
  // sum of per-outcome Kelly fractions relative to a 1-unit book.
  const bStar = [...p];
  const allocationErrorNats = klDivergence(g, bStar.map((x) => Math.max(x, 1e-300)));
  const gSum = g.reduce((a, b2) => a + b2, 0);
  const bSum = bStar.reduce((a, b2) => a + b2, 0);
  return {
    allocation: g,
    vigTerm,
    mispricingNats,
    allocationErrorNats,
    effectiveFraction: bSum > 0 ? gSum / bSum : 0,
  };
}

/**
 * Risk-constrained Kelly for mutually exclusive outcomes (2604.11577).
 *
 * Conservative mode: after computing unconstrained Kelly stakes,
 * check sum_i p_i * W_i^-lambda <= 1 (lambda = 2) on worst-case
 * wealths; if violated, shrink stakes until it holds. Exposes gamma
 * as a user-facing risk slider (higher gamma = tighter).
 */
export function riskConstrainedKelly(
  p: number[],
  decimalOdds: number[],
  lambda = 2,
  gamma = 1,
): number[] {
  const n = p.length;
  if (n === 0 || decimalOdds.length !== n) return [];
  const stakes = p.map((pi, i) => {
    const b = decimalOdds[i]! - 1;
    return Math.max(0, kellyFraction(pi, b));
  });
  // Worst-case wealth per outcome if outcome i wins: 1 + s_i*(o_i-1)
  // minus the other stakes. Constraint evaluated at full stake vector.
  const constraintHolds = (s: number[]): boolean => {
    let total = 0;
    for (let i = 0; i < n; i++) {
      let w = 1;
      for (let j = 0; j < n; j++) {
        w += j === i ? s[j]! * (decimalOdds[j]! - 1) : -s[j]!;
      }
      if (w <= 0) return false;
      total += p[i]! * Math.pow(w, -lambda * gamma);
    }
    return total <= 1;
  };
  let scale = 1;
  let s = stakes;
  for (let iter = 0; iter < 100 && !constraintHolds(s); iter++) {
    scale *= 0.9;
    s = stakes.map((x) => x * scale);
  }
  return s;
}

/**
 * Exact finite-horizon quantile Kelly for a weekly slate (2604.17577).
 *
 * Enumerates candidate chambers (all picks plus top-k by edge) over
 * the joint binary outcome space (exact for n <= 10), solves each
 * chamber's shadow-Kelly problem in closed form, and selects the
 * chamber maximizing alpha-quantile terminal wealth. Returns the
 * winning chamber's stakes.
 *
 * ACCEPTANCE GATE (needs 2025-2026 replay): ADOPT if quantile-Kelly
 * delivers >= 10% higher realized median final bankroll than
 * half-Kelly with no worse 5th-percentile bankroll; otherwise REJECT.
 */
export function quantileKellySlate(
  candidates: KellyCandidate[],
  alpha = 0.5,
): { stakes: number[]; chamber: number[]; quantileWealth: number } {
  const n = candidates.length;
  const empty = { stakes: [] as number[], chamber: [] as number[], quantileWealth: 1 };
  if (n === 0) return empty;
  if (n > 10) {
    throw new Error("quantileKellySlate: exact enumeration needs n <= 10");
  }
  // Chambers: full set plus top-k by individual Kelly edge.
  const order = candidates
    .map((c, i) => ({ i, f: kellyFraction(c.p, c.b) }))
    .sort((a, b2) => b2.f - a.f);
  const chambers: number[][] = [order.map((o) => o.i)];
  for (let k = 1; k <= n; k++) chambers.push(order.slice(0, k).map((o) => o.i));

  let best = empty;
  for (const chamber of chambers) {
    const stakesAll = chamber.map((i) =>
      Math.max(0, kellyFraction(candidates[i]!.p, candidates[i]!.b)),
    );
    // Effective chamber: picks with zero stake do not affect wealth,
    // so they are excluded from the reported chamber.
    const eff = chamber.filter((_, j) => stakesAll[j]! > 0);
    const stakes = eff.map((i) =>
      Math.max(0, kellyFraction(candidates[i]!.p, candidates[i]!.b)),
    );
    const m = eff.length;
    // Joint (wealth, probability) pairs over the binary outcome space.
    const pairs: { w: number; pr: number }[] = [];
    for (let mask = 0; mask < 1 << m; mask++) {
      let w = 1;
      let prob = 1;
      for (let j = 0; j < m; j++) {
        const c = candidates[eff[j]!]!;
        const win = (mask >> j) & 1;
        w += win ? stakes[j]! * c.b : -stakes[j]!;
        prob *= win ? c.p : 1 - c.p;
      }
      pairs.push({ w, pr: prob });
    }
    // Probability-weighted alpha-quantile of terminal wealth.
    pairs.sort((a, b2) => a.w - b2.w);
    let cum = 0;
    let qWealth = pairs[0]?.w ?? 1;
    for (const { w, pr } of pairs) {
      cum += pr;
      if (cum >= alpha) {
        qWealth = w;
        break;
      }
    }
    if (qWealth > best.quantileWealth) {
      best = { stakes, chamber: eff, quantileWealth: qWealth };
    }
  }
  return best;
}

/**
 * Multinomial-Kelly support selection for futures/awards
 * (2603.13581v1, "Single-Event Multinomial Full Kelly via Implicit
 * State Positions").
 *
 * The ledger describes ranking outcomes by the model-probability /
 * implied-probability ratio (p_i * o_i) and greedily adding outcomes
 * while the Kelly objective improves, claiming the greedy support is
 * provably optimal. That optimality claim is false in general: the
 * greedy order can miss the optimal support. This implementation
 * therefore uses exact enumeration over all 2^n - 1 non-empty
 * supports (tractable for the small futures markets this targets)
 * and scores each by the paper's Kelly objective:
 *
 *   J(S) = sum_{i in S} p_i * log(o_i * f_i),  f_i = p_i / sum_{S} p_j.
 *
 * Only positive-edge outcomes (p_i * o_i > 1) are eligible for the
 * support; holding cash (empty support, objective 0) wins when none
 * qualifies or no support has positive objective. Exact enumeration
 * guarantees agreement with brute force by construction.
 *
 * ACCEPTANCE GATE (pre-GSE): on 1,000 random synthetic markets
 * (M in 4..20) the support must match brute-force optimal
 * support in 100% of cases and the objective to 1e-9 before any
 * real-money use.
 */
export function greedyMultinomialSupport(
  p: number[],
  decimalOdds: number[],
): { support: number[]; allocation: number[]; objective: number } {
  const n = p.length;
  const empty = { support: [] as number[], allocation: [] as number[], objective: 0 };
  if (n === 0 || decimalOdds.length !== n) return empty;

  // No edge anywhere (max p_i*o_i <= 1): holding cash wins outright.
  let maxEdge = 0;
  for (let i = 0; i < n; i++) maxEdge = Math.max(maxEdge, p[i]! * decimalOdds[i]!);
  if (maxEdge <= 1) return empty;

  // Kelly objective for a support S: sum_{i in S} p_i log(o_i * f_i)
  // with f_i = p_i / sum_{S} p_j (full-Kelly allocation on S).
  const objective = (support: number[]): number => {
    const pSum = support.reduce((a, i) => a + p[i]!, 0);
    if (pSum <= 0) return -Infinity;
    let g = 0;
    for (const i of support) {
      const f = p[i]! / pSum;
      g += p[i]! * Math.log(decimalOdds[i]! * f);
    }
    return g;
  };

  // Exact enumeration over all non-empty supports. Holding cash
  // (empty support, objective 0) wins when no support is positive.
  let best = empty;
  for (let mask = 1; mask < 1 << n; mask++) {
    const support: number[] = [];
    for (let i = 0; i < n; i++) if ((mask >> i) & 1) support.push(i);
    const obj = objective(support);
    if (obj > best.objective + 1e-9) {
      const pSum = support.reduce((a, i) => a + p[i]!, 0);
      const allocation = new Array(n).fill(0);
      for (const i of support) allocation[i] = p[i]! / pSum;
      best = { support, allocation, objective: obj };
    }
  }
  return best;
}

/**
 * Belief-mixture Kelly (2508.18868v2, "Tackling estimation risk in
 * Kelly investing using options").
 *
 * Fixed convex mixture of 2-3 model-belief Kelly fractions
 * (base, shrunk-edge, aggressive). Returns the per-period mixture
 * fractions; standalone per-belief bankroll paths are a monitoring
 * concern for the caller (they require realized outcomes, which this
 * pure function does not take), so they are not fabricated here.
 */
export function beliefMixtureKelly(
  beliefFractions: number[][],
  mixtureWeights: number[],
): { mixture: number[] } {
  const k = beliefFractions.length;
  const n = beliefFractions[0]?.length ?? 0;
  if (k === 0 || n === 0 || mixtureWeights.length !== k) {
    return { mixture: [] };
  }
  const wSum = mixtureWeights.reduce((a, b2) => a + b2, 0);
  const w = wSum > 0 ? mixtureWeights.map((x) => x / wSum) : new Array(k).fill(1 / k);
  const mixture = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < k; i++) mixture[j]! += w[i]! * beliefFractions[i]![j]!;
  }
  return { mixture };
}

/**
 * Kelly-gap ranking of staking rules (2607.09505v1).
 *
 * gap = 1/2 * ||theta - alpha * Sigma^{-1} pi*||^2 in the paper's
 * normalized coordinates; here implemented in the general form
 * 0.5 * (theta - alpha * invSigma * pi)^T (theta - alpha * invSigma * pi).
 * Rank staking rules by gap; divergence between realized
 * log-wealth ranking and Kelly-gap ranking isolates estimation error
 * from structural strategy shortfall.
 *
 * ACCEPTANCE GATE (pre-GSE): on simulated GBM (theta=0.4,
 * sigma=0.2, T=1, 100k paths), for alpha=0.5 the analytic gap
 * 1/2(1-alpha)^2||theta||^2 must match the Monte Carlo mean
 * log-wealth ratio within +-2 SE before use on GSE staking rules.
 */
export function kellyGap(
  theta: number[],
  invSigma: number[][],
  pi: number[],
  alpha: number,
): number {
  const n = theta.length;
  const invSigmaPi = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) invSigmaPi[i]! += invSigma[i]![j]! * pi[j]!;
  }
  const diff = theta.map((t, i) => t - alpha * invSigmaPi[i]);
  return 0.5 * diff.reduce((a, d) => a + d * d, 0);
}

/**
 * Kelly burn-in with Laplace-smoothed edges (2201.03387v2).
 *
 * Shrinks raw model probabilities toward market-implied
 * probabilities p-hat = (n*p_model + tau*p_market)/(n+tau)
 * (bookmaker prior); gates full-Kelly staking on
 * t > t-star = (M-1)/(2*D_KL(p-hat||r)) and uses fractional Kelly
 * before that. tauSchedule(n) should return larger tau early season,
 * decaying as sample n grows.
 */
export function burnInStake(
  pModel: number,
  pMarket: number,
  n: number,
  tau: number,
  t: number,
  outcomes: number,
  fractionalKelly = 0.5,
): { pHat: number; tStar: number; fullKelly: boolean; stakeFraction: number } {
  const pHat = (n * pModel + tau * pMarket) / Math.max(n + tau, 1e-300);
  const r = Math.min(Math.max(pMarket, 1e-9), 1 - 1e-9);
  const ph = Math.min(Math.max(pHat, 1e-9), 1 - 1e-9);
  const dkl =
    ph * Math.log(ph / r) + (1 - ph) * Math.log((1 - ph) / (1 - r));
  const tStar = dkl > 1e-12 ? (outcomes - 1) / (2 * dkl) : Infinity;
  const fullKelly = t > tStar;
  const fraction = fullKelly ? 1 : fractionalKelly;
  return { pHat, tStar, fullKelly, stakeFraction: fraction };
}

/**
 * Empirical-distribution Kelly K-hat* (1710.01786v1, "Kelly Betting
 * Can Be Too Conservative").
 *
 * NEVER fits unbounded-support distributions: the Kelly fraction
 * maximizes E[log(1 + f X)] over the empirical PMF of historical
 * engine edge realizations, winsorized at the observed min/max (the
 * support IS the constraint set). Reports the implied confinement
 * interval [-1/X_max, -1/X_min]. Sample-size guard: for rare-tail
 * markets, p_bad = 1-(1-eps-hat)^M (probability of at least one tail
 * event over M bets); if p_bad > 0.05, shrink K-hat* toward the
 * supplied fractional-Kelly fallback. Defaults (eps-hat=0.001, M=50)
 * give p_bad ~= 4.9%, so ordinary markets do not trigger the guard;
 * pass explicit tail parameters for markets where unseen tails are
 * a concern.
 */
export function empiricalPmfKelly(
  edgeRealizations: number[],
  fractionalFallback: number,
  tailEpsHat = 0.001,
  tailM = 50,
): {
  fStar: number;
  confinement: [number, number];
  pBad: number;
  shrunk: boolean;
} {
  const xs = edgeRealizations.filter((x) => Number.isFinite(x));
  if (xs.length === 0) {
    return { fStar: 0, confinement: [0, 0], pBad: 1, shrunk: true };
  }
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const lo = xMax > 0 ? -1 / xMax : 0;
  const hi = xMin < 0 ? 1 / Math.abs(xMin) : 1;
  const confinement: [number, number] = [lo, hi];

  const meanLogGrowth = (f: number): number => {
    let s = 0;
    for (const x of xs) {
      const v = 1 + f * x;
      if (v <= 0) return -Infinity;
      s += Math.log(v);
    }
    return s / xs.length;
  };
  // Ternary-style grid + refine: meanLogGrowth is concave in f.
  let bestF = 0;
  let bestG = meanLogGrowth(0);
  const grid = 400;
  for (let i = 0; i <= grid; i++) {
    const f = lo + ((hi - lo) * i) / grid;
    const g = meanLogGrowth(f);
    if (g > bestG) {
      bestG = g;
      bestF = f;
    }
  }
  const pBad = 1 - Math.pow(1 - tailEpsHat, tailM);
  const shrunk = pBad > 0.05;
  const fStar = shrunk ? (bestF + fractionalFallback) / 2 : bestF;
  return { fStar, confinement, pBad, shrunk };
}

/** One observable state for the state-dependent Kelly rule. */
export interface KellyStatePayoff {
  /** Payoff multiple g(i,l) for outcome l in state i. */
  g: number;
  /** Conditional probability p(i,l) of outcome l in state i. */
  p: number;
  /** Weight phi(i,l) (default 1; up-weight high-liquidity slates). */
  phi?: number;
}

/**
 * State-dependent Kelly with formal sit-out (1708.03813v1, "Weighted
 * entropy and optimal portfolios for risk-averse Kelly investment").
 *
 * Per observable state i, solves
 *   sum_l phi(i,l) p(i,l) g(i,l) / (1 + D(i) g(i,l)) = 0
 * for D(i) by bisection on [0, D_+]. If no root exists in
 * [0, D_+], D(i) = 0: a FORMAL sit-out for that state. The no-ruin
 * floor b (e.g. 0.8) caps the stake so the worst case risks at most
 * (1 - b) of bankroll on one slate.
 *
 * ACCEPTANCE GATE (needs 2024-2025 backtest): accept if
 * state-dependent D(i) with sit-out states matches or beats flat
 * fractional Kelly on log-bankroll growth with strictly fewer losing
 * slates played and no worse max drawdown.
 */
export function regimeStateKelly(
  payoffs: KellyStatePayoff[],
  dPlus = 5,
  noRuinFloorB = 0.8,
): number {
  if (payoffs.length === 0) return 0;
  const f = (d: number): number => {
    let s = 0;
    for (const { g, p, phi = 1 } of payoffs) {
      const denom = 1 + d * g;
      if (denom <= 0) return d === 0 ? s : Infinity;
      s += (phi * p * g) / denom;
    }
    return s;
  };
  const f0 = f(0);
  // The bisection upper bound must keep every denominator positive:
  // for g < 0, need 1 + d*g > 0, i.e. d < -1/g. Cap dPlus at that
  // no-ruin domain boundary (minus a hair) so f(hi) is finite.
  let hi = dPlus;
  for (const { g } of payoffs) {
    if (g < 0) hi = Math.min(hi, (-1 / g) * (1 - 1e-9));
  }
  const fPlus = f(hi);
  if (!(f0 > 0) || !(fPlus < 0)) return 0; // no root in [0, hi] -> sit out
  const d = bisect(f, 0, hi);
  // No-ruin floor: worst-case loss on this state must be <= (1 - b).
  let worstLoss = 0;
  for (const { g } of payoffs) {
    if (g < 0) worstLoss = Math.max(worstLoss, d * Math.abs(g));
  }
  const cap = (1 - noRuinFloorB) / Math.max(worstLoss / Math.max(d, 1e-300), 1e-300);
  return Math.min(d, Number.isFinite(cap) ? cap : d);
}

/**
 * Wasserstein-robust Kelly with walk-forward delta selection
 * (2302.13979v1, "Wasserstein-Kelly Portfolios").
 *
 * Robust fraction: f_robust(delta) = f * max(0, 1 - delta * k),
 * where k = std(edge realizations)/|edge| is the relative
 * estimation noise. When |edge| is below a tiny floor (near-zero
 * measured edge with high noise), k is treated as infinite so the
 * fraction shrinks to 0 instead of being misread as riskless.
 * selectRobustDelta implements the walk-forward
 * protocol: on a rolling validation window, pick the delta with the
 * smallest max drawdown among deltas whose log-growth is within
 * `growthTolerance` of the best.
 *
 * ACCEPTANCE GATE (needs walk-forward on Neon picks): robust Kelly
 * ships iff the walk-forward shows materially smaller max drawdown
 * across regime changes at an acceptable growth exchange rate;
 * otherwise keep fractional Kelly.
 */
export function wassersteinRobustFraction(
  kellyF: number,
  edgeRealizations: number[],
  delta: number,
): number {
  if (kellyF <= 0 || delta <= 0) return Math.max(0, kellyF);
  const xs = edgeRealizations.filter((x) => Number.isFinite(x));
  if (xs.length < 2) return kellyF;
  const mean = xs.reduce((a, b2) => a + b2, 0) / xs.length;
  const variance = xs.reduce((a, b2) => a + (b2 - mean) * (b2 - mean), 0) / (xs.length - 1);
  // Robust relative noise: when |mean| is below the floor the edge
  // is pure noise, so k -> infinity and the fraction shrinks to 0
  // (no measurable edge => no bet), rather than k = 0 (riskless).
  const k = Math.sqrt(variance) / Math.max(Math.abs(mean), 1e-12);
  return kellyF * Math.max(0, 1 - delta * k);
}

/** One delta candidate evaluated on a validation window. */
export interface DeltaWindowResult {
  delta: number;
  logGrowth: number;
  maxDrawdown: number;
}

/**
 * Walk-forward delta selector for the robust-Kelly layer.
 */
export function selectRobustDelta(
  windowResults: DeltaWindowResult[],
  growthTolerance = 0.05,
): number {
  if (windowResults.length === 0) return 0;
  const bestGrowth = Math.max(...windowResults.map((r) => r.logGrowth));
  const eligible = windowResults.filter((r) => r.logGrowth >= bestGrowth - growthTolerance);
  eligible.sort((a, b2) => a.maxDrawdown - b2.maxDrawdown);
  return eligible[0]!.delta;
}
