// ============================================================
// Kelly staking module, random-walk to Levy closed forms (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (fractional-Kelly beats flat 1-unit on log-wealth at lower max drawdown
 * over >= 1 season) to pass, plus a human call. The paper's parimutuel
 * formulas are NOT adopted (wrong market structure for US books).
 */
export const ENABLED = false;

/**
 * arXiv: 2002.03448v1 — "Kelly Criterion: From a Simple Random Walk to Lévy Processes"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the paper carries the Kelly fraction from the simple
 * random walk (closed-form f* = p/a − q/b) through jump-diffusion to Lévy
 * processes, giving closed-form stakes at each level of generality plus a
 * log-normal sanity condition (|mu| < sigma²/2) under which the
 * diffusion-limit stake is valid.
 *
 * IMPROVEMENT (from ledger): Build the Kelly staking module gse_kelly.py:
 * edge gate E[r] > 0 else stake 0; full Kelly f* = p_hat/a - (1-p_hat)/b
 * clamped to [0,1]; deploy at fractional kappa = 0.25 (0.5 aggressive);
 * stake = f_deploy x current bankroll recomputed per slate; force kappa down
 * when the log-normal sanity gate |mu_hat| < sigma_hat^2/2 fails.
 *
 * ACCEPTANCE GATE: ADAPT bar: closed-form stakes must reproduce
 * (i)-(iii) to 1e-6; backtest must show fractional-Kelly (kappa=0.25)
 * beats flat 1-unit staking on log-wealth with lower max drawdown on >=1
 * full season of engine picks, else staking stays flat.
 */

/**
 * Edge gate: E[r] > 0 else stake 0. r = net return per unit staked.
 */
export function edgeGate(expectedReturn: number): boolean {
  return expectedReturn > 0;
}

/**
 * Full Kelly closed form f* = p_hat/a − (1−p_hat)/b, clamped to [0,1],
 * where a = net LOSS per unit staked (downside) and b = net WIN per unit
 * staked (upside). (Derivative of E[log(1+fX)] with X = +b w.p. p_hat,
 * −a w.p. 1−p_hat gives f* = p_hat/a − (1−p_hat)/b.)
 * (For even-money a=b=1: f* = 2p−1, the textbook result.)
 */
export function fullKellyFraction(pHat: number, a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  const f = pHat / a - (1 - pHat) / b;
  return Math.min(Math.max(f, 0), 1);
}

/**
 * Numeric maximizer of E[log(1+fX)] for the two-outcome case (gate check
 * (i)): X = +b (win payoff) with prob p_hat, −a (loss size) with prob
 * 1−p_hat — the same a/b convention as the closed form, so the two agree.
 */
export function numericKellyMaximizer(pHat: number, a: number, b: number): number {
  const growth = (f: number): number => {
    const wWin = 1 + f * b;
    const wLose = 1 - f * a;
    if (wWin <= 0 || wLose <= 0) return -Infinity;
    return pHat * Math.log(wWin) + (1 - pHat) * Math.log(wLose);
  };
  const gr = (Math.sqrt(5) - 1) / 2;
  let lo = 0;
  let hi = 1;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  for (let i = 0; i < 100; i++) {
    if (growth(c) > growth(d)) hi = d;
    else lo = c;
    c = hi - gr * (hi - lo);
    d = lo + gr * (hi - lo);
  }
  return (lo + hi) / 2;
}

/** Fractional deployment: f_deploy = kappa · f* (gate check (ii)). */
export function deployFraction(fStar: number, kappa: number): number {
  return Math.min(Math.max(kappa * fStar, 0), 1);
}

/** Stake = f_deploy × current bankroll, recomputed per slate (gate check (iii)). */
export function stakeForSlate(fDeploy: number, bankroll: number): number {
  return Math.max(fDeploy, 0) * Math.max(bankroll, 0);
}

/**
 * Log-normal sanity gate: |mu_hat| < sigma_hat^2 / 2. When it fails, the
 * diffusion-limit stake is invalid — force kappa down (halve it).
 */
export function logNormalSanityHolds(muHat: number, sigmaHat: number): boolean {
  return Math.abs(muHat) < (sigmaHat * sigmaHat) / 2;
}

/** Full per-pick staking pipeline: edge gate -> f* -> kappa (sanity-adjusted) -> stake. */
export function kellyStakePick(
  pHat: number,
  winPayoff: number,
  lossSize: number,
  expectedReturn: number,
  muHat: number,
  sigmaHat: number,
  bankroll: number,
  kappa = 0.25,
  aggressiveKappa = 0.5,
  aggressive = false,
): { stake: number; fStar: number; fDeploy: number; kappaUsed: number; sanityHolds: boolean } {
  if (!edgeGate(expectedReturn) || bankroll <= 0) {
    return { stake: 0, fStar: 0, fDeploy: 0, kappaUsed: 0, sanityHolds: logNormalSanityHolds(muHat, sigmaHat) };
  }
  const fStar = fullKellyFraction(pHat, lossSize, winPayoff);
  const sanityHolds = logNormalSanityHolds(muHat, sigmaHat);
  let kappaUsed = aggressive ? aggressiveKappa : kappa;
  if (!sanityHolds) kappaUsed /= 2; // force kappa down when the sanity gate fails
  const fDeploy = deployFraction(fStar, kappaUsed);
  return { stake: stakeForSlate(fDeploy, bankroll), fStar, fDeploy, kappaUsed, sanityHolds };
}

/** Gate helper: fractional-Kelly beats flat on log-wealth with lower max drawdown. */
export function kellyStakingGatePasses(
  kellyLogWealth: number,
  flatLogWealth: number,
  kellyMaxDd: number,
  flatMaxDd: number,
): boolean {
  return kellyLogWealth > flatLogWealth && kellyMaxDd < flatMaxDd;
}
