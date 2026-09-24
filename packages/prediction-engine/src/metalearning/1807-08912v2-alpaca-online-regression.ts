/**
 * arXiv 1807.08912v2: Meta-Learning Priors for Efficient Online Bayesian Regression
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * ALPaCA meta-learns a prior (mu0, Sigma0) over the last-layer weights of a basis network so that online Bayesian linear regression on a new task is accurate from few samples. The posterior updates are analytic (recursive least squares), so weekly refits are O(d^2).
 *
 * Record improvement (verbatim):
 * Add ALPaCA (meta-learned priors for efficient online Bayesian regression) as GSE's weekly team-strength update mechanic: offline meta-training over historical seasons sliced as function families (theta = team-season latent parameters, x = game features, y = margin); basis network phi = 2x128 tanh MLP with 16-32 basis functions, meta-loss = NLL of the analytic posterior over random horizons t (weeks 1-16). Online: after each game, closed-form recursive Lambda^{-1}/Q updates (Eqs. 13-14) -- microseconds per team, no refit, no step-count tuning; predictive mean/variance feed the pick engine and Kelly sizing; known-Sigma_epsilon estimated empirically (paper's validation-MSE approach); exponential forgetting (Appendix A.3) with tuned decay for new-regime teams (rookie QB/HC) vs veterans. This is new to the corpus: GSE recalibrates weekly but not via closed-form posterior updates, and nothing does analytic Bayesian online adaptation. Improvement: heteroscedastic ALPaCA -- combine with ledger 1902's flow-conditioned GP, replacing the fixed Gaussian predictive variance with a normalizing-flow density over the last-layer outputs while keeping the analytic recursive mean update (ALPaCA = the online mechanics, 1902 = the noise shape); test NLL on heavy-tail weeks (weather/division games).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff ALPaCA's week-1-to-8 NLL on margin beats BOTH MAML-style adaptation and the static prior by >=0.05 nats/game averaged over 2023-2024, with near-monotonic improvement (no MAML-style early overfit dips). Reject if the recursive updates show no advantage over plain refit at week <=4.
 */

export const ENABLED = false;

export interface BLRPosterior {
  mean: number[];
  cov: number[][];
}

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array<number>(m).fill(0));
}

/** Prior: mean 0, covariance priorVar * I. */
export function blrInit(dim: number, priorVar: number): BLRPosterior {
  const cov = zeros(dim, dim);
  for (let i = 0; i < dim; i++) cov[i]![i] = priorVar;
  return { mean: new Array<number>(dim).fill(0), cov };
}

/**
 * Recursive Bayesian linear regression update (ALPaCA online step):
 * y ~ N(phi'w, noiseVar), w ~ N(mean, cov).
 */
export function blrUpdate(
  post: BLRPosterior,
  phi: number[],
  y: number,
  noiseVar: number,
): BLRPosterior {
  const d = phi.length;
  // S phi
  const Sphi = new Array<number>(d).fill(0);
  for (let i = 0; i < d; i++) {
    let s = 0;
    for (let j = 0; j < d; j++) s += post.cov[i]![j]! * phi[j]!;
    Sphi[i] = s;
  }
  let denom = noiseVar;
  for (let j = 0; j < d; j++) denom += phi[j]! * Sphi[j]!;
  const k = Sphi.map((v) => v / denom); // Kalman gain
  let pred = 0;
  for (let j = 0; j < d; j++) pred += phi[j]! * post.mean[j]!;
  const mean = post.mean.map((m, i) => m + k[i]! * (y - pred));
  const cov = zeros(d, d);
  for (let i = 0; i < d; i++)
    for (let j = 0; j < d; j++) cov[i]![j] = post.cov[i]![j]! - k[i]! * Sphi[j]!;
  return { mean, cov };
}

/** Predictive distribution for a new basis vector. */
export function blrPredictive(
  post: BLRPosterior,
  phi: number[],
  noiseVar: number,
): { mean: number; variance: number } {
  const d = phi.length;
  let mean = 0;
  for (let j = 0; j < d; j++) mean += phi[j]! * post.mean[j]!;
  let variance = noiseVar;
  for (let i = 0; i < d; i++) {
    let s = 0;
    for (let j = 0; j < d; j++) s += post.cov[i]![j]! * phi[j]!;
    variance += phi[i]! * s;
  }
  return { mean, variance: Math.max(variance, 1e-12) };
}

/** Negative log-likelihood of y under the posterior predictive. */
export function blrNLL(
  post: BLRPosterior,
  phi: number[],
  y: number,
  noiseVar: number,
): number {
  const { mean, variance } = blrPredictive(post, phi, noiseVar);
  return 0.5 * (Math.log(2 * Math.PI * variance) + ((y - mean) ** 2) / variance);
}

/** RBF basis (stand-in for the paper's learned basis network). */
export function rbfBasis(x: number, centers: number[], width: number): number[] {
  return centers.map((c) => Math.exp(-((x - c) ** 2) / (2 * width * width)));
}

/** Meta-loss over tasks: mean NLL of online predictions (ALPaCA objective). */
export function metaLoss(
  tasks: { phis: number[][]; ys: number[] }[],
  dim: number,
  priorVar: number,
  noiseVar: number,
): number {
  let tot = 0;
  let cnt = 0;
  for (const task of tasks) {
    let post = blrInit(dim, priorVar);
    for (let i = 0; i < task.ys.length; i++) {
      tot += blrNLL(post, task.phis[i]!, task.ys[i]!, noiseVar);
      cnt++;
      post = blrUpdate(post, task.phis[i]!, task.ys[i]!, noiseVar);
    }
  }
  return tot / cnt;
}

/** Gate: adopt ALPaCA on Brier gain with fast analytic updates. */
export function alpacaGate(brierGain: number, msPerWeek: number, beatsRidgePrior: boolean): "ADAPT" | "REJECT" {
  if (brierGain >= 0.01 && msPerWeek < 1000 && beatsRidgePrior) return "ADAPT";
  return "REJECT";
}
