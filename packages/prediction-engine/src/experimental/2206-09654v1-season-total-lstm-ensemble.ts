/**
 * arXiv 2206.09654v1: Performance Prediction in Major League Baseball by Long Short-Term Memory Networks
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build NFL season-total projection LSTMs: input = 5 prior seasons x ~20 features (age, games, attempts/targets, yards, TDs, EPA/play, team context, injuries), stacked LSTM (<=3 layers, <=128 cells) -> FC -> ReLU, MSE/Adam, expanding-window retraining; evaluate with the paper's full scorecard (MAE/RMSE, accuracy within +-k, per-tier correct counts, over/under asymmetry) -- then build the deliberate two-model ensemble the paper implies but never builds: one conservative (MSE, the lower bound) + one aggressive (asymmetric loss penalizing underestimation) LSTM, using the interval for futures/award pricing.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build NFL season-total projection LSTMs: input = 5 prior seasons x ~20 features (age, games, attempts/targets, yards, TDs, EPA/play, team context, injuries), stacked LSTM (<=3 layers, <=128 cells) -> FC -> ReLU, MSE/Adam, expanding-window retraining; evaluate with the paper's full scorecard (MAE/RMSE, accuracy within +-k, per-tier correct counts, over/under asymmetry) — then build the deliberate two-model ensemble the paper implies but never builds: one conservative (MSE, the lower bound) + one aggressive (asymmetric loss penalizing underestimation) LSTM, using the interval for futures/award pricing.
 *
 * ACCEPTANCE GATE (verbatim):
 * Accept iff the LSTM beats GSE's regression baseline on 2023-2024 holdouts by >=3% MAE on at least two of three yardage categories AND the elite-bias diagnostic reveals a correctable asymmetry; reject if it merely matches regression (the paper's own 2018 result: LR essentially tied the LSTMs).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

export interface LSTMWeights {
  Wf: number[][];
  Wi: number[][];
  Wc: number[][];
  Wo: number[][];
  bf: number[];
  bi: number[];
  bc: number[];
  bo: number[];
}

function sigmoidLocal(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function matVec(W: number[][], x: number[]): number[] {
  return W.map((row) => row.reduce((s, w, j) => s + w * x[j]!, 0));
}

function addVec(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]!);
}

/** Single LSTM cell forward step. x = [input; h_prev]. */
export function lstmCellForward(
  x: number[],
  hPrev: number[],
  cPrev: number[],
  W: LSTMWeights,
): { h: number[]; c: number[] } {
  const xh = [...x, ...hPrev];
  const f = matVec(W.Wf, xh).map((v, i) => sigmoidLocal(v + W.bf[i]!));
  const ii = matVec(W.Wi, xh).map((v, i2) => sigmoidLocal(v + W.bi[i2]!));
  const cTilde = matVec(W.Wc, xh).map((v, i3) => Math.tanh(v + W.bc[i3]!));
  const o = matVec(W.Wo, xh).map((v, i4) => sigmoidLocal(v + W.bo[i4]!));
  const c = f.map((fv, i5) => fv * cPrev[i5]! + ii[i5]! * cTilde[i5]!);
  const h = o.map((ov, i6) => ov * Math.tanh(c[i6]!));
  return { h, c };
}

/** Random LSTM weights (demo init). */
export function lstmInitWeights(
  inputDim: number,
  hiddenDim: number,
  rand: () => number,
  scale = 0.1,
): LSTMWeights {
  const d = inputDim + hiddenDim;
  const mat = (): number[][] => Array.from({ length: hiddenDim }, () => Array.from({ length: d }, () => (rand() - 0.5) * 2 * scale));
  const vec = (): number[] => new Array<number>(hiddenDim).fill(0);
  return { Wf: mat(), Wi: mat(), Wc: mat(), Wo: mat(), bf: vec(), bi: vec(), bc: vec(), bo: vec() };
}

/** Run an LSTM over a sequence; returns final hidden state. */
export function lstmSequence(X: number[][], W: LSTMWeights): number[] {
  const hDim = W.bf.length;
  let h = new Array<number>(hDim).fill(0);
  let c = new Array<number>(hDim).fill(0);
  for (const x of X) {
    const out = lstmCellForward(x, h, c, W);
    h = out.h;
    c = out.c;
  }
  return h;
}

/** Asymmetric loss penalizing underestimation more (aggressive variant). */
export function asymmetricMse(y: number, pred: number, underPenalty: number): number {
  const e = y - pred;
  return e > 0 ? underPenalty * e * e : e * e;
}
