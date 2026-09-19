/**
 * Signal Registry Definitions for GSE.
 *
 * This file is the single source of truth for all independent prediction signals.
 * Each signal declares its identity, dependencies, rights gate, output contract,
 * activation status, owner, kill lines, and pure execution logic.
 *
 * ACTIVE signals must produce byte-identical results to the legacy procedural
 * branches under MODEL_VERSION v5.2.7.
 */

import type { SignalDefinition } from "@sports/types";
import {
  tryKalshiFairValue,
  tryEspnPowerIndexFairValue,
  tryClubEloFairValue,
  tryPolymarketIndependentFairValue,
  tryMlbStandingsFairValue,
  tryNflEpaFairValue,
  getOrFitEloRatings,
  type EloRatingsCache,
} from "./build-independent-fair-values.js";
import { isEspnPowerIndexCleared } from "./independent-source-rights.js";
import {
  getTeamScoringRecords,
  getLeagueAverageScored,
  isIngestible,
} from "@sports/data-ingestion";
import {
  isPoissonValidSport,
  poissonIndependentFairValue,
  isDixonColesValidSport,
  dixonColesIndependentFairValue,
  skellamCoverFairValue,
  SKELLAM_COVER_SOURCE,
  eloFairValueFromRatings,
  calculateWindElasticity,
  evaluateCoachingTendencies,
  analyzeInjuryTrajectory,
  evaluateRedZoneTeLeverage,
  evaluateOffensiveLineTrench,
  evaluateRefereeCrewTendencies,
  evaluateCircadianTravelFatigue,
  evaluateContractMilestones,
  evaluateWr1OutRedistribution,
} from "@sports/prediction-engine";

export const DEFAULT_KILL_LINE = {
  maxBrierScoreVsMarket: 0.250,
  minSettledSample: 100,
  maxDivergenceZScore: 3.0,
  maxAgeMinutes: 120,
} as const;

/**
 * Shared Elo ratings cache for the process cycle.
 */
export const sharedEloCache: EloRatingsCache = new Map();

/**
 * 1) Prefetched Exchange Fair Value
 */
export const prefetchedExchangeSignal: SignalDefinition = {
  id: "prefetched_exchange",
  label: "Caller-supplied / Pre-fetched Exchange Fair Value",
  category: "ODDS",
  family: "MARKET",
  outputKind: "2WAY_PROBABILITY",
  validSports: [],
  owner: "core-pipeline",
  dataDependencies: ["input.prefetched"],
  activationStatus: "ACTIVE",
  trustWeight: 1.0,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    // Handled directly when prefetched rows are passed
    return null;
  },
};

/**
 * 2) Live Kalshi Exchange
 */
export const kalshiLiveSignal: SignalDefinition = {
  id: "kalshi",
  label: "Kalshi Exchange Real-time Fair Value",
  category: "ODDS",
  family: "MARKET",
  outputKind: "2WAY_PROBABILITY",
  validSports: [
    "americanfootball_nfl",
    "baseball_mlb",
    "basketball_nba",
    "icehockey_nhl",
  ],
  owner: "market-data",
  dataDependencies: ["kalshi_api"],
  activationStatus: "ACTIVE",
  trustWeight: 1.0,
  killLine: {
    maxBrierScoreVsMarket: 0.240,
    minSettledSample: 150,
    maxDivergenceZScore: 2.8,
    maxAgeMinutes: 30,
  },
  isRightsCleared: () => isIngestible("kalshi"),
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.skipNetworkIndependents) return null;
    if (ctx.prefetched?.some((f) => f.source === "kalshi")) return null;
    const fv = await tryKalshiFairValue({
      sportKey: ctx.sportKey,
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      commenceTime: ctx.commenceTime,
      now: ctx.now,
      env: ctx.env as NodeJS.ProcessEnv,
    });
    if (!fv || fv.homeFairProb == null || fv.awayFairProb == null) return null;
    return {
      homeFairProb: fv.homeFairProb,
      awayFairProb: fv.awayFairProb,
      capturedAt: fv.capturedAt ?? ctx.now().toISOString(),
    };
  },
};

/**
 * 3) ESPN Football Power Index (FPI) Logistic
 */
export const espnPowerIndexSignal: SignalDefinition = {
  id: "espn_powerindex",
  label: "ESPN Football Power Index (FPI) Logistic",
  category: "RATINGS",
  family: "EFFICIENCY",
  outputKind: "2WAY_PROBABILITY",
  validSports: [
    "americanfootball_nfl",
    "americanfootball_ncaaf",
    "basketball_nba",
    "basketball_ncaab",
  ],
  owner: "quant-modeling",
  dataDependencies: ["espn_fpi_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.8,
  killLine: {
    maxBrierScoreVsMarket: 0.245,
    minSettledSample: 100,
    maxDivergenceZScore: 3.0,
    maxAgeMinutes: 360,
  },
  isRightsCleared: (env) => isEspnPowerIndexCleared(env as NodeJS.ProcessEnv),
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.skipNetworkIndependents) return null;
    if (!isEspnPowerIndexCleared(ctx.env as NodeJS.ProcessEnv)) return null;
    const fv = await tryEspnPowerIndexFairValue({
      sportKey: ctx.sportKey,
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      commenceTime: ctx.commenceTime,
      now: ctx.now,
      env: ctx.env as NodeJS.ProcessEnv,
    });
    if (!fv || fv.homeFairProb == null || fv.awayFairProb == null) return null;
    return {
      homeFairProb: fv.homeFairProb,
      awayFairProb: fv.awayFairProb,
      capturedAt: fv.capturedAt ?? ctx.now().toISOString(),
    };
  },
};

/**
 * 4) ClubElo Soccer Ratings
 */
export const clubEloSignal: SignalDefinition = {
  id: "clubelo",
  label: "ClubElo European Football Ratings",
  category: "RATINGS",
  family: "EFFICIENCY",
  outputKind: "2WAY_PROBABILITY",
  validSports: ["soccer_epl", "soccer_usa_mls"],
  owner: "quant-soccer",
  dataDependencies: ["clubelo_csv"],
  activationStatus: "ACTIVE",
  trustWeight: 0.9,
  killLine: {
    maxBrierScoreVsMarket: 0.248,
    minSettledSample: 120,
    maxDivergenceZScore: 3.0,
    maxAgeMinutes: 720,
  },
  isRightsCleared: () => isIngestible("clubelo"),
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.skipNetworkIndependents) return null;
    if (ctx.prefetched?.some((f) => f.source === "clubelo")) return null;
    const fv = await tryClubEloFairValue({
      sportKey: ctx.sportKey,
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      commenceTime: ctx.commenceTime,
      now: ctx.now,
      env: ctx.env as NodeJS.ProcessEnv,
    });
    if (!fv || fv.homeFairProb == null || fv.awayFairProb == null) return null;
    return {
      homeFairProb: fv.homeFairProb,
      awayFairProb: fv.awayFairProb,
      capturedAt: fv.capturedAt ?? ctx.now().toISOString(),
    };
  },
};

/**
 * 5) Scoring Rate Model (Dixon-Coles on Soccer, Poisson on Hockey/Baseball)
 */
export const rateModelSignal: SignalDefinition = {
  id: "poisson_dixon_coles",
  label: "Team Rate Scoring Model (Dixon-Coles / Poisson)",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "2WAY_PROBABILITY",
  validSports: ["soccer_epl", "soccer_usa_mls", "icehockey_nhl", "baseball_mlb"],
  owner: "quant-rates",
  dataDependencies: ["teamGameLog"],
  activationStatus: "ACTIVE",
  trustWeight: 1.0,
  killLine: {
    maxBrierScoreVsMarket: 0.245,
    minSettledSample: 100,
    maxDivergenceZScore: 2.9,
    maxAgeMinutes: 1440,
  },
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (!isPoissonValidSport(ctx.sportKey)) return null;
    try {
      const [homeRecords, awayRecords, leagueAvg] = await Promise.all([
        getTeamScoringRecords(ctx.homeTeam, ctx.sportKey, 20, ctx.commenceTime),
        getTeamScoringRecords(ctx.awayTeam, ctx.sportKey, 20, ctx.commenceTime),
        getLeagueAverageScored(ctx.sportKey, ctx.commenceTime),
      ]);
      if (leagueAvg == null || leagueAvg <= 0) return null;

      let lambdas: { lambdaHome: number; lambdaAway: number } | null = null;
      if (isDixonColesValidSport(ctx.sportKey)) {
        const dc = dixonColesIndependentFairValue({
          sportKey: ctx.sportKey,
          homeRecords,
          awayRecords,
          leagueAvgScored: leagueAvg,
        });
        if (dc) lambdas = { lambdaHome: dc.lambdaHome, lambdaAway: dc.lambdaAway };
      }
      if (!lambdas) {
        const p = poissonIndependentFairValue({
          sportKey: ctx.sportKey,
          homeRecords,
          awayRecords,
          leagueAvgScored: leagueAvg,
        });
        if (p) lambdas = { lambdaHome: p.lambdaHome, lambdaAway: p.lambdaAway };
      }
      if (!lambdas) return null;

      const fv = poissonFairValueFromLambdas(
        lambdas.lambdaHome,
        lambdas.lambdaAway,
        { now: ctx.now },
      );
      if (fv && fv.homeFairProb != null && fv.awayFairProb != null) {
        return {
          homeFairProb: fv.homeFairProb,
          awayFairProb: fv.awayFairProb,
          capturedAt: fv.capturedAt ?? ctx.now().toISOString(),
        };
      }
    } catch {
      return null;
    }
    return null;
  },
};

/**
 * 5b) Skellam Cover Model (Spread Fair Value from Team Lambdas)
 */
export const skellamCoverSignal: SignalDefinition = {
  id: SKELLAM_COVER_SOURCE,
  label: "Skellam Cover Spread Fair Value",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "SPREAD_COVER_PROBABILITY",
  validSports: ["soccer_epl", "soccer_usa_mls", "icehockey_nhl", "baseball_mlb"],
  owner: "quant-rates",
  dataDependencies: ["teamGameLog"],
  activationStatus: "ACTIVE",
  trustWeight: 0.85,
  killLine: {
    maxBrierScoreVsMarket: 0.248,
    minSettledSample: 80,
    maxDivergenceZScore: 2.8,
    maxAgeMinutes: 1440,
  },
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (!isPoissonValidSport(ctx.sportKey)) return null;
    if (ctx.spreadHome == null || !Number.isFinite(ctx.spreadHome)) return null;

    try {
      const [homeRecords, awayRecords, leagueAvg] = await Promise.all([
        getTeamScoringRecords(ctx.homeTeam, ctx.sportKey, 20, ctx.commenceTime),
        getTeamScoringRecords(ctx.awayTeam, ctx.sportKey, 20, ctx.commenceTime),
        getLeagueAverageScored(ctx.sportKey, ctx.commenceTime),
      ]);
      if (leagueAvg == null || leagueAvg <= 0) return null;

      let lambdas: { lambdaHome: number; lambdaAway: number } | null = null;
      if (isDixonColesValidSport(ctx.sportKey)) {
        const dc = dixonColesIndependentFairValue({
          sportKey: ctx.sportKey,
          homeRecords,
          awayRecords,
          leagueAvgScored: leagueAvg,
        });
        if (dc) lambdas = { lambdaHome: dc.lambdaHome, lambdaAway: dc.lambdaAway };
      }
      if (!lambdas) {
        const p = poissonIndependentFairValue({
          sportKey: ctx.sportKey,
          homeRecords,
          awayRecords,
          leagueAvgScored: leagueAvg,
        });
        if (p) lambdas = { lambdaHome: p.lambdaHome, lambdaAway: p.lambdaAway };
      }
      if (!lambdas) return null;

      const cover = skellamCoverFairValue({
        sportKey: ctx.sportKey,
        lambdaHome: lambdas.lambdaHome,
        lambdaAway: lambdas.lambdaAway,
        spreadHome: ctx.spreadHome,
      });
      if (cover && cover.homeFairProb != null && cover.awayFairProb != null) {
        return {
          homeFairProb: cover.homeFairProb,
          awayFairProb: cover.awayFairProb,
          capturedAt: ctx.now().toISOString(),
        };
      }
    } catch {
      return null;
    }
    return null;
  },
};

/**
 * 6) MLB Standings Win% Logistic
 */
export const mlbStandingsSignal: SignalDefinition = {
  id: "mlb_standings",
  label: "MLB Official Standings Win% Logistic",
  category: "STANDINGS",
  family: "EFFICIENCY",
  outputKind: "2WAY_PROBABILITY",
  validSports: ["baseball_mlb"],
  owner: "quant-mlb",
  dataDependencies: ["mlb_stats_api"],
  activationStatus: "ACTIVE",
  trustWeight: 0.75,
  killLine: {
    maxBrierScoreVsMarket: 0.245,
    minSettledSample: 120,
    maxDivergenceZScore: 2.7,
    maxAgeMinutes: 720,
  },
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.skipNetworkIndependents) return null;
    const fv = await tryMlbStandingsFairValue({
      sportKey: ctx.sportKey,
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      commenceTime: ctx.commenceTime,
      now: ctx.now,
      env: ctx.env as NodeJS.ProcessEnv,
    });
    if (!fv || fv.homeFairProb == null || fv.awayFairProb == null) return null;
    return {
      homeFairProb: fv.homeFairProb,
      awayFairProb: fv.awayFairProb,
      capturedAt: fv.capturedAt ?? ctx.now().toISOString(),
    };
  },
};

/**
 * 7) Chronological Fitted Elo
 */
export const chronologicalEloSignal: SignalDefinition = {
  id: "elo",
  label: "Chronological Team Results Elo",
  category: "RATINGS",
  family: "EFFICIENCY",
  outputKind: "2WAY_PROBABILITY",
  validSports: [],
  owner: "quant-elo",
  dataDependencies: ["teamGameLog"],
  activationStatus: "ACTIVE",
  trustWeight: 0.9,
  killLine: {
    maxBrierScoreVsMarket: 0.245,
    minSettledSample: 150,
    maxDivergenceZScore: 3.0,
    maxAgeMinutes: 1440,
  },
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    try {
      const ratings = await getOrFitEloRatings(
        sharedEloCache,
        ctx.sportKey,
        ctx.commenceTime,
      );
      const elo = eloFairValueFromRatings(
        ratings,
        ctx.homeTeam,
        ctx.awayTeam,
        { now: ctx.now },
      );
      if (elo && elo.homeFairProb != null && elo.awayFairProb != null) {
        return {
          homeFairProb: elo.homeFairProb,
          awayFairProb: elo.awayFairProb,
          capturedAt: elo.capturedAt ?? ctx.now().toISOString(),
        };
      }
    } catch {
      return null;
    }
    return null;
  },
};

/**
 * 8) Polymarket Gamma Internal Estimator
 */
export const polymarketGammaSignal: SignalDefinition = {
  id: "polymarket_gamma_internal",
  label: "Polymarket Prediction Exchange Gamma Fair Value",
  category: "ODDS",
  family: "MARKET",
  outputKind: "2WAY_PROBABILITY",
  validSports: ["americanfootball_nfl", "basketball_nba"],
  owner: "quant-markets",
  dataDependencies: ["polymarket_api"],
  activationStatus: "SHADOW_ONLY",
  trustWeight: 0.5,
  killLine: {
    maxBrierScoreVsMarket: 0.250,
    minSettledSample: 60,
    maxDivergenceZScore: 3.2,
    maxAgeMinutes: 60,
  },
  isRightsCleared: (env) => env["INDEPENDENT_POLYMARKET"] === "1",
  acquisitionTask: null,
  blockedReason: "Compliance hold: default OFF. Internal estimator only.",
  evaluate: async (ctx) => {
    if (ctx.skipNetworkIndependents) return null;
    if (ctx.prefetched?.some((f) => f.source === "polymarket_gamma_internal")) return null;
    const fv = await tryPolymarketIndependentFairValue({
      sportKey: ctx.sportKey,
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      commenceTime: ctx.commenceTime,
      now: ctx.now,
      env: ctx.env as NodeJS.ProcessEnv,
    });
    if (!fv || fv.homeFairProb == null || fv.awayFairProb == null) return null;
    return {
      homeFairProb: fv.homeFairProb,
      awayFairProb: fv.awayFairProb,
      capturedAt: fv.capturedAt ?? ctx.now().toISOString(),
    };
  },
};

/**
 * 9) NFL Opponent-Adjusted EPA/play (nflverse)
 */
export const nflOpponentAdjustedEpaSignal: SignalDefinition = {
  id: "nfl_epa_adj",
  label: "NFL Opponent-Adjusted EPA/Play (nflverse)",
  category: "RATINGS",
  family: "EFFICIENCY",
  outputKind: "2WAY_PROBABILITY",
  validSports: ["americanfootball_nfl"],
  owner: "data-eng-nflverse",
  dataDependencies: ["teamGameEfficiency"],
  activationStatus: "ACTIVE",
  trustWeight: 1.0,
  killLine: {
    maxBrierScoreVsMarket: 0.240,
    minSettledSample: 70,
    maxDivergenceZScore: 2.8,
    maxAgeMinutes: 1440,
  },
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.skipNetworkIndependents) return null;
    const fv = await tryNflEpaFairValue({
      sportKey: ctx.sportKey,
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      commenceTime: ctx.commenceTime,
      now: ctx.now,
      env: ctx.env as NodeJS.ProcessEnv,
    });
    if (!fv || fv.homeFairProb == null || fv.awayFairProb == null) return null;
    return {
      homeFairProb: fv.homeFairProb,
      awayFairProb: fv.awayFairProb,
      capturedAt: fv.capturedAt ?? ctx.now().toISOString(),
    };
  },
};

/**
 * Blocked / Future Signals (Workstream 5B and Beyond)
 */
export const BLOCKED_SIGNALS: readonly SignalDefinition[] = [
  {
    id: "nfl_contract_incentives",
    label: "NFL Player Contract Incentives & Milestones",
    category: "MILESTONES",
    family: "NARRATIVE",
    outputKind: "2WAY_PROBABILITY",
    validSports: ["americanfootball_nfl"],
    owner: "quant-narrative",
    dataDependencies: ["contract_milestones_feed"],
    activationStatus: "BLOCKED_MISSING_SOURCE",
    trustWeight: 0.0,
    killLine: DEFAULT_KILL_LINE,
    isRightsCleared: () => false,
    acquisitionTask: "GSE-DATA-209",
    blockedReason: "Verified contract milestone feed awaiting data partnership clearance.",
  },
  {
    id: "nfl_cognitive_load_fatigue",
    label: "NFL Cognitive Load & Thursday Night Travel Stress",
    category: "SCHEDULE",
    family: "SITUATIONAL",
    outputKind: "2WAY_PROBABILITY",
    validSports: ["americanfootball_nfl"],
    owner: "data-eng-nfl",
    dataDependencies: ["stadium_coordinates", "flight_schedules"],
    activationStatus: "BLOCKED_MISSING_SOURCE",
    trustWeight: 0.0,
    killLine: DEFAULT_KILL_LINE,
    isRightsCleared: () => false,
    acquisitionTask: "GSE-DATA-104",
    blockedReason: "Circadian travel stress and stadium timezone vectors not yet mapped in db.",
  },
  {
    id: "nfl_beat_desk_corroboration",
    label: "NFL Beat Reporter Injury & Depth Chart Insights",
    category: "PLAYER_AVAILABILITY",
    family: "NARRATIVE",
    outputKind: "2WAY_PROBABILITY",
    validSports: ["americanfootball_nfl"],
    owner: "osint-desk",
    dataDependencies: ["beat_reporter_rss_whitelist"],
    activationStatus: "BLOCKED_MISSING_SOURCE",
    trustWeight: 0.0,
    killLine: DEFAULT_KILL_LINE,
    isRightsCleared: () => false,
    acquisitionTask: "GSE-DATA-312",
    blockedReason: "Beat reporter whitelist pending scraping rights review; sample data feeds disabled.",
  },
  {
    id: "nfl_trench_pass_block_win_rate",
    label: "NFL Offensive vs Defensive Line Pass Block Win Rate (PBWR)",
    category: "TEAM_RATES",
    family: "TRENCHES",
    outputKind: "2WAY_PROBABILITY",
    validSports: ["americanfootball_nfl"],
    owner: "quant-trenches",
    dataDependencies: ["next_gen_stats_pbwr"],
    activationStatus: "BLOCKED_MISSING_SOURCE",
    trustWeight: 0.0,
    killLine: DEFAULT_KILL_LINE,
    isRightsCleared: () => false,
    acquisitionTask: "GSE-DATA-401",
    blockedReason: "Next Gen Stats trench telemetry requires licensing execution.",
  },
  {
    id: "nfl_luck_fumble_regression",
    label: "NFL Fumble Recovery & 3rd Down Conversion Luck Regression",
    category: "TEAM_RATES",
    family: "LUCK",
    outputKind: "2WAY_PROBABILITY",
    validSports: ["americanfootball_nfl"],
    owner: "quant-regression",
    dataDependencies: ["pbp_luck_matrix"],
    activationStatus: "BLOCKED_MISSING_SOURCE",
    trustWeight: 0.0,
    killLine: DEFAULT_KILL_LINE,
    isRightsCleared: () => false,
    acquisitionTask: "GSE-DATA-502",
    blockedReason: "Expected vs actual fumble recovery rates module awaiting backtest corpus.",
  },
];

/**
 * 11) NFL Wind Elasticity & Non-Linear Prop Adjustment
 */
export const nflWindElasticitySignal: SignalDefinition = {
  id: "nfl_wind_elasticity",
  label: "NFL Wind Elasticity & Convex Passing/FG Decay",
  category: "WEATHER",
  family: "MICROCLIMATE",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-weather",
  dataDependencies: ["nfl_stadium_weather_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const weather = (ctx.env as any)?.WIND_MPH != null ? Number((ctx.env as any).WIND_MPH) : null;
    if (weather == null || !Number.isFinite(weather)) return null;
    const res = calculateWindElasticity({
      sustainedWindMph: weather,
      gustMph: (ctx.env as any)?.WIND_GUST_MPH ? Number((ctx.env as any).WIND_GUST_MPH) : undefined,
      isDomeOrRetractableClosed: Boolean((ctx.env as any)?.IS_DOME),
    });
    return {
      value: res.passingYardsMultiplier,
      capturedAt: ctx.now().toISOString(),
    };
  },
};

/**
 * 12) NFL Coaching Alternation & 4th Down Bias
 */
export const nflCoachingTendenciesSignal: SignalDefinition = {
  id: "nfl_coaching_tendencies",
  label: "NFL Coaching 2nd-Down Run Alternation & 4th Down Conservatism",
  category: "PACE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-coaching",
  dataDependencies: ["nflverse_play_calling_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per play context
  },
};

/**
 * 13) NFL Injury Report Practice Trajectory
 */
export const nflInjuryTrajectorySignal: SignalDefinition = {
  id: "nfl_injury_trajectory",
  label: "NFL Practice Report Wed/Thu/Fri Trajectory & Questionable Fade",
  category: "INJURIES",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-injuries",
  dataDependencies: ["nfl_official_injury_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.12,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per injury report feed
  },
};

/**
 * 14) NFL Red Zone TE Leverage & Efficiency
 */
export const nflRedzoneTeLeverageSignal: SignalDefinition = {
  id: "nfl_redzone_te_leverage",
  label: "NFL Red Zone TE Leverage & Scoring Efficiency",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "2WAY_PROBABILITY",
  validSports: ["americanfootball_nfl"],
  owner: "quant-personnel",
  dataDependencies: ["nfl_personnel_rz_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per team matchup
  },
};

/**
 * 15) NFL Offensive Line Continuity & PBWR Trench Edge (Factor A21)
 */
export const nflOffensiveLineTrenchSignal: SignalDefinition = {
  id: "nfl_offensive_line_trench",
  label: "NFL Offensive Line Continuity & PBWR Trench Edge",
  category: "TEAM_RATES",
  family: "TRENCHES",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-trenches",
  dataDependencies: ["nfl_snap_counts", "nfl_pfr_advstats"],
  activationStatus: "ACTIVE",
  trustWeight: 0.12,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per matchup trench stats
  },
};

/**
 * 16) NFL Referee Crew Penalty & Total Points Elasticity (Factors A3 & A27)
 */
export const nflRefereeCrewTendenciesSignal: SignalDefinition = {
  id: "nfl_referee_crew_tendencies",
  label: "NFL Referee Crew Penalty & Total Points Elasticity",
  category: "OFFICIALS",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-officials",
  dataDependencies: ["nflverse_officials", "games_csv_referee"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per assigned officiating crew
  },
};

/**
 * 17) NFL Circadian Rhythm & Timezone Travel Fatigue (Factor A4)
 */
export const nflCircadianTravelFatigueSignal: SignalDefinition = {
  id: "nfl_circadian_travel_fatigue",
  label: "NFL Circadian Rhythm & Timezone Travel Fatigue",
  category: "SCHEDULE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-travel",
  dataDependencies: ["nfl_stadium_timezones", "nfl_schedules"],
  activationStatus: "ACTIVE",
  trustWeight: 0.09,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per travel itinerary
  },
};

/**
 * 18) NFL Late-Season Contract Incentives & Milestone Funneling (Factor A15 & 5B)
 */
export const nflContractMilestonesSignal: SignalDefinition = {
  id: "nfl_contract_milestones",
  label: "NFL Late-Season Contract Incentives & Milestone Funneling",
  category: "MILESTONES",
  family: "NARRATIVE",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-incentives",
  dataDependencies: ["nflverse_contracts_otc"],
  activationStatus: "ACTIVE",
  trustWeight: 0.11,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per player contract thresholds
  },
};

/**
 * 19) NFL Alpha WR1-Out Vacated Target Reallocation & Efficiency Decay (Factor A19)
 */
export const nflWr1OutRedistributionSignal: SignalDefinition = {
  id: "nfl_wr1_out_redistribution",
  label: "NFL Alpha WR1-Out Vacated Target Reallocation & Efficiency Decay",
  category: "PLAYER_AVAILABILITY",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-targets",
  dataDependencies: ["nfl_injuries", "nfl_player_stats_weekly"],
  activationStatus: "ACTIVE",
  trustWeight: 0.14,
  killLine: DEFAULT_KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    return null; // Ingested dynamically per injury status & depth chart
  },
};

/**
 * Complete Signal Registry array in canonical order.
 */
export const SIGNAL_REGISTRY: readonly SignalDefinition[] = [
  prefetchedExchangeSignal,
  kalshiLiveSignal,
  espnPowerIndexSignal,
  clubEloSignal,
  rateModelSignal,
  skellamCoverSignal,
  mlbStandingsSignal,
  chronologicalEloSignal,
  polymarketGammaSignal,
  nflOpponentAdjustedEpaSignal,
  nflWindElasticitySignal,
  nflCoachingTendenciesSignal,
  nflInjuryTrajectorySignal,
  nflRedzoneTeLeverageSignal,
  nflOffensiveLineTrenchSignal,
  nflRefereeCrewTendenciesSignal,
  nflCircadianTravelFatigueSignal,
  nflContractMilestonesSignal,
  nflWr1OutRedistributionSignal,
  ...BLOCKED_SIGNALS,
];

/**
 * Builds dynamic shadow evidence records from all non-ACTIVE registry entries.
 * Replaces hardcoded constant arrays with real tracked signal rows.
 */
export function buildMissingContextEvidenceFromRegistry(fetchedAt: Date) {
  return SIGNAL_REGISTRY.filter((s) => s.activationStatus !== "ACTIVE").map((s) => ({
    sourceCategory: s.category,
    sourceName: s.id,
    signalKey: s.id,
    fetchedAt,
    trustLevel: 0,
    isBootstrap: true,
    activationStatus: s.activationStatus,
    freshnessStatus: "MISSING" as const,
    sampleSize: null,
    whyUsedOrBlocked:
      s.blockedReason ??
      (s.acquisitionTask ? `Blocked under acquisition task ${s.acquisitionTask}` : "Blocked"),
  }));
}
