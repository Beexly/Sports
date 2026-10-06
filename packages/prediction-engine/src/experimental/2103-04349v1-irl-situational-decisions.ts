/**
 * arXiv 2103.04349v1: Markov Cricket: Using Forward and Inverse Reinforcement Learning to Model, Predict And Optimize Batting Performance in ODI Cricket
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Adapt IRL to NFL situational decision-making: define the MDP (states = down, distance, yardline, score differential, time; actions = {go for it, punt, field-goal attempt} on 4th downs or {run, pass} on early downs); expert trajectories = drives of winning teams (or top-quartile EPA teams); linear reward in state+action features with Ng & Russell margin-maximization (Eq. 4), or modernize to MaxEnt IRL / guided cost learning with a small neural reward net; neural reward function tests whether action rankings become state-dependent.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adapt IRL to NFL situational decision-making: define the MDP (states = down, distance, yardline, score differential, time; actions = {go for it, punt, field-goal attempt} on 4th downs or {run, pass} on early downs); expert trajectories = drives of winning teams (or top-quartile EPA teams); linear reward in state+action features with Ng & Russell margin-maximization (Eq. 4), or modernize to MaxEnt IRL / guided cost learning with a small neural reward net; improvement: neural reward function to test whether action rankings become state-dependent (e.g., 'go for it' value spiking at specific yardlines).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT gate: (a) Test 1 must show the IRL recovers a known reward function on synthetic ground truth (the paper never validates its IRL -- do not skip this); (b) inferred NFL weights must not all sit at optimization bounds (the paper's bound artifact); (c) expert-definition sensitivity must be checked (winners vs top-EPA teams). If (a) fails, the method is unvalidated machinery -> REJECT. The cricket simulator and DLS results are not adopted under any gate.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Feature expectations from expert trajectories (list of feature-sum vectors). */
export function featureExpectations(trajs: number[][]): number[] {
  const d = trajs[0]!.length;
  const mu = new Array<number>(d).fill(0);
  for (const t of trajs) for (let j = 0; j < d; j++) mu[j]! += t[j]!;
  return mu.map((x) => x / trajs.length);
}

/** MaxEnt IRL gradient step: w += lr * (mu_expert - mu_model). */
export function maxEntIrlStep(
  w: number[],
  muExpert: number[],
  muModel: number[],
  lr: number,
): number[] {
  return w.map((wj, j) => wj + lr * (muExpert[j]! - muModel[j]!));
}

/** Ng & Russell margin check: expert return exceeds alternatives by margin. */
export function irlMargin(expertReturn: number, altReturns: number[]): number {
  return expertReturn - Math.max(...altReturns);
}

/** Softmax policy from a linear reward over discrete actions. */
export function softPolicy(rewards: number[], tau: number): number[] {
  const mx = Math.max(...rewards);
  const e = rewards.map((r) => Math.exp((r - mx) / tau));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}
