/**
 * arXiv 1804.04226v1: Increased Prediction Accuracy in the Game of Cricket using Machine Learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * The paper decomposes player performance into Consistency (career rate), Form (recent rate), Opposition (vs this opponent), and Venue (home/away splits), combined by AHP weights. We replace AHP with learned logistic weights and evaluate strictly time-ordered for NFL receiving props.
 *
 * Record improvement (verbatim):
 * Port the cricket paper's Consistency/Form/Opposition/Venue decomposition to NFL player props (the portable part -- the cricket itself is irrelevant): per player-game compute Consistency (career baseline), Form (last 4-8 games), Opposition (career vs that defense/scheme), Venue (home/away/dome/outdoors splits). Fix the paper's two design flaws at once: (a) replace subjective AHP weights with learned weights via grouped-regularized multinomial regression (group = the four derived attributes, so the decomposition stays interpretable); (b) replace SMOTE + random-split with strictly point-in-time features, time-ordered train (<=2022) / test (2023-2025) and class-weighted loss. Targets: receiving/rushing/receptions bands or direct regression on the prop line -- test both; data nflverse 2006-2025. The diagnostic that matters: whether the Opposition component (player vs specific defense) carries independent signal beyond team-level matchup adjustments -- the one thing a player-prop model can know that a team model cannot.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the Consistency/Form/Opposition/Venue feature set for GSE props only if the time-ordered test shows >=3pp accuracy gain or >=0.01 log-loss improvement over the career-average baseline; reject if the gain vanishes under honest time-ordered evaluation (the paper's random-split numbers do not count as evidence).
 */

export const ENABLED = false;

export interface PlayerGame {
  playerId: string;
  opp: string;
  venue: "home" | "away" | "neutral";
  success: boolean;
}

export interface CFOV {
  consistency: number;
  form: number;
  opposition: number;
  venue: number;
}

function smoothRate(hits: number, n: number): number {
  return (hits + 1) / (n + 2); // Laplace toward 0.5
}

/**
 * C/F/O/V features for games[gameIdx], using only games before gameIdx
 * (strictly time-ordered, no leakage).
 */
export function cfovFeatures(
  games: PlayerGame[],
  playerId: string,
  gameIdx: number,
): CFOV {
  const prior = games.filter((g, i) => i < gameIdx && g.playerId === playerId);
  const rate = (gs: PlayerGame[]) =>
    smoothRate(gs.filter((g) => g.success).length, gs.length);
  const cur = games[gameIdx]!;
  const consistency = rate(prior);
  const form = rate(prior.slice(-4));
  const vsOpp = prior.filter((g) => g.opp === cur.opp);
  const opposition = vsOpp.length > 0 ? rate(vsOpp) : consistency;
  const atVenue = prior.filter((g) => g.venue === cur.venue);
  const venue = atVenue.length > 0 ? rate(atVenue) : consistency;
  return { consistency, form, opposition, venue };
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** L2-regularized logistic regression by gradient ascent. Returns [b, w...]. */
export function fitLogistic(
  X: number[][],
  y: number[],
  iters = 800,
  lr = 0.5,
  l2 = 1e-4,
): number[] {
  const d = X[0]!.length;
  const w = new Array<number>(d + 1).fill(0);
  for (let t = 0; t < iters; t++) {
    const grad = new Array<number>(d + 1).fill(0);
    for (let i = 0; i < X.length; i++) {
      let s = w[0]!;
      for (let j = 0; j < d; j++) s += w[j + 1]! * X[i]![j]!;
      const err = y[i]! - sigmoid(s);
      grad[0]! += err;
      for (let j = 0; j < d; j++) grad[j + 1]! += err * X[i]![j]!;
    }
    for (let j = 0; j <= d; j++) w[j]! += (lr * (grad[j]! / X.length)) - lr * l2 * w[j]!;
  }
  return w;
}

export function predictLogistic(w: number[], x: number[]): number {
  let s = w[0]!;
  for (let j = 0; j < x.length; j++) s += w[j + 1]! * x[j]!;
  return sigmoid(s);
}

export function logLossMean(probs: number[], y: number[]): number {
  let s = 0;
  for (let i = 0; i < y.length; i++)
    s += -(y[i]! * Math.log(Math.max(probs[i]!, 1e-12)) + (1 - y[i]!) * Math.log(Math.max(1 - probs[i]!, 1e-12)));
  return s / y.length;
}

export interface CFOVEval {
  cfovLogLoss: number;
  baselineLogLoss: number;
  weights: number[];
}

/**
 * Time-ordered evaluation: for each game t >= burnIn, fit C/F/O/V weights on
 * games < t and predict game t. Baseline predicts the smoothed career rate.
 */
export function timeOrderedEval(games: PlayerGame[], burnIn = 12): CFOVEval {
  const cfovProbs: number[] = [];
  const baseProbs: number[] = [];
  const ys: number[] = [];
  let weights: number[] = [];
  for (let t = burnIn; t < games.length; t++) {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < t; i++) {
      const f = cfovFeatures(games, games[i]!.playerId, i);
      X.push([f.consistency, f.form, f.opposition, f.venue]);
      y.push(games[i]!.success ? 1 : 0);
    }
    const w = fitLogistic(X, y);
    weights = w;
    const f = cfovFeatures(games, games[t]!.playerId, t);
    cfovProbs.push(predictLogistic(w, [f.consistency, f.form, f.opposition, f.venue]));
    baseProbs.push(f.consistency);
    ys.push(games[t]!.success ? 1 : 0);
  }
  return {
    cfovLogLoss: logLossMean(cfovProbs, ys),
    baselineLogLoss: logLossMean(baseProbs, ys),
    weights,
  };
}
