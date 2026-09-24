/**
 * arXiv:2609.13564v1 — When Greedy Sampling Explores: KL-Regularized Contextual Bandits without Eluder-Dimension Dependence
 *
 * Contextual-bandit pick selection: Gibbs policy pi(a|x) proportional to pi_ref(a|x)*exp(eta*R-hat(x,a))
 * over candidate edges plus an explicit abstain arm; judged on cumulative CLV vs epsilon-greedy on replay.
 *
 * Improvement: Build a contextual-bandit pick-selection layer: arms = candidate edges (spread/moneyline/total/prop candidates the engine already prices), context = slate features (matchup metrics, de-vigged market price, model edge, CLV history), reward = realized CLV/ROI, Gibbs policy pi(a|x) proportional to pi_ref(a|x)*exp(eta*R-hat(x,a)) with eta tuned on replay, plus an explicit abstain arm - served as a nightly batch that outputs the slate's pick set.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the greedy-Gibbs selection layer only if it beats the epsilon-greedy baseline by >=2% cumulative CLV on the full 2024-2025 replay with >=500 decisions; otherwise REJECT. Pre-registered before running.
 */

/** Candidate edge (arm) with context and reference policy weight. */
export interface Arm {
  id: string;
  /** Context features. */
  x: number[];
  /** Reference policy probability (e.g. uniform or prior stake). */
  piRef: number;
}

/**
 * Gibbs policy: pi(a|x) = pi_ref(a) * exp(eta * Rhat(x,a)) / Z.
 * Rhat is the estimated reward model: here linear in context with arm weights.
 */
export function gibbsPolicy(
  arms: readonly Arm[],
  rewardHat: (arm: Arm) => number,
  eta: number,
): Map<string, number> {
  if (arms.length === 0) throw new Error("gibbsPolicy: no arms");
  if (eta < 0) throw new Error("gibbsPolicy: eta >= 0");
  const scores = arms.map((a) => Math.log(Math.max(1e-12, a.piRef)) + eta * rewardHat(a));
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const z = exps.reduce((a, b) => a + b, 0);
  const out = new Map<string, number>();
  arms.forEach((a, i) => out.set(a.id, (exps[i] ?? 0) / z));
  return out;
}

/** Sample an arm id from a policy map with the given rng. */
export function sampleArm(policy: Map<string, number>, rand: () => number): string {
  const entries = [...policy.entries()];
  if (entries.length === 0) throw new Error("sampleArm: empty policy");
  let u = rand();
  for (const [id, p] of entries) {
    u -= p;
    if (u <= 0) return id;
  }
  return entries[entries.length - 1]![0];
}

/**
 * Cumulative CLV of a selection policy over a replay log.
 * log rows: { armId, clv } with clv = 0 for the abstain arm.
 */
export function cumulativeClv(log: readonly { armId: string; clv: number }[]): number {
  return log.reduce((s, r) => s + r.clv, 0);
}
