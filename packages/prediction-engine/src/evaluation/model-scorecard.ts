/**
 * Four-part model scorecard (arXiv 2210.06327v3).
 *
 * The paper's standard model-evaluation template, adopted as GSE's:
 *  (1) fitness: MAE / RMSE / log-loss / Brier;
 *  (2) season-table reconstruction: rank correlation (Spearman) of
 *      predicted vs actual win totals / playoff seeding;
 *  (3) tier accuracy: playoff teams, division winners;
 *  (4) flat-stake betting sim at recorded closing odds: ROI + CLV.
 * Extension hook (not the default): a fifth Kelly-sized-stakes CLV
 * component can be added once the model's probabilities are calibrated.
 *
 * ACCEPTANCE GATE: adopt as the standard iff the scorecard surfaces at
 * least one model-ranking disagreement between fitness metrics and the
 * betting/tier components on GSE's own backtests (it must add
 * information beyond MAE/RMSE).
 *
 * Research-only module. Not wired into any live evaluation path.
 */

export interface GameEval {
  predicted: number; // predicted home win probability
  actual: number; // 1 home win, 0 away win
  closingHomeProb: number; // vig-free closing line implied probability
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
}

/** (1) Fitness metrics. */
export function fitness(games: readonly GameEval[]): {
  mae: number;
  rmse: number;
  logLoss: number;
  brier: number;
} {
  if (games.length === 0) throw new Error("fitness: no games");
  let mae = 0;
  let rmse = 0;
  let ll = 0;
  let brier = 0;
  for (const g of games) {
    const p = Math.min(1 - 1e-9, Math.max(1e-9, g.predicted));
    mae += Math.abs(p - g.actual);
    rmse += (p - g.actual) ** 2;
    ll += -(g.actual * Math.log(p) + (1 - g.actual) * Math.log(1 - p));
    brier += (p - g.actual) ** 2;
  }
  const n = games.length;
  return { mae: mae / n, rmse: Math.sqrt(rmse / n), logLoss: ll / n, brier: brier / n };
}

/** Spearman rank correlation. */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 2) throw new Error("spearman: need >= 2 pairs");
  const rank = (vs: readonly number[]): number[] => {
    const order = vs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(vs.length);
    order.forEach((o, k) => {
      r[o.i] = k + 1;
    });
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const m = (n + 1) / 2;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (rx[i] as number) - m;
    const dy = (ry[i] as number) - m;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.max(1e-12, Math.sqrt(sxx * syy));
}

/**
 * (2) Season-table reconstruction: Spearman correlation between
 * predicted and actual win totals per team.
 */
export function tableCorrelation(
  predictedWins: ReadonlyMap<string, number> | Record<string, number>,
  actualWins: ReadonlyMap<string, number> | Record<string, number>,
): number {
  const pw = predictedWins instanceof Map ? [...predictedWins.values()] : Object.values(predictedWins);
  const aw = actualWins instanceof Map ? [...actualWins.values()] : Object.values(actualWins);
  return spearman(pw, aw);
}

export interface TierSets {
  predictedPlayoff: ReadonlySet<string>;
  actualPlayoff: ReadonlySet<string>;
  predictedDivision: ReadonlySet<string>;
  actualDivision: ReadonlySet<string>;
}

/** (3) Tier accuracy: playoff teams and division winners. */
export function tierAccuracy(tiers: TierSets): {
  playoffAccuracy: number;
  divisionAccuracy: number;
} {
  const inter = (a: ReadonlySet<string>, b: ReadonlySet<string>): number =>
    [...a].filter((x) => b.has(x)).length;
  const playoffAccuracy =
    inter(tiers.predictedPlayoff, tiers.actualPlayoff) /
    Math.max(1, tiers.actualPlayoff.size);
  const divisionAccuracy =
    inter(tiers.predictedDivision, tiers.actualDivision) /
    Math.max(1, tiers.actualDivision.size);
  return { playoffAccuracy, divisionAccuracy };
}

export interface BettingSim {
  /** Flat-stake ROI (profit / staked). */
  roi: number;
  /** Closing-line value: mean(edge at bet time vs close), in probability points. */
  clv: number;
  nBets: number;
}

/**
 * (4) Flat-stake betting sim at recorded closing odds: bet the side
 * with the edge whenever |predicted - closing| exceeds the threshold;
 * settle at fair decimal odds derived from the closing probability.
 */
export function bettingSim(
  games: readonly GameEval[],
  threshold = 0.03,
): BettingSim {
  let profit = 0;
  let staked = 0;
  let clvSum = 0;
  let n = 0;
  for (const g of games) {
    const edge = g.predicted - g.closingHomeProb;
    if (Math.abs(edge) < threshold) continue;
    const betHome = edge > 0;
    const closeP = betHome ? g.closingHomeProb : 1 - g.closingHomeProb;
    const fair = 1 / Math.max(1e-9, Math.min(1 - 1e-9, closeP));
    const won = betHome ? g.actual === 1 : g.actual === 0;
    profit += won ? fair - 1 : -1;
    staked += 1;
    clvSum += Math.abs(edge);
    n++;
  }
  return {
    roi: staked === 0 ? 0 : profit / staked,
    clv: n === 0 ? 0 : clvSum / n,
    nBets: n,
  };
}

export interface Scorecard {
  fitness: ReturnType<typeof fitness>;
  tableCorrelation: number;
  tierAccuracy: ReturnType<typeof tierAccuracy>;
  betting: BettingSim;
}

/** The full four-part scorecard for one model. */
export function scorecard(
  games: readonly GameEval[],
  predictedWins: ReadonlyMap<string, number> | Record<string, number>,
  actualWins: ReadonlyMap<string, number> | Record<string, number>,
  tiers: TierSets,
  threshold = 0.03,
): Scorecard {
  return {
    fitness: fitness(games),
    tableCorrelation: tableCorrelation(predictedWins, actualWins),
    tierAccuracy: tierAccuracy(tiers),
    betting: bettingSim(games, threshold),
  };
}

/**
 * Ranking-disagreement check: do two models ordered by fitness (Brier)
 * flip order on the betting/tier components? Returns the components
 * where the Brier-worse model wins — the scorecard "adds information"
 * iff this is non-empty.
 */
export function rankingDisagreements(
  a: Scorecard,
  b: Scorecard,
): string[] {
  const brierBetter = a.fitness.brier <= b.fitness.brier ? "a" : "b";
  const other = brierBetter === "a" ? b : a;
  const first = brierBetter === "a" ? a : b;
  const disagreements: string[] = [];
  if (other.betting.roi > first.betting.roi) disagreements.push("betting.roi");
  if (other.betting.clv > first.betting.clv) disagreements.push("betting.clv");
  if (other.tierAccuracy.playoffAccuracy > first.tierAccuracy.playoffAccuracy) {
    disagreements.push("tier.playoff");
  }
  if (other.tableCorrelation > first.tableCorrelation) disagreements.push("table.spearman");
  return disagreements;
}
