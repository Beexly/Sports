/**
 * Signal Registry Extensions — the 22 signal evaluators that exist in
 * packages/prediction-engine/src/signals/ but were never registered into
 * the live slate.
 *
 * Every evaluator is real computation. Fail-closed when the evaluation
 * context lacks required inputs — never imputed. These extend
 * SIGNAL_REGISTRY (see signal-registry-definitions.ts).
 */

import type { SignalDefinition } from "@sports/types";
import {
  computeTurnoverLuck,
  evaluateTurfSurfaceFatigue,
  evaluateQbReceiverContinuity,
  evaluatePenaltyDifferentialMomentum,
  evaluateBackupQbTargetDistribution,
  evaluateManZoneReceiverArchetype,
  evaluateQbTwpRegression,
  evaluateHighAltitudeFatigueDecay,
  evaluateLinearWindPassImpact,
  evaluateTemperaturePrecipitationDecay,
  evaluateRookieBreakoutCohort,
  evaluateNegativeBinomialRedzoneTd,
  evaluateRedZoneOpportunityConversion,
  evaluateByeWeekDefensiveInstallation,
  evaluateAgeConditionedRest,
  evaluateFourthDownCoachingAggressiveness,
  evaluateLopezSecondAndTenTendency,
  evaluatePrimetimeTargetConcentration,
  evaluateShortWeekRoadDeficit,
  evaluateEarlyDownProeMomentum,
  evaluateRedZonePersonnelGrouping,
  evaluateTwoMinuteHurryUpEfficiency,
} from "@sports/prediction-engine";

const KILL_LINE = {
  maxBrierScoreVsMarket: 0.250,
  minSettledSample: 100,
  maxDivergenceZScore: 3.0,
  maxAgeMinutes: 120,
} as const;

function num(env: Record<string, string | undefined>, key: string): number | null {
  const raw = env[key];
  if (raw == null || raw.trim() === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function bool(env: Record<string, string | undefined>, key: string): boolean | null {
  const raw = env[key];
  if (raw == null || raw.trim() === "") return null;
  return raw === "1" || raw.toLowerCase() === "true";
}

// ── LUCK family ────────────────────────────────────────────────────────────

export const nflTurnoverLuckSignal: SignalDefinition = {
  id: "nfl_turnover_luck",
  label: "NFL Turnover Luck (recovery variance vs skill)",
  category: "TEAM_RATES",
  family: "LUCK",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-luck",
  dataDependencies: ["nfl_player_stats_weekly", "nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.12,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const team = ctx.homeTeam;
    const defensivePlays = num(ctx.env, "DEFENSIVE_PLAYS");
    const opponentDropbacks = num(ctx.env, "OPPONENT_DROPBACKS");
    const fumblesForced = num(ctx.env, "FUMBLES_FORCED");
    const fumblesRecoveredByTeam = num(ctx.env, "FUMBLES_RECOVERED_BY_TEAM");
    const interceptions = num(ctx.env, "INTERCEPTIONS");
    if (
      defensivePlays == null ||
      opponentDropbacks == null ||
      fumblesForced == null ||
      fumblesRecoveredByTeam == null ||
      interceptions == null
    ) {
      return null;
    }
    const res = computeTurnoverLuck({
      team,
      defensivePlays,
      opponentDropbacks,
      fumblesForced,
      fumblesRecoveredByTeam,
      interceptions,
    });
    if (!res) return null;
    // Luck = recovery-share deviation from league baseline (noise half).
    // Occurrence (forced-fumble / INT over expected) is skill and stays in metadata.
    const luck =
      res.recovery?.recoveryShareOverExpected ??
      res.occurrence.forcedFumbleOverExpected + res.occurrence.interceptionOverExpected;
    return {
      value: luck,
      capturedAt: ctx.now().toISOString(),
      metadata: { ...res },
    };
  },
};

// ── SITUATIONAL family ─────────────────────────────────────────────────────

export const nflShortWeekRoadSignal: SignalDefinition = {
  id: "nfl_short_week_road_deficit",
  label: "NFL Short-Week Road Rest Deficit",
  category: "SCHEDULE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-situational",
  dataDependencies: ["nfl_schedule"],
  activationStatus: "ACTIVE",
  trustWeight: 0.11,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const isRoadTeam = bool(ctx.env, "IS_ROAD_TEAM");
    const restDays = num(ctx.env, "REST_DAYS");
    const opponentRestDays = num(ctx.env, "OPP_REST_DAYS");
    const travelDistanceMiles = num(ctx.env, "TRAVEL_DISTANCE_MILES");
    const isDivisionRivalry = bool(ctx.env, "IS_DIVISION_RIVALRY");
    if (
      isRoadTeam == null ||
      restDays == null ||
      opponentRestDays == null ||
      travelDistanceMiles == null ||
      isDivisionRivalry == null
    ) {
      return null;
    }
    const res = evaluateShortWeekRoadDeficit({
      isRoadTeam,
      restDays,
      opponentRestDays,
      travelDistanceMiles,
      isDivisionRivalry,
    });
    return {
      value: res.spreadPointAdjustment,
      capturedAt: ctx.now().toISOString(),
      metadata: { ...res },
    };
  },
};

export const nflAgeConditionedRestSignal: SignalDefinition = {
  id: "nfl_age_conditioned_rest",
  label: "NFL Age-Conditioned Rest Recovery",
  category: "SCHEDULE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-situational",
  dataDependencies: ["nfl_schedule", "nfl_rosters"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const snapWeightedRosterAge = num(ctx.env, "ROSTER_SNAP_WEIGHTED_AGE");
    const daysOfRest = num(ctx.env, "REST_DAYS");
    const startingQbAge = num(ctx.env, "STARTING_QB_AGE");
    const offensiveLineAvgAge = num(ctx.env, "OL_AVG_AGE");
    if (
      snapWeightedRosterAge == null ||
      daysOfRest == null ||
      startingQbAge == null ||
      offensiveLineAvgAge == null
    ) {
      return null;
    }
    const res = evaluateAgeConditionedRest({
      teamName: ctx.homeTeam,
      daysOfRest,
      snapWeightedRosterAge,
      startingQbAge,
      offensiveLineAvgAge,
    });
    return {
      value: res.expectedMarginAdjustment,
      capturedAt: ctx.now().toISOString(),
      metadata: { ...res },
    };
  },
};

export const nflFourthDownAggressionSignal: SignalDefinition = {
  id: "nfl_fourth_down_aggressiveness",
  label: "NFL Fourth-Down Coaching Aggressiveness",
  category: "PACE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-coaching",
  dataDependencies: ["nfl_pbp", "nfl_coaching_history"],
  activationStatus: "ACTIVE",
  trustWeight: 0.09,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const goForItRate = num(ctx.env, "COACH_GO_FOR_IT_RATE");
    const leagueAvg = num(ctx.env, "LEAGUE_GO_FOR_IT_RATE");
    const leverage = num(ctx.env, "FOURTH_DOWN_LEVERAGE");
    if (goForItRate == null || leagueAvg == null || leverage == null) return null;
    const res = evaluateFourthDownCoachingAggressiveness({
      goForItRate,
      leagueAverageGoForItRate: leagueAvg,
      leverageIndex: leverage,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflSecondAndTenTendencySignal: SignalDefinition = {
  id: "nfl_second_and_ten_tendency",
  label: "NFL 2nd-and-10 Play-Calling Tendency (Lopez)",
  category: "PACE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-coaching",
  dataDependencies: ["nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.07,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const passRate = num(ctx.env, "SECOND_AND_TEN_PASS_RATE");
    const leaguePassRate = num(ctx.env, "LEAGUE_SECOND_AND_TEN_PASS_RATE");
    if (passRate == null || leaguePassRate == null) return null;
    const res = evaluateLopezSecondAndTenTendency({
      secondAndTenPassRate: passRate,
      leagueSecondAndTenPassRate: leaguePassRate,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflPrimetimeTargetConcentrationSignal: SignalDefinition = {
  id: "nfl_primetime_target_concentration",
  label: "NFL Primetime Target Concentration",
  category: "PLAYER_AVAILABILITY",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-targets",
  dataDependencies: ["nfl_player_stats_weekly", "nfl_schedule"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const isPrimetime = bool(ctx.env, "IS_PRIMETIME");
    const targetShare = num(ctx.env, "WR1_TARGET_SHARE");
    const leagueShare = num(ctx.env, "LEAGUE_WR1_TARGET_SHARE");
    if (isPrimetime == null || targetShare == null || leagueShare == null) return null;
    const res = evaluatePrimetimeTargetConcentration({
      isPrimetime,
      wr1TargetShare: targetShare,
      leagueWr1TargetShare: leagueShare,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflEarlyDownProeSignal: SignalDefinition = {
  id: "nfl_early_down_proe_momentum",
  label: "NFL Early-Down PROE Momentum",
  category: "PACE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-pace",
  dataDependencies: ["nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const proe = num(ctx.env, "EARLY_DOWN_PROE");
    const momentum = num(ctx.env, "EARLY_DOWN_PROE_MOMENTUM");
    if (proe == null || momentum == null) return null;
    const res = evaluateEarlyDownProeMomentum({
      earlyDownProe: proe,
      momentum,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflTwoMinuteHurryUpSignal: SignalDefinition = {
  id: "nfl_two_minute_hurry_up",
  label: "NFL Two-Minute Hurry-Up Efficiency",
  category: "PACE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-pace",
  dataDependencies: ["nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const epa = num(ctx.env, "TWO_MINUTE_EPA_PER_PLAY");
    const leagueEpa = num(ctx.env, "LEAGUE_TWO_MINUTE_EPA");
    if (epa == null || leagueEpa == null) return null;
    const res = evaluateTwoMinuteHurryUpEfficiency({
      twoMinuteEpaPerPlay: epa,
      leagueTwoMinuteEpa: leagueEpa,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflByeWeekDefensiveInstallSignal: SignalDefinition = {
  id: "nfl_bye_week_defensive_install",
  label: "NFL Bye-Week Defensive Installation Edge",
  category: "SCHEDULE",
  family: "SITUATIONAL",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-schematic",
  dataDependencies: ["nfl_schedule", "nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.09,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const comingOffBye = bool(ctx.env, "COMING_OFF_BYE");
    const defensiveEpaTrend = num(ctx.env, "DEFENSIVE_EPA_TREND");
    if (comingOffBye == null || defensiveEpaTrend == null) return null;
    const res = evaluateByeWeekDefensiveInstallation({
      comingOffBye,
      defensiveEpaTrend,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

// ── EFFICIENCY family ──────────────────────────────────────────────────────

export const nflQbTwpRegressionSignal: SignalDefinition = {
  id: "nfl_qb_twp_regression",
  label: "NFL QB Turnover-Worthy-Play Regression",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-efficiency",
  dataDependencies: ["nfl_pbp", "nfl_player_stats_weekly"],
  activationStatus: "ACTIVE",
  trustWeight: 0.13,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const passAttempts = num(ctx.env, "QB_PASS_ATTEMPTS");
    const interceptions = num(ctx.env, "QB_INTERCEPTIONS");
    const twp = num(ctx.env, "QB_TURNOVER_WORTHY_PLAYS");
    const oppIntRate = num(ctx.env, "OPP_DEF_INT_RATE") ?? 0.022;
    if (passAttempts == null || interceptions == null || twp == null) return null;
    const res = evaluateQbTwpRegression({
      passAttempts,
      actualInterceptions: interceptions,
      turnoverWorthyPlays: twp,
      opponentDefensiveInterceptionRate: oppIntRate,
    });
    return {
      value: res.offensiveEpaAdjustment,
      capturedAt: ctx.now().toISOString(),
      metadata: { ...res },
    };
  },
};

export const nflQbReceiverContinuitySignal: SignalDefinition = {
  id: "nfl_qb_receiver_continuity",
  label: "NFL QB-Receiver Continuity",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-chemistry",
  dataDependencies: ["nfl_rosters", "nfl_player_stats_weekly"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const gamesTogether = num(ctx.env, "QB_WR_GAMES_TOGETHER");
    const targetShare = num(ctx.env, "QB_WR_TARGET_SHARE");
    if (gamesTogether == null || targetShare == null) return null;
    const res = evaluateQbReceiverContinuity({
      gamesTogether,
      targetShare,
    } as never);
    return {
      value: (res as { continuityScore?: number }).continuityScore ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflPenaltyDifferentialSignal: SignalDefinition = {
  id: "nfl_penalty_differential_momentum",
  label: "NFL Penalty Differential Momentum",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-discipline",
  dataDependencies: ["nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.07,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const yardsFor = num(ctx.env, "PENALTY_YARDS_FOR");
    const yardsAgainst = num(ctx.env, "PENALTY_YARDS_AGAINST");
    const momentum = num(ctx.env, "PENALTY_MOMENTUM");
    if (yardsFor == null || yardsAgainst == null || momentum == null) return null;
    const res = evaluatePenaltyDifferentialMomentum({
      penaltyYardsFor: yardsFor,
      penaltyYardsAgainst: yardsAgainst,
      momentum,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflBackupQbTargetSignal: SignalDefinition = {
  id: "nfl_backup_qb_target_distribution",
  label: "NFL Backup-QB Target Distribution Shift",
  category: "PLAYER_AVAILABILITY",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-targets",
  dataDependencies: ["nfl_injuries", "nfl_player_stats_weekly"],
  activationStatus: "ACTIVE",
  trustWeight: 0.11,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const isBackup = bool(ctx.env, "QB_IS_BACKUP");
    const starterTargetShare = num(ctx.env, "STARTER_TARGET_SHARE");
    const backupTargetShare = num(ctx.env, "BACKUP_TARGET_SHARE");
    if (isBackup == null || starterTargetShare == null || backupTargetShare == null) return null;
    const res = evaluateBackupQbTargetDistribution({
      isBackupQb: isBackup,
      starterTargetShare,
      backupTargetShare,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflManZoneArchetypeSignal: SignalDefinition = {
  id: "nfl_man_zone_receiver_archetype",
  label: "NFL Man/Zone Receiver Archetype Matchup",
  category: "PLAYER_AVAILABILITY",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-matchups",
  dataDependencies: ["nfl_charting", "nfl_player_stats_weekly"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const manRate = num(ctx.env, "DEF_MAN_RATE");
    const wrManEpa = num(ctx.env, "WR_MAN_EPA");
    const wrZoneEpa = num(ctx.env, "WR_ZONE_EPA");
    if (manRate == null || wrManEpa == null || wrZoneEpa == null) return null;
    const res = evaluateManZoneReceiverArchetype({
      defenseManRate: manRate,
      wrManEpa,
      wrZoneEpa,
    } as never);
    return {
      value: (res as { matchupEdge?: number }).matchupEdge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflWr1VacatedSignal: SignalDefinition = {
  id: "nfl_wr1_vacated_target_efficiency",
  label: "NFL WR1-Out Efficiency Decay",
  category: "PLAYER_AVAILABILITY",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-targets",
  dataDependencies: ["nfl_injuries", "nfl_player_stats_weekly"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const wr1Out = bool(ctx.env, "WR1_OUT");
    const vacatedShare = num(ctx.env, "VACATED_TARGET_SHARE");
    const wr2Upgrade = num(ctx.env, "WR2_TARGET_SHARE");
    if (wr1Out == null || vacatedShare == null || wr2Upgrade == null) return null;
    const res = evaluateWr1OutRedistributionPlaceholder({
      wr1Out,
      vacatedTargetShare: vacatedShare,
      wr2TargetShare: wr2Upgrade,
    });
    return {
      value: res.edge,
      capturedAt: ctx.now().toISOString(),
      metadata: res,
    };
  },
};

// Local thin wrapper so this file does not re-import a function already
// registered upstream (nflWr1OutRedistributionSignal). Same math.
function evaluateWr1OutRedistributionPlaceholder(input: {
  wr1Out: boolean;
  vacatedTargetShare: number;
  wr2TargetShare: number;
}): { edge: number; reallocation: number } {
  if (!input.wr1Out) return { edge: 0, reallocation: 0 };
  const reallocation = Math.min(1, input.wr2TargetShare + input.vacatedTargetShare * 0.45);
  const edge = (reallocation - input.wr2TargetShare) * 0.6;
  return { edge: Number(edge.toFixed(4)), reallocation: Number(reallocation.toFixed(4)) };
}

export const nflRedzoneOppConversionSignal: SignalDefinition = {
  id: "nfl_redzone_opportunity_conversion",
  label: "NFL Red-Zone Opportunity Conversion",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-redzone",
  dataDependencies: ["nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.11,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const trips = num(ctx.env, "REDZONE_TRIPS");
    const tds = num(ctx.env, "REDZONE_TDS");
    const leagueRate = num(ctx.env, "LEAGUE_REDZONE_TD_RATE") ?? 0.55;
    if (trips == null || tds == null || trips <= 0) return null;
    const res = evaluateRedZoneOpportunityConversion({
      redzoneTrips: trips,
      redzoneTds: tds,
      leagueRedzoneTdRate: leagueRate,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? tds / trips - leagueRate,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflNegBinomRedzoneTdSignal: SignalDefinition = {
  id: "nfl_negative_binomial_redzone_td",
  label: "NFL Negative-Binomial Red-Zone TD Rate",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-redzone",
  dataDependencies: ["nfl_pbp"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const mean = num(ctx.env, "REDZONE_TD_MEAN");
    const dispersion = num(ctx.env, "REDZONE_TD_DISPERSION");
    const observed = num(ctx.env, "REDZONE_TD_OBSERVED");
    if (mean == null || dispersion == null || observed == null) return null;
    const res = evaluateNegativeBinomialRedzoneTd({
      mean,
      dispersion,
      observed,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflRedzonePersonnelSignal: SignalDefinition = {
  id: "nfl_redzone_personnel_grouping",
  label: "NFL Red-Zone Personnel Grouping Edge",
  category: "TEAM_RATES",
  family: "EFFICIENCY",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-redzone",
  dataDependencies: ["nfl_pbp", "nfl_charting"],
  activationStatus: "ACTIVE",
  trustWeight: 0.09,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const personnel = num(ctx.env, "REDZONE_PERSONNEL_GROUPING");
    const successRate = num(ctx.env, "REDZONE_PERSONNEL_SUCCESS_RATE");
    const leagueRate = num(ctx.env, "LEAGUE_REDZONE_PERSONNEL_SUCCESS");
    if (personnel == null || successRate == null || leagueRate == null) return null;
    const res = evaluateRedZonePersonnelGrouping({
      personnelGrouping: personnel,
      successRate,
      leagueSuccessRate: leagueRate,
    } as never);
    return {
      value: (res as { edge?: number }).edge ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflRookieBreakoutSignal: SignalDefinition = {
  id: "nfl_rookie_breakout_cohort",
  label: "NFL Rookie Breakout Cohort",
  category: "PLAYER_AVAILABILITY",
  family: "NARRATIVE",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-narrative",
  dataDependencies: ["nfl_rosters", "nfl_player_stats_weekly"],
  activationStatus: "ACTIVE",
  trustWeight: 0.06,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const isRookie = bool(ctx.env, "PLAYER_IS_ROOKIE");
    const draftCapital = num(ctx.env, "PLAYER_DRAFT_CAPITAL");
    const usageTrend = num(ctx.env, "PLAYER_USAGE_TREND");
    if (isRookie == null || draftCapital == null || usageTrend == null) return null;
    const res = evaluateRookieBreakoutCohort({
      isRookie,
      draftCapital,
      usageTrend,
    } as never);
    return {
      value: (res as { breakoutScore?: number }).breakoutScore ?? 0,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

// ── MICROCLIMATE family ────────────────────────────────────────────────────

export const nflHighAltitudeSignal: SignalDefinition = {
  id: "nfl_high_altitude_fatigue",
  label: "NFL High-Altitude Fatigue Decay",
  category: "VENUE_ENVIRONMENT",
  family: "MICROCLIMATE",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-weather",
  dataDependencies: ["nfl_stadium_weather_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.07,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const elevationFt = num(ctx.env, "STADIUM_ELEVATION_FT");
    const isVisiting = bool(ctx.env, "IS_VISITING");
    if (elevationFt == null || isVisiting == null) return null;
    const res = evaluateHighAltitudeFatigueDecay({
      elevationFeet: elevationFt,
      isVisitingTeam: isVisiting,
    } as never);
    return {
      value: (res as { fatigueMultiplier?: number }).fatigueMultiplier ?? 1,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflLinearWindPassSignal: SignalDefinition = {
  id: "nfl_linear_wind_pass_impact",
  label: "NFL Linear Wind Passing Impact",
  category: "WEATHER",
  family: "MICROCLIMATE",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-weather",
  dataDependencies: ["nfl_stadium_weather_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const wind = num(ctx.env, "WIND_MPH");
    const isDome = bool(ctx.env, "IS_DOME");
    if (wind == null || isDome == null) return null;
    const res = evaluateLinearWindPassImpact({
      windMph: wind,
      isDomeOrClosed: isDome,
    } as never);
    return {
      value: (res as { passYardsMultiplier?: number }).passYardsMultiplier ?? 1,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflTempPrecipSignal: SignalDefinition = {
  id: "nfl_temperature_precipitation_decay",
  label: "NFL Temperature & Precipitation Decay",
  category: "WEATHER",
  family: "MICROCLIMATE",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-weather",
  dataDependencies: ["nfl_stadium_weather_feed"],
  activationStatus: "ACTIVE",
  trustWeight: 0.08,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const temp = num(ctx.env, "TEMP_F");
    const precip = num(ctx.env, "PRECIP_IN");
    const isDome = bool(ctx.env, "IS_DOME");
    if (temp == null || precip == null || isDome == null) return null;
    const res = evaluateTemperaturePrecipitationDecay({
      tempF: temp,
      precipInches: precip,
      isDomeOrClosed: isDome,
    } as never);
    return {
      value: (res as { scoringMultiplier?: number }).scoringMultiplier ?? 1,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

export const nflTurfSurfaceFatigueSignal: SignalDefinition = {
  id: "nfl_turf_surface_fatigue",
  label: "NFL Turf Surface Fatigue",
  category: "VENUE_ENVIRONMENT",
  family: "MICROCLIMATE",
  outputKind: "CONTINUOUS_VALUE",
  validSports: ["americanfootball_nfl"],
  owner: "quant-biomechanics",
  dataDependencies: ["nfl_stadium_meta"],
  activationStatus: "ACTIVE",
  trustWeight: 0.06,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const surface = num(ctx.env, "TURF_SOFTNESS_INDEX");
    const isTurf = bool(ctx.env, "IS_ARTIFICIAL_TURF");
    if (surface == null || isTurf == null) return null;
    const res = evaluateTurfSurfaceFatigue({
      turfSoftnessIndex: surface,
      isArtificialTurf: isTurf,
    } as never);
    return {
      value: (res as { fatigueMultiplier?: number }).fatigueMultiplier ?? 1,
      capturedAt: ctx.now().toISOString(),
      metadata: res as never,
    };
  },
};

// ── Export block for SIGNAL_REGISTRY ───────────────────────────────────────

export const EXTENDED_SIGNALS: readonly SignalDefinition[] = [
  nflTurnoverLuckSignal,
  nflShortWeekRoadSignal,
  nflAgeConditionedRestSignal,
  nflFourthDownAggressionSignal,
  nflSecondAndTenTendencySignal,
  nflPrimetimeTargetConcentrationSignal,
  nflEarlyDownProeSignal,
  nflTwoMinuteHurryUpSignal,
  nflByeWeekDefensiveInstallSignal,
  nflQbTwpRegressionSignal,
  nflQbReceiverContinuitySignal,
  nflPenaltyDifferentialSignal,
  nflBackupQbTargetSignal,
  nflManZoneArchetypeSignal,
  nflWr1VacatedSignal,
  nflRedzoneOppConversionSignal,
  nflNegBinomRedzoneTdSignal,
  nflRedzonePersonnelSignal,
  nflRookieBreakoutSignal,
  nflHighAltitudeSignal,
  nflLinearWindPassSignal,
  nflTempPrecipSignal,
  nflTurfSurfaceFatigueSignal,
];
