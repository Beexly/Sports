/**
 * Player season projection.
 *
 * Projects next-season per-game production from a recency- and games-weighted
 * average of recent seasons, regressed toward a conservative prior by sample
 * size. Pure and db-free; the apps layer feeds it real PlayerGameStat
 * aggregates. A projection is a forecast, so it ships WITH its backtest error
 * (see `backtestProjections`) and is not auto-published — the choice to surface
 * projections to users stays a deliberate, owner-gated step.
 */

export interface PlayerSeasonLine {
  readonly season: number;
  readonly games: number;
  readonly pprPerGame: number;
}

export interface PlayerProjection {
  readonly targetSeason: number;
  readonly projectedPprPerGame: number;
  readonly basisSeasons: number; // prior seasons used
  readonly priorGames: number; // total games in the basis
  readonly method: string;
  /** Which parameter set produced this number: "default" or a research-derived label. */
  readonly parameterSource?: string;
}

/**
 * The model's tunable slots, named so research evidence can address them.
 * Defaults are the values the engine shipped with; passing a different set is the
 * ONLY way these move, which keeps the wiring inspectable at the call site.
 */
export interface ProjectionParameters {
  readonly recencyWeights: readonly number[];
  readonly regressionGames: number;
  readonly leaguePriorPpr: number;
  /** Audit label recorded on every projection built from this set. */
  readonly source?: string;
}

export const DEFAULT_PROJECTION_PARAMETERS: ProjectionParameters = Object.freeze({
  recencyWeights: [0.6, 0.3, 0.1] as const,
  regressionGames: 8,
  leaguePriorPpr: 6,
  source: "default",
});

const RECENCY_WEIGHTS = DEFAULT_PROJECTION_PARAMETERS.recencyWeights;
const REGRESSION_GAMES = DEFAULT_PROJECTION_PARAMETERS.regressionGames;
const LEAGUE_PRIOR_PPR = DEFAULT_PROJECTION_PARAMETERS.leaguePriorPpr;

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function projectPlayerSeason(
  history: readonly PlayerSeasonLine[],
  targetSeason: number,
  parameters: ProjectionParameters = DEFAULT_PROJECTION_PARAMETERS,
): PlayerProjection {
  if (!Number.isFinite(parameters.regressionGames) || parameters.regressionGames < 0) {
    throw new RangeError(`regressionGames must be a finite number >= 0, got ${String(parameters.regressionGames)}`);
  }
  if (!Number.isFinite(parameters.leaguePriorPpr)) {
    throw new RangeError(`leaguePriorPpr must be finite, got ${String(parameters.leaguePriorPpr)}`);
  }
  const recencyWeights = parameters.recencyWeights.length > 0
    ? parameters.recencyWeights
    : DEFAULT_PROJECTION_PARAMETERS.recencyWeights;

  const prior = history
    .filter((h) => h.season < targetSeason && h.games > 0 && Number.isFinite(h.pprPerGame))
    .sort((a, b) => b.season - a.season)
    .slice(0, recencyWeights.length);

  if (prior.length === 0) {
    return {
      targetSeason,
      projectedPprPerGame: parameters.leaguePriorPpr,
      basisSeasons: 0,
      priorGames: 0,
      method: "prior-only (no history)",
      parameterSource: parameters.source ?? "default",
    };
  }

  let weightSum = 0;
  let valueSum = 0;
  let priorGames = 0;
  prior.forEach((h, i) => {
    const w = recencyWeights[i]! * h.games; // recency × sample size
    weightSum += w;
    valueSum += w * h.pprPerGame;
    priorGames += h.games;
  });
  if (weightSum <= 0) {
    return {
      targetSeason,
      projectedPprPerGame: parameters.leaguePriorPpr,
      basisSeasons: prior.length,
      priorGames,
      method: "prior-only (degenerate weights)",
      parameterSource: parameters.source ?? "default",
    };
  }
  const observed = valueSum / weightSum;

  // Regress toward the league prior by total games seen (more games → trust the
  // observed rate more; few games → pull toward the prior).
  const projected =
    (priorGames * observed + parameters.regressionGames * parameters.leaguePriorPpr) /
    (priorGames + parameters.regressionGames);

  return {
    targetSeason,
    projectedPprPerGame: round2(projected),
    basisSeasons: prior.length,
    priorGames,
    method: "recency+games-weighted, regressed to prior",
    parameterSource: parameters.source ?? "default",
  };
}

export interface ProjectionBacktest {
  readonly sampleSize: number;
  readonly mae: number; // model mean absolute error (pprPerGame)
  readonly bias: number; // mean(projected − actual)
  readonly naiveMae: number; // carry-last-season baseline MAE
  readonly skillVsNaive: number; // naiveMae − mae (positive = model beats carry-forward)
}

/**
 * Backtest on real history: for each player and each season N with an actual and
 * at least one prior season, project N from seasons < N and compare to the
 * actual per-game PPR. Reports MAE/bias plus the carry-forward baseline so the
 * method's value-add (or lack of it) is explicit and honest.
 */
export function backtestProjections(histories: Iterable<readonly PlayerSeasonLine[]>): ProjectionBacktest {
  let n = 0;
  let absErr = 0;
  let signedErr = 0;
  let naiveAbs = 0;
  for (const history of histories) {
    const bySeason = [...history].filter((h) => h.games > 0 && Number.isFinite(h.pprPerGame)).sort((a, b) => a.season - b.season);
    for (let i = 1; i < bySeason.length; i++) {
      const actual = bySeason[i]!;
      const proj = projectPlayerSeason(bySeason.slice(0, i), actual.season);
      n += 1;
      absErr += Math.abs(proj.projectedPprPerGame - actual.pprPerGame);
      signedErr += proj.projectedPprPerGame - actual.pprPerGame;
      naiveAbs += Math.abs(bySeason[i - 1]!.pprPerGame - actual.pprPerGame); // carry previous season forward
    }
  }
  if (n === 0) return { sampleSize: 0, mae: 0, bias: 0, naiveMae: 0, skillVsNaive: 0 };
  const mae = round2(absErr / n);
  const naiveMae = round2(naiveAbs / n);
  return { sampleSize: n, mae, bias: round2(signedErr / n), naiveMae, skillVsNaive: round2(naiveMae - mae) };
}
