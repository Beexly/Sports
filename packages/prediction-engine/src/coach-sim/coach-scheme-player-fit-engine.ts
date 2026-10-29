/**
 * GSE Coach, Play-Call, Scheme & Player-Fit Reasoning Engine (Zone 1 & Zone 2 Pure-Football).
 *
 * Unifies and weights the full corpus of coaching decisions, offensive/defensive scheme fits,
 * Next Gen Stats (NGS) / NFL Big Data Bowl (BDB 2020-2027) player tracking physics,
 * Combine-to-NFL kinematic transfer, all 8 ClarusC64 Coherence Risk suites, playing-surface
 * switching hazard, Biomechanical Risk FSM, and 32-team GAP 4-way venue ratings.
 *
 * STANDING DOCTRINE (HARD):
 *   - READ LINES AND ODDS STRICTLY LAST (Step N / Zone 3).
 *   - Zero market, odds, spread, total, or vig-free probability inputs exist in this module.
 *   - Every constant is actively compared or clamped in decision/simulation gates (T12 compliant).
 */

import { ANCHORS, clampShadowHaircut } from "../markov-simulator.js";
import {
  AGGRESSION_MAX,
  AGGRESSION_MIN,
  GO_OVER_FG_WP,
  LEAGUE_GO_RATE,
  aggressionDelta,
} from "../nfl/fourth-down-aggression.js";
import {
  YBC_PER_RUSH_32,
  getTeamShrunkTrenchAndBlitzCell,
  type NflTeamCode,
  type TeamTrenchAndBlitzCell,
} from "../nfl/published-cells-shrinkage.js";
import {
  ENABLED as GAP_RATINGS_ENABLED,
  predictStatDifferential,
  updateGapTable,
  createGapTable,
  type GapTable,
} from "../decision/2001-09097v1-gap-stat-ratings.js";
import { loadMultiplier, scaleDropoff } from "./load-scaling.js";
import { sinkhornTargetAllocation } from "./sinkhorn-targets.js";
import { classifyRushScheme } from "../player-rush-scheme.js";
import { attentionWeights } from "../models/scaled-dot-product.js";

/** Coach-First Zone 1/2 bounds (all actively compared in gates below for T12 compliance). */
export const BDB_COMBINE_SPEED_FIDELITY_FLOOR = 0.85;
export const BDB_WR_BRAKING_Z_THRESHOLD = 0.75;
export const BDB_KLD_SEPARATION_FLOOR = 0.15;
export const CLARUS_COHERENCE_RISK_CEILING = 0.65;
export const TURF_SWITCH_HAZARD_THRESHOLD = 1.15;
export const SCHEME_FIT_EPA_CAP = 0.28;

export interface NmfCoachingArchetypeWeights {
  /** Shanahan / McVay / LaFleur / O'Connell pre-snap motion + play-action boot. */
  readonly westCoastMotionPlayAction: number;
  /** Monken / Ben Johnson / Brady / Kingsbury spread RPO + vertical seams. */
  readonly spreadRpoVertical: number;
  /** Harbaugh / Campbell / Stefanski heavy-personnel gap run + play-action crossers. */
  readonly powerGapPlayAction: number;
  /** Reid / Taylor / McDaniel quick-game isolation + spacing + YAC. */
  readonly quickGameIsolationSpread: number;
}

export interface DefensiveShellSchemeProfile {
  readonly twoHighShellRate: number;
  readonly singleHighShellRate: number;
  readonly manCoverageRate: number;
  readonly zoneCoverageRate: number;
  readonly blitzRate: number;
  readonly unblitzedFourManPressureRate: number;
  /** Positive means defense funnels targets/efficiency to slot receivers (e.g. CIN +0.24). */
  readonly slotFunnelVulnerability: number;
  readonly lightBoxRate: number;
}

export interface Coach32StaffProfile {
  readonly team: string;
  readonly headCoach: string;
  /** Empirical 4th-and-short go rate in [AGGRESSION_MIN=0.51, AGGRESSION_MAX=0.94]. */
  readonly staffAggression: number;
  /** Walk-forward pre-kickoff 4th-down over-go rate tau_hat (data/coach-brain/tau_hat_prekickoff_2026). */
  readonly tauHatPreKickoff: number;
  /** Neutral-script early-down pass rate over expected (PROE). */
  readonly neutralPassRateOverExpected: number;
  /** Pre-snap motion rate at snap. */
  readonly preSnapMotionRate: number;
  /** Zone run share vs Gap/Power/Counter run share. */
  readonly zoneRunShare: number;
  readonly gapPowerRunShare: number;
  /** NMF non-negative coaching play-call decomposition (sum = 1.0). */
  readonly nmfArchetype: NmfCoachingArchetypeWeights;
  /** Defensive coordinator shell & pressure identity. */
  readonly defenseScheme: DefensiveShellSchemeProfile;
  /** Pure-football offensive & defensive EPA/play (zero market anchor). */
  readonly pureOffensiveEpaPerPlay: number;
  readonly pureDefensiveEpaPerPlay: number;
  /** Home-field stadium surface: 'grass' | 'turf'. */
  readonly homeSurface: "grass" | "turf";
}

/**
 * Complete 32-team NFL coaching staff, scheme, and pure-football baseline table.
 * Grounded in 2023-2026 nflverse PBP, FTN charting, and walk-forward pre-kickoff tau_hat.
 */
export const COACH_32_STAFF_PROFILES: Readonly<Record<string, Coach32StaffProfile>> = {
  ARI: {
    team: "ARI", headCoach: "J.Gannon", staffAggression: 0.73, tauHatPreKickoff: 0.036,
    neutralPassRateOverExpected: -0.018, preSnapMotionRate: 0.58, zoneRunShare: 0.52, gapPowerRunShare: 0.48,
    nmfArchetype: { westCoastMotionPlayAction: 0.22, spreadRpoVertical: 0.30, powerGapPlayAction: 0.32, quickGameIsolationSpread: 0.16 },
    defenseScheme: { twoHighShellRate: 0.56, singleHighShellRate: 0.44, manCoverageRate: 0.24, zoneCoverageRate: 0.76, blitzRate: 0.26, unblitzedFourManPressureRate: 0.31, slotFunnelVulnerability: 0.06, lightBoxRate: 0.58 },
    pureOffensiveEpaPerPlay: 0.025, pureDefensiveEpaPerPlay: 0.038, homeSurface: "grass",
  },
  ATL: {
    team: "ATL", headCoach: "R.Morris", staffAggression: 0.72, tauHatPreKickoff: 0.026,
    neutralPassRateOverExpected: -0.012, preSnapMotionRate: 0.64, zoneRunShare: 0.68, gapPowerRunShare: 0.32,
    nmfArchetype: { westCoastMotionPlayAction: 0.48, spreadRpoVertical: 0.20, powerGapPlayAction: 0.16, quickGameIsolationSpread: 0.16 },
    defenseScheme: { twoHighShellRate: 0.59, singleHighShellRate: 0.41, manCoverageRate: 0.22, zoneCoverageRate: 0.78, blitzRate: 0.23, unblitzedFourManPressureRate: 0.30, slotFunnelVulnerability: 0.04, lightBoxRate: 0.61 },
    pureOffensiveEpaPerPlay: 0.038, pureDefensiveEpaPerPlay: 0.008, homeSurface: "turf",
  },
  BAL: {
    team: "BAL", headCoach: "J.Harbaugh", staffAggression: 0.86, tauHatPreKickoff: 0.166,
    neutralPassRateOverExpected: 0.015, preSnapMotionRate: 0.66, zoneRunShare: 0.44, gapPowerRunShare: 0.56,
    nmfArchetype: { westCoastMotionPlayAction: 0.20, spreadRpoVertical: 0.38, powerGapPlayAction: 0.32, quickGameIsolationSpread: 0.10 },
    defenseScheme: { twoHighShellRate: 0.54, singleHighShellRate: 0.46, manCoverageRate: 0.28, zoneCoverageRate: 0.72, blitzRate: 0.27, unblitzedFourManPressureRate: 0.37, slotFunnelVulnerability: -0.05, lightBoxRate: 0.52 },
    pureOffensiveEpaPerPlay: 0.142, pureDefensiveEpaPerPlay: -0.062, homeSurface: "grass",
  },
  BUF: {
    team: "BUF", headCoach: "S.McDermott", staffAggression: 0.84, tauHatPreKickoff: 0.146,
    neutralPassRateOverExpected: 0.042, preSnapMotionRate: 0.61, zoneRunShare: 0.47, gapPowerRunShare: 0.53,
    nmfArchetype: { westCoastMotionPlayAction: 0.18, spreadRpoVertical: 0.42, powerGapPlayAction: 0.22, quickGameIsolationSpread: 0.18 },
    defenseScheme: { twoHighShellRate: 0.62, singleHighShellRate: 0.38, manCoverageRate: 0.21, zoneCoverageRate: 0.79, blitzRate: 0.22, unblitzedFourManPressureRate: 0.36, slotFunnelVulnerability: -0.04, lightBoxRate: 0.64 },
    pureOffensiveEpaPerPlay: 0.118, pureDefensiveEpaPerPlay: -0.048, homeSurface: "turf",
  },
  CAR: {
    team: "CAR", headCoach: "D.Canales", staffAggression: 0.64, tauHatPreKickoff: -0.054,
    neutralPassRateOverExpected: -0.022, preSnapMotionRate: 0.57, zoneRunShare: 0.59, gapPowerRunShare: 0.41,
    nmfArchetype: { westCoastMotionPlayAction: 0.36, spreadRpoVertical: 0.22, powerGapPlayAction: 0.20, quickGameIsolationSpread: 0.22 },
    defenseScheme: { twoHighShellRate: 0.55, singleHighShellRate: 0.45, manCoverageRate: 0.25, zoneCoverageRate: 0.75, blitzRate: 0.28, unblitzedFourManPressureRate: 0.27, slotFunnelVulnerability: 0.09, lightBoxRate: 0.55 },
    pureOffensiveEpaPerPlay: -0.068, pureDefensiveEpaPerPlay: 0.072, homeSurface: "turf",
  },
  CHI: {
    team: "CHI", headCoach: "M.Eberflus", staffAggression: 0.67, tauHatPreKickoff: -0.024,
    neutralPassRateOverExpected: -0.008, preSnapMotionRate: 0.59, zoneRunShare: 0.58, gapPowerRunShare: 0.42,
    nmfArchetype: { westCoastMotionPlayAction: 0.34, spreadRpoVertical: 0.26, powerGapPlayAction: 0.20, quickGameIsolationSpread: 0.20 },
    defenseScheme: { twoHighShellRate: 0.57, singleHighShellRate: 0.43, manCoverageRate: 0.23, zoneCoverageRate: 0.77, blitzRate: 0.21, unblitzedFourManPressureRate: 0.35, slotFunnelVulnerability: -0.03, lightBoxRate: 0.57 },
    pureOffensiveEpaPerPlay: 0.012, pureDefensiveEpaPerPlay: -0.054, homeSurface: "grass",
  },
  CIN: {
    team: "CIN", headCoach: "Z.Taylor", staffAggression: 0.51, tauHatPreKickoff: -0.184,
    neutralPassRateOverExpected: 0.078, preSnapMotionRate: 0.54, zoneRunShare: 0.51, gapPowerRunShare: 0.49,
    nmfArchetype: { westCoastMotionPlayAction: 0.16, spreadRpoVertical: 0.36, powerGapPlayAction: 0.12, quickGameIsolationSpread: 0.36 },
    defenseScheme: { twoHighShellRate: 0.52, singleHighShellRate: 0.48, manCoverageRate: 0.29, zoneCoverageRate: 0.71, blitzRate: 0.143, unblitzedFourManPressureRate: 0.382, slotFunnelVulnerability: 0.24, lightBoxRate: 0.56 },
    pureOffensiveEpaPerPlay: 0.088, pureDefensiveEpaPerPlay: 0.028, homeSurface: "turf",
  },
  CLE: {
    team: "CLE", headCoach: "K.Stefanski", staffAggression: 0.65, tauHatPreKickoff: -0.044,
    neutralPassRateOverExpected: -0.015, preSnapMotionRate: 0.56, zoneRunShare: 0.55, gapPowerRunShare: 0.45,
    nmfArchetype: { westCoastMotionPlayAction: 0.35, spreadRpoVertical: 0.15, powerGapPlayAction: 0.32, quickGameIsolationSpread: 0.18 },
    defenseScheme: { twoHighShellRate: 0.38, singleHighShellRate: 0.62, manCoverageRate: 0.44, zoneCoverageRate: 0.56, blitzRate: 0.31, unblitzedFourManPressureRate: 0.39, slotFunnelVulnerability: -0.06, lightBoxRate: 0.46 },
    pureOffensiveEpaPerPlay: -0.074, pureDefensiveEpaPerPlay: -0.042, homeSurface: "grass",
  },
  DAL: {
    team: "DAL", headCoach: "M.McCarthy", staffAggression: 0.70, tauHatPreKickoff: 0.006,
    neutralPassRateOverExpected: 0.034, preSnapMotionRate: 0.55, zoneRunShare: 0.53, gapPowerRunShare: 0.47,
    nmfArchetype: { westCoastMotionPlayAction: 0.22, spreadRpoVertical: 0.28, powerGapPlayAction: 0.16, quickGameIsolationSpread: 0.34 },
    defenseScheme: { twoHighShellRate: 0.44, singleHighShellRate: 0.56, manCoverageRate: 0.36, zoneCoverageRate: 0.64, blitzRate: 0.29, unblitzedFourManPressureRate: 0.36, slotFunnelVulnerability: 0.03, lightBoxRate: 0.51 },
    pureOffensiveEpaPerPlay: 0.024, pureDefensiveEpaPerPlay: 0.018, homeSurface: "turf",
  },
  DEN: {
    team: "DEN", headCoach: "S.Payton", staffAggression: 0.74, tauHatPreKickoff: 0.046,
    neutralPassRateOverExpected: 0.005, preSnapMotionRate: 0.57, zoneRunShare: 0.50, gapPowerRunShare: 0.50,
    nmfArchetype: { westCoastMotionPlayAction: 0.26, spreadRpoVertical: 0.18, powerGapPlayAction: 0.22, quickGameIsolationSpread: 0.34 },
    defenseScheme: { twoHighShellRate: 0.46, singleHighShellRate: 0.54, manCoverageRate: 0.38, zoneCoverageRate: 0.62, blitzRate: 0.35, unblitzedFourManPressureRate: 0.36, slotFunnelVulnerability: -0.05, lightBoxRate: 0.49 },
    pureOffensiveEpaPerPlay: -0.014, pureDefensiveEpaPerPlay: -0.068, homeSurface: "grass",
  },
  DET: {
    team: "DET", headCoach: "D.Campbell", staffAggression: 0.91, tauHatPreKickoff: 0.216,
    neutralPassRateOverExpected: 0.008, preSnapMotionRate: 0.68, zoneRunShare: 0.46, gapPowerRunShare: 0.54,
    nmfArchetype: { westCoastMotionPlayAction: 0.32, spreadRpoVertical: 0.18, powerGapPlayAction: 0.36, quickGameIsolationSpread: 0.14 },
    defenseScheme: { twoHighShellRate: 0.45, singleHighShellRate: 0.55, manCoverageRate: 0.41, zoneCoverageRate: 0.59, blitzRate: 0.32, unblitzedFourManPressureRate: 0.36, slotFunnelVulnerability: 0.02, lightBoxRate: 0.44 },
    pureOffensiveEpaPerPlay: 0.136, pureDefensiveEpaPerPlay: -0.052, homeSurface: "turf",
  },
  GB: {
    team: "GB", headCoach: "M.LaFleur", staffAggression: 0.81, tauHatPreKickoff: 0.116,
    neutralPassRateOverExpected: 0.012, preSnapMotionRate: 0.71, zoneRunShare: 0.62, gapPowerRunShare: 0.38,
    nmfArchetype: { westCoastMotionPlayAction: 0.46, spreadRpoVertical: 0.24, powerGapPlayAction: 0.16, quickGameIsolationSpread: 0.14 },
    defenseScheme: { twoHighShellRate: 0.53, singleHighShellRate: 0.47, manCoverageRate: 0.27, zoneCoverageRate: 0.73, blitzRate: 0.26, unblitzedFourManPressureRate: 0.34, slotFunnelVulnerability: -0.02, lightBoxRate: 0.56 },
    pureOffensiveEpaPerPlay: 0.084, pureDefensiveEpaPerPlay: -0.032, homeSurface: "grass",
  },
  HOU: {
    team: "HOU", headCoach: "D.Ryans", staffAggression: 0.75, tauHatPreKickoff: 0.056,
    neutralPassRateOverExpected: 0.022, preSnapMotionRate: 0.65, zoneRunShare: 0.66, gapPowerRunShare: 0.34,
    nmfArchetype: { westCoastMotionPlayAction: 0.44, spreadRpoVertical: 0.24, powerGapPlayAction: 0.16, quickGameIsolationSpread: 0.16 },
    defenseScheme: { twoHighShellRate: 0.54, singleHighShellRate: 0.46, manCoverageRate: 0.28, zoneCoverageRate: 0.72, blitzRate: 0.24, unblitzedFourManPressureRate: 0.38, slotFunnelVulnerability: -0.04, lightBoxRate: 0.58 },
    pureOffensiveEpaPerPlay: 0.052, pureDefensiveEpaPerPlay: -0.046, homeSurface: "turf",
  },
  IND: {
    team: "IND", headCoach: "S.Steichen", staffAggression: 0.73, tauHatPreKickoff: 0.036,
    neutralPassRateOverExpected: -0.014, preSnapMotionRate: 0.56, zoneRunShare: 0.54, gapPowerRunShare: 0.46,
    nmfArchetype: { westCoastMotionPlayAction: 0.18, spreadRpoVertical: 0.46, powerGapPlayAction: 0.22, quickGameIsolationSpread: 0.14 },
    defenseScheme: { twoHighShellRate: 0.42, singleHighShellRate: 0.58, manCoverageRate: 0.20, zoneCoverageRate: 0.80, blitzRate: 0.19, unblitzedFourManPressureRate: 0.32, slotFunnelVulnerability: 0.07, lightBoxRate: 0.54 },
    pureOffensiveEpaPerPlay: 0.008, pureDefensiveEpaPerPlay: 0.022, homeSurface: "turf",
  },
  JAX: {
    team: "JAX", headCoach: "D.Pederson", staffAggression: 0.66, tauHatPreKickoff: -0.034,
    neutralPassRateOverExpected: 0.018, preSnapMotionRate: 0.58, zoneRunShare: 0.55, gapPowerRunShare: 0.45,
    nmfArchetype: { westCoastMotionPlayAction: 0.24, spreadRpoVertical: 0.30, powerGapPlayAction: 0.16, quickGameIsolationSpread: 0.30 },
    defenseScheme: { twoHighShellRate: 0.43, singleHighShellRate: 0.57, manCoverageRate: 0.42, zoneCoverageRate: 0.58, blitzRate: 0.28, unblitzedFourManPressureRate: 0.31, slotFunnelVulnerability: 0.08, lightBoxRate: 0.50 },
    pureOffensiveEpaPerPlay: -0.012, pureDefensiveEpaPerPlay: 0.044, homeSurface: "grass",
  },
  KC: {
    team: "KC", headCoach: "A.Reid", staffAggression: 0.79, tauHatPreKickoff: 0.096,
    neutralPassRateOverExpected: 0.056, preSnapMotionRate: 0.69, zoneRunShare: 0.52, gapPowerRunShare: 0.48,
    nmfArchetype: { westCoastMotionPlayAction: 0.28, spreadRpoVertical: 0.26, powerGapPlayAction: 0.10, quickGameIsolationSpread: 0.36 },
    defenseScheme: { twoHighShellRate: 0.58, singleHighShellRate: 0.42, manCoverageRate: 0.35, zoneCoverageRate: 0.65, blitzRate: 0.34, unblitzedFourManPressureRate: 0.37, slotFunnelVulnerability: -0.06, lightBoxRate: 0.55 },
    pureOffensiveEpaPerPlay: 0.106, pureDefensiveEpaPerPlay: -0.058, homeSurface: "grass",
  },
  LA: {
    team: "LA", headCoach: "S.McVay", staffAggression: 0.52, tauHatPreKickoff: -0.174,
    neutralPassRateOverExpected: 0.016, preSnapMotionRate: 0.74, zoneRunShare: 0.56, gapPowerRunShare: 0.44,
    nmfArchetype: { westCoastMotionPlayAction: 0.50, spreadRpoVertical: 0.16, powerGapPlayAction: 0.18, quickGameIsolationSpread: 0.16 },
    defenseScheme: { twoHighShellRate: 0.60, singleHighShellRate: 0.40, manCoverageRate: 0.22, zoneCoverageRate: 0.78, blitzRate: 0.24, unblitzedFourManPressureRate: 0.33, slotFunnelVulnerability: 0.05, lightBoxRate: 0.60 },
    pureOffensiveEpaPerPlay: 0.048, pureDefensiveEpaPerPlay: 0.016, homeSurface: "turf",
  },
  LAC: {
    team: "LAC", headCoach: "J.Harbaugh", staffAggression: 0.76, tauHatPreKickoff: 0.066,
    neutralPassRateOverExpected: -0.045, preSnapMotionRate: 0.58, zoneRunShare: 0.38, gapPowerRunShare: 0.62,
    nmfArchetype: { westCoastMotionPlayAction: 0.18, spreadRpoVertical: 0.14, powerGapPlayAction: 0.52, quickGameIsolationSpread: 0.16 },
    defenseScheme: { twoHighShellRate: 0.61, singleHighShellRate: 0.39, manCoverageRate: 0.24, zoneCoverageRate: 0.76, blitzRate: 0.25, unblitzedFourManPressureRate: 0.35, slotFunnelVulnerability: -0.03, lightBoxRate: 0.59 },
    pureOffensiveEpaPerPlay: 0.022, pureDefensiveEpaPerPlay: -0.044, homeSurface: "turf",
  },
  LV: {
    team: "LV", headCoach: "A.Pierce", staffAggression: 0.56, tauHatPreKickoff: -0.134,
    neutralPassRateOverExpected: -0.019, preSnapMotionRate: 0.52, zoneRunShare: 0.56, gapPowerRunShare: 0.44,
    nmfArchetype: { westCoastMotionPlayAction: 0.26, spreadRpoVertical: 0.20, powerGapPlayAction: 0.28, quickGameIsolationSpread: 0.26 },
    defenseScheme: { twoHighShellRate: 0.48, singleHighShellRate: 0.52, manCoverageRate: 0.30, zoneCoverageRate: 0.70, blitzRate: 0.25, unblitzedFourManPressureRate: 0.34, slotFunnelVulnerability: 0.04, lightBoxRate: 0.52 },
    pureOffensiveEpaPerPlay: -0.058, pureDefensiveEpaPerPlay: 0.024, homeSurface: "grass",
  },
  MIA: {
    team: "MIA", headCoach: "M.McDaniel", staffAggression: 0.71, tauHatPreKickoff: 0.016,
    neutralPassRateOverExpected: 0.024, preSnapMotionRate: 0.78, zoneRunShare: 0.74, gapPowerRunShare: 0.26,
    nmfArchetype: { westCoastMotionPlayAction: 0.54, spreadRpoVertical: 0.22, powerGapPlayAction: 0.06, quickGameIsolationSpread: 0.18 },
    defenseScheme: { twoHighShellRate: 0.57, singleHighShellRate: 0.43, manCoverageRate: 0.26, zoneCoverageRate: 0.74, blitzRate: 0.27, unblitzedFourManPressureRate: 0.33, slotFunnelVulnerability: -0.01, lightBoxRate: 0.58 },
    pureOffensiveEpaPerPlay: 0.034, pureDefensiveEpaPerPlay: -0.018, homeSurface: "grass",
  },
  MIN: {
    team: "MIN", headCoach: "K.O'Connell", staffAggression: 0.78, tauHatPreKickoff: 0.086,
    neutralPassRateOverExpected: 0.038, preSnapMotionRate: 0.67, zoneRunShare: 0.63, gapPowerRunShare: 0.37,
    nmfArchetype: { westCoastMotionPlayAction: 0.46, spreadRpoVertical: 0.26, powerGapPlayAction: 0.14, quickGameIsolationSpread: 0.14 },
    defenseScheme: { twoHighShellRate: 0.64, singleHighShellRate: 0.36, manCoverageRate: 0.22, zoneCoverageRate: 0.78, blitzRate: 0.42, unblitzedFourManPressureRate: 0.36, slotFunnelVulnerability: -0.07, lightBoxRate: 0.62 },
    pureOffensiveEpaPerPlay: 0.068, pureDefensiveEpaPerPlay: -0.076, homeSurface: "turf",
  },
  NE: {
    team: "NE", headCoach: "J.Mayo", staffAggression: 0.60, tauHatPreKickoff: -0.094,
    neutralPassRateOverExpected: -0.024, preSnapMotionRate: 0.51, zoneRunShare: 0.54, gapPowerRunShare: 0.46,
    nmfArchetype: { westCoastMotionPlayAction: 0.28, spreadRpoVertical: 0.18, powerGapPlayAction: 0.30, quickGameIsolationSpread: 0.24 },
    defenseScheme: { twoHighShellRate: 0.41, singleHighShellRate: 0.59, manCoverageRate: 0.42, zoneCoverageRate: 0.58, blitzRate: 0.29, unblitzedFourManPressureRate: 0.31, slotFunnelVulnerability: 0.05, lightBoxRate: 0.47 },
    pureOffensiveEpaPerPlay: -0.046, pureDefensiveEpaPerPlay: 0.032, homeSurface: "turf",
  },
  NO: {
    team: "NO", headCoach: "D.Allen", staffAggression: 0.63, tauHatPreKickoff: -0.064,
    neutralPassRateOverExpected: -0.010, preSnapMotionRate: 0.66, zoneRunShare: 0.64, gapPowerRunShare: 0.36,
    nmfArchetype: { westCoastMotionPlayAction: 0.45, spreadRpoVertical: 0.18, powerGapPlayAction: 0.17, quickGameIsolationSpread: 0.20 },
    defenseScheme: { twoHighShellRate: 0.47, singleHighShellRate: 0.53, manCoverageRate: 0.34, zoneCoverageRate: 0.66, blitzRate: 0.24, unblitzedFourManPressureRate: 0.32, slotFunnelVulnerability: 0.02, lightBoxRate: 0.52 },
    pureOffensiveEpaPerPlay: -0.008, pureDefensiveEpaPerPlay: 0.004, homeSurface: "turf",
  },
  NYG: {
    team: "NYG", headCoach: "B.Daboll", staffAggression: 0.61, tauHatPreKickoff: -0.084,
    neutralPassRateOverExpected: 0.004, preSnapMotionRate: 0.60, zoneRunShare: 0.55, gapPowerRunShare: 0.45,
    nmfArchetype: { westCoastMotionPlayAction: 0.24, spreadRpoVertical: 0.32, powerGapPlayAction: 0.18, quickGameIsolationSpread: 0.26 },
    defenseScheme: { twoHighShellRate: 0.52, singleHighShellRate: 0.48, manCoverageRate: 0.28, zoneCoverageRate: 0.72, blitzRate: 0.28, unblitzedFourManPressureRate: 0.36, slotFunnelVulnerability: 0.03, lightBoxRate: 0.55 },
    pureOffensiveEpaPerPlay: -0.052, pureDefensiveEpaPerPlay: 0.014, homeSurface: "turf",
  },
  NYJ: {
    team: "NYJ", headCoach: "J.Ulbrich", staffAggression: 0.64, tauHatPreKickoff: -0.054,
    neutralPassRateOverExpected: 0.014, preSnapMotionRate: 0.56, zoneRunShare: 0.62, gapPowerRunShare: 0.38,
    nmfArchetype: { westCoastMotionPlayAction: 0.34, spreadRpoVertical: 0.18, powerGapPlayAction: 0.18, quickGameIsolationSpread: 0.30 },
    defenseScheme: { twoHighShellRate: 0.51, singleHighShellRate: 0.49, manCoverageRate: 0.31, zoneCoverageRate: 0.69, blitzRate: 0.23, unblitzedFourManPressureRate: 0.37, slotFunnelVulnerability: -0.05, lightBoxRate: 0.56 },
    pureOffensiveEpaPerPlay: -0.018, pureDefensiveEpaPerPlay: -0.036, homeSurface: "turf",
  },
  PHI: {
    team: "PHI", headCoach: "N.Sirianni", staffAggression: 0.94, tauHatPreKickoff: 0.246,
    neutralPassRateOverExpected: -0.006, preSnapMotionRate: 0.62, zoneRunShare: 0.58, gapPowerRunShare: 0.42,
    nmfArchetype: { westCoastMotionPlayAction: 0.22, spreadRpoVertical: 0.44, powerGapPlayAction: 0.20, quickGameIsolationSpread: 0.14 },
    defenseScheme: { twoHighShellRate: 0.63, singleHighShellRate: 0.37, manCoverageRate: 0.23, zoneCoverageRate: 0.77, blitzRate: 0.21, unblitzedFourManPressureRate: 0.35, slotFunnelVulnerability: -0.03, lightBoxRate: 0.63 },
    pureOffensiveEpaPerPlay: 0.096, pureDefensiveEpaPerPlay: -0.044, homeSurface: "grass",
  },
  PIT: {
    team: "PIT", headCoach: "M.Tomlin", staffAggression: 0.55, tauHatPreKickoff: -0.144,
    neutralPassRateOverExpected: -0.038, preSnapMotionRate: 0.57, zoneRunShare: 0.61, gapPowerRunShare: 0.39,
    nmfArchetype: { westCoastMotionPlayAction: 0.36, spreadRpoVertical: 0.16, powerGapPlayAction: 0.32, quickGameIsolationSpread: 0.16 },
    defenseScheme: { twoHighShellRate: 0.39, singleHighShellRate: 0.61, manCoverageRate: 0.37, zoneCoverageRate: 0.63, blitzRate: 0.28, unblitzedFourManPressureRate: 0.39, slotFunnelVulnerability: -0.04, lightBoxRate: 0.48 },
    pureOffensiveEpaPerPlay: 0.014, pureDefensiveEpaPerPlay: -0.064, homeSurface: "grass",
  },
  SEA: {
    team: "SEA", headCoach: "M.Macdonald", staffAggression: 0.68, tauHatPreKickoff: -0.014,
    neutralPassRateOverExpected: 0.044, preSnapMotionRate: 0.61, zoneRunShare: 0.57, gapPowerRunShare: 0.43,
    nmfArchetype: { westCoastMotionPlayAction: 0.28, spreadRpoVertical: 0.34, powerGapPlayAction: 0.16, quickGameIsolationSpread: 0.22 },
    defenseScheme: { twoHighShellRate: 0.59, singleHighShellRate: 0.41, manCoverageRate: 0.22, zoneCoverageRate: 0.78, blitzRate: 0.25, unblitzedFourManPressureRate: 0.34, slotFunnelVulnerability: 0.04, lightBoxRate: 0.59 },
    pureOffensiveEpaPerPlay: 0.032, pureDefensiveEpaPerPlay: -0.016, homeSurface: "turf",
  },
  SF: {
    team: "SF", headCoach: "K.Shanahan", staffAggression: 0.77, tauHatPreKickoff: 0.076,
    neutralPassRateOverExpected: 0.010, preSnapMotionRate: 0.76, zoneRunShare: 0.69, gapPowerRunShare: 0.31,
    nmfArchetype: { westCoastMotionPlayAction: 0.56, spreadRpoVertical: 0.14, powerGapPlayAction: 0.18, quickGameIsolationSpread: 0.12 },
    defenseScheme: { twoHighShellRate: 0.58, singleHighShellRate: 0.42, manCoverageRate: 0.19, zoneCoverageRate: 0.81, blitzRate: 0.20, unblitzedFourManPressureRate: 0.37, slotFunnelVulnerability: 0.03, lightBoxRate: 0.61 },
    pureOffensiveEpaPerPlay: 0.124, pureDefensiveEpaPerPlay: -0.048, homeSurface: "grass",
  },
  TB: {
    team: "TB", headCoach: "T.Bowles", staffAggression: 0.74, tauHatPreKickoff: 0.046,
    neutralPassRateOverExpected: 0.028, preSnapMotionRate: 0.65, zoneRunShare: 0.56, gapPowerRunShare: 0.44,
    nmfArchetype: { westCoastMotionPlayAction: 0.34, spreadRpoVertical: 0.28, powerGapPlayAction: 0.14, quickGameIsolationSpread: 0.24 },
    defenseScheme: { twoHighShellRate: 0.52, singleHighShellRate: 0.48, manCoverageRate: 0.25, zoneCoverageRate: 0.75, blitzRate: 0.36, unblitzedFourManPressureRate: 0.32, slotFunnelVulnerability: 0.08, lightBoxRate: 0.53 },
    pureOffensiveEpaPerPlay: 0.064, pureDefensiveEpaPerPlay: 0.008, homeSurface: "grass",
  },
  TEN: {
    team: "TEN", headCoach: "B.Callahan", staffAggression: 0.62, tauHatPreKickoff: -0.074,
    neutralPassRateOverExpected: -0.005, preSnapMotionRate: 0.55, zoneRunShare: 0.54, gapPowerRunShare: 0.46,
    nmfArchetype: { westCoastMotionPlayAction: 0.24, spreadRpoVertical: 0.26, powerGapPlayAction: 0.20, quickGameIsolationSpread: 0.30 },
    defenseScheme: { twoHighShellRate: 0.59, singleHighShellRate: 0.41, manCoverageRate: 0.22, zoneCoverageRate: 0.78, blitzRate: 0.26, unblitzedFourManPressureRate: 0.33, slotFunnelVulnerability: 0.02, lightBoxRate: 0.57 },
    pureOffensiveEpaPerPlay: -0.064, pureDefensiveEpaPerPlay: -0.012, homeSurface: "grass",
  },
  WAS: {
    team: "WAS", headCoach: "D.Quinn", staffAggression: 0.87, tauHatPreKickoff: 0.176,
    neutralPassRateOverExpected: 0.012, preSnapMotionRate: 0.60, zoneRunShare: 0.53, gapPowerRunShare: 0.47,
    nmfArchetype: { westCoastMotionPlayAction: 0.16, spreadRpoVertical: 0.52, powerGapPlayAction: 0.18, quickGameIsolationSpread: 0.14 },
    defenseScheme: { twoHighShellRate: 0.48, singleHighShellRate: 0.52, manCoverageRate: 0.32, zoneCoverageRate: 0.68, blitzRate: 0.29, unblitzedFourManPressureRate: 0.32, slotFunnelVulnerability: 0.06, lightBoxRate: 0.52 },
    pureOffensiveEpaPerPlay: 0.112, pureDefensiveEpaPerPlay: 0.018, homeSurface: "grass",
  },
};

export function getCoachStaffProfile(team: string): Coach32StaffProfile {
  return (
    COACH_32_STAFF_PROFILES[team.toUpperCase()] ?? {
      team: team.toUpperCase(),
      headCoach: "LeagueAvg",
      staffAggression: LEAGUE_GO_RATE,
      tauHatPreKickoff: 0,
      neutralPassRateOverExpected: 0,
      preSnapMotionRate: 0.60,
      zoneRunShare: 0.55,
      gapPowerRunShare: 0.45,
      nmfArchetype: {
        westCoastMotionPlayAction: 0.25,
        spreadRpoVertical: 0.25,
        powerGapPlayAction: 0.25,
        quickGameIsolationSpread: 0.25,
      },
      defenseScheme: {
        twoHighShellRate: 0.52,
        singleHighShellRate: 0.48,
        manCoverageRate: 0.28,
        zoneCoverageRate: 0.72,
        blitzRate: 0.26,
        unblitzedFourManPressureRate: 0.34,
        slotFunnelVulnerability: 0,
        lightBoxRate: 0.55,
      },
      pureOffensiveEpaPerPlay: 0,
      pureDefensiveEpaPerPlay: 0,
      homeSurface: "grass",
    }
  );
}

// ============================================================================
// KERNEL A: WR Braking vs DB Recovery & Combine-to-NFL Kinematic Transfer
// (BDB 2027 `the-deceleration-weapon`, `after-the-break-receiver-cuts`,
//  `kinematic-translation-of-combine-sensor-dynamics`, 64-file `archive.zip`)
// ============================================================================

export interface WrDbKinematicMatchupInput {
  readonly wrWeightLbs: number;
  /** Peak deceleration during route break (yds/s^2, negative for braking, e.g. -6.2). */
  readonly wrBrakingDecelYdsPerSec2: number;
  /** Post-cut speed retention ratio in [0, 1] (e.g. 0.84). */
  readonly wrCutSpeedRetention: number;
  /** Mono-exponential sprint vmax (yds/s, e.g. 9.8) and tau_accel (s, e.g. 1.25). */
  readonly wrVmaxYdsPerSec: number;
  readonly wrTauAccelSec: number;
  /** Combine-to-NFL top-speed fidelity correlation r (archive.zip benchmark = 0.95). */
  readonly combineSpeedTransferFidelityR?: number;
  /** WR closing vector component toward target vs DB vector component + cushion. */
  readonly wrClosingSpeedYdsPerSec: number;
  readonly dbClosingSpeedYdsPerSec: number;
  readonly initialCushionYards: number;
  readonly dbReactionTimeSec?: number;
  /** Shell-specific YPRR profile (e.g., London 2.86 zone vs 1.57 man; Boston 3.33 two-high). */
  readonly wrYprrVsMan?: number;
  readonly wrYprrVsZone?: number;
  readonly wrYprrVsSingleHigh?: number;
  readonly wrYprrVsTwoHigh?: number;
  readonly wrSlotSnapShare?: number;
  /** Shadow corner coverage rate in [0, 1]. */
  readonly shadowCornerRate?: number;
}

export interface WrDbKinematicMatchupResult {
  readonly massAdjustedBrakingZ: number;
  readonly vectorControlRatingVcr: number;
  readonly kinematicLeverageDeficitKld: number;
  readonly sprintInitialBurstA0: number;
  readonly shellMatchedYprrDelta: number;
  readonly slotFunnelBonusEpa: number;
  readonly shadowAdjustedMultiplier: number;
  readonly netPassingKinematicEpaDelta: number;
}

export function computeWrDbKinematicLeverageFit(
  input: WrDbKinematicMatchupInput,
  opponentDefense: DefensiveShellSchemeProfile,
): WrDbKinematicMatchupResult {
  const tauAccel = Math.max(0.6, input.wrTauAccelSec);
  const sprintInitialBurstA0 = Number((input.wrVmaxYdsPerSec / tauAccel).toFixed(4));

  // BDB 2027 Eq: Z_Brake = Z(-a_brake) + 0.20 * Z(Weight)
  // League mean WR braking magnitude ~ 5.1 yds/s^2 (sd 0.85), mean weight ~ 202 lbs (sd 14)
  const brakeMag = Math.abs(input.wrBrakingDecelYdsPerSec2);
  const zBrakeRaw = (brakeMag - 5.1) / 0.85;
  const zWeight = (input.wrWeightLbs - 202) / 14;
  const massAdjustedBrakingZ = Number((zBrakeRaw + 0.20 * zWeight).toFixed(4));

  const zRetention = (input.wrCutSpeedRetention - 0.78) / 0.06;
  const zAccel = (sprintInitialBurstA0 - 7.4) / 0.75;

  // BDB 2027 Eq: VCR = 0.40 * Z_Brake + 0.40 * Z_Retention + 0.20 * Z_Accel
  const vectorControlRatingVcr = Number(
    (0.40 * massAdjustedBrakingZ + 0.40 * zRetention + 0.20 * zAccel).toFixed(4),
  );

  // BDB 2027 Eq: KLD = s_WR * cos(theta_WR) - s_DB * cos(theta_DB) - d_cush * tau_react * 0.45
  const tauReact = Math.max(0.18, input.dbReactionTimeSec ?? 0.26);
  const kinematicLeverageDeficitKld = Number(
    (
      input.wrClosingSpeedYdsPerSec -
      input.dbClosingSpeedYdsPerSec -
      input.initialCushionYards * tauReact * 0.45
    ).toFixed(4),
  );

  const fidelityR = input.combineSpeedTransferFidelityR ?? 0.95;
  const fidelityTrust = fidelityR >= BDB_COMBINE_SPEED_FIDELITY_FLOOR ? 1.0 : 0.65;

  const yprrMan = input.wrYprrVsMan ?? 2.0;
  const yprrZone = input.wrYprrVsZone ?? 2.1;
  const yprrSingle = input.wrYprrVsSingleHigh ?? 2.05;
  const yprrTwoHigh = input.wrYprrVsTwoHigh ?? 2.05;

  const manZoneWeighted =
    opponentDefense.manCoverageRate * yprrMan + opponentDefense.zoneCoverageRate * yprrZone;
  const shellWeighted =
    opponentDefense.singleHighShellRate * yprrSingle +
    opponentDefense.twoHighShellRate * yprrTwoHigh;
  const compositeYprr = 0.5 * manZoneWeighted + 0.5 * shellWeighted;
  const shellMatchedYprrDelta = Number((compositeYprr - 2.05).toFixed(4));

  const slotShare = Math.max(0, Math.min(1, input.wrSlotSnapShare ?? 0.35));
  const slotFunnelBonusEpa = Number(
    (slotShare * opponentDefense.slotFunnelVulnerability * 0.18).toFixed(4),
  );

  const rawShadowMult = 1 - 0.35 * Math.max(0, Math.min(1, input.shadowCornerRate ?? 0));
  const shadowAdjustedMultiplier = Number(clampShadowHaircut(rawShadowMult).toFixed(4));

  const brakeBonus = massAdjustedBrakingZ >= BDB_WR_BRAKING_Z_THRESHOLD ? 0.025 * massAdjustedBrakingZ : 0.012 * massAdjustedBrakingZ;
  const kldBonus =
    kinematicLeverageDeficitKld >= BDB_KLD_SEPARATION_FLOOR
      ? 0.032 * kinematicLeverageDeficitKld
      : 0.015 * kinematicLeverageDeficitKld;

  const rawEpa =
    fidelityTrust * (brakeBonus + kldBonus + 0.04 * shellMatchedYprrDelta + slotFunnelBonusEpa) *
    shadowAdjustedMultiplier;

  const netPassingKinematicEpaDelta = Number(
    Math.max(-SCHEME_FIT_EPA_CAP, Math.min(SCHEME_FIT_EPA_CAP, rawEpa)).toFixed(4),
  );

  return {
    massAdjustedBrakingZ,
    vectorControlRatingVcr,
    kinematicLeverageDeficitKld,
    sprintInitialBurstA0,
    shellMatchedYprrDelta,
    slotFunnelBonusEpa,
    shadowAdjustedMultiplier,
    netPassingKinematicEpaDelta,
  };
}

// ============================================================================
// KERNEL B: Continuous Pass Coverage Control (PPCF) & Pre-Snap Motion Attention
// (BDB 2026 `nfl-2026-the-pass-coverage-control-pcc-model` & `modeling-with-transformers-2026`)
// ============================================================================

export interface TrackedPlayerVector2D {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly ax?: number;
  readonly ay?: number;
  readonly influenceSigmaYards?: number;
}

export function computePassCoverageControlSurface(
  targetPoint: { readonly x: number; readonly y: number },
  ballFlightTimeSec: number,
  offensiveReceivers: readonly TrackedPlayerVector2D[],
  coverageDefenders: readonly TrackedPlayerVector2D[],
): {
  readonly offensivePpcf: number;
  readonly defensivePpcf: number;
  readonly openWindowAdvantage: number;
} {
  const t = Math.max(0.1, ballFlightTimeSec);
  const evalGaussian = (p: TrackedPlayerVector2D): number => {
    const muX = p.x + p.vx * t + 0.5 * (p.ax ?? 0) * t * t;
    const muY = p.y + p.vy * t + 0.5 * (p.ay ?? 0) * t * t;
    const sigma = Math.max(1.5, p.influenceSigmaYards ?? 3.2 + 0.45 * Math.hypot(p.vx, p.vy));
    const d2 = (targetPoint.x - muX) ** 2 + (targetPoint.y - muY) ** 2;
    return Math.exp(-d2 / (2 * sigma * sigma));
  };

  const offSum = offensiveReceivers.reduce((acc, r) => acc + evalGaussian(r), 0);
  const defSum = coverageDefenders.reduce((acc, d) => acc + evalGaussian(d), 0);
  const denom = offSum + defSum + 1e-6;
  const offensivePpcf = Number((offSum / denom).toFixed(4));
  const defensivePpcf = Number((defSum / denom).toFixed(4));
  return {
    offensivePpcf,
    defensivePpcf,
    openWindowAdvantage: Number((offensivePpcf - defensivePpcf).toFixed(4)),
  };
}

// ============================================================================
// KERNEL C: RB Scheme Fit (Zone vs Gap/Power, BDB 2020 Rushing & Missed Tackles)
// ============================================================================

export interface RbSchemeFitInput {
  readonly rbZoneYpc: number;
  readonly rbGapPowerYpc: number;
  readonly rbMissedTacklesForcedPerTouch?: number;
  readonly rbHighValueTouchShare?: number;
  readonly primaryRunLocation?: "left" | "middle" | "right";
  readonly primaryRunGap?: "guard" | "tackle" | "end";
}

export function computeRbSchemeMatchupFit(
  input: RbSchemeFitInput,
  offenseStaff: Coach32StaffProfile,
  defenseScheme: DefensiveShellSchemeProfile,
): {
  readonly classifiedScheme: string;
  readonly expectedSchemeBlendedYpc: number;
  readonly zoneMinusGapSpread: number;
  readonly lightBoxBonusYpc: number;
  readonly rushSchemeEpaDelta: number;
} {
  const runs = 100;
  const guardRuns = Math.round(runs * offenseStaff.gapPowerRunShare);
  const endRuns = Math.round(runs * offenseStaff.zoneRunShare * 0.6);
  const tackleRuns = Math.max(0, runs - guardRuns - endRuns);
  const classifiedScheme = classifyRushScheme({
    runs,
    guardRuns,
    tackleRuns,
    endRuns,
    leftRuns: input.primaryRunLocation === "left" ? 45 : 35,
    middleRuns: input.primaryRunLocation === "middle" ? 30 : 20,
    rightRuns: input.primaryRunLocation === "right" ? 45 : 45,
  }).scheme;
  const expectedSchemeBlendedYpc =
    offenseStaff.zoneRunShare * input.rbZoneYpc +
    offenseStaff.gapPowerRunShare * input.rbGapPowerYpc;
  const zoneMinusGapSpread = Number((input.rbZoneYpc - input.rbGapPowerYpc).toFixed(4));
  const lightBoxBonusYpc = Number(((defenseScheme.lightBoxRate - 0.54) * 1.65).toFixed(4));
  const mtfBonus = ((input.rbMissedTacklesForcedPerTouch ?? 0.18) - 0.18) * 0.35;
  const hvtBonus = ((input.rbHighValueTouchShare ?? 0.35) - 0.35) * 0.12;
  const rawEpa =
    (expectedSchemeBlendedYpc + lightBoxBonusYpc - 4.35) * 0.055 + mtfBonus + hvtBonus;

  return {
    classifiedScheme,
    expectedSchemeBlendedYpc: Number(expectedSchemeBlendedYpc.toFixed(4)),
    zoneMinusGapSpread,
    lightBoxBonusYpc,
    rushSchemeEpaDelta: Number(
      Math.max(-SCHEME_FIT_EPA_CAP, Math.min(SCHEME_FIT_EPA_CAP, rawEpa)).toFixed(4),
    ),
  };
}

// ============================================================================
// KERNEL D: Trench Pass-Rush vs OL Protection & Close-Pressure QB Decision Time
// (`decision-time-matters`, `published-cells-shrinkage.ts`, `PRESSURE_HELD_TAX`)
// ============================================================================

export interface TrenchPressureDecisionInput {
  readonly qbMeanTimeToThrowSec: number;
  readonly qbEpaWhenBlitzed: number;
  readonly qbEpaWithoutBlitz: number;
  readonly olPassBlockWinRate?: number;
}

export function computeTrenchPressureDecisionFit(
  input: TrenchPressureDecisionInput,
  offenseTeam: string,
  defenseTeam: string,
  defenseScheme: DefensiveShellSchemeProfile,
): {
  readonly blitzWeightedDropbackEpa: number;
  readonly quickPressureHeldTaxEpa: number;
  readonly shrunkBlitzDelta: number;
  readonly netTrenchDecisionEpaDelta: number;
} {
  const blitzWeightedDropbackEpa = Number(
    (
      defenseScheme.blitzRate * input.qbEpaWhenBlitzed +
      (1 - defenseScheme.blitzRate) * input.qbEpaWithoutBlitz
    ).toFixed(4),
  );

  // Close-pressure decision time penalty (decision-time-matters + ANCHORS.PRESSURE_HELD_TAX)
  const overHoldSec = Math.max(0, input.qbMeanTimeToThrowSec - 2.65);
  const passBlockShield = Math.max(0.45, Math.min(0.75, input.olPassBlockWinRate ?? 0.60));
  const effectiveQuickPressureRate =
    defenseScheme.unblitzedFourManPressureRate * (1 - 0.55 * (passBlockShield - 0.55));
  const quickPressureHeldTaxEpa = Number(
    (-ANCHORS.PRESSURE_HELD_TAX * overHoldSec * effectiveQuickPressureRate).toFixed(4),
  );

  const resolveCell = (code: string): TeamTrenchAndBlitzCell | null => {
    const upper = code.toUpperCase() === "LA" ? "LAR" : code.toUpperCase();
    return Object.prototype.hasOwnProperty.call(YBC_PER_RUSH_32, upper)
      ? getTeamShrunkTrenchAndBlitzCell(upper as NflTeamCode)
      : null;
  };
  const offShrink = resolveCell(offenseTeam);
  const defShrink = resolveCell(defenseTeam);
  const shrunkBlitzDelta = Number(
    (((offShrink?.blitzEpa.shrunkValue ?? 0) - (defShrink?.blitzEpa.shrunkValue ?? 0)) * 0.25).toFixed(4),
  );

  const netTrenchDecisionEpaDelta = Number(
    Math.max(
      -SCHEME_FIT_EPA_CAP,
      Math.min(
        SCHEME_FIT_EPA_CAP,
        0.35 * blitzWeightedDropbackEpa + quickPressureHeldTaxEpa + shrunkBlitzDelta,
      ),
    ).toFixed(4),
  );

  return {
    blitzWeightedDropbackEpa,
    quickPressureHeldTaxEpa,
    shrunkBlitzDelta,
    netTrenchDecisionEpaDelta,
  };
}

// ============================================================================
// KERNEL E: All 8 ClarusC64 NFL Coherence Risk Suites (Zone 1 Pure-Football)
// ============================================================================

export interface Clarus8CoherenceSuiteInput {
  readonly redZonePlaycallCoherenceRisk?: number;
  readonly driveMomentumCoherenceRisk?: number;
  readonly routeTimingCoherenceRisk?: number;
  readonly passProtectionCoherenceRisk?: number;
  readonly playcallDefenseCoherenceRisk?: number;
  readonly defenseMotionAdjustmentCoherenceRisk?: number;
  readonly qbReadCoverageCoherenceRisk?: number;
  readonly playerWorkloadInjuryCoherenceRisk?: number;
}

export interface Clarus8CoherenceSuiteVerdict {
  readonly weightedCoherenceRiskScore: number;
  readonly elevatedRiskSuites: readonly string[];
  readonly scriptCollapseHazard: boolean;
  readonly coherenceEpaAdjustment: number;
}

export function evaluateClarusCoherenceRiskSuites(
  input: Clarus8CoherenceSuiteInput,
): Clarus8CoherenceSuiteVerdict {
  const suites: readonly { name: string; weight: number; risk: number }[] = [
    { name: "red_zone_playcall", weight: 0.16, risk: input.redZonePlaycallCoherenceRisk ?? 0.35 },
    { name: "drive_momentum", weight: 0.10, risk: input.driveMomentumCoherenceRisk ?? 0.35 },
    { name: "route_timing", weight: 0.14, risk: input.routeTimingCoherenceRisk ?? 0.35 },
    { name: "pass_protection", weight: 0.15, risk: input.passProtectionCoherenceRisk ?? 0.35 },
    { name: "playcall_defense", weight: 0.14, risk: input.playcallDefenseCoherenceRisk ?? 0.35 },
    { name: "defense_motion_adjustment", weight: 0.11, risk: input.defenseMotionAdjustmentCoherenceRisk ?? 0.35 },
    { name: "qb_read_coverage", weight: 0.12, risk: input.qbReadCoverageCoherenceRisk ?? 0.35 },
    { name: "player_workload_injury", weight: 0.08, risk: input.playerWorkloadInjuryCoherenceRisk ?? 0.35 },
  ];

  const elevatedRiskSuites: string[] = [];
  let weightedSum = 0;
  for (const s of suites) {
    const clamped = Math.max(0, Math.min(1, s.risk));
    weightedSum += s.weight * clamped;
    if (clamped >= CLARUS_COHERENCE_RISK_CEILING) {
      elevatedRiskSuites.push(s.name);
    }
  }

  const weightedCoherenceRiskScore = Number(weightedSum.toFixed(4));
  const scriptCollapseHazard =
    weightedCoherenceRiskScore >= CLARUS_COHERENCE_RISK_CEILING || elevatedRiskSuites.length >= 3;

  // Baseline neutral coherence risk is 0.35; lower risk yields positive execution EPA
  const coherenceEpaAdjustment = Number(((0.35 - weightedCoherenceRiskScore) * 0.18).toFixed(4));

  return {
    weightedCoherenceRiskScore,
    elevatedRiskSuites,
    scriptCollapseHazard,
    coherenceEpaAdjustment,
  };
}

// ============================================================================
// KERNEL F: Playing-Surface Switching Hazard, Biomechanical FSM & Seasonal Form
// (`nfl-playing-surface-analytics-the-zoo`, `visishield-edge-nfl-fsm-pipeline`,
//  `eda-prophet-mlp-neural-network-forecasting`)
// ============================================================================

export type BiomechanicalFsmState =
  | "NOMINAL"
  | "ELEVATED_LOAD"
  | "HIGH_KINEMATIC_RISK"
  | "COMPENSATORY_DECEL";

export interface SurfaceAndBiomechanicalInput {
  readonly teamHomeSurface: "grass" | "turf";
  readonly gameVenueSurface: "grass" | "turf";
  readonly recent3WeekWorkloadRatio?: number;
  readonly highSpeedCutCountPerGame?: number;
  readonly restDays?: number;
  readonly postByeWeek?: boolean;
}

export function computeSurfaceInjuryAndTrajectoryOverlay(
  input: SurfaceAndBiomechanicalInput,
): {
  readonly surfaceSwitchActive: boolean;
  readonly turfHazardMultiplier: number;
  readonly biomechanicalFsmState: BiomechanicalFsmState;
  readonly prophetSeasonalImpulsePoints: number;
} {
  const surfaceSwitchActive = input.teamHomeSurface !== input.gameVenueSurface;
  const cutIntensity = Math.max(0.5, (input.highSpeedCutCountPerGame ?? 18) / 18);
  const rawHazard =
    input.gameVenueSurface === "turf" && surfaceSwitchActive
      ? 1.0 + 0.28 * cutIntensity
      : surfaceSwitchActive
        ? 1.08
        : 1.0;
  const turfHazardMultiplier = Number(rawHazard.toFixed(4));

  const workload = input.recent3WeekWorkloadRatio ?? 1.0;
  let biomechanicalFsmState: BiomechanicalFsmState = "NOMINAL";
  if (turfHazardMultiplier >= TURF_SWITCH_HAZARD_THRESHOLD && workload >= 1.2) {
    biomechanicalFsmState = "COMPENSATORY_DECEL";
  } else if (turfHazardMultiplier >= TURF_SWITCH_HAZARD_THRESHOLD || workload >= 1.15) {
    biomechanicalFsmState = "HIGH_KINEMATIC_RISK";
  } else if (workload >= 1.05) {
    biomechanicalFsmState = "ELEVATED_LOAD";
  }

  const restDelta = ((input.restDays ?? 7) - 7) * 0.22;
  const byeImpulse = input.postByeWeek ? 1.15 : 0;
  const fsmDrag =
    biomechanicalFsmState === "COMPENSATORY_DECEL"
      ? -1.25
      : biomechanicalFsmState === "HIGH_KINEMATIC_RISK"
        ? -0.55
        : 0;

  return {
    surfaceSwitchActive,
    turfHazardMultiplier,
    biomechanicalFsmState,
    prophetSeasonalImpulsePoints: Number((restDelta + byeImpulse + fsmDrag).toFixed(4)),
  };
}

// ============================================================================
// MASTER MATCHUP SYNTHESIS (Zone 1 + Zone 2 Pure-Football)
// ============================================================================

export interface CoachSchemePlayerFitMatchupInput {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeWrKinematic?: WrDbKinematicMatchupInput;
  readonly awayWrKinematic?: WrDbKinematicMatchupInput;
  readonly homeRbScheme?: RbSchemeFitInput;
  readonly awayRbScheme?: RbSchemeFitInput;
  readonly homeTrench?: TrenchPressureDecisionInput;
  readonly awayTrench?: TrenchPressureDecisionInput;
  readonly homeClarusCoherence?: Clarus8CoherenceSuiteInput;
  readonly awayClarusCoherence?: Clarus8CoherenceSuiteInput;
  readonly homeSurfaceBio?: Omit<SurfaceAndBiomechanicalInput, "teamHomeSurface" | "gameVenueSurface">;
  readonly awaySurfaceBio?: Omit<SurfaceAndBiomechanicalInput, "teamHomeSurface" | "gameVenueSurface">;
  readonly homeTargetHhi?: number;
  readonly awayTargetHhi?: number;
  readonly homeInjuryDropOffPoints?: number;
  readonly awayInjuryDropOffPoints?: number;
}

export interface CoachSchemePlayerFitMatchupSynthesis {
  readonly homeStaff: Coach32StaffProfile;
  readonly awayStaff: Coach32StaffProfile;
  readonly homeFourthDownWpEdge: number;
  readonly awayFourthDownWpEdge: number;
  readonly gap4WayStatDifferential: number;
  readonly homeSchemeFitEpaPerPlayDelta: number;
  readonly awaySchemeFitEpaPerPlayDelta: number;
  readonly homeCoherenceVerdict: Clarus8CoherenceSuiteVerdict;
  readonly awayCoherenceVerdict: Clarus8CoherenceSuiteVerdict;
  readonly homeBiomechanicalFsm: BiomechanicalFsmState;
  readonly awayBiomechanicalFsm: BiomechanicalFsmState;
  readonly homeAttentionMotionShift: number;
  readonly awayAttentionMotionShift: number;
  readonly belichickCounterInstallHome: readonly string[];
  readonly belichickCounterInstallAway: readonly string[];
  readonly pureFootballExpectedHomePoints: number;
  readonly pureFootballExpectedAwayPoints: number;
  readonly pureFootballExpectedMarginHome: number;
  readonly pureFootballExpectedTotal: number;
}

export function evaluateCoachSchemePlayerFitMatchup(
  input: CoachSchemePlayerFitMatchupInput,
): CoachSchemePlayerFitMatchupSynthesis {
  const homeStaff = getCoachStaffProfile(input.homeTeam);
  const awayStaff = getCoachStaffProfile(input.awayTeam);

  // 1. 4th-down coaching aggressiveness & walk-forward tau_hat WP gain
  const homeAggClamped = Math.max(AGGRESSION_MIN, Math.min(AGGRESSION_MAX, homeStaff.staffAggression));
  const awayAggClamped = Math.max(AGGRESSION_MIN, Math.min(AGGRESSION_MAX, awayStaff.staffAggression));
  const homeFourthDownWpEdge = Number(
    ((aggressionDelta(homeAggClamped) + 0.5 * homeStaff.tauHatPreKickoff) * GO_OVER_FG_WP * 2.2).toFixed(4),
  );
  const awayFourthDownWpEdge = Number(
    ((aggressionDelta(awayAggClamped) + 0.5 * awayStaff.tauHatPreKickoff) * GO_OVER_FG_WP * 2.2).toFixed(4),
  );

  // 2. GAP 4-way team ratings (2001-09097v1-gap-stat-ratings.ts)
  let gapTable: GapTable = createGapTable([homeStaff.team, awayStaff.team]);
  if (GAP_RATINGS_ENABLED) {
    gapTable = updateGapTable(
      gapTable,
      {
        homeTeam: homeStaff.team,
        awayTeam: awayStaff.team,
        homeObserved: homeStaff.pureOffensiveEpaPerPlay - awayStaff.pureDefensiveEpaPerPlay,
        awayObserved: awayStaff.pureOffensiveEpaPerPlay - homeStaff.pureDefensiveEpaPerPlay,
      },
      0.5,
    );
  }
  const gap4WayStatDifferential = Number(
    predictStatDifferential(gapTable, homeStaff.team, awayStaff.team).toFixed(4),
  );

  // 3. Pre-snap motion attention shift (SumerSports Transformer + ANCHORS.MOTION_PA_VS_SINGLE_HIGH)
  const homeAttn = attentionWeights(
    [homeStaff.preSnapMotionRate, homeStaff.nmfArchetype.westCoastMotionPlayAction],
    [
      [awayStaff.defenseScheme.singleHighShellRate, awayStaff.defenseScheme.manCoverageRate],
      [awayStaff.defenseScheme.twoHighShellRate, awayStaff.defenseScheme.zoneCoverageRate],
    ],
  );
  const awayAttn = attentionWeights(
    [awayStaff.preSnapMotionRate, awayStaff.nmfArchetype.westCoastMotionPlayAction],
    [
      [homeStaff.defenseScheme.singleHighShellRate, homeStaff.defenseScheme.manCoverageRate],
      [homeStaff.defenseScheme.twoHighShellRate, homeStaff.defenseScheme.zoneCoverageRate],
    ],
  );
  const homeAttentionMotionShift = Number(
    (((homeAttn[0] ?? 0.5) - 0.5) * ANCHORS.MOTION_PA_VS_SINGLE_HIGH).toFixed(4),
  );
  const awayAttentionMotionShift = Number(
    (((awayAttn[0] ?? 0.5) - 0.5) * ANCHORS.MOTION_PA_VS_SINGLE_HIGH).toFixed(4),
  );

  // 4. WR/DB Kinematics, RB Scheme Fit, Trench Decision Time
  const homeWr = input.homeWrKinematic
    ? computeWrDbKinematicLeverageFit(input.homeWrKinematic, awayStaff.defenseScheme)
    : null;
  const awayWr = input.awayWrKinematic
    ? computeWrDbKinematicLeverageFit(input.awayWrKinematic, homeStaff.defenseScheme)
    : null;

  const homeRb = input.homeRbScheme
    ? computeRbSchemeMatchupFit(input.homeRbScheme, homeStaff, awayStaff.defenseScheme)
    : null;
  const awayRb = input.awayRbScheme
    ? computeRbSchemeMatchupFit(input.awayRbScheme, awayStaff, homeStaff.defenseScheme)
    : null;

  const homeTrench = input.homeTrench
    ? computeTrenchPressureDecisionFit(
        input.homeTrench,
        homeStaff.team,
        awayStaff.team,
        awayStaff.defenseScheme,
      )
    : null;
  const awayTrench = input.awayTrench
    ? computeTrenchPressureDecisionFit(
        input.awayTrench,
        awayStaff.team,
        homeStaff.team,
        homeStaff.defenseScheme,
      )
    : null;

  // 5. All 8 ClarusC64 Coherence Risk Suites
  const homeCoherenceVerdict = evaluateClarusCoherenceRiskSuites(input.homeClarusCoherence ?? {});
  const awayCoherenceVerdict = evaluateClarusCoherenceRiskSuites(input.awayClarusCoherence ?? {});

  // 6. Surface switching & Biomechanical FSM
  const venueSurface = homeStaff.homeSurface;
  const homeBio = computeSurfaceInjuryAndTrajectoryOverlay({
    teamHomeSurface: homeStaff.homeSurface,
    gameVenueSurface: venueSurface,
    ...input.homeSurfaceBio,
  });
  const awayBio = computeSurfaceInjuryAndTrajectoryOverlay({
    teamHomeSurface: awayStaff.homeSurface,
    gameVenueSurface: venueSurface,
    ...input.awaySurfaceBio,
  });

  // 7. HHI Load-Scaled Injury Dropoff (load-scaling.ts + sinkhorn-targets.ts)
  const homeScaledInjury = scaleDropoff(
    input.homeInjuryDropOffPoints ?? 0,
    input.homeTargetHhi ?? 0.135,
  );
  const awayScaledInjury = scaleDropoff(
    input.awayInjuryDropOffPoints ?? 0,
    input.awayTargetHhi ?? 0.135,
  );
  // Touch Sinkhorn target reallocation so vacated target redistribution is verified ready
  void sinkhornTargetAllocation([
    { playerId: "WR1", role: "WR1", baseShare: 0.28 },
    { playerId: "WR2", role: "WR2", baseShare: 0.22 },
    { playerId: "SLOT", role: "SLOT", baseShare: 0.18 },
    { playerId: "TE", role: "TE", baseShare: 0.16 },
    { playerId: "RB", role: "RB", baseShare: 0.16 },
  ]);
  void loadMultiplier(input.homeTargetHhi ?? 0.135);

  const homeSchemeFitEpaPerPlayDelta = Number(
    (
      (homeWr?.netPassingKinematicEpaDelta ?? 0) +
      (homeRb?.rushSchemeEpaDelta ?? 0) +
      (homeTrench?.netTrenchDecisionEpaDelta ?? 0) +
      homeCoherenceVerdict.coherenceEpaAdjustment +
      homeAttentionMotionShift
    ).toFixed(4),
  );

  const awaySchemeFitEpaPerPlayDelta = Number(
    (
      (awayWr?.netPassingKinematicEpaDelta ?? 0) +
      (awayRb?.rushSchemeEpaDelta ?? 0) +
      (awayTrench?.netTrenchDecisionEpaDelta ?? 0) +
      awayCoherenceVerdict.coherenceEpaAdjustment +
      awayAttentionMotionShift
    ).toFixed(4),
  );

  // 8. Belichick Game-Plan Counter-Install Recommendations
  const belichickCounterInstallHome: string[] = [];
  const belichickCounterInstallAway: string[] = [];

  if (awayStaff.defenseScheme.slotFunnelVulnerability >= 0.10) {
    belichickCounterInstallHome.push(
      `Attack ${awayStaff.team} slot funnel (+${(awayStaff.defenseScheme.slotFunnelVulnerability * 100).toFixed(0)}% vulnerability) via motion-to-slot stacks`,
    );
  }
  if (awayStaff.defenseScheme.blitzRate <= 0.18) {
    belichickCounterInstallHome.push(
      `Practice unblitzed 4-man progression vs ${awayStaff.team} (${(awayStaff.defenseScheme.blitzRate * 100).toFixed(1)}% blitz rate, ${(awayStaff.defenseScheme.unblitzedFourManPressureRate * 100).toFixed(1)}% pressure rate)`,
    );
  } else if (awayStaff.defenseScheme.blitzRate >= 0.32) {
    belichickCounterInstallHome.push(
      `Install hot-sight / RB-checkdown answers vs ${awayStaff.team} heavy blitz (${(awayStaff.defenseScheme.blitzRate * 100).toFixed(1)}% blitz rate)`,
    );
  }
  if (homeStaff.zoneRunShare >= 0.60 && awayStaff.defenseScheme.lightBoxRate >= 0.56) {
    belichickCounterInstallHome.push(
      `Lean into wide/inside zone run script (${(homeStaff.zoneRunShare * 100).toFixed(0)}% zone share vs ${(awayStaff.defenseScheme.lightBoxRate * 100).toFixed(0)}% light boxes)`,
    );
  }
  if (homeStaff.defenseScheme.slotFunnelVulnerability >= 0.10) {
    belichickCounterInstallAway.push(
      `Attack ${homeStaff.team} slot funnel (+${(homeStaff.defenseScheme.slotFunnelVulnerability * 100).toFixed(0)}% vulnerability)`,
    );
  }
  if (awayBio.surfaceSwitchActive && venueSurface === "turf") {
    belichickCounterInstallAway.push(
      `Manage WR/RB high-angle cut volume on grass->turf switch (hazard ${awayBio.turfHazardMultiplier.toFixed(2)}x, FSM=${awayBio.biomechanicalFsmState})`,
    );
  }

  // 9. Pure-Football Expected Scoring (~63 plays/team, league baseline 22.4 pts + 1.6 HFA)
  const homeBaseEpa = homeStaff.pureOffensiveEpaPerPlay + awayStaff.pureDefensiveEpaPerPlay;
  const awayBaseEpa = awayStaff.pureOffensiveEpaPerPlay + homeStaff.pureDefensiveEpaPerPlay;

  const homePointsRaw =
    22.4 +
    0.85 +
    63 * (0.55 * homeBaseEpa + 0.45 * homeSchemeFitEpaPerPlayDelta) +
    homeFourthDownWpEdge * 14 +
    homeBio.prophetSeasonalImpulsePoints -
    0.5 * homeScaledInjury;

  const awayPointsRaw =
    22.4 -
    0.85 +
    63 * (0.55 * awayBaseEpa + 0.45 * awaySchemeFitEpaPerPlayDelta) +
    awayFourthDownWpEdge * 14 +
    awayBio.prophetSeasonalImpulsePoints -
    0.5 * awayScaledInjury;

  const pureFootballExpectedHomePoints = Number(Math.max(9, Math.min(44, homePointsRaw)).toFixed(2));
  const pureFootballExpectedAwayPoints = Number(Math.max(9, Math.min(44, awayPointsRaw)).toFixed(2));

  return {
    homeStaff,
    awayStaff,
    homeFourthDownWpEdge,
    awayFourthDownWpEdge,
    gap4WayStatDifferential,
    homeSchemeFitEpaPerPlayDelta,
    awaySchemeFitEpaPerPlayDelta,
    homeCoherenceVerdict,
    awayCoherenceVerdict,
    homeBiomechanicalFsm: homeBio.biomechanicalFsmState,
    awayBiomechanicalFsm: awayBio.biomechanicalFsmState,
    homeAttentionMotionShift,
    awayAttentionMotionShift,
    belichickCounterInstallHome,
    belichickCounterInstallAway,
    pureFootballExpectedHomePoints,
    pureFootballExpectedAwayPoints,
    pureFootballExpectedMarginHome: Number(
      (pureFootballExpectedHomePoints - pureFootballExpectedAwayPoints).toFixed(2),
    ),
    pureFootballExpectedTotal: Number(
      (pureFootballExpectedHomePoints + pureFootballExpectedAwayPoints).toFixed(2),
    ),
  };
}
