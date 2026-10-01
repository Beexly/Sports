/**
 * Signal Registry Extensions — continuous signals registered into the live slate.
 *
 * A wrapper calls its kernel only when the kernel's own inputs are present.
 * A wrapper whose env keys do not match the kernel abstains. It does not
 * invent a call shape, and it does not emit 0 for a field the kernel does
 * not return. These extend SIGNAL_REGISTRY (see signal-registry-definitions.ts).
 */

import type { SignalDefinition } from "@sports/types";
import {
  computeTurnoverLuck,
  evaluateQbTwpRegression,
  evaluateAgeConditionedRest,
  evaluatePrimetimeTargetConcentration,
  evaluateTemperaturePrecipitationDecay,
} from "@sports/prediction-engine";
import { evalShortWeekRoadDeficit, evalLinearWindPassImpact } from "./signals-bridge.js";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { NFL_SCHEME_PRIOR, NFL_SCHEME_PRIOR_SEASON } from "./priors/nfl-2025-scheme.js";
import { SCHEME_MEASURED_SIGNALS } from "./scheme-measured-signals.js";
import { NFL_INJURY_SIGNALS } from "./nfl-injury-signals.js";
import { nflEspnEnteringRecordSignal } from "./espn-record-signal.js";
import { classifyNflBroadcast, isStandalonePrimetime } from "./nfl-broadcast.js";

function teamLabel(team: unknown): string | null {
  if (typeof team === "string") return team;
  if (team && typeof team === "object") {
    const row = team as { abbreviation?: unknown; name?: unknown };
    if (typeof row.abbreviation === "string" && row.abbreviation.trim() !== "") return row.abbreviation;
    if (typeof row.name === "string") return row.name;
  }
  return null;
}

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
    // DIRECTION: homeSign +1, neutral 0. The value is a recovery-share deviation
    // from the league baseline: recovering forced fumbles / intercepting above
    // expectation means the DEFENSE did something real, which favors the team
    // being evaluated. The registry's own comment calls this "recovery-share
    // deviation" and splits skill (occurrence) from luck (recovery), so the
    // signed direction is the recovery surplus.
    homeSign: 1 as const,
    neutralValue: 0,
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
  // DIRECTION: homeSign +1, neutral 0. The value is home-relative. A road
  // team on a short week produces a positive value (the road penalty, negated),
  // which favors home. The slate always evaluates the home side, so the away
  // rest column is the road team's rest — reading only the home side made this
  // signal mute on the exact case it exists to see.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const travel = num(ctx.env, "TRAVEL_DISTANCE_MILES");
    const rivalry = bool(ctx.env, "IS_DIVISION_RIVALRY");

    // Slate path. Both rest columns are already on the Game row and already
    // copied into env. The thesis is the ROAD team's short week, which is the
    // away team. Evaluate that side, then flip the sign so a road penalty
    // favors home. Missing travel or rivalry skips that modifier; it does not
    // block the rest component and it is not imputed as 0 miles or "not a rivalry."
    const homeRest = num(ctx.env, "HOME_REST_DAYS");
    const awayRest = num(ctx.env, "AWAY_REST_DAYS");
    if (homeRest != null && awayRest != null) {
      const bridged = evalShortWeekRoadDeficit({
        isRoadTeam: true,
        restDays: awayRest,
        travelDistanceMiles: travel,
        opponentRestDays: homeRest,
        isDivisionRivalry: rivalry,
      });
      if (!bridged.ok) return null;
      const roadTilt = bridged.data.spreadPointsTilt;
      return {
        value: -roadTilt,
        capturedAt: ctx.now().toISOString(),
        metadata: {
          perspective: "home-relative",
          roadSpreadPointAdjustment: roadTilt,
          travelKnown: travel != null,
          rivalryKnown: rivalry != null,
          homeRestDays: homeRest,
          awayRestDays: awayRest,
          explanation: bridged.data.explanation,
        },
      };
    }

    // One-side path, for a caller that evaluated a single team and said which
    // side it is. The tilt is always applied to home probability, so a road
    // team's penalty is negated. A home-side reading is already home-relative.
    const isRoadTeam = bool(ctx.env, "IS_ROAD_TEAM");
    const restDays = num(ctx.env, "REST_DAYS");
    const opponentRestDays = num(ctx.env, "OPP_REST_DAYS");
    if (isRoadTeam == null || restDays == null || opponentRestDays == null) return null;
    const bridged = evalShortWeekRoadDeficit({
      isRoadTeam,
      restDays,
      travelDistanceMiles: travel,
      opponentRestDays,
      isDivisionRivalry: rivalry,
    });
    if (!bridged.ok) return null;
    const sideTilt = bridged.data.spreadPointsTilt;
    return {
      value: isRoadTeam ? -sideTilt : sideTilt,
      capturedAt: ctx.now().toISOString(),
      metadata: {
        perspective: "evaluated-side",
        evaluatedSideTilt: sideTilt,
        travelKnown: travel != null,
        rivalryKnown: rivalry != null,
        explanation: bridged.data.explanation,
      },
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
  // DIRECTION: homeSign +1, neutral 0. expected margin for the team being rested.
  // The evaluator's own field is `expectedMarginAdjustment`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
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
  // DIRECTION: homeSign +1, neutral 0. higher go-rate = more fourth-down attempts = more first downs.
  // The evaluator's own field is `expectedGoProbabilityOnFourthAndShort`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign -1, neutral 0.5. higher expected pass prob on 2nd&10 = pass-leaning, which historically costs; neutral is .5.
  // The evaluator's own field is `expectedPassProbability`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: -1 as const,
  neutralValue: 0.5,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. On a standalone night window the kernel's
  // alpha multiplier (1.18) scales the measured WR1-share gap. A bigger home
  // funnel benefits more from the spotlight. A regional window, or a kickoff
  // we cannot classify, abstains. Route participation is not measured.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const window = classifyNflBroadcast(ctx.commenceTime);
    if (!isStandalonePrimetime(window) || window == null) return null;
    const homeAbbr = nflTeamAbbr(teamLabel(ctx.homeTeam));
    const awayAbbr = nflTeamAbbr(teamLabel(ctx.awayTeam));
    if (homeAbbr == null || awayAbbr == null) return null;
    const home = NFL_SCHEME_PRIOR[homeAbbr];
    const away = NFL_SCHEME_PRIOR[awayAbbr];
    if (home == null || away == null) return null;
    const kernel = evaluatePrimetimeTargetConcentration({
      broadcastWindow: window,
      playerDepthChartRole: "ALPHA_WR1",
      baselineTargetShare: home.wrFunnel,
    });
    const gap = home.wrFunnel - away.wrFunnel;
    const value = Number(((kernel.targetShareMultiplier - 1) * gap).toFixed(4));
    if (!Number.isFinite(value)) return null;
    return {
      value,
      capturedAt: ctx.now().toISOString(),
      metadata: {
        broadcastWindow: window,
        targetShareMultiplier: kernel.targetShareMultiplier,
        homeWrFunnel: home.wrFunnel,
        awayWrFunnel: away.wrFunnel,
        routeParticipationNotMeasured: true,
        season: NFL_SCHEME_PRIOR_SEASON,
      },
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
  dataDependencies: ["nflverse_2025_pbp_pass_oe"],
  activationStatus: "ACTIVE",
  trustWeight: 0.10,
  killLine: KILL_LINE,
  isRightsCleared: () => true,
  acquisitionTask: null,
  blockedReason: null,
  // DIRECTION: homeSign +1, neutral 0. The value is home pass_oe minus away
  // pass_oe, in rate units. A larger value means the home side's prior-season
  // play-calling was more pass-heavy than the visitor's, which favors home.
  // This is nflverse scrimmage pass_oe, all downs, season 2025. It is not the
  // early-down-only kernel. That kernel wants an expected early-down rate and
  // a seconds-per-play pace we do not have, and calling it would mislabel the
  // measurement. The early-down neutral pass rate is recorded in metadata and
  // does not vote.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const homeAbbr = nflTeamAbbr(teamLabel(ctx.homeTeam));
    const awayAbbr = nflTeamAbbr(teamLabel(ctx.awayTeam));
    if (homeAbbr == null || awayAbbr == null) return null;
    const home = NFL_SCHEME_PRIOR[homeAbbr];
    const away = NFL_SCHEME_PRIOR[awayAbbr];
    if (home == null || away == null) return null;
    const value = Number(((home.proePp - away.proePp) / 100).toFixed(4));
    if (!Number.isFinite(value)) return null;
    return {
      value,
      capturedAt: ctx.now().toISOString(),
      metadata: {
        season: NFL_SCHEME_PRIOR_SEASON,
        source: "nflverse pass_oe, scrimmage plays, regular season",
        homeAbbr,
        awayAbbr,
        homeProePp: home.proePp,
        awayProePp: away.proePp,
        homeNeutralPass: home.neutralPass,
        awayNeutralPass: away.neutralPass,
        homePassDefenseRank: home.passDefenseRank,
        awayPassDefenseRank: away.passDefenseRank,
      },
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
  // DIRECTION: homeSign +1, neutral 0. more points added per opportunity is better for the offense.
  // The evaluator's own field is `expectedPointsAddedPerTwoMinuteOpportunity`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign -1, neutral 0. negative value means opponent EPA falls (good for defense).
  // The evaluator's own field is `opponentFirstHalfEpaDelta`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: -1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. offensive EPA adjustment; positive is better for the offense.
  // The evaluator's own field is `offensiveEpaAdjustment`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
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
  // DIRECTION: homeSign +1, neutral 0. continuity trust index: larger = more trusted chemistry.
  // The evaluator's own field is `trustIndex`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. expected spread adjustment from penalties.
  // The evaluator's own field is `expectedSpreadAdjustmentPoints`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign -1, neutral 0. lower average depth of target = less efficient passing game.
  // The evaluator's own field is `adjustedAdot`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: -1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign -1, neutral 0. man-zone coverage inflates aDot against the archetype.
  // The evaluator's own field is `adjustedAdot`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: -1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
    // DIRECTION: homeSign +1, neutral 0. The local placeholder computes
    // `edge = (reallocation - wr2TargetShare) * 0.6` — how much better the offense
    // does after its WR1 goes out than the WR2's share alone predicts. A larger
    // value means the offense absorbed the loss better. NOTE: this signal wraps a
    // locally-defined placeholder, not the upstream WR1 redistributor; that is
    // flagged as an open wiring item rather than silently counted as covered.
    homeSign: 1 as const,
    neutralValue: 0,
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
  // DIRECTION: homeSign +1, neutral 0. higher high-value touch score = better red-zone conversion.
  // The evaluator's own field is `highValueTouchScore`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. edge over naive Poisson = genuine red-zone TD skill.
  // The evaluator's own field is `edgeOverPoissonAnytimeTd`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. play-action EPA bonus; positive is better for the offense.
  // The evaluator's own field is `playActionEpaBonus`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. a higher target share is a breakout.
  // The evaluator's own field is `adjustedTargetShare`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. altitude spreads against the VISITING team, so this is signed for the picked side.
  // The evaluator's own field is `spreadPointAdjustment`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  // DIRECTION: homeSign +1, neutral 0. Wind suppresses passing yards. The
  // home-relative value is that suppression times (home pass rate minus away
  // pass rate). A pass-heavier home side is hurt. A pass-heavier visitor is
  // hurt, which favors home. Equal pass rates say nothing. No measured
  // passing-yards baseline, so the projection is not used.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const wind = num(ctx.env, "WIND_MPH");
    if (wind == null) return null;
    const homeAbbr = nflTeamAbbr(teamLabel(ctx.homeTeam));
    const awayAbbr = nflTeamAbbr(teamLabel(ctx.awayTeam));
    if (homeAbbr == null || awayAbbr == null) return null;
    const home = NFL_SCHEME_PRIOR[homeAbbr];
    const away = NFL_SCHEME_PRIOR[awayAbbr];
    if (home == null || away == null) return null;
    const bridged = evalLinearWindPassImpact({
      windSpeedMph: wind,
      isEnclosedOrDome: bool(ctx.env, "IS_DOME") === true,
      baselinePassingYards: null,
    });
    if (!bridged.ok) return null;
    const passGap = home.passRate - away.passRate;
    const value = Number((bridged.data.passingYardsTilt * passGap).toFixed(4));
    if (!Number.isFinite(value)) return null;
    return {
      value,
      capturedAt: ctx.now().toISOString(),
      metadata: {
        windMph: wind,
        passingYardsTilt: bridged.data.passingYardsTilt,
        homePassRate: home.passRate,
        awayPassRate: away.passRate,
        stadium: ctx.env.WEATHER_STADIUM ?? null,
        baselineNotMeasured: true,
      },
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
  // DIRECTION: homeSign +1, neutral 0. Cold and precipitation suppress passing.
  // The yards adjustment is applied to the pass-rate gap, so the more pass-heavy
  // side is hurt. Heavy rain is not inferred from a forecast word. Snow, freezing
  // rain, and light rain are. No forecast text means no precipitation claim.
  homeSign: 1 as const,
  neutralValue: 0,
  evaluate: async (ctx) => {
    if (ctx.sportKey !== "americanfootball_nfl") return null;
    const temp = num(ctx.env, "TEMP_F");
    const precipRaw = ctx.env.PRECIP_TYPE;
    if (temp == null || precipRaw == null) return null;
    const allowed = ["NONE", "LIGHT_RAIN", "HEAVY_RAIN", "SNOW", "FREEZING_RAIN"] as const;
    if (!allowed.includes(precipRaw as (typeof allowed)[number])) return null;
    const homeAbbr = nflTeamAbbr(teamLabel(ctx.homeTeam));
    const awayAbbr = nflTeamAbbr(teamLabel(ctx.awayTeam));
    if (homeAbbr == null || awayAbbr == null) return null;
    const home = NFL_SCHEME_PRIOR[homeAbbr];
    const away = NFL_SCHEME_PRIOR[awayAbbr];
    if (home == null || away == null) return null;
    const kernel = evaluateTemperaturePrecipitationDecay({
      temperatureFahrenheit: temp,
      precipitationType: precipRaw as (typeof allowed)[number],
      isDomeVenue: bool(ctx.env, "IS_DOME") === true,
    });
    const passGap = home.passRate - away.passRate;
    const value = Number((kernel.passingYardsAdjustment * passGap).toFixed(4));
    if (!Number.isFinite(value)) return null;
    return {
      value,
      capturedAt: ctx.now().toISOString(),
      metadata: {
        tempF: temp,
        precipType: precipRaw,
        passingYardsAdjustment: kernel.passingYardsAdjustment,
        passGap,
        baselineNotMeasured: true,
      },
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
  // DIRECTION: homeSign -1, neutral 1. a LOWER multiplier means more late-game decay; neutral is 1.
  // The evaluator's own field is `lateGameExplosiveRunDecayMultiplier`; the registry previously read
  // a field this result does not return, so `?? 0` made it silently emit nothing.
  homeSign: -1 as const,
  neutralValue: 1,
  evaluate: async () => {
    // The kernel's input contract does not match the env keys this wrapper
    // used to pass, and the result was read off a field the kernel does not
    // return. That read emits 0, which is a vote the measurement never made.
    // Abstain. The sanctioned call is the matching function in
    // signals-bridge.ts, and it stays unwired until its real inputs exist in
    // the schema. Do not restore a type-erasing call.
    return null;
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
  ...SCHEME_MEASURED_SIGNALS,
  ...NFL_INJURY_SIGNALS,
  nflEspnEnteringRecordSignal,
];
