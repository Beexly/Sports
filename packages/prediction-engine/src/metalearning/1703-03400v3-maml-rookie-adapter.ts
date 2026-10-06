/**
 * arXiv 1703.03400v3: Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * MAML as the rookie-QB / new-regime adapter: a small tabular model
meta-trained over historical team-seasons as tasks (support = first K games,
query = remaining games) with the first-order approximation. Meta-training
uses K in {2, 4} to match the new-regime data budget; test-time adaptation is
1-5 gradient steps on the observed games. Implemented here on a linear model
so inner steps and meta-gradients are exact.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build MAML as the 'rookie QB adapter': small tabular MLP (game features -> margin), meta-trained over historical team-seasons as tasks (support = first K games, query = remaining games) with the first-order approximation (same accuracy, 33% faster); meta-train with K in {2,4} to match the new-regime data budget (rookie QB, new HC); test-time adaptation = 1-5 gradient steps on observed games for fast adaptation of the deep network to new regimes.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff MAML beats pretrain+fine-tune by >=0.02 Brier on new-regime win prediction at K in {2,4} (2023-2025) AND shows the paper's no-overfit behavior (performance non-decreasing over 1->5 inner steps).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: metalearning_fewshot | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2023-2025 new-regime Brier comparison at K in {2,4}.

export interface FewShotTask {
  supportX: number[][];
  supportY: number[];
  queryX: number[][];
  queryY: number[];
}

function mse(theta: number[], X: number[][], y: number[]): number {
  let s = 0;
  for (let i = 0; i < X.length; i++) {
    let pred = 0;
    for (let j = 0; j < theta.length; j++) pred += theta[j]! * X[i]![j]!;
    s += (pred - y[i]!) ** 2;
  }
  return s / Math.max(X.length, 1);
}

function mseGrad(theta: number[], X: number[][], y: number[]): number[] {
  const n = Math.max(X.length, 1);
  const g = new Array<number>(theta.length).fill(0);
  for (let i = 0; i < X.length; i++) {
    let pred = 0;
    for (let j = 0; j < theta.length; j++) pred += theta[j]! * X[i]![j]!;
    const err = pred - y[i]!;
    for (let j = 0; j < theta.length; j++) g[j]! += (2 / n) * err * X[i]![j]!;
  }
  return g;
}

/** Inner adaptation: `steps` gradient steps on the support set. */
export function innerAdapt(theta: number[], task: FewShotTask, alpha: number, steps: number): number[] {
  let t = [...theta];
  for (let s = 0; s < steps; s++) {
    const g = mseGrad(t, task.supportX, task.supportY);
    t = t.map((v, j) => v - alpha * g[j]!);
  }
  return t;
}

/** Query loss after inner adaptation (the MAML meta-objective per task). */
export function queryLoss(theta: number[], task: FewShotTask, alpha: number, innerSteps: number): number {
  return mse(innerAdapt(theta, task, alpha, innerSteps), task.queryX, task.queryY);
}

/** Mean query loss over tasks. */
export function mamlMetaLoss(
  theta: number[],
  tasks: FewShotTask[],
  alpha: number,
  innerSteps: number,
): number {
  return tasks.reduce((s, t) => s + queryLoss(theta, t, alpha, innerSteps), 0) / tasks.length;
}

/**
 * First-order MAML meta-gradient: mean query-gradient evaluated at the
 * adapted parameters (drops the second-order term; the paper's 33%-faster
 * approximation with matching accuracy).
 */
export function foMetaGradient(
  theta: number[],
  tasks: FewShotTask[],
  alpha: number,
  innerSteps: number,
): number[] {
  const g = new Array<number>(theta.length).fill(0);
  for (const t of tasks) {
    const adapted = innerAdapt(theta, t, alpha, innerSteps);
    const qg = mseGrad(adapted, t.queryX, t.queryY);
    for (let j = 0; j < theta.length; j++) g[j]! += qg[j]! / tasks.length;
  }
  return g;
}

/** Meta-training loop over tasks. */
export function metaTrain(
  theta0: number[],
  tasks: FewShotTask[],
  alpha: number,
  innerSteps: number,
  metaLr: number,
  metaIters: number,
): number[] {
  let theta = [...theta0];
  for (let it = 0; it < metaIters; it++) {
    const g = foMetaGradient(theta, tasks, alpha, innerSteps);
    theta = theta.map((v, j) => v - metaLr * g[j]!);
  }
  return theta;
}
