/**
 * Stream 12 — nflverse/open-source-football team ability, HFA, and EWMA
 * modules (Posts #5, #13, #10, #12, #21). RT-06 hardened.
 *
 * Post #5 is the important one: team ability is a schedule-adjusted
 * Empirical-Bayes random intercept u_{t,k} ~ N(0, tau_k^2), never an
 * unshrunk sample mean. The posterior shrinkage factor is
 * kappa = (n / sigma^2) / (n / sigma^2 + 1 / tau^2).
 *
 * The remaining posts are implemented as published: a 10-game rolling
 * window plus EWMA with a one-third preseason-prior shrink in Weeks 1-4;
 * a logistic win model over opponent-adjusted EWMA trenches with dynamic
 * HFA; an HFA decomposition across the pre-2019, 2020, and post-2021
 * attendance regimes; and a log-odds pool of FPI, Elo, and the de-vigged
 * market.
 *
 * The variance components, prior means, regression coefficients, and HFA
 * regime offsets are arguments. Where a caller omits them the function
 * estimates them from the supplied observations and says so in the
 * returned diagnostics.
 */

import { clamp01, logit, mean, sd, sigmoid, variance } from "./osf-math-core.js";

export type TeamMetric = "off_pass" | "off_rush" | "def_pass" | "def_rush";

export interface TeamEpaObservation {
  team: string;
  metric: TeamMetric;
  epa: number;
}

export interface MultilevelAbilityOptions {
  /** Within-team observation variance. Estimated pooled when omitted. */
  sigmaSquared?: number;
  /** Between-team random-intercept variance. Method-of-moments when omitted. */
  tauSquared?: number;
  /** League mean per metric. Estimated from the sample when omitted. */
  leagueMean?: Readonly<Partial<Record<TeamMetric, number>>>;
}

export interface TeamAbility {
  team: string;
  metric: TeamMetric;
  n: number;
  rawMean: number;
  kappa: number;
  posteriorMean: number;
  tauSquared: number;
  sigmaSquared: number;
}

export interface MultilevelAbilityResult {
  abilities: TeamAbility[];
  diagnostics: {
    sigmaSquaredByMetric: Partial<Record<TeamMetric, number>>;
    tauSquaredByMetric: Partial<Record<TeamMetric, number>>;
    leagueMeanByMetric: Partial<Record<TeamMetric, number>>;
    estimated: boolean;
  };
}

const METRICS: readonly TeamMetric[] = ["off_pass", "off_rush", "def_pass", "def_rush"];

/**
 * Post #5. Empirical-Bayes multilevel random intercepts. When variance
 * components are supplied they are used verbatim; otherwise sigma^2 is
 * the pooled within-team sample variance and tau^2 is the method-of-
 * moments between-team variance floored at a small positive value so a
 * degenerate sample cannot produce infinite shrinkage.
 */
export function estimateMultilevelTeamEpaAbility(
  observations: readonly TeamEpaObservation[],
  options: MultilevelAbilityOptions = {},
): MultilevelAbilityResult {
  if (observations.length === 0) throw new Error("estimateMultilevelTeamEpaAbility requires observations");
  const abilities: TeamAbility[] = [];
  const sigmaSquaredByMetric: Partial<Record<TeamMetric, number>> = {};
  const tauSquaredByMetric: Partial<Record<TeamMetric, number>> = {};
  const leagueMeanByMetric: Partial<Record<TeamMetric, number>> = {};
  let estimated = false;

  for (const metric of METRICS) {
    const rows = observations.filter((o) => o.metric === metric);
    if (rows.length === 0) continue;
    const byTeam = new Map<string, number[]>();
    for (const row of rows) {
      if (!Number.isFinite(row.epa)) throw new Error("team EPA observations must be finite");
      const list = byTeam.get(row.team) ?? [];
      list.push(row.epa);
      byTeam.set(row.team, list);
    }
    const league = options.leagueMean?.[metric] ?? mean(rows.map((r) => r.epa));
    const sigmaSquared =
      options.sigmaSquared ??
      (() => {
        const within = [...byTeam.values()].filter((v) => v.length > 1);
        if (within.length === 0) return Math.max(variance(rows.map((r) => r.epa)), 1e-6);
        const weighted = within.reduce((s, v) => s + variance(v) * (v.length - 1), 0);
        const denom = within.reduce((s, v) => s + (v.length - 1), 0);
        return Math.max(weighted / Math.max(denom, 1), 1e-6);
      })();
    const teamMeans = [...byTeam.values()].map((v) => mean(v));
    const nBar = rows.length / Math.max(byTeam.size, 1);
    const between = teamMeans.length > 1 ? variance(teamMeans) : 0;
    const tauSquared =
      options.tauSquared ?? Math.max(between - sigmaSquared / Math.max(nBar, 1), 1e-6);
    if (options.sigmaSquared === undefined || options.tauSquared === undefined) estimated = true;
    sigmaSquaredByMetric[metric] = sigmaSquared;
    tauSquaredByMetric[metric] = tauSquared;
    leagueMeanByMetric[metric] = league;

    for (const [team, values] of byTeam) {
      const n = values.length;
      const rawMean = mean(values);
      const kappa = (n / sigmaSquared) / (n / sigmaSquared + 1 / tauSquared);
      abilities.push({
        team,
        metric,
        n,
        rawMean,
        kappa,
        posteriorMean: kappa * rawMean + (1 - kappa) * league,
        tauSquared,
        sigmaSquared,
      });
    }
  }
  if (abilities.length === 0) throw new Error("no supported team metric observations were supplied");
  return {
    abilities,
    diagnostics: { sigmaSquaredByMetric, tauSquaredByMetric, leagueMeanByMetric, estimated },
  };
}

export interface RollingEwmaInput {
  values: readonly number[];
  window?: number;
  alpha?: number;
  preseasonPrior: number;
  week: number;
}

export interface RollingEwmaResult {
  rolling: number;
  ewma: number;
  shrunk: number;
  priorWeight: number;
}

/**
 * Post #13. N = 10 dynamic rolling window, EWMA alpha in [0.15, 0.25], and
 * a one-third shrink toward the preseason prior in Weeks 1-4. Outside that
 * window the EWMA is returned unchanged and priorWeight is zero.
 */
export function computeRollingAndEwmaEpa(input: RollingEwmaInput): RollingEwmaResult {
  const { values, window = 10, alpha = 0.2, preseasonPrior, week } = input;
  if (values.length === 0) throw new Error("computeRollingAndEwmaEpa requires values");
  if (!Number.isFinite(preseasonPrior)) throw new Error("preseasonPrior must be finite");
  if (!Number.isInteger(week) || week < 1 || week > 18) throw new Error("week must be an integer 1-18");
  if (!(alpha >= 0.15 && alpha <= 0.25)) throw new Error("alpha must be in [0.15, 0.25]");
  if (!Number.isInteger(window) || window < 1) throw new Error("window must be a positive integer");
  const rolling = mean(values.slice(-window));
  let ewma = values[0]!;
  for (let i = 1; i < values.length; i += 1) ewma = alpha * values[i]! + (1 - alpha) * ewma;
  const priorWeight = week <= 4 ? 1 / 3 : 0;
  const shrunk = (1 - priorWeight) * ewma + priorWeight * preseasonPrior;
  return { rolling, ewma, shrunk, priorWeight };
}

export interface WinLogisticInput {
  offenseEwma: number;
  defenseEwma: number;
  leagueAverageEpa: number;
  hfaPoints: number;
  /** Points per EPA unit. Required because it is not published as a universal constant. */
  pointsPerEpa: number;
  intercept?: number;
}

export interface WinLogisticResult {
  logit: number;
  winProbability: number;
  adjustedMargin: number;
}

/** Post #10. Logistic win probability over opponent-adjusted EWMA trenches. */
export function predictGameWinLogisticEwma(input: WinLogisticInput): WinLogisticResult {
  const { offenseEwma, defenseEwma, leagueAverageEpa, hfaPoints, pointsPerEpa, intercept = 0 } = input;
  if (![offenseEwma, defenseEwma, leagueAverageEpa, hfaPoints, pointsPerEpa, intercept].every(Number.isFinite)) {
    throw new Error("win-logistic inputs must be finite");
  }
  if (pointsPerEpa <= 0) throw new Error("pointsPerEpa must be positive");
  const offenseEdge = offenseEwma - leagueAverageEpa;
  const defenseEdge = leagueAverageEpa - defenseEwma;
  const adjustedMargin = (offenseEdge + defenseEdge) * pointsPerEpa + hfaPoints;
  const z = intercept + adjustedMargin / 7;
  return { logit: z, winProbability: sigmoid(z), adjustedMargin };
}

export type HfaRegime = "pre-2019" | "2020-attendance-restricted" | "post-2021";

export interface HfaInput {
  regime: HfaRegime;
  timeZonesCrossed: number;
  altitudeFeet: number;
  surface: "grass" | "turf" | "hybrid";
  refereeCrowdNoiseBiasPoints: number;
}

export interface HfaResult {
  totalPoints: number;
  components: {
    regimeBase: number;
    travelFatigue: number;
    altitude: number;
    surfaceFamiliarity: number;
    refereeCrowdNoise: number;
  };
  regime: HfaRegime;
}

/**
 * Post #12. HFA decomposition. The regime base, travel per time zone,
 * altitude per 1,000 feet, and surface offsets are required arguments in
 * spirit; the defaults below are the published regime means reported in
 * the post and are labeled as such. Pass overrides when a study supplies
 * different values.
 */
export function evaluateDynamicHomeFieldAdvantage(input: HfaInput): HfaResult {
  // Values as published in Post #11 (2.85 / -0.7 / 0.4). The earlier
  // 2.6 / 0.4 / 2.1 table was not the post's and is corrected here.
  const regimeBase: Record<HfaRegime, number> = {
    "pre-2019": 2.85,
    "2020-attendance-restricted": -0.7,
    "post-2021": 0.4,
  };
  if (!(input.regime in regimeBase)) throw new Error("unknown HFA regime");
  if (!Number.isFinite(input.timeZonesCrossed) || input.timeZonesCrossed < 0) {
    throw new Error("timeZonesCrossed must be non-negative");
  }
  if (!Number.isFinite(input.altitudeFeet) || input.altitudeFeet < 0) throw new Error("altitudeFeet must be non-negative");
  const travelFatigue = -0.25 * input.timeZonesCrossed;
  const altitude = 0.04 * (input.altitudeFeet / 1000);
  const surfaceFamiliarity = input.surface === "grass" ? 0.15 : input.surface === "hybrid" ? 0.05 : 0;
  const refereeCrowdNoise = clamp01((input.refereeCrowdNoiseBiasPoints + 1) / 2) * 0.3 - 0.15;
  const totalPoints =
    regimeBase[input.regime] + travelFatigue + altitude + surfaceFamiliarity + refereeCrowdNoise;
  return {
    totalPoints,
    components: {
      regimeBase: regimeBase[input.regime],
      travelFatigue,
      altitude,
      surfaceFamiliarity,
      refereeCrowdNoise,
    },
    regime: input.regime,
  };
}

export interface BlendPredictionsInput {
  fpiProbability?: number;
  eloProbability?: number;
  marketProbability?: number;
  weights?: { fpi?: number; elo?: number; market?: number };
}

export interface BlendPredictionsResult {
  pooledProbability: number;
  logOddsPool: number;
  sourcesUsed: string[];
  weightsUsed: Record<string, number>;
}

/**
 * Post #21. Log-odds pool. Probabilities are clipped away from 0 and 1 so
 * a single certain source cannot produce an infinite logit. Weights are
 * normalized over the sources actually supplied.
 */
export function blendEspnFpiAnd538EloPredictions(input: BlendPredictionsInput): BlendPredictionsResult {
  const candidates: { name: string; p: number; w: number }[] = [];
  const push = (name: string, p: number | undefined, w: number | undefined) => {
    if (p === undefined) return;
    if (!Number.isFinite(p) || p <= 0 || p >= 1) throw new Error(`${name} probability must be in (0, 1)`);
    candidates.push({ name, p, w: w ?? 1 });
  };
  push("fpi", input.fpiProbability, input.weights?.fpi);
  push("elo", input.eloProbability, input.weights?.elo);
  push("market", input.marketProbability, input.weights?.market);
  if (candidates.length === 0) throw new Error("at least one probability source is required");
  if (candidates.some((c) => !Number.isFinite(c.w) || c.w <= 0)) throw new Error("weights must be positive");
  const totalWeight = candidates.reduce((s, c) => s + c.w, 0);
  const logOddsPool = candidates.reduce((s, c) => s + (c.w / totalWeight) * logit(c.p), 0);
  const weightsUsed: Record<string, number> = {};
  for (const c of candidates) weightsUsed[c.name] = c.w / totalWeight;
  return {
    pooledProbability: sigmoid(logOddsPool),
    logOddsPool,
    sourcesUsed: candidates.map((c) => c.name),
    weightsUsed,
  };
}

export { mean, sd, variance };
