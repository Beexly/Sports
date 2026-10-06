/**
 * arXiv:physics/0606016v1 — Football Fever: Goal Distributions and Non-Gaussian Statistics
 *
 * Distribution shootout for team points: Poisson vs negative-binomial vs feedback-mixture scored by
 * out-of-sample log-likelihood on rolling seasons, with tail-decile ECE as the extreme-line calibration
 * check.
 *
 * Improvement: Run the distribution shootout on NFL data: fit Poisson, NBD, and a feedback-mixture to team points-per-game distributions (nflverse 2015-2025) scored by out-of-sample log-likelihood on rolling seasons, extend the winner with team-strength controls (hierarchical NBD with team attack/defense random effects), and use the winning family as the score-distribution engine for totals pricing tails.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the shootout winner as GSE's score-distribution family if it beats both Poisson and Gaussian baselines by >=0.01 nats/game out-of-sample on 2025 (paired p<0.05) AND improves extreme-line calibration (ECE in the tail decile cut by >=20%); REJECT (stay with current distributional assumption) otherwise; no GSE content may cite this paper as evidence of in-game momentum.
 */

/** Poisson log-pmf. */
export function poisLogPmf(k: number, lam: number): number {
  if (k < 0 || !Number.isInteger(k) || lam <= 0) throw new Error("poisLogPmf: bad args");
  let lf = 0;
  for (let i = 2; i <= k; i++) lf += Math.log(i);
  return k * Math.log(lam) - lam - lf;
}

/** Negative-binomial log-pmf (mean mu, size r). */
export function nbLogPmf(k: number, mu: number, r: number): number {
  if (k < 0 || !Number.isInteger(k) || mu <= 0 || r <= 0) throw new Error("nbLogPmf: bad args");
  const p = r / (r + mu);
  let lf = 0;
  for (let i = 1; i <= k; i++) lf += Math.log(r + i - 1) - Math.log(i);
  return lf + r * Math.log(p) + k * Math.log(1 - p);
}

/**
 * Feedback-mixture log-pmf: w * Poisson(lam) + (1-w) * NB(mu, r) — the
 * self-exciting (momentum-like feedback) mixture.
 */
export function feedbackLogPmf(k: number, lam: number, mu: number, r: number, w: number): number {
  if (w < 0 || w > 1) throw new Error("feedbackLogPmf: w in [0,1]");
  const a = Math.exp(poisLogPmf(k, lam));
  const b = Math.exp(nbLogPmf(k, mu, r));
  return Math.log(Math.max(1e-300, w * a + (1 - w) * b));
}

/** Out-of-sample mean log-likelihood of a family on held-out counts. */
export function oosLogLik(
  counts: readonly number[],
  logPmf: (k: number) => number,
): number {
  if (counts.length === 0) throw new Error("oosLogLik: no counts");
  return counts.reduce((s, k) => s + logPmf(k), 0) / counts.length;
}

/**
 * Tail-decile ECE: split predicted tail probabilities into deciles by the
 * predicted P(X >= threshold); ECE over the top decile vs empirical rate.
 */
export function tailDecileEce(
  predTail: readonly number[],
  actual: readonly (0 | 1)[],
): number {
  if (predTail.length !== actual.length || predTail.length < 10) {
    throw new Error("tailDecileEce: need >= 10 points");
  }
  const order = predTail.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const dec = order.slice(0, Math.max(1, Math.floor(order.length / 10)));
  const meanP = dec.reduce((s, d) => s + d.p, 0) / dec.length;
  const emp = dec.reduce((s, d) => s + (actual[d.i] ?? 0), 0) / dec.length;
  return Math.abs(meanP - emp);
}

/** Shootout winner: family with the best OOS log-likelihood. */
export function shootoutWinner(scores: Record<string, number>): string {
  const entries = Object.entries(scores);
  if (entries.length === 0) throw new Error("shootoutWinner: no scores");
  return entries.sort((a, b) => b[1] - a[1])[0]![0];
}
