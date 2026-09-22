/**
 * Davidson paired-comparison model with strength-dependent ties.
 *
 * Davidson (1970) extends Bradley-Terry to ties. With strengths pi_i, pi_j
 * and tie parameter nu:
 *   P(i wins) = pi_i / D
 *   P(tie)    = nu * sqrt(pi_i * pi_j) / D
 *   P(j wins) = pi_j / D
 *   D = pi_i + pi_j + nu * sqrt(pi_i * pi_j)
 * Strength-dependent ties: nu(s) = exp(beta0 + beta1 * s_bar) with s_bar the
 * pair's mean log-strength; beta1 > 0 means stronger pairs tie more. A home
 * order effect multiplies the home strength by h. Fitting beta (and the
 * beta1 > 0 gate) is offline; these are the pure probability functions.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2505.24783 — Paired comparison models with
 * strength-dependent ties and order effects.
 *
 * ACCEPTANCE GATE: strength-dependent-nu Davidson beats constant-nu by
 * >= 0.005 out-of-sample 3-way log-loss, beta1 > 0 with 95% CI excluding 0.
 */

export interface DavidsonProbs {
  readonly homeWin: number;
  readonly tie: number;
  readonly awayWin: number;
}

/** Strength-dependent tie parameter nu(s_bar) = exp(beta0 + beta1 * s_bar). */
export function tieNu(sBar: number, beta0: number, beta1: number): number {
  return Math.exp(beta0 + beta1 * sBar);
}

/**
 * Davidson 3-way probabilities for a home/away pair.
 * @param piHome, piAway positive strengths; @param nu tie parameter;
 * @param homeEdge multiplicative home order effect (default 1).
 */
export function davidsonProbs(
  piHome: number,
  piAway: number,
  nu: number,
  homeEdge = 1,
): DavidsonProbs {
  if (!(piHome > 0 && piAway > 0)) throw new Error("davidson-ties: strengths must be > 0");
  if (!(nu >= 0)) throw new Error("davidson-ties: nu must be >= 0");
  if (!(homeEdge > 0)) throw new Error("davidson-ties: homeEdge must be > 0");
  const ph = piHome * homeEdge;
  const pa = piAway;
  const d = ph + pa + nu * Math.sqrt(ph * pa);
  return { homeWin: ph / d, tie: (nu * Math.sqrt(ph * pa)) / d, awayWin: pa / d };
}

/** 3-way log-loss of Davidson probs against an outcome ("H"|"T"|"A"). */
export function davidsonLogLoss(p: DavidsonProbs, outcome: "H" | "T" | "A"): number {
  const q = outcome === "H" ? p.homeWin : outcome === "T" ? p.tie : p.awayWin;
  return -Math.log(Math.max(q, 1e-12));
}

/**
 * Convenience: Davidson probs from log-strengths with strength-dependent nu.
 * s_bar = mean(log pi_home, log pi_away).
 */
export function davidsonProbsStrengthDep(
  logPiHome: number,
  logPiAway: number,
  beta0: number,
  beta1: number,
  homeEdge = 1,
): DavidsonProbs {
  const sBar = (logPiHome + logPiAway) / 2;
  return davidsonProbs(Math.exp(logPiHome), Math.exp(logPiAway), tieNu(sBar, beta0, beta1), homeEdge);
}
