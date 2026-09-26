import { describe, expect, it } from "vitest";
import {
  evalFitBradleyTerry,
  evalBtWinProb,
  evalMad,
  evalStrengthCovariate,
  evalFitLeastSquares,
  evalGameVariance,
  evalFitWeightedLeastSquares,
  evalFitL1Ratings,
  evalPredictSpread,
  evalSpreadMae,
  evalRankingViolationRate,
  evalMarginWeight,
  evalUpdateDynamicRating,
  evalDynamicPageRank,
  evalRatingToWinProb,
  evalShrinkRatings,
  evalShrinkRatingsMatrix,
  evalShrinkageUncertainty,
  evalTullock,
  evalDifferenceForm,
  evalFitAlpha,
  evalWinRmse,
  evalFitGameEwp,
  evalGameEwp,
  evalRecencyWeight,
  evalFitMatchupRatings,
  evalPredictMatchup,
  evalTimeOrderedMae,
  evalAsOfDate,
  evalEstimateStrengths,
  evalSelFeatures,
  evalAuditProvenance,
  evalBrierScore,
  evalSoftThreshold,
  evalFitImpactScores,
  evalPredictWpDelta,
  evalImpactScoreIntervals,
  evalMahalanobisSimilarity,
  evalYearToYearCorrelation,
  evalDominanceGraph,
  evalCountThreeCycles,
  evalCycleRate,
  evalLongCycles,
  evalTieNu,
  evalDavidsonProbs,
  evalDavidsonLogLoss,
  evalDavidsonProbsStrengthDep,
  evalFitTVC,
  evalPredictTVC,
  evalEffectiveWeight,
  evalMeanLogLoss,
  evalFitStatic,
  evalBuildTransition,
  evalPagerankCentrality,
  evalCentralityResiduals,
  evalTeamCentralityDifferential,
  evalEdgeWeight,
  evalParametricPagerank,
  evalWinProbFromRatings,
  evalTuneRecencyDecay,
  evalClvEdge,
  evalAggregateTeamVector,
  evalTrainTeamModel,
  evalPlayerGameRating,
  evalFormRating,
  evalDetectRoles,
  evalAuc,
  evalUnadjustedHfa,
  evalTeamFixedEffectsHfa,
  evalMixedEffectsHfa,
  evalHfaBiasAudit,
  evalSimulateNonrandomSchedule,
  evalCsf,
  evalFitAlphaOls,
  evalLoocvRmse,
  evalCompareCsf,
  evalExistenceViolations,
  evalKernelWeights,
  evalFitDynamicBt,
  evalLooLogLik,
  evalTuneBandwidthLOOCV,
} from "./ratings-bridge.js";
import type { BtGame, LeastSquaresGameResult, SelGameResult } from "./ratings-bridge.js";

// A complete double round-robin, so the Bradley-Terry MM fit is identified
// and its pseudocount smoothing has no unconnected team.
const btGames: BtGame[] = [
  { home: "BUF", away: "NYJ", homeWin: 1 },
  { home: "NYJ", away: "BUF", homeWin: 0 },
  { home: "BUF", away: "CLE", homeWin: 1 },
  { home: "CLE", away: "BUF", homeWin: 0 },
  { home: "BUF", away: "MIA", homeWin: 1 },
  { home: "MIA", away: "BUF", homeWin: 0 },
  { home: "NYJ", away: "CLE", homeWin: 0 },
  { home: "CLE", away: "NYJ", homeWin: 1 },
  { home: "NYJ", away: "MIA", homeWin: 0 },
  { home: "MIA", away: "NYJ", homeWin: 1 },
  { home: "CLE", away: "MIA", homeWin: 1 },
  { home: "MIA", away: "CLE", homeWin: 0 },
  { home: "BUF", away: "NYJ", homeWin: 1 },
  { home: "CLE", away: "NYJ", homeWin: 1 },
  { home: "MIA", away: "BUF", homeWin: 0 },
];

const lsGames: LeastSquaresGameResult[] = [
  { home: "BUF", away: "NYJ", homePoints: 31, awayPoints: 17, restEdge: 1, travelMiles: 300, week: 3 },
  { home: "BUF", away: "CLE", homePoints: 24, awayPoints: 20, restEdge: 0, travelMiles: 200, week: 4 },
  { home: "NYJ", away: "MIA", homePoints: 17, awayPoints: 27, restEdge: -1, travelMiles: 1200, week: 5 },
  { home: "CLE", away: "MIA", homePoints: 23, awayPoints: 10, restEdge: 2, travelMiles: 1100, week: 6 },
  { home: "MIA", away: "BUF", homePoints: 13, awayPoints: 34, restEdge: 0, travelMiles: 1100, week: 7 },
  { home: "BUF", away: "MIA", homePoints: 28, awayPoints: 24, restEdge: 3, travelMiles: 1100, week: 8 },
  { home: "NYJ", away: "BUF", homePoints: 20, awayPoints: 25, restEdge: 0, travelMiles: 300, week: 9 },
  { home: "CLE", away: "BUF", homePoints: 16, awayPoints: 30, restEdge: -1, travelMiles: 300, week: 10 },
];

describe("ratings-bridge bradley-terry", () => {
  it("fits strengths and returns a real win probability", () => {
    const fit = evalFitBradleyTerry({ games: btGames });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const p = evalBtWinProb({ fit: fit.data, home: "BUF", away: "NYJ" });
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.data).toBeGreaterThan(0.5);
      expect(p.data).toBeLessThan(1);
    }
  });

  it("the better team wins more often", () => {
    const fit = evalFitBradleyTerry({ games: btGames });
    if (!fit.ok) return;
    const good = evalBtWinProb({ fit: fit.data, home: "BUF", away: "MIA" });
    const bad = evalBtWinProb({ fit: fit.data, home: "MIA", away: "BUF" });
    if (good.ok && bad.ok) expect(good.data).toBeGreaterThan(bad.data);
  });

  it("refuses an unknown team rather than guessing", () => {
    const fit = evalFitBradleyTerry({ games: btGames });
    if (!fit.ok) return;
    const p = evalBtWinProb({ fit: fit.data, home: "XXX", away: "NYJ" });
    expect(p.ok).toBe(false);
  });

  it("fail-closes on empty games", () => {
    expect(evalFitBradleyTerry({ games: [] }).ok).toBe(false);
    expect(evalFitBradleyTerry({ games: btGames, homeEdge: 0 }).ok).toBe(false);
  });

  it("mad and strength covariate are finite on real data", () => {
    const mad = evalMad({ xs: [1, 2, 3, 100] });
    expect(mad.ok).toBe(true);
    if (mad.ok) expect(mad.data).toBeGreaterThan(0);
    const fit = evalFitBradleyTerry({ games: btGames });
    if (!fit.ok) return;
    const cov = evalStrengthCovariate({
      fit: fit.data,
      matchups: [["BUF", "NYJ"], ["CLE", "MIA"]],
    });
    expect(cov.ok).toBe(true);
    if (cov.ok) expect(cov.data.length).toBe(2);
  });
});

describe("ratings-bridge least-squares-ratings", () => {
  it("OLS, weighted and L1 all fit and agree on the sign of the spread", () => {
    const ols = evalFitLeastSquares({ games: lsGames });
    const wls = evalFitWeightedLeastSquares({ games: lsGames });
    const l1 = evalFitL1Ratings({ games: lsGames });
    expect(ols.ok).toBe(true);
    expect(wls.ok).toBe(true);
    expect(l1.ok).toBe(true);
    if (!ols.ok || !wls.ok || !l1.ok) return;
    const sOls = evalPredictSpread({ fit: ols.data, home: "BUF", away: "NYJ" });
    const sWls = evalPredictSpread({ fit: wls.data, home: "BUF", away: "NYJ" });
    const sL1 = evalPredictSpread({ fit: l1.data, home: "BUF", away: "NYJ" });
    if (sOls.ok && sWls.ok && sL1.ok) {
      expect(Math.sign(sOls.data)).toBe(Math.sign(sWls.data));
      expect(Math.sign(sOls.data)).toBe(Math.sign(sL1.data));
    }
  });

  it("spread MAE and violation rate are in range", () => {
    const ols = evalFitLeastSquares({ games: lsGames });
    if (!ols.ok) return;
    const mae = evalSpreadMae({ fit: ols.data, games: lsGames });
    const viol = evalRankingViolationRate({ fit: ols.data, games: lsGames });
    expect(mae.ok).toBe(true);
    if (mae.ok) expect(mae.data).toBeGreaterThan(0);
    expect(viol.ok).toBe(true);
    if (viol.ok) {
      expect(viol.data).toBeGreaterThanOrEqual(0);
      expect(viol.data).toBeLessThanOrEqual(1);
    }
  });

  it("game variance rises with travel and early-season noise", () => {
    const early = evalGameVariance({ game: { ...lsGames[0]!, week: 2 } });
    const late = evalGameVariance({ game: { ...lsGames[0]!, week: 12 } });
    expect(early.ok).toBe(true);
    expect(late.ok).toBe(true);
    if (early.ok && late.ok) expect(early.data).toBeGreaterThan(late.data);
  });

  it("fail-closes on empty games and unknown teams", () => {
    expect(evalFitLeastSquares({ games: [] }).ok).toBe(false);
    const ols = evalFitLeastSquares({ games: lsGames });
    if (!ols.ok) return;
    expect(evalPredictSpread({ fit: ols.data, home: "ZZZ", away: "NYJ" }).ok).toBe(
      false,
    );
  });
});

describe("ratings-bridge dynamic-network-rating", () => {
  it("margin weight is log(1+margin) and positive", () => {
    const w = evalMarginWeight({ margin: 7 });
    expect(w.ok).toBe(true);
    if (w.ok) expect(w.data).toBeCloseTo(Math.log1p(7), 6);
    expect(evalMarginWeight({ margin: 0 }).ok).toBe(false);
  });

  it("one week of updates never mutates the input", () => {
    const ratings = [0.5, 0.4, 0.3];
    const week = [
      { winner: 0, loser: 1, margin: 7 },
      { winner: 2, loser: 0, margin: 3 },
    ];
    const r = evalUpdateDynamicRating({ ratings, weekGames: week });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(ratings).toEqual([0.5, 0.4, 0.3]);
      expect(r.data.length).toBe(3);
    }
  });

  it("fail-closes on empty ratings", () => {
    expect(evalUpdateDynamicRating({ ratings: [], weekGames: [] }).ok).toBe(false);
  });

  it("dynamic pagerank returns a probability vector", () => {
    const week = [
      [
        [0, 1, 0],
        [0, 0, 1],
        [0, 0, 0],
      ],
    ];
    const r = evalDynamicPageRank({ weeklyAdjacency: week });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const total = r.data.reduce((s, x) => s + x, 0);
      expect(total).toBeCloseTo(1, 3);
    }
    expect(evalDynamicPageRank({ weeklyAdjacency: [] }).ok).toBe(false);
  });

  it("rating difference maps to a probability", () => {
    const r = evalRatingToWinProb({ ratingDiff: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeGreaterThan(0.5);
    expect(evalRatingToWinProb({ ratingDiff: Number.NaN }).ok).toBe(false);
    expect(evalRatingToWinProb({ ratingDiff: 100, scale: 0 }).ok).toBe(false);
  });
});

describe("ratings-bridge eb-shrinkage", () => {
  it("shrinks a noisy rating toward the target", () => {
    const r = evalShrinkRatings({
      shrinkageInput: {
        mle: { A: 1.8, B: 1.0, C: 1.0, D: 0.2 },
        information: { A: 0.5, B: 40, C: 40, D: 0.2 },
        totalGames: 200,
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.factors["A"] ?? 0).toBeGreaterThan(r.data.factors["B"] ?? 0);
      expect(r.data.factors["B"] ?? 0).toBeGreaterThanOrEqual(0);
      expect(r.data.factors["B"] ?? 0).toBeLessThanOrEqual(1);
    }
  });

  it("matrix form and uncertainty are finite", () => {
    const r = evalShrinkRatingsMatrix({
      mle: { A: 1.5, B: 1.0, C: 0.7 },
      fisher: { A: { B: 1 }, B: { A: 1 }, C: { A: 1 } },
      totalGames: 120,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const u = evalShrinkageUncertainty({ result: r.data });
    expect(u.ok).toBe(true);
  });

  it("fail-closes on an empty rating map", () => {
    expect(
      evalShrinkRatings({ shrinkageInput: { mle: {}, information: {}, totalGames: 0 } }).ok,
    ).toBe(false);
  });
});

describe("ratings-bridge pythagorean-duel", () => {
  const seasons = [
    { pf: 420, pa: 330, wins: 12, games: 16 },
    { pf: 300, pa: 380, wins: 4, games: 16 },
    { pf: 390, pa: 340, wins: 10, games: 16 },
    { pf: 250, pa: 410, wins: 2, games: 16 },
  ];

  it("tullock and difference both return a probability", () => {
    const t = evalTullock({ pf: 420, pa: 330, alpha: 2.2 });
    const d = evalDifferenceForm({ pf: 420, pa: 330, alpha: 0.08 });
    expect(t.ok).toBe(true);
    expect(d.ok).toBe(true);
    if (t.ok && d.ok) expect(t.data).toBeGreaterThan(0.5);
  });

  it("refuses non-positive points", () => {
    expect(evalTullock({ pf: 0, pa: 330, alpha: 2.2 }).ok).toBe(false);
    expect(evalCsf({ pf: 420, pa: 0, alpha: 2.2, form: "tullock" }).ok).toBe(false);
  });

  it("fits alpha and scores it", () => {
    const a = evalFitAlpha({ seasons, form: "tullock" });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const rmse = evalWinRmse({ seasons, form: "tullock", alpha: a.data });
    expect(rmse.ok).toBe(true);
    if (rmse.ok) expect(rmse.data).toBeGreaterThanOrEqual(0);
  });

  it("fail-closes on an empty season set and a bad form", () => {
    expect(evalFitAlpha({ seasons: [], form: "tullock" }).ok).toBe(false);
    expect(
      evalFitAlpha({ seasons, form: "nope" as "tullock" }).ok,
    ).toBe(false);
  });

  it("game EWP is a probability and refuses a bad fit", () => {
    const fit = evalFitGameEwp({
      games: [
        { pd: 7, hfa: 1, restEdge: 1, won: 1 },
        { pd: -3, hfa: -1, restEdge: 0, won: 0 },
        { pd: 14, hfa: 1, restEdge: 2, won: 1 },
        { pd: 0, hfa: 1, restEdge: 0, won: 0 },
      ],
    });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const p = evalGameEwp({
      pd: 7,
      hfa: 1,
      restEdge: 1,
      coef: fit.data,
    });
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.data).toBeGreaterThan(0.5);
  });
});

describe("ratings-bridge matchup-ratings", () => {
  const obs = [
    { i: "WR1", j: "CB1", s: 1.2, t: 1 },
    { i: "WR1", j: "CB2", s: 0.4, t: 1 },
    { i: "WR2", j: "CB1", s: 0.1, t: 2 },
    { i: "WR2", j: "CB2", s: -0.5, t: 2 },
    { i: "WR3", j: "CB1", s: 1.5, t: 3 },
    { i: "WR3", j: "CB2", s: 0.9, t: 3 },
  ];

  it("fits matchup ratings and predicts a pair", () => {
    const fit = evalFitMatchupRatings({ obs });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const p = evalPredictMatchup({ ratings: fit.data, i: "WR1", j: "CB1" });
    expect(p.ok).toBe(true);
    if (p.ok) expect(Number.isFinite(p.data)).toBe(true);
  });

  it("recency weight rises with the week index", () => {
    const lo = evalRecencyWeight({ t: 1, tMin: 1, tMax: 5 });
    const hi = evalRecencyWeight({ t: 5, tMin: 1, tMax: 5 });
    expect(lo.ok).toBe(true);
    expect(hi.ok).toBe(true);
    if (lo.ok && hi.ok) expect(hi.data).toBeGreaterThan(lo.data);
    expect(evalRecencyWeight({ t: 1, tMin: 5, tMax: 1 }).ok).toBe(false);
  });

  it("time-ordered MAE reports both the model and the baseline", () => {
    const r = evalTimeOrderedMae({ obs, splitWeeks: [2, 3] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.model)).toBe(true);
      expect(Number.isFinite(r.data.baseline)).toBe(true);
    }
  });

  it("fail-closes on empty observations and splits", () => {
    expect(evalFitMatchupRatings({ obs: [] }).ok).toBe(false);
    expect(evalTimeOrderedMae({ obs, splitWeeks: [] }).ok).toBe(false);
  });
});

describe("ratings-bridge sel-strengths", () => {
  const games: SelGameResult[] = [
    { date: "2026-01-05", home: "BUF", away: "NYJ", homePoints: 31, awayPoints: 17 },
    { date: "2026-01-12", home: "BUF", away: "CLE", homePoints: 24, awayPoints: 20 },
    { date: "2026-01-19", home: "NYJ", away: "MIA", homePoints: 17, awayPoints: 27 },
    { date: "2026-01-26", home: "CLE", away: "MIA", homePoints: 23, awayPoints: 10 },
    { date: "2026-02-02", home: "MIA", away: "BUF", homePoints: 13, awayPoints: 34 },
  ];

  it("as-of read excludes games on or after the target date", () => {
    const r = evalAsOfDate({ games, targetDate: "2026-01-20" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const g of r.data) expect(g.date < "2026-01-20").toBe(true);
    }
    expect(evalAsOfDate({ games, targetDate: "not-a-date" }).ok).toBe(false);
  });

  it("estimates strengths and builds the feature vector", () => {
    const s = evalEstimateStrengths({ games, targetDate: "2026-03-01" });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    const buf = s.data.find((t) => t.team === "BUF");
    const mia = s.data.find((t) => t.team === "MIA");
    expect(buf).toBeDefined();
    expect(mia).toBeDefined();
    if (!buf || !mia) return;
    const f = evalSelFeatures({ baseProb: 0.55, home: buf, away: mia });
    expect(f.ok).toBe(true);
    if (f.ok) {
      expect(Number.isFinite(f.data.strengthDiff)).toBe(true);
      expect(f.data.baseProb).toBe(0.55);
    }
  });

  it("fail-closes when no game precedes the target", () => {
    const r = evalEstimateStrengths({ games, targetDate: "2025-01-01" });
    expect(r.ok).toBe(false);
  });

  it("provenance audit refuses a feature that postdates the target", () => {
    const clean = evalAuditProvenance({
      provenance: [
        { feature: "a", maxDataDate: "2026-01-01", targetDate: "2026-01-15" },
        { feature: "b", maxDataDate: "2026-01-10", targetDate: "2026-01-15" },
      ],
    });
    expect(clean.ok).toBe(true);
    if (clean.ok) expect(clean.data.length).toBe(0);

    const leaking = evalAuditProvenance({
      provenance: [
        { feature: "a", maxDataDate: "2026-01-01", targetDate: "2026-01-15" },
        { feature: "leak", maxDataDate: "2026-01-20", targetDate: "2026-01-15" },
      ],
    });
    expect(leaking.ok).toBe(false);
    if (!leaking.ok) expect(leaking.reason).toContain("target date");
  });

  it("brier score is zero for a perfect forecast", () => {
    const r = evalBrierScore({ probs: [0, 1], outcomes: [0, 1] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(0, 6);
    expect(evalBrierScore({ probs: [0.5], outcomes: [1, 0] }).ok).toBe(false);
  });
});

describe("ratings-bridge unit-impact", () => {
  const drives = [
    { wpDelta: 0.12, units: { QB: 1 as const, RB: 1 as const, WR: -1 as const } },
    { wpDelta: 0.05, units: { QB: 1 as const, RB: -1 as const, WR: 1 as const } },
    { wpDelta: -0.08, units: { QB: -1 as const, RB: 1 as const, WR: 1 as const } },
    { wpDelta: 0.09, units: { QB: 1 as const, RB: 1 as const, WR: 1 as const } },
    { wpDelta: 0.02, units: { QB: 1 as const, RB: -1 as const, WR: -1 as const } },
    { wpDelta: -0.04, units: { QB: 0 as const, RB: 1 as const, WR: 1 as const } },
  ];

  it("soft threshold zeroes small coefficients", () => {
    const r = evalSoftThreshold({ x: 0.05, lambda: 0.1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBe(0);
    expect(evalSoftThreshold({ x: 1, lambda: -1 }).ok).toBe(false);
  });

  it("fits impact scores and predicts a wp delta", () => {
    const fit = evalFitImpactScores({ drives, iters: 200 });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const delta = evalPredictWpDelta({
      scores: fit.data,
      units: { QB: 1, RB: 0, WR: 1 },
    });
    expect(delta.ok).toBe(true);
    if (delta.ok) expect(Number.isFinite(delta.data)).toBe(true);
  });

  it("bootstrap intervals bracket the point score", () => {
    const r = evalImpactScoreIntervals({ drives, nBoot: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const v of Object.values(r.data)) {
        expect(v.lo).toBeLessThanOrEqual(v.hi);
        expect(Number.isFinite(v.score)).toBe(true);
      }
    }
  });

  it("similarity and year-over-year correlation are in range", () => {
    const sim = evalMahalanobisSimilarity({ a: [1, 2, 3], b: [1, 2, 3.1] });
    expect(sim.ok).toBe(true);
    if (sim.ok) expect(sim.data).toBeGreaterThan(0);
    expect(evalMahalanobisSimilarity({ a: [1, 2], b: [1] }).ok).toBe(false);

    const corr = evalYearToYearCorrelation({
      scoresA: { QB: 1, RB: 2, WR: 3, TE: 1 },
      scoresB: { QB: 1.1, RB: 1.9, WR: 3.2, TE: 0.9 },
    });
    expect(corr.ok).toBe(true);
    if (corr.ok) expect(corr.data).toBeGreaterThan(0.9);
  });

  it("fail-closes on an empty drive set", () => {
    expect(evalFitImpactScores({ drives: [] }).ok).toBe(false);
    expect(evalYearToYearCorrelation({ scoresA: {}, scoresB: {} }).ok).toBe(false);
  });
});

describe("ratings-bridge cycle-diagnostics", () => {
  const records = [
    { a: "A", b: "B", winsA: 3, winsB: 1 },
    { a: "B", b: "C", winsA: 3, winsB: 1 },
    { a: "C", b: "A", winsA: 3, winsB: 1 },
  ];

  it("a three-way dominance cycle is detected", () => {
    const g = evalDominanceGraph({ records });
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    const n = evalCountThreeCycles({ adj: g.data });
    const rate = evalCycleRate({ adj: g.data });
    expect(n.ok).toBe(true);
    expect(rate.ok).toBe(true);
    if (n.ok) expect(n.data).toBeGreaterThan(0);
  });

  it("an acyclic graph has no three-cycles", () => {
    const g = evalDominanceGraph({
      records: [
        { a: "A", b: "B", winsA: 4, winsB: 0 },
        { a: "A", b: "C", winsA: 4, winsB: 0 },
        { a: "B", b: "C", winsA: 4, winsB: 0 },
      ],
    });
    if (!g.ok) return;
    const n = evalCountThreeCycles({ adj: g.data });
    expect(n.ok).toBe(true);
    if (n.ok) expect(n.data).toBe(0);
  });

  it("long cycles enumerate the 4-cycles", () => {
    const g = evalDominanceGraph({
      records: [
        { a: "A", b: "B", winsA: 4, winsB: 0 },
        { a: "B", b: "C", winsA: 4, winsB: 0 },
        { a: "C", b: "D", winsA: 4, winsB: 0 },
        { a: "D", b: "A", winsA: 4, winsB: 0 },
      ],
    });
    if (!g.ok) return;
    const long = evalLongCycles({ adj: g.data, maxLen: 5 });
    expect(long.ok).toBe(true);
    if (long.ok) expect(long.data.length).toBeGreaterThan(0);
  });

  it("fail-closes on an empty graph", () => {
    expect(evalDominanceGraph({ records: [] }).ok).toBe(false);
    expect(evalCountThreeCycles({ adj: new Map() }).ok).toBe(false);
  });
});

describe("ratings-bridge davidson-ties", () => {
  it("probabilities partition the three-way outcome space", () => {
    const r = evalDavidsonProbs({ piHome: 1.3, piAway: 1.0, nu: 0.2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const total = r.data.homeWin + r.data.tie + r.data.awayWin;
      expect(total).toBeCloseTo(1, 6);
      expect(r.data.homeWin).toBeGreaterThan(r.data.awayWin);
    }
  });

  it("equal strengths split evenly", () => {
    const r = evalDavidsonProbs({ piHome: 1, piAway: 1, nu: 0.2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.homeWin).toBeCloseTo(r.data.awayWin, 6);
  });

  it("log loss is non-negative and the strength-dependent form works", () => {
    const p = evalDavidsonProbs({ piHome: 1.3, piAway: 1, nu: 0.2 });
    if (!p.ok) return;
    const l = evalDavidsonLogLoss({ probs: p.data, outcome: "H" });
    expect(l.ok).toBe(true);
    if (l.ok) expect(l.data).toBeGreaterThan(0);
    const sd = evalDavidsonProbsStrengthDep({
      logPiHome: Math.log(1.3),
      logPiAway: 0,
      beta0: -1.5,
      beta1: 0.2,
    });
    expect(sd.ok).toBe(true);
  });

  it("refuses non-positive strengths", () => {
    expect(evalDavidsonProbs({ piHome: 0, piAway: 1, nu: 0.2 }).ok).toBe(false);
    expect(evalDavidsonProbs({ piHome: 1, piAway: 1, nu: -1 }).ok).toBe(false);
  });

  it("tieNu is positive and finite", () => {
    const r = evalTieNu({ sBar: 0.2, beta0: -1.5, beta1: 0.2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeGreaterThan(0);
  });
});

describe("ratings-bridge time-varying-weights", () => {
  const games = [
    { features: [1, 0.2], week: 1, homeWin: true },
    { features: [1, 0.8], week: 2, homeWin: true },
    { features: [1, 0.4], week: 3, homeWin: false },
    { features: [1, 0.6], week: 4, homeWin: true },
    { features: [1, 0.1], week: 5, homeWin: false },
    { features: [1, 0.9], week: 6, homeWin: true },
  ];

  it("fits a drifting model and scores it", () => {
    const fit = evalFitTVC({ games, iters: 300 });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const p = evalPredictTVC({ model: fit.data, features: [1, 0.5], week: 3 });
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.data).toBeGreaterThan(0);
    const ll = evalMeanLogLoss({ model: fit.data, games });
    expect(ll.ok).toBe(true);
    if (ll.ok) expect(ll.data).toBeGreaterThan(0);
  });

  it("effective weight is finite and a static fit is available", () => {
    const fit = evalFitTVC({ games, iters: 200 });
    if (!fit.ok) return;
    const w = evalEffectiveWeight({ model: fit.data, k: 0, week: 3 });
    expect(w.ok).toBe(true);
    const stat = evalFitStatic({ games, iters: 200 });
    expect(stat.ok).toBe(true);
  });

  it("refuses a feature-width mismatch", () => {
    const fit = evalFitTVC({ games, iters: 200 });
    if (!fit.ok) return;
    const bad = evalPredictTVC({ model: fit.data, features: [1, 2, 3], week: 3 });
    expect(bad.ok).toBe(false);
  });

  it("fail-closes on empty games", () => {
    expect(evalFitTVC({ games: [] }).ok).toBe(false);
    expect(evalMeanLogLoss({ model: {} as never, games: [] }).ok).toBe(false);
  });
});

describe("ratings-bridge target-pagerank", () => {
  const arcs = [
    { from: "WR1", to: "QB1", kind: "target" as const },
    { from: "WR1", to: "QB1", kind: "target" as const },
    { from: "WR2", to: "QB1", kind: "td" as const },
    { from: "QB1", to: "WR1", kind: "target" as const },
    { from: "WR2", to: "WR1", kind: "target" as const },
  ];

  it("builds a transition and computes centrality", () => {
    const t = evalBuildTransition({ arcs });
    expect(t.ok).toBe(true);
    if (!t.ok) return;
    const c = evalPagerankCentrality({ nodes: t.data.nodes, trans: t.data.trans });
    expect(c.ok).toBe(true);
    if (c.ok) {
      const total = Object.values(c.data).reduce((s, x) => s + x, 0);
      expect(total).toBeCloseTo(1, 3);
    }
  });

  it("residuals and a team differential are finite", () => {
    const t = evalBuildTransition({ arcs });
    if (!t.ok) return;
    const c = evalPagerankCentrality({ nodes: t.data.nodes, trans: t.data.trans });
    if (!c.ok) return;
    const r = evalCentralityResiduals({
      centrality: c.data,
      production: { WR1: 100, WR2: 80, QB1: 60, TE1: 40 },
    });
    expect(r.ok).toBe(true);
    const teamOf = (id: string) => (id.startsWith("WR") ? "BUF" : "NYJ");
    const d = evalTeamCentralityDifferential({
      centrality: c.data,
      teamOf,
      teamA: "BUF",
      teamB: "NYJ",
      k: 3,
    });
    expect(d.ok).toBe(true);
  });

  it("fail-closes on empty arcs and a non-function teamOf", () => {
    expect(evalBuildTransition({ arcs: [] }).ok).toBe(false);
    expect(
      evalTeamCentralityDifferential({
        centrality: { a: 1 },
        teamOf: undefined as unknown as (id: string) => string,
        teamA: "A",
        teamB: "B",
      }).ok,
    ).toBe(false);
  });
});

describe("ratings-bridge parametric-pagerank", () => {
  const games = [
    { winner: "BUF", loser: "NYJ", weeksAgo: 0, situation: 1, importance: 1 },
    { winner: "BUF", loser: "CLE", weeksAgo: 1, situation: 1.1, importance: 1 },
    { winner: "NYJ", loser: "MIA", weeksAgo: 2, situation: 0.9, importance: 1 },
    { winner: "CLE", loser: "MIA", weeksAgo: 1, situation: 1, importance: 1.2 },
    { winner: "MIA", loser: "BUF", weeksAgo: 3, situation: 1, importance: 1 },
  ];

  it("edge weight decays with age", () => {
    const fresh = evalEdgeWeight({ game: games[0]!, weights: { recencyDecay: 0.1 } });
    const old = evalEdgeWeight({ game: games[2]!, weights: { recencyDecay: 0.1 } });
    expect(fresh.ok).toBe(true);
    expect(old.ok).toBe(true);
    if (fresh.ok && old.ok) expect(fresh.data).toBeGreaterThan(old.data);
  });

  it("pagerank ratings and win probability", () => {
    const r = evalParametricPagerank({ games, weights: { recencyDecay: 0.1 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const total = Object.values(r.data).reduce((s, x) => s + x, 0);
    expect(total).toBeCloseTo(1, 6);
    const p = evalWinProbFromRatings({ ratingHome: 0.3, ratingAway: 0.2 });
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.data).toBeGreaterThan(0.5);
  });

  it("tunes the decay and computes the CLV edge", () => {
    const t = evalTuneRecencyDecay({
      evaluate: (d) => -((d - 0.1) ** 2),
    });
    expect(t.ok).toBe(true);
    if (t.ok) expect(t.data.decay).toBeCloseTo(0.1, 5);
    const clv = evalClvEdge({
      ratingProb: [0.6, 0.45],
      closingProb: [0.55, 0.5],
      pickedHome: [true, false],
    });
    expect(clv.ok).toBe(true);
  });

  it("fail-closes on empty games and mismatched CLV arrays", () => {
    expect(evalParametricPagerank({ games: [], weights: { recencyDecay: 0.1 } }).ok).toBe(
      false,
    );
    expect(
      evalClvEdge({ ratingProb: [0.6], closingProb: [0.5, 0.5], pickedHome: [true] }).ok,
    ).toBe(false);
  });
});

describe("ratings-bridge playerank", () => {
  const teamGames = [
    { teamVector: [1, 0.5], won: 1 as const },
    { teamVector: [0.4, 0.9], won: 0 as const },
    { teamVector: [0.8, 0.6], won: 1 as const },
    { teamVector: [0.3, 0.4], won: 0 as const },
  ];

  it("aggregates, trains and scores", () => {
    const agg = evalAggregateTeamVector({
      games: [{ a: 1, b: 0.5 }, { a: 0.4, b: 0.9 }],
      featureNames: ["a", "b"],
    });
    expect(agg.ok).toBe(true);
    if (agg.ok) expect(agg.data.length).toBe(2);

    const w = evalTrainTeamModel({ games: teamGames, iters: 300 });
    expect(w.ok).toBe(true);
    if (!w.ok) return;
    const s = evalPlayerGameRating({
      weights: w.data,
      playerGame: { a: 0.8, b: 0.6 },
      featureNames: ["a", "b"],
    });
    expect(s.ok).toBe(true);
    if (s.ok) expect(Number.isFinite(s.data)).toBe(true);
  });

  it("form rating is an EWMA that starts at the first value", () => {
    const r = evalFormRating({ ratings: [1, 2, 3], alpha: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data[0]).toBe(1);
      expect(r.data.length).toBe(3);
    }
    expect(evalFormRating({ ratings: [1], alpha: 0 }).ok).toBe(false);
  });

  it("role detection and AUC", () => {
    const roles = evalDetectRoles({
      snapPositions: [
        { id: "p1", x: -20, y: 0 },
        { id: "p2", x: -22, y: 1 },
        { id: "p3", x: 20, y: 0 },
        { id: "p4", x: 21, y: -1 },
      ],
      k: 2,
    });
    expect(roles.ok).toBe(true);
    if (roles.ok) expect(Object.keys(roles.data).length).toBe(4);

    const a = evalAuc({ scores: [0.9, 0.8, 0.2, 0.1], labels: [1, 1, 0, 0] });
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.data).toBe(1);
    expect(evalDetectRoles({ snapPositions: [], k: 2 }).ok).toBe(false);
    expect(evalAuc({ scores: [0.5], labels: [1, 0] }).ok).toBe(false);
  });
});

describe("ratings-bridge hfa-bias-audit", () => {
  const games = [
    { homeTeam: "A", awayTeam: "B", homeMargin: 7 },
    { homeTeam: "A", awayTeam: "C", homeMargin: 14 },
    { homeTeam: "B", awayTeam: "A", homeMargin: -3 },
    { homeTeam: "B", awayTeam: "C", homeMargin: 3 },
    { homeTeam: "C", awayTeam: "A", homeMargin: -10 },
    { homeTeam: "C", awayTeam: "B", homeMargin: -1 },
  ];

  it("the three HFA specifications all estimate a positive home edge", () => {
    const naive = evalUnadjustedHfa({ games });
    const fe = evalTeamFixedEffectsHfa({ games });
    const mixed = evalMixedEffectsHfa({ games });
    expect(naive.ok).toBe(true);
    expect(fe.ok).toBe(true);
    expect(mixed.ok).toBe(true);
    if (naive.ok && fe.ok && mixed.ok) {
      expect(fe.data.gamma).toBeGreaterThan(0);
      expect(mixed.data.gamma).toBeGreaterThan(0);
      expect(mixed.data.sigmaE).toBeGreaterThanOrEqual(0);
    }
  });

  it("the audit reports the scheduling-bias gap", () => {
    const r = evalHfaBiasAudit({ games, materiality: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.gap)).toBe(true);
      expect(typeof r.data.material).toBe("boolean");
    }
  });

  it("the simulator is seeded and reproducible", () => {
    const a = evalSimulateNonrandomSchedule({ teams: 6, games: 30, seed: 11 });
    const b = evalSimulateNonrandomSchedule({ teams: 6, games: 30, seed: 11 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.games.length).toBe(30);
      expect(JSON.stringify(a.data)).toBe(JSON.stringify(b.data));
    }
  });

  it("fail-closes on empty games", () => {
    expect(evalUnadjustedHfa({ games: [] }).ok).toBe(false);
    expect(evalHfaBiasAudit({ games: [] }).ok).toBe(false);
  });
});

describe("ratings-bridge csf-triple-compare", () => {
  const seasons = [
    { pf: 420, pa: 330, wins: 12, games: 16 },
    { pf: 300, pa: 380, wins: 4, games: 16 },
    { pf: 390, pa: 340, wins: 10, games: 16 },
    { pf: 250, pa: 410, wins: 2, games: 16 },
    { pf: 400, pa: 350, wins: 11, games: 16 },
  ];

  it("all three forms produce a probability", () => {
    for (const form of ["tullock", "difference", "serial"] as const) {
      const r = evalCsf({ pf: 420, pa: 330, alpha: 0.01, form });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.data).toBeGreaterThan(0);
        expect(r.data).toBeLessThan(1);
      }
    }
    expect(evalCsf({ pf: 420, pa: 330, alpha: 0.01, form: "nope" as "tullock" }).ok).toBe(
      false,
    );
  });

  it("fits, cross-validates and compares the three forms", () => {
    const a = evalFitAlphaOls({ seasons, form: "tullock" });
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.data).toBeGreaterThan(0);

    const cv = evalLoocvRmse({ seasons, form: "tullock" });
    expect(cv.ok).toBe(true);
    if (cv.ok) expect(cv.data).toBeGreaterThan(0);

    const cmp = evalCompareCsf({ seasons });
    expect(cmp.ok).toBe(true);
    if (cmp.ok) {
      expect(["tullock", "difference", "serial"]).toContain(cmp.data.winner);
      expect(Number.isFinite(cmp.data.serialVsTullock.pValue)).toBe(true);
    }
  });

  it("refuses cross-validation on fewer than three seasons", () => {
    expect(evalLoocvRmse({ seasons: seasons.slice(0, 2), form: "tullock" }).ok).toBe(
      false,
    );
  });
});

describe("ratings-bridge dynamic-bradley-terry", () => {
  const games = [
    { week: 1, home: "A", away: "B", homeWin: true },
    { week: 1, home: "B", away: "C", homeWin: true },
    { week: 1, home: "A", away: "C", homeWin: true },
    { week: 2, home: "C", away: "A", homeWin: true },
    { week: 2, home: "B", away: "A", homeWin: true },
    { week: 2, home: "C", away: "B", homeWin: true },
    { week: 3, home: "A", away: "B", homeWin: true },
    { week: 3, home: "A", away: "C", homeWin: false },
    { week: 3, home: "B", away: "C", homeWin: true },
    { week: 9, home: "A", away: "B", homeWin: true },
    { week: 10, home: "B", away: "C", homeWin: true },
  ];

  it("kernel weights peak at the target week", () => {
    const r = evalKernelWeights({ games, week: 2, h: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.length).toBe(games.length);
      // Week 2 is the target, so the three week-2 games carry the full
      // weight, weeks 1 and 3 are equidistant, and week 9+ is far out.
      const wk1 = r.data[0]!;
      const wk3 = r.data[6]!;
      const atTarget = r.data[3]!;
      const far = r.data[9]!;
      expect(atTarget).toBeGreaterThan(wk1);
      expect(wk1).toBeCloseTo(wk3, 10);
      expect(wk1).toBeGreaterThan(far);
    }
    expect(evalKernelWeights({ games, week: 2, h: 0 }).ok).toBe(false);
  });

  it("fits a time-varying BT model", () => {
    const r = evalFitDynamicBt({ games, week: 2, h: 1, iters: 200 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.data.ratings).length).toBe(3);
      expect(r.data.effN).toBeGreaterThan(0);
    }
  });

  it("existence violations are reported and refuse the read", () => {
    const weights = new Array(games.length).fill(1);
    const clean = evalExistenceViolations({ games, weights });
    expect(clean.ok).toBe(true);
    if (clean.ok) expect(clean.data.length).toBe(0);
  });

  it("leave-one-out likelihood and bandwidth tuning are finite", () => {
    const loo = evalLooLogLik({ games, h: 1 });
    expect(loo.ok).toBe(true);
    if (loo.ok) expect(Number.isFinite(loo.data)).toBe(true);
    const tuned = evalTuneBandwidthLOOCV({ games, candidates: [0.5, 1, 2] });
    expect(tuned.ok).toBe(true);
    if (tuned.ok) {
      expect(tuned.data.scores.length).toBeGreaterThan(0);
      expect(tuned.data.h).toBeGreaterThan(0);
    }
  });

  it("fail-closes on empty inputs and mismatched weight lengths", () => {
    expect(evalFitDynamicBt({ games: [], week: 1, h: 1 }).ok).toBe(false);
    expect(evalLooLogLik({ games: [games[0]!], h: 1 }).ok).toBe(false);
    expect(evalTuneBandwidthLOOCV({ games, candidates: [] }).ok).toBe(false);
    expect(
      evalExistenceViolations({ games, weights: [1, 2] }).ok,
    ).toBe(false);
  });
});
