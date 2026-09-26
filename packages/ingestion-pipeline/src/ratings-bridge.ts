/**
 * Ratings bridge — wires the seventeen ratings modules into the live path.
 *
 * This is the team's strength-estimation layer: who is better, by how much,
 * and how sure are we. Everything here is a fit or an audit of a fit, so the
 * doctrine is stricter than usual: a rating is only ever reported together
 * with the evidence that produced it, and a model that cannot be fitted on
 * the rows it was given is refused rather than regularized into a number.
 *
 * Covered modules: bradley-terry, least-squares-ratings, dynamic-network-rating,
 * eb-shrinkage, pythagorean-duel, matchup-ratings, sel-strengths, unit-impact,
 * cycle-diagnostics, davidson-ties, time-varying-weights, target-pagerank,
 * parametric-pagerank, playerank, hfa-bias-audit, csf-triple-compare,
 * dynamic-bradley-terry.
 *
 * Fail-closed everywhere. No strength is imputed, no prior is invented, and a
 * fit that violates its own existence condition (a Bradley-Terry existence
 * violation, a tuning split with no data) returns a typed refusal.
 */

import {
  ratingsFitBradleyTerry,
  btWinProb,
  mad,
  strengthCovariate,
  type BtGame,
  type BtFit,
} from "@sports/prediction-engine";
import {
  fitLeastSquares,
  gameVariance,
  fitWeightedLeastSquares,
  fitL1Ratings,
  predictSpread,
  spreadMae,
  rankingViolationRate,
  type LeastSquaresGameResult,
  type LsFit,
} from "@sports/prediction-engine";
import {
  marginWeight,
  updateDynamicRating,
  dynamicPageRank,
  ratingToWinProb,
  type DynamicNetworkGameResult,
} from "@sports/prediction-engine";
import {
  shrinkRatings,
  shrinkRatingsMatrix,
  shrinkageUncertainty,
  type ShrinkageInput,
  type ShrinkageResult,
} from "@sports/prediction-engine";
import {
  tullock,
  differenceForm,
  fitAlpha,
  winRmse,
  fitGameEwp,
  gameEwp,
  type PythagoreanTeamSeason,
  type GameRow,
} from "@sports/prediction-engine";
import {
  recencyWeight,
  fitMatchupRatings,
  predictMatchup,
  timeOrderedMae,
  type MatchupObs,
  type MatchupRatings,
  type SgdOptions,
} from "@sports/prediction-engine";
import {
  asOfDate,
  estimateStrengths,
  selFeatures,
  auditProvenance,
  ratingsBrierScore,
  type SelGameResult,
  type TeamStrengths,
  type SelFeatures,
  type FeatureProvenance,
} from "@sports/prediction-engine";
import {
  ratingsSoftThreshold,
  fitImpactScores,
  predictWpDelta,
  impactScoreIntervals,
  mahalanobisSimilarity,
  yearToYearCorrelation,
  type DriveObs,
} from "@sports/prediction-engine";
import {
  dominanceGraph,
  countThreeCycles,
  cycleRate,
  longCycles,
  type HeadToHead,
} from "@sports/prediction-engine";
import {
  tieNu,
  davidsonProbs,
  davidsonLogLoss,
  davidsonProbsStrengthDep,
  type DavidsonProbs,
} from "@sports/prediction-engine";
import {
  fitTVC,
  predictTVC,
  effectiveWeight,
  ratingsMeanLogLoss,
  fitStatic,
  type TVCGame,
  type TVCModel,
} from "@sports/prediction-engine";
import {
  buildTransition,
  pagerankCentrality,
  centralityResiduals,
  teamCentralityDifferential,
  type PlayArc,
} from "@sports/prediction-engine";
import {
  edgeWeight,
  parametricPagerank,
  winProbFromRatings,
  tuneRecencyDecay,
  clvEdge,
  type RatedGame,
  type EdgeWeights,
} from "@sports/prediction-engine";
import {
  aggregateTeamVector,
  trainTeamModel,
  playerGameRating,
  formRating,
  detectRoles,
  auc,
  type PlayerGame,
  type TeamGame,
} from "@sports/prediction-engine";
import {
  unadjustedHFA,
  teamFixedEffectsHFA,
  mixedEffectsHFA,
  hfaBiasAudit,
  simulateNonrandomSchedule,
  type HFAGame,
  type HFAEstimate,
  type HFABiasAudit,
} from "@sports/prediction-engine";
import {
  csf,
  fitAlphaOls,
  loocvRmse,
  compareCsf,
  type CsfForm,
  type CsfTeamSeason,
} from "@sports/prediction-engine";
import {
  existenceViolations,
  kernelWeights,
  fitDynamicBT,
  looLogLik,
  tuneBandwidthLOOCV,
  type BTGame,
  type BTFit,
} from "@sports/prediction-engine";

export type RatingEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function requireArray<T>(
  xs: readonly T[] | null | undefined,
  label: string,
  min = 1,
): RatingEval<true> {
  if (!Array.isArray(xs) || xs.length < min) {
    return {
      ok: false,
      reason: `${label} needs at least ${min} row(s) — not imputed`,
    };
  }
  return { ok: true, data: true };
}

function guard<T>(fn: () => T): RatingEval<T> {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── bradley-terry ───────────────────────────────────────────────────────────

/** Fit Bradley-Terry strengths with a fixed home multiplier. */
export function evalFitBradleyTerry(input: {
  readonly games: readonly BtGame[];
  readonly homeEdge?: number;
  readonly iters?: number;
}): RatingEval<BtFit> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() =>
    ratingsFitBradleyTerry(input.games, input.homeEdge ?? 1.15, input.iters ?? 500),
  );
}

/** P(home beats away) under a fitted BT model. */
export function evalBtWinProb(input: {
  readonly fit: BtFit;
  readonly home: string;
  readonly away: string;
}): RatingEval<number> {
  if (!input.fit) {
    return { ok: false, reason: "fit required — not imputed" };
  }
  return guard(() => {
    const p = btWinProb(input.fit, input.home, input.away);
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("btWinProb returned a probability outside (0,1)");
    }
    return p;
  });
}

/** Median absolute deviation — the robust spread used for omega. */
export function evalMad(input: { readonly xs: readonly number[] }): RatingEval<number> {
  const rows = requireArray(input.xs, "xs");
  if (!rows.ok) return rows;
  return guard(() => mad(input.xs));
}

/** MAD-normalized strength differential across a slate of matchups. */
export function evalStrengthCovariate(input: {
  readonly fit: BtFit;
  readonly matchups: ReadonlyArray<readonly [string, string]>;
}): RatingEval<readonly number[]> {
  const rows = requireArray(input.matchups, "matchups");
  if (!rows.ok) return rows;
  if (!input.fit) {
    return { ok: false, reason: "fit required — not imputed" };
  }
  return guard(() => strengthCovariate(input.fit, input.matchups));
}

// ── least-squares-ratings ───────────────────────────────────────────────────

/** OLS point-differential ratings with a home-field column. */
export function evalFitLeastSquares(input: {
  readonly games: readonly LeastSquaresGameResult[];
}): RatingEval<LsFit> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => fitLeastSquares(input.games));
}

/** Per-game variance from rest, travel and season week. */
export function evalGameVariance(input: {
  readonly game: LeastSquaresGameResult;
}): RatingEval<number> {
  if (!input.game) {
    return { ok: false, reason: "game required — not imputed" };
  }
  return guard(() => {
    const v = gameVariance(input.game);
    if (!Number.isFinite(v) || v <= 0) {
      throw new Error("gameVariance returned a non-positive variance");
    }
    return v;
  });
}

/** Variance-weighted ratings — noisy early games count for less. */
export function evalFitWeightedLeastSquares(input: {
  readonly games: readonly LeastSquaresGameResult[];
}): RatingEval<LsFit> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => fitWeightedLeastSquares(input.games));
}

/** Robust L1 ratings — outlier-resistant point differentials. */
export function evalFitL1Ratings(input: {
  readonly games: readonly LeastSquaresGameResult[];
  readonly iters?: number;
}): RatingEval<LsFit> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => fitL1Ratings(input.games, input.iters ?? 25));
}

/** Projected point spread for a matchup. */
export function evalPredictSpread(input: {
  readonly fit: LsFit;
  readonly home: string;
  readonly away: string;
}): RatingEval<number> {
  if (!input.fit) {
    return { ok: false, reason: "fit required — not imputed" };
  }
  return guard(() => predictSpread(input.fit, input.home, input.away));
}

/** Spread MAE of a fitted rating set — the honesty number for a rating model. */
export function evalSpreadMae(input: {
  readonly fit: LsFit;
  readonly games: readonly LeastSquaresGameResult[];
}): RatingEval<number> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  if (!input.fit) {
    return { ok: false, reason: "fit required — not imputed" };
  }
  return guard(() => spreadMae(input.fit, input.games));
}

/** Fraction of games where the rating ordering and the result disagree. */
export function evalRankingViolationRate(input: {
  readonly fit: LsFit;
  readonly games: readonly LeastSquaresGameResult[];
}): RatingEval<number> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  if (!input.fit) {
    return { ok: false, reason: "fit required — not imputed" };
  }
  return guard(() => {
    const v = rankingViolationRate(input.fit, input.games);
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      throw new Error("rankingViolationRate returned a value outside [0,1]");
    }
    return v;
  });
}

// ── dynamic-network-rating ──────────────────────────────────────────────────

/** Diminishing-returns margin weight: log(1 + margin). */
export function evalMarginWeight(input: { readonly margin: number }): RatingEval<number> {
  if (!Number.isFinite(input.margin)) {
    return { ok: false, reason: "margin must be finite" };
  }
  return guard(() => marginWeight(input.margin));
}

/** One week of prestige-flow updates plus decay. Input is never mutated. */
export function evalUpdateDynamicRating(input: {
  readonly ratings: readonly number[];
  readonly weekGames: readonly DynamicNetworkGameResult[];
  readonly alpha?: number;
  readonly beta?: number;
}): RatingEval<number[]> {
  const rows = requireArray(input.ratings, "ratings");
  if (!rows.ok) return rows;
  return guard(() =>
    updateDynamicRating(
      input.ratings,
      input.weekGames,
      input.alpha ?? 0.13,
      input.beta ?? 1 / 52,
    ),
  );
}

/** Recency-weighted PageRank over a weekly adjacency stack. */
export function evalDynamicPageRank(input: {
  readonly weeklyAdjacency: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
  readonly recencyHalflifeWeeks?: number;
  readonly damping?: number;
  readonly iterations?: number;
}): RatingEval<number[]> {
  const weeks = requireArray(input.weeklyAdjacency, "weeklyAdjacency");
  if (!weeks.ok) return weeks;
  return guard(() =>
    dynamicPageRank(
      input.weeklyAdjacency,
      input.recencyHalflifeWeeks ?? 8,
      input.damping ?? 0.85,
      input.iterations ?? 100,
    ),
  );
}

/** Logistic win probability from a rating difference. */
export function evalRatingToWinProb(input: {
  readonly ratingDiff: number;
  readonly scale?: number;
}): RatingEval<number> {
  if (!Number.isFinite(input.ratingDiff)) {
    return { ok: false, reason: "ratingDiff must be finite" };
  }
  if (input.scale !== undefined && (!Number.isFinite(input.scale) || input.scale <= 0)) {
    return { ok: false, reason: "scale must be finite and > 0" };
  }
  return guard(() => {
    const p = ratingToWinProb(input.ratingDiff, input.scale ?? 400);
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("ratingToWinProb returned a probability outside (0,1)");
    }
    return p;
  });
}

// ── eb-shrinkage ────────────────────────────────────────────────────────────

/** Empirical-Bayes shrinkage of MLE ratings toward a target. */
export function evalShrinkRatings(input: {
  readonly shrinkageInput: ShrinkageInput;
}): RatingEval<ShrinkageResult> {
  if (!input.shrinkageInput) {
    return { ok: false, reason: "shrinkageInput required — not imputed" };
  }
  if (Object.keys(input.shrinkageInput.mle ?? {}).length === 0) {
    return { ok: false, reason: "mle ratings empty — not imputed" };
  }
  return guard(() => {
    const r = shrinkRatings(input.shrinkageInput);
    for (const [team, f] of Object.entries(r.factors)) {
      if (!Number.isFinite(f) || f < 0 || f > 1) {
        throw new Error(`shrinkage factor for ${team} is outside [0,1]`);
      }
    }
    return r;
  });
}

/** Matrix form of EB shrinkage with a per-opponent Fisher term. */
export function evalShrinkRatingsMatrix(input: {
  readonly mle: Record<string, number>;
  readonly fisher: Record<string, Record<string, number>>;
  readonly totalGames: number;
  readonly strength?: number;
  readonly target?: number;
}): RatingEval<ShrinkageResult> {
  if (Object.keys(input.mle ?? {}).length === 0) {
    return { ok: false, reason: "mle ratings empty — not imputed" };
  }
  return guard(() =>
    shrinkRatingsMatrix(
      input.mle,
      input.fisher,
      input.totalGames,
      input.strength ?? 1,
      input.target,
    ),
  );
}

/** Per-team shrinkage factor — how much each rating actually moved. */
export function evalShrinkageUncertainty(input: {
  readonly result: ShrinkageResult;
}): RatingEval<Record<string, number>> {
  if (!input.result) {
    return { ok: false, reason: "result required — not imputed" };
  }
  return guard(() => shrinkageUncertainty(input.result));
}

// ── pythagorean-duel ────────────────────────────────────────────────────────

/** Tullock expectation: points-for share under a power transform. */
export function evalTullock(input: {
  readonly pf: number;
  readonly pa: number;
  readonly alpha: number;
}): RatingEval<number> {
  const { pf, pa, alpha } = input;
  if (![pf, pa, alpha].every(Number.isFinite)) {
    return { ok: false, reason: "pf, pa and alpha must be finite" };
  }
  if (pf <= 0 || pa <= 0) {
    return { ok: false, reason: "points must be positive — not imputed" };
  }
  return guard(() => {
    const p = tullock(pf, pa, alpha);
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("tullock returned a probability outside (0,1)");
    }
    return p;
  });
}

/** Logistic (difference-form) expectation. */
export function evalDifferenceForm(input: {
  readonly pf: number;
  readonly pa: number;
  readonly alpha: number;
}): RatingEval<number> {
  const { pf, pa, alpha } = input;
  if (![pf, pa, alpha].every(Number.isFinite)) {
    return { ok: false, reason: "pf, pa and alpha must be finite" };
  }
  return guard(() => differenceForm(pf, pa, alpha));
}

/** Fractional-logit fit of the Pythagorean exponent. */
export function evalFitAlpha(input: {
  readonly seasons: readonly PythagoreanTeamSeason[];
  readonly form: "tullock" | "difference";
  readonly init?: number;
}): RatingEval<number> {
  const rows = requireArray(input.seasons, "seasons");
  if (!rows.ok) return rows;
  if (input.form !== "tullock" && input.form !== "difference") {
    return { ok: false, reason: 'form must be "tullock" | "difference"' };
  }
  return guard(() => {
    const a = fitAlpha(input.seasons, input.form, input.init ?? 2);
    if (!Number.isFinite(a) || a <= 0) {
      throw new Error("fitAlpha returned a non-positive exponent");
    }
    return a;
  });
}

/** Win-rate RMSE of an exponent fit. */
export function evalWinRmse(input: {
  readonly seasons: readonly PythagoreanTeamSeason[];
  readonly form: "tullock" | "difference";
  readonly alpha: number;
}): RatingEval<number> {
  const rows = requireArray(input.seasons, "seasons");
  if (!rows.ok) return rows;
  if (!Number.isFinite(input.alpha)) {
    return { ok: false, reason: "alpha must be finite" };
  }
  return guard(() => winRmse(input.seasons, input.form, input.alpha));
}

/** Fit game-level expected win probability coefficients. */
export function evalFitGameEwp(input: {
  readonly games: readonly GameRow[];
}): RatingEval<{ alpha: number; beta: number; gamma: number }> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => fitGameEwp(input.games));
}

/** Expected win probability for one game context. */
export function evalGameEwp(input: {
  readonly pd: number;
  readonly hfa: number;
  readonly restEdge: number;
  readonly coef: { alpha: number; beta: number; gamma: number };
}): RatingEval<number> {
  const { pd, hfa, restEdge, coef } = input;
  if (![pd, hfa, restEdge].every(Number.isFinite)) {
    return { ok: false, reason: "pd, hfa and restEdge must be finite" };
  }
  if (!coef) {
    return { ok: false, reason: "coefficients required — not imputed" };
  }
  return guard(() => gameEwp(pd, hfa, restEdge, coef));
}

// ── matchup-ratings ─────────────────────────────────────────────────────────

/** Linear recency weight over a [tMin, tMax] week window. */
export function evalRecencyWeight(input: {
  readonly t: number;
  readonly tMin: number;
  readonly tMax: number;
}): RatingEval<number> {
  const { t, tMin, tMax } = input;
  if (![t, tMin, tMax].every(Number.isFinite)) {
    return { ok: false, reason: "t, tMin and tMax must be finite" };
  }
  if (tMax < tMin) {
    return { ok: false, reason: "tMax must be >= tMin" };
  }
  return guard(() => {
    const w = recencyWeight(t, tMin, tMax);
    if (!Number.isFinite(w) || w < 0) {
      throw new Error("recencyWeight returned a negative or non-finite weight");
    }
    return w;
  });
}

/** Fit attacker-minus-defender matchup ratings by recency-weighted SGD. */
export function evalFitMatchupRatings(input: {
  readonly obs: readonly MatchupObs[];
  readonly opts?: SgdOptions;
}): RatingEval<MatchupRatings> {
  const rows = requireArray(input.obs, "obs");
  if (!rows.ok) return rows;
  return guard(() => fitMatchupRatings(input.obs, input.opts ?? {}));
}

/** Predicted matchup outcome for one attacker/defender pair. */
export function evalPredictMatchup(input: {
  readonly ratings: MatchupRatings;
  readonly i: string;
  readonly j: string;
}): RatingEval<number> {
  if (!input.ratings) {
    return { ok: false, reason: "ratings required — not imputed" };
  }
  return guard(() => predictMatchup(input.ratings, input.i, input.j));
}

/** Time-ordered MAE: the model against the neighborhood-mean baseline. */
export function evalTimeOrderedMae(input: {
  readonly obs: readonly MatchupObs[];
  readonly splitWeeks: readonly number[];
  readonly opts?: SgdOptions;
}): RatingEval<{ model: number; baseline: number }> {
  const rows = requireArray(input.obs, "obs");
  if (!rows.ok) return rows;
  const splits = requireArray(input.splitWeeks, "splitWeeks");
  if (!splits.ok) return splits;
  return guard(() => timeOrderedMae(input.obs, input.splitWeeks, input.opts ?? {}));
}

// ── sel-strengths ───────────────────────────────────────────────────────────

/** Games strictly before a target date — the as-of read. */
export function evalAsOfDate(input: {
  readonly games: readonly SelGameResult[];
  readonly targetDate: string;
}): RatingEval<SelGameResult[]> {
  if (!Number.isFinite(Date.parse(input.targetDate))) {
    return { ok: false, reason: "targetDate must be a valid ISO instant" };
  }
  return guard(() => asOfDate(input.games, input.targetDate));
}

/** Least-squares latent strengths from as-of-date games. */
export function evalEstimateStrengths(input: {
  readonly games: readonly SelGameResult[];
  readonly targetDate: string;
  readonly hfa?: number;
}): RatingEval<TeamStrengths[]> {
  if (!Array.isArray(input.games) || input.games.length === 0) {
    return { ok: false, reason: "games empty — not imputed" };
  }
  if (!Number.isFinite(Date.parse(input.targetDate))) {
    return { ok: false, reason: "targetDate must be a valid ISO instant" };
  }
  return guard(() => estimateStrengths(input.games, input.targetDate, input.hfa ?? 2.5));
}

/** Feature vector for the selective-prediction head. */
export function evalSelFeatures(input: {
  readonly baseProb: number;
  readonly home: TeamStrengths;
  readonly away: TeamStrengths;
}): RatingEval<SelFeatures> {
  if (!input.home || !input.away) {
    return { ok: false, reason: "both team strengths required — not imputed" };
  }
  if (!Number.isFinite(input.baseProb)) {
    return { ok: false, reason: "baseProb must be finite" };
  }
  return guard(() => selFeatures(input.baseProb, input.home, input.away));
}

/**
 * Leakage audit: return only the features whose data does NOT postdate the
 * prediction target. A feature that does is withheld, never reported.
 */
export function evalAuditProvenance(input: {
  readonly provenance: readonly FeatureProvenance[];
}): RatingEval<FeatureProvenance[]> {
  const rows = requireArray(input.provenance, "provenance");
  if (!rows.ok) return rows;
  return guard(() => {
    const clean = auditProvenance(input.provenance);
    if (clean.length > 0) {
      throw new Error(
        `${clean.length} feature(s) carry data at or after the target date — refusing the audit`,
      );
    }
    return clean;
  });
}

/** Brier score of probabilistic predictions. */
export function evalBrierScore(input: {
  readonly probs: readonly number[];
  readonly outcomes: readonly number[];
}): RatingEval<number> {
  const probs = requireArray(input.probs, "probs", 2);
  if (!probs.ok) return probs;
  if (input.probs.length !== input.outcomes.length) {
    return {
      ok: false,
      reason: `probs (${input.probs.length}) and outcomes (${input.outcomes.length}) must be equal-length`,
    };
  }
  return guard(() => {
    const b = ratingsBrierScore(input.probs, input.outcomes);
    if (!Number.isFinite(b) || b < 0 || b > 1) {
      throw new Error("brierScore returned a value outside [0,1]");
    }
    return b;
  });
}

// ── unit-impact ─────────────────────────────────────────────────────────────

/** Soft-threshold (proximal step under a Laplace prior). */
export function evalSoftThreshold(input: {
  readonly x: number;
  readonly lambda: number;
}): RatingEval<number> {
  if (!Number.isFinite(input.x) || !Number.isFinite(input.lambda)) {
    return { ok: false, reason: "x and lambda must be finite" };
  }
  if (input.lambda < 0) {
    return { ok: false, reason: "lambda must be non-negative" };
  }
  return guard(() => ratingsSoftThreshold(input.x, input.lambda));
}

/** Impact Scores by proximal gradient descent. */
export function evalFitImpactScores(input: {
  readonly drives: readonly DriveObs[];
  readonly lambda?: number;
  readonly iters?: number;
  readonly step?: number;
}): RatingEval<Record<string, number>> {
  const rows = requireArray(input.drives, "drives");
  if (!rows.ok) return rows;
  return guard(() =>
    fitImpactScores(input.drives, input.lambda ?? 0.01, input.iters ?? 500, input.step ?? 0.5),
  );
}

/** Predicted win-probability delta from a signed unit lineup. */
export function evalPredictWpDelta(input: {
  readonly scores: Readonly<Record<string, number>>;
  readonly units: Record<string, -1 | 0 | 1>;
}): RatingEval<number> {
  if (!input.scores || !input.units) {
    return { ok: false, reason: "scores and units required — not imputed" };
  }
  return guard(() => predictWpDelta(input.scores, input.units));
}

/** Bootstrap credible intervals for the Impact Scores. */
export function evalImpactScoreIntervals(input: {
  readonly drives: readonly DriveObs[];
  readonly lambda?: number;
  readonly nBoot?: number;
  readonly seed?: number;
}): RatingEval<Record<string, { score: number; lo: number; hi: number }>> {
  const rows = requireArray(input.drives, "drives");
  if (!rows.ok) return rows;
  return guard(() =>
    impactScoreIntervals(
      input.drives,
      input.lambda ?? 0.01,
      input.nBoot ?? 200,
      input.seed ?? 42,
    ),
  );
}

/** Mahalanobis similarity between two unit-impact vectors. */
export function evalMahalanobisSimilarity(input: {
  readonly a: readonly number[];
  readonly b: readonly number[];
}): RatingEval<number> {
  const a = requireArray(input.a, "a");
  if (!a.ok) return a;
  if (input.a.length !== input.b.length) {
    return {
      ok: false,
      reason: `a (${input.a.length}) and b (${input.b.length}) must be equal-length`,
    };
  }
  return guard(() => mahalanobisSimilarity(input.a, input.b));
}

/** Year-over-year stability of a unit's Impact Score. */
export function evalYearToYearCorrelation(input: {
  readonly scoresA: Readonly<Record<string, number>>;
  readonly scoresB: Readonly<Record<string, number>>;
}): RatingEval<number> {
  if (Object.keys(input.scoresA ?? {}).length === 0) {
    return { ok: false, reason: "scoresA empty — not imputed" };
  }
  return guard(() => {
    const r = yearToYearCorrelation(input.scoresA, input.scoresB);
    if (!Number.isFinite(r) || r < -1 || r > 1) {
      throw new Error("yearToYearCorrelation returned a value outside [-1,1]");
    }
    return r;
  });
}

// ── cycle-diagnostics ───────────────────────────────────────────────────────

/** Dominance adjacency: i -> j when i dominates j. */
export function evalDominanceGraph(input: {
  readonly records: readonly HeadToHead[];
  readonly minGames?: number;
}): RatingEval<Map<string, Set<string>>> {
  const rows = requireArray(input.records, "records");
  if (!rows.ok) return rows;
  return guard(() => dominanceGraph(input.records, input.minGames ?? 1));
}

/** Count of rock-paper-scissors triples — a ratings-model integrity check. */
export function evalCountThreeCycles(input: {
  readonly adj: Map<string, Set<string>>;
}): RatingEval<number> {
  if (!input.adj || input.adj.size === 0) {
    return { ok: false, reason: "adjacency empty — not imputed" };
  }
  return guard(() => countThreeCycles(input.adj));
}

/** Share of team triples that form a dominance cycle. */
export function evalCycleRate(input: {
  readonly adj: Map<string, Set<string>>;
}): RatingEval<number> {
  if (!input.adj || input.adj.size === 0) {
    return { ok: false, reason: "adjacency empty — not imputed" };
  }
  return guard(() => {
    const r = cycleRate(input.adj);
    if (!Number.isFinite(r) || r < 0 || r > 1) {
      throw new Error("cycleRate returned a value outside [0,1]");
    }
    return r;
  });
}

/** Simple directed cycles longer than three teams. */
export function evalLongCycles(input: {
  readonly adj: Map<string, Set<string>>;
  readonly maxLen?: number;
}): RatingEval<string[][]> {
  if (!input.adj || input.adj.size === 0) {
    return { ok: false, reason: "adjacency empty — not imputed" };
  }
  return guard(() => longCycles(input.adj, input.maxLen ?? 5));
}

// ── davidson-ties ───────────────────────────────────────────────────────────

/** Strength-dependent Davidson tie parameter. */
export function evalTieNu(input: {
  readonly sBar: number;
  readonly beta0: number;
  readonly beta1: number;
}): RatingEval<number> {
  if (![input.sBar, input.beta0, input.beta1].every(Number.isFinite)) {
    return { ok: false, reason: "sBar, beta0 and beta1 must be finite" };
  }
  return guard(() => {
    const nu = tieNu(input.sBar, input.beta0, input.beta1);
    if (!Number.isFinite(nu) || nu < 0) {
      throw new Error("tieNu returned a negative or non-finite nu");
    }
    return nu;
  });
}

/** Three-way Davidson probabilities for a home/away pair. */
export function evalDavidsonProbs(input: {
  readonly piHome: number;
  readonly piAway: number;
  readonly nu: number;
  readonly homeEdge?: number;
}): RatingEval<DavidsonProbs> {
  const { piHome, piAway, nu } = input;
  if (![piHome, piAway, nu].every(Number.isFinite)) {
    return { ok: false, reason: "piHome, piAway and nu must be finite" };
  }
  if (piHome <= 0 || piAway <= 0) {
    return { ok: false, reason: "strengths must be > 0 — not imputed" };
  }
  if (nu < 0) {
    return { ok: false, reason: "nu must be >= 0" };
  }
  return guard(() => {
    const p = davidsonProbs(piHome, piAway, nu, input.homeEdge ?? 1);
    const total = p.homeWin + p.tie + p.awayWin;
    if (Math.abs(total - 1) > 1e-6) {
      throw new Error(`Davidson probabilities sum to ${total}, not 1`);
    }
    return p;
  });
}

/** Log loss of a Davidson three-way prediction. */
export function evalDavidsonLogLoss(input: {
  readonly probs: DavidsonProbs;
  readonly outcome: "H" | "T" | "A";
}): RatingEval<number> {
  if (!input.probs) {
    return { ok: false, reason: "probs required — not imputed" };
  }
  if (!["H", "T", "A"].includes(input.outcome)) {
    return { ok: false, reason: 'outcome must be "H" | "T" | "A"' };
  }
  return guard(() => {
    const l = davidsonLogLoss(input.probs, input.outcome);
    if (!Number.isFinite(l) || l < 0) {
      throw new Error("davidsonLogLoss returned a negative or non-finite value");
    }
    return l;
  });
}

/** Davidson probabilities from log-strengths with a strength-dependent nu. */
export function evalDavidsonProbsStrengthDep(input: {
  readonly logPiHome: number;
  readonly logPiAway: number;
  readonly beta0: number;
  readonly beta1: number;
  readonly homeEdge?: number;
}): RatingEval<DavidsonProbs> {
  const { logPiHome, logPiAway, beta0, beta1 } = input;
  if (![logPiHome, logPiAway, beta0, beta1].every(Number.isFinite)) {
    return { ok: false, reason: "log strengths and betas must be finite" };
  }
  return guard(() =>
    davidsonProbsStrengthDep(logPiHome, logPiAway, beta0, beta1, input.homeEdge ?? 1),
  );
}

// ── time-varying-weights ────────────────────────────────────────────────────

/** Fit a model whose weights drift with the season week. */
export function evalFitTVC(input: {
  readonly games: readonly TVCGame[];
  readonly l2?: number;
  readonly iters?: number;
}): RatingEval<TVCModel> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  const model = guard(() => fitTVC(input.games, { l2: input.l2, iters: input.iters }));
  if (!model.ok) return model;
  if (model.data == null) {
    return { ok: false, reason: "fitTVC returned null (insufficient data)" };
  }
  return model;
}

/** Predict a probability from a time-varying model. */
export function evalPredictTVC(input: {
  readonly model: TVCModel;
  readonly features: readonly number[];
  readonly week: number;
  readonly regimes?: Record<string, boolean>;
}): RatingEval<number> {
  if (!input.model) {
    return { ok: false, reason: "model required — not imputed" };
  }
  if (!Number.isFinite(input.week)) {
    return { ok: false, reason: "week must be finite" };
  }
  return guard(() => {
    const p = predictTVC(input.model, [...input.features], input.week, input.regimes ?? {});
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("predictTVC returned a probability outside (0,1)");
    }
    return p;
  });
}

/** Effective weight of feature k in a given week. */
export function evalEffectiveWeight(input: {
  readonly model: TVCModel;
  readonly k: number;
  readonly week: number;
}): RatingEval<number> {
  if (!input.model) {
    return { ok: false, reason: "model required — not imputed" };
  }
  if (!Number.isInteger(input.k) || input.k < 0) {
    return { ok: false, reason: "k must be a non-negative integer" };
  }
  if (!Number.isFinite(input.week)) {
    return { ok: false, reason: "week must be finite" };
  }
  return guard(() => effectiveWeight(input.model, input.k, input.week));
}

/** Mean binary log loss of a model over games. */
export function evalMeanLogLoss(input: {
  readonly model: TVCModel;
  readonly games: readonly TVCGame[];
}): RatingEval<number> {
  if (!input.model) {
    return { ok: false, reason: "model required — not imputed" };
  }
  if (!Array.isArray(input.games) || input.games.length === 0) {
    return { ok: false, reason: "games empty — not imputed" };
  }
  return guard(() => {
    const l = ratingsMeanLogLoss(input.model, input.games);
    if (!Number.isFinite(l) || l < 0) {
      throw new Error("meanLogLoss returned a negative or non-finite value");
    }
    return l;
  });
}

/** Static (no-drift) counterpart of the time-varying fit. */
export function evalFitStatic(input: {
  readonly games: readonly TVCGame[];
  readonly l2?: number;
  readonly iters?: number;
}): RatingEval<TVCModel> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  const model = guard(() => fitStatic(input.games, { l2: input.l2, iters: input.iters }));
  if (!model.ok) return model;
  if (model.data == null) {
    return { ok: false, reason: "fitStatic returned null (insufficient data)" };
  }
  return model;
}

// ── target-pagerank ─────────────────────────────────────────────────────────

/** Build the weighted play-arc transition matrix. */
export function evalBuildTransition(input: {
  readonly arcs: readonly PlayArc[];
}): RatingEval<{ nodes: string[]; trans: Map<string, Array<{ to: string; p: number }>> }> {
  const rows = requireArray(input.arcs, "arcs");
  if (!rows.ok) return rows;
  return guard(() => buildTransition(input.arcs));
}

/** PageRank centrality over the play-arc graph. */
export function evalPagerankCentrality(input: {
  readonly nodes: readonly string[];
  readonly trans: ReadonlyMap<string, Array<{ to: string; p: number }>>;
  readonly damping?: number;
  readonly tol?: number;
  readonly maxIter?: number;
}): RatingEval<Record<string, number>> {
  const nodes = requireArray(input.nodes, "nodes");
  if (!nodes.ok) return nodes;
  if (!input.trans) {
    return { ok: false, reason: "transition map required — not imputed" };
  }
  return guard(() => {
    const c = pagerankCentrality(
      input.nodes,
      input.trans,
      input.damping ?? 0.85,
      input.tol ?? 1e-10,
      input.maxIter ?? 1000,
    );
    if (Object.keys(c).length === 0) {
      throw new Error("pagerankCentrality produced no centrality");
    }
    return c;
  });
}

/** Residual between centrality and production on the shared player set. */
export function evalCentralityResiduals(input: {
  readonly centrality: Readonly<Record<string, number>>;
  readonly production: Readonly<Record<string, number>>;
}): RatingEval<Record<string, number>> {
  if (Object.keys(input.centrality ?? {}).length === 0) {
    return { ok: false, reason: "centrality empty — not imputed" };
  }
  return guard(() => centralityResiduals(input.centrality, input.production));
}

/** Top-k centrality differential between two teams. */
export function evalTeamCentralityDifferential(input: {
  readonly centrality: Readonly<Record<string, number>>;
  readonly teamOf: (id: string) => string;
  readonly teamA: string;
  readonly teamB: string;
  readonly k: number;
}): RatingEval<number> {
  if (Object.keys(input.centrality ?? {}).length === 0) {
    return { ok: false, reason: "centrality empty — not imputed" };
  }
  if (typeof input.teamOf !== "function") {
    return { ok: false, reason: "teamOf must be a function" };
  }
  if (!Number.isInteger(input.k) || input.k < 1) {
    return { ok: false, reason: "k must be a positive integer" };
  }
  return guard(() =>
    teamCentralityDifferential(
      input.centrality,
      input.teamOf,
      input.teamA,
      input.teamB,
      input.k,
    ),
  );
}

// ── parametric-pagerank ─────────────────────────────────────────────────────

/** Recency x situation x importance edge weight. */
export function evalEdgeWeight(input: {
  readonly game: RatedGame;
  readonly weights: EdgeWeights;
}): RatingEval<number> {
  if (!input.game) {
    return { ok: false, reason: "game required — not imputed" };
  }
  if (!input.weights) {
    return { ok: false, reason: "weights required — not imputed" };
  }
  return guard(() => {
    const w = edgeWeight(input.game, input.weights);
    if (!Number.isFinite(w) || w < 0) {
      throw new Error("edgeWeight returned a negative or non-finite weight");
    }
    return w;
  });
}

/** Weighted PageRank over team nodes. */
export function evalParametricPagerank(input: {
  readonly games: readonly RatedGame[];
  readonly weights: EdgeWeights;
  readonly damping?: number;
  readonly tol?: number;
}): RatingEval<Record<string, number>> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => {
    const r = parametricPagerank(
      input.games,
      input.weights,
      input.damping ?? 0.85,
      input.tol ?? 1e-10,
    );
    if (Object.keys(r).length === 0) {
      throw new Error("parametricPagerank produced no ratings");
    }
    return r;
  });
}

/** Logistic win probability from a PageRank rating pair. */
export function evalWinProbFromRatings(input: {
  readonly ratingHome: number;
  readonly ratingAway: number;
  readonly scale?: number;
}): RatingEval<number> {
  if (![input.ratingHome, input.ratingAway].every(Number.isFinite)) {
    return { ok: false, reason: "ratings must be finite" };
  }
  return guard(() => {
    const p = winProbFromRatings(input.ratingHome, input.ratingAway, input.scale ?? 200);
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("winProbFromRatings returned a probability outside (0,1)");
    }
    return p;
  });
}

/** Greedy coordinate search over the recency decay. */
export function evalTuneRecencyDecay(input: {
  readonly evaluate: (decay: number) => number;
  readonly candidates?: readonly number[];
}): RatingEval<{ decay: number; score: number }> {
  if (typeof input.evaluate !== "function") {
    return { ok: false, reason: "evaluate must be a function" };
  }
  return guard(() =>
    tuneRecencyDecay(
      input.evaluate,
      input.candidates ?? [0.02, 0.05, 0.1, 0.2, 0.35],
    ),
  );
}

/** Closing-line-value edge of the rating probabilities. */
export function evalClvEdge(input: {
  readonly ratingProb: readonly number[];
  readonly closingProb: readonly number[];
  readonly pickedHome: ReadonlyArray<boolean>;
}): RatingEval<number> {
  const a = requireArray(input.ratingProb, "ratingProb");
  if (!a.ok) return a;
  if (
    input.ratingProb.length !== input.closingProb.length ||
    input.ratingProb.length !== input.pickedHome.length
  ) {
    return { ok: false, reason: "ratingProb, closingProb and pickedHome must be equal-length" };
  }
  return guard(() => clvEdge(input.ratingProb, input.closingProb, input.pickedHome));
}

// ── playerank ───────────────────────────────────────────────────────────────

/** Mean player-game vector for a team. */
export function evalAggregateTeamVector(input: {
  readonly games: ReadonlyArray<PlayerGame>;
  readonly featureNames: readonly string[];
}): RatingEval<number[]> {
  const names = requireArray(input.featureNames, "featureNames");
  if (!names.ok) return names;
  return guard(() => aggregateTeamVector(input.games, input.featureNames));
}

/** Train the team win model on team-level vectors. */
export function evalTrainTeamModel(input: {
  readonly games: readonly TeamGame[];
  readonly lr?: number;
  readonly iters?: number;
  readonly l2?: number;
}): RatingEval<number[]> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() =>
    trainTeamModel(input.games, input.lr ?? 0.5, input.iters ?? 2000, input.l2 ?? 0.01),
  );
}

/** Score one player-game vector. */
export function evalPlayerGameRating(input: {
  readonly weights: readonly number[];
  readonly playerGame: PlayerGame;
  readonly featureNames: readonly string[];
}): RatingEval<number> {
  if (!Array.isArray(input.weights) || input.weights.length === 0) {
    return { ok: false, reason: "weights empty — not imputed" };
  }
  if (!input.playerGame) {
    return { ok: false, reason: "playerGame required — not imputed" };
  }
  return guard(() =>
    playerGameRating(input.weights, input.playerGame, input.featureNames),
  );
}

/** EWMA season form. */
export function evalFormRating(input: {
  readonly ratings: readonly number[];
  readonly alpha?: number;
}): RatingEval<number[]> {
  const rows = requireArray(input.ratings, "ratings");
  if (!rows.ok) return rows;
  if (input.alpha !== undefined && (!Number.isFinite(input.alpha) || input.alpha <= 0)) {
    return { ok: false, reason: "alpha must be finite and in (0,1]" };
  }
  return guard(() => formRating(input.ratings, input.alpha ?? 0.3));
}

/** Cluster snap coordinates into positional roles. */
export function evalDetectRoles(input: {
  readonly snapPositions: ReadonlyArray<{ id: string; x: number; y: number }>;
  readonly k: number;
  readonly iters?: number;
}): RatingEval<Record<string, number>> {
  if (!Array.isArray(input.snapPositions) || input.snapPositions.length === 0) {
    return { ok: false, reason: "snapPositions empty — not imputed" };
  }
  if (!Number.isInteger(input.k) || input.k < 1) {
    return { ok: false, reason: "k must be a positive integer" };
  }
  return guard(() => detectRoles(input.snapPositions, input.k, input.iters ?? 50));
}

/** Area under the ROC curve. */
export function evalAuc(input: {
  readonly scores: readonly number[];
  readonly labels: ReadonlyArray<0 | 1>;
}): RatingEval<number> {
  const scores = requireArray(input.scores, "scores", 2);
  if (!scores.ok) return scores;
  if (input.scores.length !== input.labels.length) {
    return {
      ok: false,
      reason: `scores (${input.scores.length}) and labels (${input.labels.length}) must be equal-length`,
    };
  }
  return guard(() => {
    const a = auc(input.scores, input.labels);
    if (!Number.isFinite(a) || a < 0 || a > 1) {
      throw new Error("auc returned a value outside [0,1]");
    }
    return a;
  });
}

// ── hfa-bias-audit ──────────────────────────────────────────────────────────

/** Naive mean home margin — the specification the audit is measuring against. */
export function evalUnadjustedHfa(input: {
  readonly games: readonly HFAGame[];
}): RatingEval<number> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => unadjustedHFA(input.games));
}

/** Team fixed-effects HFA. */
export function evalTeamFixedEffectsHfa(input: {
  readonly games: readonly HFAGame[];
}): RatingEval<HFAEstimate> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => teamFixedEffectsHFA(input.games));
}

/** Mixed-effects HFA with a random team effect. */
export function evalMixedEffectsHfa(input: {
  readonly games: readonly HFAGame[];
}): RatingEval<HFAEstimate> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => mixedEffectsHFA(input.games));
}

/** The scheduling-bias audit: naive vs mixed HFA, and whether the gap matters. */
export function evalHfaBiasAudit(input: {
  readonly games: readonly HFAGame[];
  readonly materiality?: number;
}): RatingEval<HFABiasAudit> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  return guard(() => hfaBiasAudit(input.games, input.materiality ?? 0.5));
}

/** Seeded simulator for a non-random (hosting-biased) schedule. */
export function evalSimulateNonrandomSchedule(input: {
  readonly teams?: number;
  readonly games?: number;
  readonly trueGamma?: number;
  readonly teamSd?: number;
  readonly noiseSd?: number;
  readonly hostBias?: number;
  readonly seed?: number;
}): RatingEval<{ games: HFAGame[]; trueGamma: number }> {
  return guard(() => simulateNonrandomSchedule(input));
}

// ── csf-triple-compare ──────────────────────────────────────────────────────

/** Common-season-form expectation under one of three forms. */
export function evalCsf(input: {
  readonly pf: number;
  readonly pa: number;
  readonly alpha: number;
  readonly form: CsfForm;
}): RatingEval<number> {
  const { pf, pa, alpha, form } = input;
  if (![pf, pa, alpha].every(Number.isFinite)) {
    return { ok: false, reason: "pf, pa and alpha must be finite" };
  }
  if (pf <= 0 || pa <= 0) {
    return { ok: false, reason: "points must be positive — not imputed" };
  }
  if (!["tullock", "difference", "serial"].includes(form)) {
    return { ok: false, reason: 'form must be "tullock" | "difference" | "serial"' };
  }
  return guard(() => {
    const p = csf(pf, pa, alpha, form);
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("csf returned a probability outside (0,1)");
    }
    return p;
  });
}

/** OLS fit of the CSF exponent. */
export function evalFitAlphaOls(input: {
  readonly seasons: readonly CsfTeamSeason[];
  readonly form: CsfForm;
  readonly lo?: number;
  readonly hi?: number;
}): RatingEval<number> {
  const rows = requireArray(input.seasons, "seasons");
  if (!rows.ok) return rows;
  return guard(() => {
    const a = fitAlphaOls(input.seasons, input.form, input.lo ?? 0.05, input.hi ?? 10);
    if (!Number.isFinite(a) || a <= 0) {
      throw new Error("fitAlphaOls returned a non-positive exponent");
    }
    return a;
  });
}

/** Leave-one-out CV RMSE of a CSF form. */
export function evalLoocvRmse(input: {
  readonly seasons: readonly CsfTeamSeason[];
  readonly form: CsfForm;
}): RatingEval<number> {
  const rows = requireArray(input.seasons, "seasons", 3);
  if (!rows.ok) return rows;
  return guard(() => {
    const r = loocvRmse(input.seasons, input.form);
    if (!Number.isFinite(r) || r < 0) {
      throw new Error("loocvRmse returned a negative or non-finite value");
    }
    return r;
  });
}

/** Head-to-head of the three CSF forms: RMSE, exponent and winner. */
export function evalCompareCsf(input: {
  readonly seasons: readonly CsfTeamSeason[];
}): RatingEval<{
  rmse: Record<CsfForm, number>;
  alpha: Record<CsfForm, number>;
  winner: CsfForm;
  serialVsTullock: { diffWins: number; pValue: number };
}> {
  const rows = requireArray(input.seasons, "seasons", 3);
  if (!rows.ok) return rows;
  return guard(() => compareCsf(input.seasons));
}

// ── dynamic-bradley-terry ───────────────────────────────────────────────────

/** Games that violate the Bradley-Terry existence condition under weights. */
export function evalExistenceViolations(input: {
  readonly games: readonly BTGame[];
  readonly weights: readonly number[];
  readonly minWeight?: number;
}): RatingEval<string[]> {
  const games = requireArray(input.games, "games");
  if (!games.ok) return games;
  if (input.weights.length !== input.games.length) {
    return {
      ok: false,
      reason: `games (${input.games.length}) and weights (${input.weights.length}) must be equal-length`,
    };
  }
  return guard(() => {
    const v = existenceViolations(input.games, input.weights, input.minWeight ?? 1e-6);
    if (v.length > 0) {
      throw new Error(`${v.length} game(s) violate the BT existence condition`);
    }
    return v;
  });
}

/** Gaussian kernel weights over week distance. */
export function evalKernelWeights(input: {
  readonly games: readonly BTGame[];
  readonly week: number;
  readonly h: number;
}): RatingEval<number[]> {
  const games = requireArray(input.games, "games");
  if (!games.ok) return games;
  if (!Number.isFinite(input.h) || input.h <= 0) {
    return { ok: false, reason: "bandwidth h must be finite and > 0" };
  }
  if (!Number.isFinite(input.week)) {
    return { ok: false, reason: "week must be finite" };
  }
  return guard(() => kernelWeights(input.games, input.week, input.h));
}

/** Time-varying BT fit at a given week and bandwidth. */
export function evalFitDynamicBt(input: {
  readonly games: readonly BTGame[];
  readonly week: number;
  readonly h: number;
  readonly iters?: number;
  readonly ridge?: number;
}): RatingEval<BTFit> {
  const rows = requireArray(input.games, "games");
  if (!rows.ok) return rows;
  if (!Number.isFinite(input.h) || input.h <= 0) {
    return { ok: false, reason: "bandwidth h must be finite and > 0" };
  }
  const fit = guard(() =>
    fitDynamicBT(input.games, input.week, input.h, {
      iters: input.iters,
      ridge: input.ridge,
    }),
  );
  if (!fit.ok) return fit;
  if (fit.data == null) {
    return {
      ok: false,
      reason: "fitDynamicBT returned null (existence condition violated)",
    };
  }
  return fit;
}

/** Leave-one-out log likelihood at a bandwidth. */
export function evalLooLogLik(input: {
  readonly games: readonly BTGame[];
  readonly h: number;
}): RatingEval<number> {
  const rows = requireArray(input.games, "games", 2);
  if (!rows.ok) return rows;
  if (!Number.isFinite(input.h) || input.h <= 0) {
    return { ok: false, reason: "bandwidth h must be finite and > 0" };
  }
  return guard(() => {
    const l = looLogLik(input.games, input.h);
    if (!Number.isFinite(l)) {
      throw new Error("looLogLik returned a non-finite value");
    }
    return l;
  });
}

/** Choose a bandwidth by leave-one-out CV. */
export function evalTuneBandwidthLOOCV(input: {
  readonly games: readonly BTGame[];
  readonly candidates: readonly number[];
}): RatingEval<{ h: number; scores: { h: number; loo: number }[] }> {
  const rows = requireArray(input.games, "games", 2);
  if (!rows.ok) return rows;
  const cands = requireArray(input.candidates, "candidates");
  if (!cands.ok) return cands;
  return guard(() => tuneBandwidthLOOCV(input.games, input.candidates));
}

export {
  ratingsFitBradleyTerry as fitBradleyTerry,
  ratingsBrierScore as brierScore,
  ratingsSoftThreshold as softThreshold,
  ratingsMeanLogLoss as meanLogLoss,
  btWinProb,
  mad,
  strengthCovariate,
  fitLeastSquares,
  gameVariance,
  fitWeightedLeastSquares,
  fitL1Ratings,
  predictSpread,
  spreadMae,
  rankingViolationRate,
  marginWeight,
  updateDynamicRating,
  dynamicPageRank,
  ratingToWinProb,
  shrinkRatings,
  shrinkRatingsMatrix,
  shrinkageUncertainty,
  tullock,
  differenceForm,
  fitAlpha,
  winRmse,
  fitGameEwp,
  gameEwp,
  recencyWeight,
  fitMatchupRatings,
  predictMatchup,
  timeOrderedMae,
  asOfDate,
  estimateStrengths,
  selFeatures,
  auditProvenance,
  ratingsBrierScore,
  softThreshold,
  fitImpactScores,
  predictWpDelta,
  impactScoreIntervals,
  mahalanobisSimilarity,
  yearToYearCorrelation,
  dominanceGraph,
  countThreeCycles,
  cycleRate,
  longCycles,
  tieNu,
  davidsonProbs,
  davidsonLogLoss,
  davidsonProbsStrengthDep,
  fitTVC,
  predictTVC,
  effectiveWeight,
  fitStatic,
  buildTransition,
  pagerankCentrality,
  centralityResiduals,
  teamCentralityDifferential,
  edgeWeight,
  parametricPagerank,
  winProbFromRatings,
  tuneRecencyDecay,
  clvEdge,
  aggregateTeamVector,
  trainTeamModel,
  playerGameRating,
  formRating,
  detectRoles,
  auc,
  unadjustedHFA,
  teamFixedEffectsHFA,
  mixedEffectsHFA,
  hfaBiasAudit,
  simulateNonrandomSchedule,
  csf,
  fitAlphaOls,
  loocvRmse,
  compareCsf,
  existenceViolations,
  kernelWeights,
  fitDynamicBT,
  looLogLik,
  tuneBandwidthLOOCV,
};
export type {
  BtGame,
  BtFit,
  LeastSquaresGameResult,
  LsFit,
  DynamicNetworkGameResult,
  ShrinkageInput,
  ShrinkageResult,
  PythagoreanTeamSeason,
  GameRow,
  MatchupObs,
  MatchupRatings,
  SgdOptions,
  SelGameResult,
  TeamStrengths,
  SelFeatures,
  FeatureProvenance,
  DriveObs,
  HeadToHead,
  DavidsonProbs,
  TVCGame,
  TVCModel,
  PlayArc,
  RatedGame,
  EdgeWeights,
  PlayerGame,
  TeamGame,
  HFAGame,
  HFAEstimate,
  HFABiasAudit,
  CsfForm,
  CsfTeamSeason,
  BTGame,
  BTFit,
};
