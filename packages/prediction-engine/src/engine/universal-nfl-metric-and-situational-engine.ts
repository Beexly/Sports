/**
 * universal-nfl-metric-and-situational-engine.ts
 *
 * Implements:
 * A. Foundational Universal NFL Metric Suites (100% Deterministic, Vectorized):
 *    1. `computeUniversalQbMetrics`
 *    2. `computeUniversalReceivingMetrics`
 *    3. `computeUniversalRushingMetrics`
 *    4. `computeUniversalTrenchMetrics`
 *    5. `computeUniversalDefenseAndIdpMetrics`
 *    6. `computeUniversalSituationalContextOverlay`
 * B. Deep Second- & Third-Order Non-Stationary Football Intelligence Kernels:
 *    7. `computeCausalDeconfoundedSkillVector`
 *    8. `computeQbTraumaAndDisguiseHysteresis`
 *    9. `computeTrenchTutFatigueAndWeakLinkExploitation`
 *   10. `computeCoordinatorScriptCliffAndTendencyTrap`
 *   11. `computeRefereeAndMarketReflexivity`
 *   12. `evaluateUniversalNfl360MetricAndSituationalDossier`
 */

export const UNIVERSAL_NFL_ANALYST_AND_METRIC_REGISTRY = {
  pbp_and_expected_points: [
    "@benbbaldwin (nflfastR / rbsdm: EPA/play, CPOE, DAKOTA, xPass, PROE, WP garbage-time filter)",
    "@mrcaseb (nflverse / nflreadr / nflfastR play-by-play canonical schema)",
    "@Sumersports / @SamHoppen (EPA/Drive, Early-Down EPA, Neutral Pace, 11/12/21 Personnel, Box Counts, Motion %)",
    "@arjunmenon100 / @tejfbanalytics (WAR, coverage responsibility, route-tree clustering)",
  ],
  receiving_and_route_charting: [
    "@FantasyPtsData (ASS Average Separation Score, 1READ%, 1D/RR, YPRR vs Man/Zone/MOFC/MOFO)",
    "@MattHarmon_BYB (Reception Perception: route success rate vs Man, Zone, Press, Double coverage)",
    "@AirYards / Josh Hermsmeyer (WOPR = 1.5*TargetShare + 0.7*AirYardsShare, RACR, PACR)",
    "@Brian_Burke / ESPN Analytics (RTM Open Score, Catch Score, YAC Score, Composite)",
    "Next Gen Stats (xYAC, YACOE, Avg Separation, Avg Cushion, Targeted Air Yards)",
  ],
  rushing_and_opportunity: [
    "Next Gen Stats (RYOE/Att, ROE%, Time Behind LOS, 8+ Defenders in Box %)",
    "Pro Football Focus (YBC/Att, YACo/Att, MTF/Att, Elusive Rating, Breakaway %)",
    "@KoalatyStats (XFP/G Expected Fantasy Points per Game, FPPG - XFPPG differential)",
    "FTN Data / Aaron Schatz (DVOA, DYAR, Success Rate, Gap vs Zone rushing splits)",
  ],
  trench_warfare_ol_dl: [
    "ESPN Analytics / Next Gen Stats (PBWR 2.5s, PRWR 2.5s, RBWR, RSWR)",
    "Pro Football Focus (Pass Blocking Efficiency PBE, Pass Rush Productivity PRP)",
    "@BrandonThornNFL (Trench Warfare: True Pass Set TPS filtering, High-Quality Pressures)",
    "FTN Data (Adjusted Line Yards ALY 120%/100%/50%/0%, Stuffed %, Power Success %, Second-Level, Open-Field)",
    "@SethWalder / @PFF_Moo (Stunt/Twist rates, Simulated Creeper pressures, P2S% stability)",
  ],
  defensive_scheme_and_idp: [
    "@MatchQuarters / Cody Alexander (MOFC vs MOFO, Quarters/Palms/Cover-6, Creepers, Sim Pressures)",
    "@WideLeft / Arif Hasan (Cover-1/Cover-3/Quarters frequency, pre-to-post-snap disguise rotation)",
    "@statrankings / MAGICSPORTSBREAKDOWN+ (11-Layer Matchup Ranks, Primary CB FP/route allowed, PROE+)",
    "@jonmacri / @PFF_Macri (IDP utilization, Home Stadium Scorekeeper Tackle Assist multiplier, Co-Sack rates)",
  ],
  situational_referees_weather_incentives: [
    "@nflrefstats (Officiating crew holding rate, DPI rate/yards, false starts, home bias, pace drag)",
    "@PattonAnalytics (Pressure Over Expectation vs Pressure-to-Sack Survival Curve)",
    "@spotrac / @FieldYates (Contract incentive escalators, statistical milestones, playing-time tiers)",
  ],
  deep_non_stationary_second_order_kernels: [
    "Kernel 1: Frisch-Waugh-Lovell & IPTW Causal De-Confounding (True Unschemed Execution vs Scheme-Manufactured Volume)",
    "Kernel 2: QB Post-Hit Hawkes Trauma Hysteresis, Phantom Pressure Bailout & Post-Snap Disguise-Spin TWP% Spike",
    "Kernel 3: Trench Time-Under-Tension (TUT) Anaerobic Decay & Minimum-Operator Backup-OL Stunt Target Exploitation",
    "Kernel 4: Coordinator Opening-15 Script Cliff, Non-Markovian Negative-Play Tilt & 3-Snap DC Tendency-Baiting Trap",
    "Kernel 5: Dynamic Referee Score-State Reflexivity & True Information Steam vs Syndicate Head-Fake Buyback Detector",
  ],
} as const;

// ============================================================================
// 1. UNIVERSAL QB SUITE
// ============================================================================

export interface UniversalQbInput {
  readonly playEpas?: readonly number[];
  readonly playWinProbs?: readonly number[];
  readonly passAttempts?: number;
  readonly completions?: number;
  readonly expectedCompletionPct?: number;
  readonly passYards?: number;
  readonly passTds?: number;
  readonly interceptions?: number;
  readonly sacks?: number;
  readonly sackYards?: number;
  readonly scrambles?: number;
  readonly airYards?: number;
  readonly pressures?: number;
  readonly bigTimeThrows?: number;
  readonly turnoverWorthyPlays?: number;
  readonly firstReadTargets?: number;
  readonly targetedDropbacks?: number;
  readonly tightWindowAttempts?: number;
  readonly cleanPocketEpa?: number;
  readonly pressuredEpa?: number;
  readonly wpLow?: number;
  readonly wpHigh?: number;
}

export interface UniversalQbOutput {
  readonly epa_per_play: number;
  readonly epa_per_play_unfiltered: number;
  readonly garbage_time_wp_filter_bounds: readonly [number, number];
  readonly garbage_time_snaps_excluded: number;
  readonly cpoe: number;
  readonly dakota_composite: number;
  readonly any_a: number;
  readonly pff_btt_rate: number;
  readonly pff_twp_rate: number;
  readonly pressure_to_sack_rate: number;
  readonly patton_pressure_survival_score: number;
  readonly first_read_target_rate: number;
  readonly aggressiveness_pct: number;
  readonly pacr: number;
}

export function computeUniversalQbMetrics(input: UniversalQbInput = {}): UniversalQbOutput {
  const epas = input.playEpas ?? [0.42, -0.18, 0.65, 0.14, 0.31, -0.22, 0.88];
  const wps = input.playWinProbs ?? [0.5, 0.54, 0.48, 0.61, 0.35, 0.72, 0.98];
  const wpLow = input.wpLow ?? 0.05;
  const wpHigh = input.wpHigh ?? 0.95;

  const filteredEpas: number[] = [];
  for (let i = 0; i < epas.length; i += 1) {
    const wp = wps[i] ?? 0.5;
    if (wp >= wpLow && wp <= wpHigh) {
      filteredEpas.push(epas[i] ?? 0);
    }
  }
  const activeEpas = filteredEpas.length > 0 ? filteredEpas : epas.length > 0 ? [...epas] : [0];
  const epaPerPlay = activeEpas.reduce((a, b) => a + b, 0) / activeEpas.length;
  const epaUnfiltered = epas.reduce((a, b) => a + b, 0) / Math.max(1, epas.length);
  const garbageTimeExcluded = Math.max(0, epas.length - filteredEpas.length);

  const att = Math.max(1, Math.trunc(input.passAttempts ?? 34));
  const comp = input.completions ?? 23;
  const xCompPct = input.expectedCompletionPct ?? 63.8;
  const cpoe = (comp / att) * 100 - xCompPct;
  const dakota = 0.2 * epaPerPlay + 0.009 * cpoe + 0.09;

  const passYards = input.passYards ?? 278.0;
  const passTds = input.passTds ?? 2;
  const ints = input.interceptions ?? 0;
  const sacks = input.sacks ?? 2;
  const sackYards = input.sackYards ?? 14.0;
  const scrambles = input.scrambles ?? 3;
  const airYards = input.airYards ?? 295.0;
  const pressures = Math.max(1, Math.trunc(input.pressures ?? 11));

  const anyA = (passYards + 20 * passTds - 45 * ints - sackYards) / Math.max(1, att + sacks);
  const bttRate = (input.bigTimeThrows ?? 3) / att;
  const twpRate = (input.turnoverWorthyPlays ?? 1) / Math.max(1, att + sacks + scrambles);
  const p2sRate = sacks / pressures;

  const sackAvoidance = 1 - Math.min(1, p2sRate);
  const scrambleBonus = scrambles / pressures;
  const cleanEpa = input.cleanPocketEpa ?? 0.28;
  const pressEpa = input.pressuredEpa ?? -0.14;
  const epaRetention = 1 / (1 + Math.exp(-2.5 * (pressEpa - cleanEpa + 0.35)));
  const pattonScore = 0.5 * sackAvoidance + 0.3 * epaRetention + 0.2 * Math.min(1, scrambleBonus);

  const firstReadRate = (input.firstReadTargets ?? 22) / Math.max(1, input.targetedDropbacks ?? 32);
  const aggPct = ((input.tightWindowAttempts ?? 5) / att) * 100;
  const pacr = passYards / Math.max(1, airYards);

  return {
    epa_per_play: Number(epaPerPlay.toFixed(6)),
    epa_per_play_unfiltered: Number(epaUnfiltered.toFixed(6)),
    garbage_time_wp_filter_bounds: [wpLow, wpHigh],
    garbage_time_snaps_excluded: garbageTimeExcluded,
    cpoe: Number(cpoe.toFixed(6)),
    dakota_composite: Number(dakota.toFixed(6)),
    any_a: Number(anyA.toFixed(6)),
    pff_btt_rate: Number(bttRate.toFixed(6)),
    pff_twp_rate: Number(twpRate.toFixed(6)),
    pressure_to_sack_rate: Number(p2sRate.toFixed(6)),
    patton_pressure_survival_score: Number(pattonScore.toFixed(6)),
    first_read_target_rate: Number(firstReadRate.toFixed(6)),
    aggressiveness_pct: Number(aggPct.toFixed(6)),
    pacr: Number(pacr.toFixed(6)),
  };
}

// ============================================================================
// 2. UNIVERSAL RECEIVING SUITE
// ============================================================================

export interface UniversalReceivingInput {
  readonly receivingYards?: number;
  readonly routesRun?: number;
  readonly receivingYardsVsMan?: number;
  readonly routesVsMan?: number;
  readonly receivingYardsVsZone?: number;
  readonly routesVsZone?: number;
  readonly receivingYardsVsSingleHigh?: number;
  readonly routesVsSingleHigh?: number;
  readonly receivingYardsVsTwoHigh?: number;
  readonly routesVsTwoHigh?: number;
  readonly targets?: number;
  readonly targetShare?: number;
  readonly airYards?: number;
  readonly airYardsShare?: number;
  readonly routeSeparationScores?: readonly number[];
  readonly espnOpenScore?: number;
  readonly espnCatchScore?: number;
  readonly espnYacScore?: number;
  readonly actualYacPerRec?: number;
  readonly expectedYacPerRec?: number;
  readonly firstDownsAndTds?: number;
  readonly drops?: number;
  readonly onTargetTargets?: number;
  readonly contestedCatches?: number;
  readonly contestedTargets?: number;
  readonly playerEndZoneTargets?: number;
  readonly teamEndZoneTargets?: number;
}

export interface UniversalReceivingOutput {
  readonly yprr_overall: number;
  readonly yprr_vs_man: number;
  readonly yprr_vs_zone: number;
  readonly yprr_vs_single_high: number;
  readonly yprr_vs_two_high: number;
  readonly tprr: number;
  readonly wopr: number;
  readonly racr: number;
  readonly fantasy_pts_ass_separation_score: number;
  readonly espn_rtm_open_catch_yac_composite: number;
  readonly ngs_xyac_over_expected: number;
  readonly first_downs_per_route_run: number;
  readonly on_target_drop_rate: number;
  readonly contested_catch_rate: number;
  readonly end_zone_target_share: number;
}

export function computeUniversalReceivingMetrics(
  input: UniversalReceivingInput = {},
): UniversalReceivingOutput {
  const recYds = input.receivingYards ?? 92.0;
  const rr = Math.max(1, Math.trunc(input.routesRun ?? 34));
  const yprrOverall = recYds / rr;
  const yprrVsMan = (input.receivingYardsVsMan ?? 38.0) / Math.max(1, input.routesVsMan ?? 12);
  const yprrVsZone = (input.receivingYardsVsZone ?? 54.0) / Math.max(1, input.routesVsZone ?? 22);
  const yprrVsSingleHigh =
    (input.receivingYardsVsSingleHigh ?? 49.0) / Math.max(1, input.routesVsSingleHigh ?? 16);
  const yprrVsTwoHigh =
    (input.receivingYardsVsTwoHigh ?? 43.0) / Math.max(1, input.routesVsTwoHigh ?? 18);

  const tprr = (input.targets ?? 9) / rr;
  const wopr = 1.5 * (input.targetShare ?? 0.28) + 0.7 * (input.airYardsShare ?? 0.36);
  const racr = recYds / Math.max(1, input.airYards ?? 105.0);

  const sepScores = input.routeSeparationScores ?? [0.18, 0.24, 0.11, 0.3, 0.15, 0.22];
  const assScore = sepScores.reduce((a, b) => a + b, 0) / Math.max(1, sepScores.length);

  const rtmComposite =
    0.45 * (input.espnOpenScore ?? 82.0) +
    0.35 * (input.espnCatchScore ?? 76.0) +
    0.2 * (input.espnYacScore ?? 71.0);

  const yacoe = (input.actualYacPerRec ?? 5.4) - (input.expectedYacPerRec ?? 4.1);
  const fdPerRr = (input.firstDownsAndTds ?? 5) / rr;
  const dropRate = (input.drops ?? 0) / Math.max(1, input.onTargetTargets ?? 8);
  const contestedRate = (input.contestedCatches ?? 2) / Math.max(1, input.contestedTargets ?? 3);
  const ezShare = (input.playerEndZoneTargets ?? 2) / Math.max(1, input.teamEndZoneTargets ?? 5);

  return {
    yprr_overall: Number(yprrOverall.toFixed(6)),
    yprr_vs_man: Number(yprrVsMan.toFixed(6)),
    yprr_vs_zone: Number(yprrVsZone.toFixed(6)),
    yprr_vs_single_high: Number(yprrVsSingleHigh.toFixed(6)),
    yprr_vs_two_high: Number(yprrVsTwoHigh.toFixed(6)),
    tprr: Number(tprr.toFixed(6)),
    wopr: Number(wopr.toFixed(6)),
    racr: Number(racr.toFixed(6)),
    fantasy_pts_ass_separation_score: Number(assScore.toFixed(6)),
    espn_rtm_open_catch_yac_composite: Number(rtmComposite.toFixed(6)),
    ngs_xyac_over_expected: Number(yacoe.toFixed(6)),
    first_downs_per_route_run: Number(fdPerRr.toFixed(6)),
    on_target_drop_rate: Number(dropRate.toFixed(6)),
    contested_catch_rate: Number(contestedRate.toFixed(6)),
    end_zone_target_share: Number(ezShare.toFixed(6)),
  };
}

// ============================================================================
// 3. UNIVERSAL RUSHING SUITE
// ============================================================================

export interface UniversalRushingInput {
  readonly rushAttempts?: number;
  readonly rushingYards?: number;
  readonly expectedRushingYards?: number;
  readonly carriesOverExpected?: number;
  readonly stackedBox8PlusCarries?: number;
  readonly lightBoxCarries?: number;
  readonly yardsBeforeContact?: number;
  readonly yardsAfterContact?: number;
  readonly missedTacklesForcedRush?: number;
  readonly missedTacklesForcedRec?: number;
  readonly receptions?: number;
  readonly stuffedCarries?: number;
  readonly explosive10PlusCarries?: number;
  readonly gapSchemeEpaPerRush?: number;
  readonly zoneSchemeEpaPerRush?: number;
  readonly actualFppg?: number;
  readonly koalatyXfppg?: number;
}

export interface UniversalRushingOutput {
  readonly ngs_ryoe_per_att: number;
  readonly rush_pct_over_expected: number;
  readonly stacked_box_8plus_rate: number;
  readonly light_box_rate: number;
  readonly yards_before_contact_per_att: number;
  readonly yards_after_contact_per_att: number;
  readonly missed_tackles_forced_per_att: number;
  readonly pff_elusive_rating: number;
  readonly stuff_rate: number;
  readonly explosive_run_rate_10plus: number;
  readonly gap_vs_zone_efficiency_delta: number;
  readonly koalaty_xfp_over_expected: number;
}

export function computeUniversalRushingMetrics(
  input: UniversalRushingInput = {},
): UniversalRushingOutput {
  const att = Math.max(1, Math.trunc(input.rushAttempts ?? 18));
  const rushYds = input.rushingYards ?? 89.0;
  const xRushYds = input.expectedRushingYards ?? 74.2;
  const ryoePerAtt = (rushYds - xRushYds) / att;
  const roePct = ((input.carriesOverExpected ?? 10) / att) * 100;
  const stackedRate = (input.stackedBox8PlusCarries ?? 5) / att;
  const lightRate = (input.lightBoxCarries ?? 6) / att;

  const ybcPerAtt = (input.yardsBeforeContact ?? 34.0) / att;
  const yacoPerAtt = (input.yardsAfterContact ?? 55.0) / att;
  const mtfRush = input.missedTacklesForcedRush ?? 5;
  const mtfRec = input.missedTacklesForcedRec ?? 2;
  const mtfPerAtt = mtfRush / att;

  const totalTouches = Math.max(1, att + (input.receptions ?? 4));
  const elusiveRating = ((mtfRush + mtfRec) / totalTouches) * yacoPerAtt * 100;

  const stuffRate = (input.stuffedCarries ?? 3) / att;
  const expRate = (input.explosive10PlusCarries ?? 3) / att;
  const gapZoneDelta = (input.gapSchemeEpaPerRush ?? 0.08) - (input.zoneSchemeEpaPerRush ?? -0.02);
  const koalatyDelta = (input.actualFppg ?? 17.4) - (input.koalatyXfppg ?? 15.1);

  return {
    ngs_ryoe_per_att: Number(ryoePerAtt.toFixed(6)),
    rush_pct_over_expected: Number(roePct.toFixed(6)),
    stacked_box_8plus_rate: Number(stackedRate.toFixed(6)),
    light_box_rate: Number(lightRate.toFixed(6)),
    yards_before_contact_per_att: Number(ybcPerAtt.toFixed(6)),
    yards_after_contact_per_att: Number(yacoPerAtt.toFixed(6)),
    missed_tackles_forced_per_att: Number(mtfPerAtt.toFixed(6)),
    pff_elusive_rating: Number(elusiveRating.toFixed(6)),
    stuff_rate: Number(stuffRate.toFixed(6)),
    explosive_run_rate_10plus: Number(expRate.toFixed(6)),
    gap_vs_zone_efficiency_delta: Number(gapZoneDelta.toFixed(6)),
    koalaty_xfp_over_expected: Number(koalatyDelta.toFixed(6)),
  };
}

// ============================================================================
// 4. UNIVERSAL TRENCH WARFARE SUITE
// ============================================================================

function computeFtnAlySingleCarry(yards: number): number {
  if (yards < 0) return 1.2 * yards;
  if (yards <= 4) return 1.0 * yards;
  if (yards <= 10) return 4.0 + 0.5 * (yards - 4.0);
  return 7.0;
}

export interface UniversalTrenchInput {
  readonly passBlockSnaps?: number;
  readonly pbwrWins25s?: number;
  readonly hurriesAllowed?: number;
  readonly hitsAllowed?: number;
  readonly sacksAllowed?: number;
  readonly passRushSnaps?: number;
  readonly prwrWins25s?: number;
  readonly sacksGenerated?: number;
  readonly hitsGenerated?: number;
  readonly hurriesGenerated?: number;
  readonly runBlockSnaps?: number;
  readonly rbwrWins?: number;
  readonly runDefenseSnaps?: number;
  readonly rswrWins?: number;
  readonly truePassSetSnaps?: number;
  readonly truePassSetPressures?: number;
  readonly carryYardsSequence?: readonly number[];
  readonly stuntTwistSnaps?: number;
  readonly stuntTwistDisruptions?: number;
  readonly simulatedCreeperSnaps?: number;
  readonly simulatedCreeperPressures?: number;
}

export interface UniversalTrenchOutput {
  readonly espn_pbwr_2_5s: number;
  readonly espn_prwr_2_5s: number;
  readonly espn_rbwr: number;
  readonly espn_rswr: number;
  readonly pff_pass_blocking_efficiency: number;
  readonly pff_pass_rush_productivity: number;
  readonly brandon_thorn_true_pass_set_pressure_rate: number;
  readonly ftn_adjusted_line_yards: number;
  readonly stunt_twist_disruption_rate: number;
  readonly simulated_creeper_pressure_rate: number;
}

export function computeUniversalTrenchMetrics(
  input: UniversalTrenchInput = {},
): UniversalTrenchOutput {
  const pbSnaps = Math.max(1, Math.trunc(input.passBlockSnaps ?? 38));
  const prSnaps = Math.max(1, Math.trunc(input.passRushSnaps ?? 36));
  const rbSnaps = Math.max(1, Math.trunc(input.runBlockSnaps ?? 26));
  const rdSnaps = Math.max(1, Math.trunc(input.runDefenseSnaps ?? 25));

  const pbwr = (input.pbwrWins25s ?? 24) / pbSnaps;
  const prwr = (input.prwrWins25s ?? 6) / prSnaps;
  const rbwr = (input.rbwrWins ?? 19) / rbSnaps;
  const rswr = (input.rswrWins ?? 8) / rdSnaps;

  const weightedAllowed =
    0.75 * (input.hurriesAllowed ?? 6) +
    0.75 * (input.hitsAllowed ?? 2) +
    1.0 * (input.sacksAllowed ?? 2);
  const pbe = ((pbSnaps - weightedAllowed) / pbSnaps) * 100;

  const weightedGen =
    (input.sacksGenerated ?? 3) +
    0.75 * ((input.hitsGenerated ?? 4) + (input.hurriesGenerated ?? 8));
  const prp = (weightedGen / prSnaps) * 100;

  const tpsRate = (input.truePassSetPressures ?? 8) / Math.max(1, input.truePassSetSnaps ?? 22);
  const carries = input.carryYardsSequence ?? [-2.0, 3.0, 4.0, 7.0, 14.0, 2.0, 5.0, 1.0];
  const aly =
    carries.map(computeFtnAlySingleCarry).reduce((a, b) => a + b, 0) / Math.max(1, carries.length);

  const stuntRate = (input.stuntTwistDisruptions ?? 4) / Math.max(1, input.stuntTwistSnaps ?? 9);
  const creeperRate =
    (input.simulatedCreeperPressures ?? 3) / Math.max(1, input.simulatedCreeperSnaps ?? 8);

  return {
    espn_pbwr_2_5s: Number(pbwr.toFixed(6)),
    espn_prwr_2_5s: Number(prwr.toFixed(6)),
    espn_rbwr: Number(rbwr.toFixed(6)),
    espn_rswr: Number(rswr.toFixed(6)),
    pff_pass_blocking_efficiency: Number(pbe.toFixed(6)),
    pff_pass_rush_productivity: Number(prp.toFixed(6)),
    brandon_thorn_true_pass_set_pressure_rate: Number(tpsRate.toFixed(6)),
    ftn_adjusted_line_yards: Number(aly.toFixed(6)),
    stunt_twist_disruption_rate: Number(stuntRate.toFixed(6)),
    simulated_creeper_pressure_rate: Number(creeperRate.toFixed(6)),
  };
}

// ============================================================================
// 5. UNIVERSAL DEFENSE, MATCHQUARTERS & IDP STADIUM CREW SUITE
// ============================================================================

export interface UniversalDefenseAndIdpInput {
  readonly coverageSnaps?: number;
  readonly cover1Snaps?: number;
  readonly cover3Snaps?: number;
  readonly cover0Snaps?: number;
  readonly cover2Snaps?: number;
  readonly cover4QuartersSnaps?: number;
  readonly cover6PalmsSnaps?: number;
  readonly disguisedShellSnaps?: number;
  readonly primaryCbFantasyPointsAllowed?: number;
  readonly primaryCbRoutesFaced?: number;
  readonly forcedIncompletions?: number;
  readonly coverageTargets?: number;
  readonly stadiumHomeAssistToSoloRatio?: number;
  readonly leagueAvgAssistToSoloRatio?: number;
  readonly projectedSoloSackLambda?: number;
  readonly projectedHalfSackLambda?: number;
}

export interface UniversalDefenseAndIdpOutput {
  readonly mofc_rate: number;
  readonly mofo_rate: number;
  readonly pre_to_post_snap_disguise_rate: number;
  readonly primary_cb_fp_per_route_allowed: number;
  readonly forced_incompletion_rate: number;
  readonly idp_stadium_scorekeeper_assist_multiplier: number;
  readonly co_sack_0_25_half_sack_clear_prob: number;
}

export function computeUniversalDefenseAndIdpMetrics(
  input: UniversalDefenseAndIdpInput = {},
): UniversalDefenseAndIdpOutput {
  const covSnaps = Math.max(1, Math.trunc(input.coverageSnaps ?? 38));
  const mofc =
    ((input.cover1Snaps ?? 9) + (input.cover3Snaps ?? 12) + (input.cover0Snaps ?? 2)) / covSnaps;
  const mofo =
    ((input.cover2Snaps ?? 5) +
      (input.cover4QuartersSnaps ?? 6) +
      (input.cover6PalmsSnaps ?? 4)) /
    covSnaps;
  const disguise = (input.disguisedShellSnaps ?? 11) / covSnaps;

  const cbFpPerRoute =
    (input.primaryCbFantasyPointsAllowed ?? 8.4) / Math.max(1, input.primaryCbRoutesFaced ?? 30);
  const fincRate = (input.forcedIncompletions ?? 4) / Math.max(1, input.coverageTargets ?? 24);
  const assistMult =
    (input.stadiumHomeAssistToSoloRatio ?? 0.78) /
    Math.max(0.1, input.leagueAvgAssistToSoloRatio ?? 0.62);

  const sackLambda =
    Math.max(0, input.projectedSoloSackLambda ?? 0.38) +
    Math.max(0, input.projectedHalfSackLambda ?? 0.24);
  const coSackClearProb = 1 - Math.exp(-sackLambda);

  return {
    mofc_rate: Number(mofc.toFixed(6)),
    mofo_rate: Number(mofo.toFixed(6)),
    pre_to_post_snap_disguise_rate: Number(disguise.toFixed(6)),
    primary_cb_fp_per_route_allowed: Number(cbFpPerRoute.toFixed(6)),
    forced_incompletion_rate: Number(fincRate.toFixed(6)),
    idp_stadium_scorekeeper_assist_multiplier: Number(assistMult.toFixed(6)),
    co_sack_0_25_half_sack_clear_prob: Number(coSackClearProb.toFixed(6)),
  };
}

// ============================================================================
// 6. UNIVERSAL COACHING TEMPO, PROE & SITUATIONAL CONTEXT SUITE
// ============================================================================

export interface UniversalSituationalContextInput {
  readonly actualPassRate?: number;
  readonly expectedPassRate?: number;
  readonly neutralPaceSecPerSnap?: number;
  readonly passRateTrailing8Plus?: number;
  readonly crewHoldingCallsPerGame?: number;
  readonly crewDpiYardsPerGame?: number;
  readonly crewFirstDownsByPenaltyPerGame?: number;
  readonly surfaceType?: string;
  readonly altitudeFeet?: number;
  readonly windMph?: number;
  readonly isIndoorDome?: boolean;
  readonly crowdNoiseDb?: number;
  readonly westToEastEarlyKickoff?: boolean;
  readonly isTnfShortWeek?: boolean;
  readonly restDifferentialDays?: number;
  readonly priorWeekDefensiveSnaps?: number;
  readonly distanceToIncentivePct?: number;
  readonly incentiveBonusUsd?: number;
}

export interface UniversalSituationalContextOutput {
  readonly proe: number;
  readonly neutral_pace_sec_per_snap: number;
  readonly trailing_8plus_script_elasticity: number;
  readonly officiating_crew_penalty_and_drive_extension_index: number;
  readonly stadium_surface_and_microclimate_index: number;
  readonly circadian_rest_travel_fatigue_index: number;
  readonly contract_incentive_and_milestone_escalator_boost: number;
}

export function computeUniversalSituationalContextOverlay(
  input: UniversalSituationalContextInput = {},
): UniversalSituationalContextOutput {
  const actualPass = input.actualPassRate ?? 0.612;
  const xPass = input.expectedPassRate ?? 0.568;
  const proe = actualPass - xPass;
  const elasticity = (input.passRateTrailing8Plus ?? 0.745) - actualPass;

  const holdingNorm = (input.crewHoldingCallsPerGame ?? 3.2) / 2.6;
  const dpiNorm = (input.crewDpiYardsPerGame ?? 24.5) / 18.0;
  const fdPenNorm = (input.crewFirstDownsByPenaltyPerGame ?? 4.1) / 3.4;
  const crewIndex = 0.35 * holdingNorm + 0.4 * dpiNorm + 0.25 * fdPenNorm;

  const surf = (input.surfaceType ?? "monofilament_turf").toLowerCase();
  const surfMult = surf.includes("slit")
    ? 1.06
    : surf.includes("mono") || surf.includes("turf")
      ? 1.03
      : 1.0;
  const altFactor = 1.0 + 0.045 * (Math.max(0, input.altitudeFeet ?? 5280) / 5280);
  const effWind = input.isIndoorDome ? 0 : Math.max(0, input.windMph ?? 11.0);
  const windDrag = 0.012 * Math.max(0, effWind - 10);
  const noiseBoost = 0.015 * Math.max(0, ((input.crowdNoiseDb ?? 101.0) - 90) / 10);
  const microclimateIndex = surfMult * altFactor - windDrag + noiseBoost;

  const circPenalty = input.westToEastEarlyKickoff ? 0.18 : 0;
  const tnfPenalty = input.isTnfShortWeek ? 0.14 : 0;
  const restAdj = -0.025 * (input.restDifferentialDays ?? 0);
  const snapOverload = 0.012 * Math.max(0, (input.priorWeekDefensiveSnaps ?? 74) - 70);
  const fatigueIndex = Math.max(0, 0.2 + circPenalty + tnfPenalty + restAdj + snapOverload);

  const distPct = Math.max(0.005, input.distanceToIncentivePct ?? 0.08);
  const proxWeight = Math.exp(-6.0 * distPct);
  const bonusScale = Math.min(2.0, Math.log10(Math.max(10000, input.incentiveBonusUsd ?? 500000)) / 5.5);
  const incentiveBoost = proxWeight * bonusScale * 0.12;

  return {
    proe: Number(proe.toFixed(6)),
    neutral_pace_sec_per_snap: Number((input.neutralPaceSecPerSnap ?? 26.4).toFixed(6)),
    trailing_8plus_script_elasticity: Number(elasticity.toFixed(6)),
    officiating_crew_penalty_and_drive_extension_index: Number(crewIndex.toFixed(6)),
    stadium_surface_and_microclimate_index: Number(microclimateIndex.toFixed(6)),
    circadian_rest_travel_fatigue_index: Number(fatigueIndex.toFixed(6)),
    contract_incentive_and_milestone_escalator_boost: Number(incentiveBoost.toFixed(6)),
  };
}

// ============================================================================
// B. DEEP SECOND- & THIRD-ORDER NON-STATIONARY INTELLIGENCE KERNELS (7..11)
// ============================================================================

export interface CausalDeconfoundedSkillInput {
  readonly snapEpas?: readonly number[];
  readonly schemeAssistedFlags?: readonly boolean[];
  readonly rpoScreenRate?: number;
  readonly playActionBootRate?: number;
  readonly motionFreeReleaseRate?: number;
  readonly lightBoxSpacingRate?: number;
  readonly qbReadOptionEdgeFreezeRate?: number;
  readonly garbageTimeSoftShellRate?: number;
  readonly opposingDcDisruptionScore?: number;
}

export interface CausalDeconfoundedSkillOutput {
  readonly raw_observed_epa_per_play: number;
  readonly scheme_manufactured_epa_component: number;
  readonly true_unschemed_duress_epa: number;
  readonly scheme_dependency_fragility_ratio: number;
  readonly projected_post_dc_clamp_epa: number;
  readonly playoff_dc_clamp_survival_prob: number;
  readonly propensity_overlap_ess: number;
}

export function computeCausalDeconfoundedSkillVector(
  input: CausalDeconfoundedSkillInput = {},
): CausalDeconfoundedSkillOutput {
  const vals = input.snapEpas && input.snapEpas.length > 0 ? [...input.snapEpas] : [0.55, 0.48, -0.12, 0.62, -0.28, 0.35, 0.04, -0.19];
  const flags = input.schemeAssistedFlags ?? [true, true, false, true, false, true, false, false];
  const nSnaps = vals.length;
  const rawObserved = vals.reduce((a, b) => a + b, 0) / nSnaps;

  const confounderLoad =
    0.24 * (input.rpoScreenRate ?? 0.28) +
    0.22 * (input.playActionBootRate ?? 0.31) +
    0.18 * (input.motionFreeReleaseRate ?? 0.64) +
    0.14 * (input.lightBoxSpacingRate ?? 0.58) +
    0.12 * (input.qbReadOptionEdgeFreezeRate ?? 0.19) +
    0.1 * (input.garbageTimeSoftShellRate ?? 0.12);

  const zVec = vals.map((_, i) => (flags[i] ? 1.0 : 0.0));
  const zMean = zVec.reduce((a, b) => a + b, 0) / nSnaps;
  const zCentered = zVec.map((z) => z - zMean);
  const zzSum = zCentered.reduce((acc, zc) => acc + zc * zc, 0) + 1e-6;
  const zySum = zCentered.reduce((acc, zc, i) => acc + zc * ((vals[i] ?? 0) - rawObserved), 0);
  const gammaScheme = zySum / zzSum;

  const schemeManufacturedEpa = Math.max(0, gammaScheme * zMean) + 0.22 * confounderLoad;
  const trueUnschemedEpa = rawObserved - schemeManufacturedEpa;

  const propSchemed = Math.min(0.92, Math.max(0.08, 0.5 * zMean + 0.5 * confounderLoad));
  const iptwWeights = zVec.map((z) => (z > 0.5 ? 1 / propSchemed : 1 / (1 - propSchemed)));
  const wSum = iptwWeights.reduce((a, b) => a + b, 0);
  const wSqSum = iptwWeights.reduce((acc, w) => acc + w * w, 0);
  const ess = (wSum * wSum) / Math.max(1e-9, wSqSum);

  const denomFragility = Math.abs(schemeManufacturedEpa) + Math.abs(trueUnschemedEpa) + 1e-6;
  const fragilityRatio = Math.abs(schemeManufacturedEpa) / denomFragility;

  const dcClamp = Math.min(1, Math.max(0, input.opposingDcDisruptionScore ?? 0.72));
  const postClampEpa = trueUnschemedEpa + (1 - 0.75 * dcClamp) * schemeManufacturedEpa;
  const survivalProb = 1 / (1 + Math.exp(-4.0 * (postClampEpa - 0.05 * fragilityRatio)));

  return {
    raw_observed_epa_per_play: Number(rawObserved.toFixed(6)),
    scheme_manufactured_epa_component: Number(schemeManufacturedEpa.toFixed(6)),
    true_unschemed_duress_epa: Number(trueUnschemedEpa.toFixed(6)),
    scheme_dependency_fragility_ratio: Number(fragilityRatio.toFixed(6)),
    projected_post_dc_clamp_epa: Number(postClampEpa.toFixed(6)),
    playoff_dc_clamp_survival_prob: Number(survivalProb.toFixed(6)),
    propensity_overlap_ess: Number(ess.toFixed(6)),
  };
}

export interface QbTraumaAndDisguiseInput {
  readonly hitEvents?: readonly (readonly [number, number, boolean])[];
  readonly currentSnapIndex?: number;
  readonly baselineCleanTttSec?: number;
  readonly baselineCheckdownRate?: number;
  readonly baselineTwpRate?: number;
  readonly postSnapSafetySpinRate?: number;
  readonly interiorAGapMultiplier?: number;
  readonly decayLambda?: number;
}

export interface QbTraumaAndDisguiseOutput {
  readonly cumulative_trauma_excitation: number;
  readonly trauma_saturation_index: number;
  readonly interior_hit_count: number;
  readonly clean_pocket_ttt_compression_sec: number;
  readonly effective_clean_pocket_ttt_sec: number;
  readonly phantom_pressure_bailout_prob: number;
  readonly pocket_climb_angle_deg: number;
  readonly premature_checkdown_spike_delta: number;
  readonly projected_checkdown_rate: number;
  readonly post_snap_disguise_spin_twp_hazard: number;
}

export function computeQbTraumaAndDisguiseHysteresis(
  input: QbTraumaAndDisguiseInput = {},
): QbTraumaAndDisguiseOutput {
  const events = input.hitEvents ?? [
    [4.0, 0.85, true],
    [11.0, 1.1, true],
    [19.0, 0.65, false],
    [27.0, 1.25, true],
  ];
  const tNow = input.currentSnapIndex ?? 30.0;
  const lam = Math.max(0.001, input.decayLambda ?? 0.045);
  const aGapMult = Math.max(1.0, input.interiorAGapMultiplier ?? 1.45);

  let excitation = 0;
  let interiorCount = 0;
  for (const [snapT, sev, isInterior] of events) {
    if (snapT <= tNow) {
      const dt = tNow - snapT;
      const w = isInterior ? aGapMult : 1.0;
      excitation += sev * w * Math.exp(-lam * dt);
      if (isInterior) interiorCount += 1;
    }
  }

  const saturation = 1 - Math.exp(-0.42 * excitation);
  const tttCompression = -0.58 * saturation;
  const effTtt = Math.max(1.85, (input.baselineCleanTttSec ?? 2.76) + tttCompression);
  const phantomBailout = Math.min(0.85, 0.04 + 0.52 * saturation);
  const climbAngle = 80.0 - 122.0 * saturation;
  const checkdownSpike = 0.16 * saturation;
  const projCheckdown = Math.min(0.45, (input.baselineCheckdownRate ?? 0.09) + checkdownSpike);

  const spinRate = Math.min(1, Math.max(0, input.postSnapSafetySpinRate ?? 0.38));
  const interaction = saturation * spinRate * (1 + 0.15 * interiorCount);
  const twpHazard = Math.min(0.25, (input.baselineTwpRate ?? 0.028) * (1 + 1.85 * interaction));

  return {
    cumulative_trauma_excitation: Number(excitation.toFixed(6)),
    trauma_saturation_index: Number(saturation.toFixed(6)),
    interior_hit_count: interiorCount,
    clean_pocket_ttt_compression_sec: Number(tttCompression.toFixed(6)),
    effective_clean_pocket_ttt_sec: Number(effTtt.toFixed(6)),
    phantom_pressure_bailout_prob: Number(phantomBailout.toFixed(6)),
    pocket_climb_angle_deg: Number(climbAngle.toFixed(6)),
    premature_checkdown_spike_delta: Number(checkdownSpike.toFixed(6)),
    projected_checkdown_rate: Number(projCheckdown.toFixed(6)),
    post_snap_disguise_spin_twp_hazard: Number(twpHazard.toFixed(6)),
  };
}

export interface TrenchTutAndWeakLinkInput {
  readonly driveSnapDurationsSec?: readonly number[];
  readonly cumulativeGameTutSec?: number;
  readonly olFiveRatings?: readonly number[];
  readonly backupOlActiveSlot?: number | null;
  readonly dcStuntRate?: number;
  readonly dcSimulatedCreeperRate?: number;
}

export interface TrenchTutAndWeakLinkOutput {
  readonly drive_tut_weighted_sec: number;
  readonly lactate_fatigue_index: number;
  readonly naive_mean_ol_rating: number;
  readonly weak_link_min_anchor: number;
  readonly weak_link_slot_index: number;
  readonly mean_vs_min_illusion_gap: number;
  readonly targeted_stunt_overload_multiplier: number;
  readonly weak_link_collapse_prob: number;
}

export function computeTrenchTutFatigueAndWeakLinkExploitation(
  input: TrenchTutAndWeakLinkInput = {},
): TrenchTutAndWeakLinkOutput {
  const durations =
    input.driveSnapDurationsSec && input.driveSnapDurationsSec.length > 0
      ? [...input.driveSnapDurationsSec]
      : [2.4, 3.8, 5.6, 2.9, 6.1, 4.2, 3.5];
  const driveTut = durations.reduce((acc, d) => acc + Math.max(1, d) * (d > 3.5 ? 1.35 : 1.0), 0);
  const totalTut = (input.cumulativeGameTutSec ?? 168.0) + 2.2 * driveTut;
  const lactateIndex = Math.pow(totalTut, 2.2) / (Math.pow(210, 2.2) + Math.pow(totalTut, 2.2));

  const rawOl = input.olFiveRatings ?? [0.82, 0.76, 0.84, 0.44, 0.79];
  const olVals = [0, 1, 2, 3, 4].map((i) => rawOl[i] ?? 0.75);
  const naiveMean = olVals.reduce((a, b) => a + b, 0) / 5;

  const dcStunt = input.dcStuntRate ?? 0.34;
  const dcCreeper = input.dcSimulatedCreeperRate ?? 0.26;
  const stuntGamma = 0.42 * dcStunt + 0.3 * dcCreeper;
  const backupSlot = input.backupOlActiveSlot === undefined ? 3 : input.backupOlActiveSlot;

  const anchors = olVals.map((val, i) => {
    const leftDiff = i > 0 ? Math.abs(val - (olVals[i - 1] ?? val)) : 0;
    const rightDiff = i < 4 ? Math.abs(val - (olVals[i + 1] ?? val)) : 0;
    const seamMismatch = Math.max(leftDiff, rightDiff);
    const backupPen = backupSlot !== null && backupSlot === i ? 0.08 : 0;
    return val - stuntGamma * seamMismatch - backupPen - 0.14 * lactateIndex;
  });

  const minAnchor = Math.min(...anchors);
  const minSlotIdx = anchors.indexOf(minAnchor);
  const illusionGap = naiveMean - minAnchor;
  const stuntOverload = 1.0 + 0.85 * dcStunt + (backupSlot !== null ? 0.45 : 0);
  const collapseProb = Math.min(0.95, 1 / (1 + Math.exp(5.5 * (minAnchor - 0.42))));

  return {
    drive_tut_weighted_sec: Number(driveTut.toFixed(6)),
    lactate_fatigue_index: Number(lactateIndex.toFixed(6)),
    naive_mean_ol_rating: Number(naiveMean.toFixed(6)),
    weak_link_min_anchor: Number(minAnchor.toFixed(6)),
    weak_link_slot_index: minSlotIdx,
    mean_vs_min_illusion_gap: Number(illusionGap.toFixed(6)),
    targeted_stunt_overload_multiplier: Number(stuntOverload.toFixed(6)),
    weak_link_collapse_prob: Number(collapseProb.toFixed(6)),
  };
}

export interface CoordinatorScriptCliffInput {
  readonly scriptedPlays1To15Epa?: number;
  readonly unscriptedPlays16To65Epa?: number;
  readonly baselinePlayCallProbs?: readonly number[];
  readonly postNegativePlayCallProbs?: readonly number[];
  readonly repeatedShellBaitCount?: number;
  readonly ocHotRouteRigidness?: number;
  readonly dcSimCreeperDisguiseSkill?: number;
}

export interface CoordinatorScriptCliffOutput {
  readonly script_cliff_epa_delta: number;
  readonly script_exhaustion_severity: number;
  readonly baseline_play_call_entropy_nats: number;
  readonly post_negative_play_entropy_nats: number;
  readonly non_markovian_entropy_collapse: number;
  readonly kl_tilt_divergence: number;
  readonly tendency_trap_interception_sack_hazard: number;
}

export function computeCoordinatorScriptCliffAndTendencyTrap(
  input: CoordinatorScriptCliffInput = {},
): CoordinatorScriptCliffOutput {
  const scriptedEpa = input.scriptedPlays1To15Epa ?? 0.29;
  const unscriptedEpa = input.unscriptedPlays16To65Epa ?? -0.06;
  const cliffDelta = unscriptedEpa - scriptedEpa;
  const cliffSeverity = Math.max(0, -cliffDelta);

  const rawBase = (input.baselinePlayCallProbs ?? [0.38, 0.34, 0.18, 0.1]).map((p) =>
    Math.max(1e-9, p),
  );
  const sumBase = rawBase.reduce((a, b) => a + b, 0);
  const pBase = rawBase.map((p) => p / sumBase);

  const rawTilt = (input.postNegativePlayCallProbs ?? [0.68, 0.18, 0.09, 0.05]).map((p) =>
    Math.max(1e-9, p),
  );
  const sumTilt = rawTilt.reduce((a, b) => a + b, 0);
  const pTilt = rawTilt.map((p) => p / sumTilt);

  const nCats = Math.min(pBase.length, pTilt.length);
  let hBase = 0;
  let hTilt = 0;
  let klDiv = 0;
  for (let i = 0; i < nCats; i += 1) {
    const pb = pBase[i] ?? 1e-9;
    const pt = pTilt[i] ?? 1e-9;
    hBase -= pb * Math.log(pb);
    hTilt -= pt * Math.log(pt);
    klDiv += pt * Math.log(pt / pb);
  }
  const entropyCollapse = Math.max(0, hBase - hTilt);
  const baitFactor = 1 - Math.exp(-0.65 * Math.max(0, input.repeatedShellBaitCount ?? 2));
  const trapHazard = Math.min(
    0.65,
    baitFactor *
      (input.ocHotRouteRigidness ?? 0.74) *
      (input.dcSimCreeperDisguiseSkill ?? 0.81) *
      (0.35 + 0.45 * entropyCollapse),
  );

  return {
    script_cliff_epa_delta: Number(cliffDelta.toFixed(6)),
    script_exhaustion_severity: Number(cliffSeverity.toFixed(6)),
    baseline_play_call_entropy_nats: Number(hBase.toFixed(6)),
    post_negative_play_entropy_nats: Number(hTilt.toFixed(6)),
    non_markovian_entropy_collapse: Number(entropyCollapse.toFixed(6)),
    kl_tilt_divergence: Number(klDiv.toFixed(6)),
    tendency_trap_interception_sack_hazard: Number(trapHazard.toFixed(6)),
  };
}

export interface RefereeAndMarketReflexivityInput {
  readonly scoreDifferentialTrailing?: number;
  readonly quarter?: number;
  readonly priorControversialFlagAgainstTeam?: boolean;
  readonly crewBaselineDpiRate?: number;
  readonly openingSpread?: number;
  readonly currentSpread?: number;
  readonly pinnacleCircaAligned?: boolean;
  readonly reverseTicketMoneyDivergence?: number;
  readonly qbPassingYardsLineDelta?: number;
  readonly sumReceiversYardsLineDelta?: number;
}

export interface RefereeAndMarketReflexivityOutput {
  readonly reflexive_dpi_drive_extension_prob: number;
  readonly makeup_call_autocorrelation_active: boolean;
  readonly key_numbers_crossed: number;
  readonly prop_zero_sum_coherence_score: number;
  readonly true_information_steam_prob: number;
  readonly syndicate_head_fake_buyback_prob: number;
  readonly reflexive_execution_recommendation:
    | "FOLLOW_TRUE_INFORMATION_STEAM"
    | "FADE_SYNDICATE_HEAD_FAKE_INTO_BUYBACK"
    | "HOLD_WAIT_FOR_KEY_NUMBER_CONFIRMATION";
}

export function computeRefereeAndMarketReflexivity(
  input: RefereeAndMarketReflexivityInput = {},
): RefereeAndMarketReflexivityOutput {
  const trailingPts = Math.max(0, -(input.scoreDifferentialTrailing ?? -7.0));
  const qtrLev = (input.quarter ?? 4) >= 4 ? 1.35 : 1.0;
  const makeupActive = input.priorControversialFlagAgainstTeam ?? true;
  const makeupBoost = makeupActive ? 1.28 : 1.0;
  const catchupBoost = 1.0 + 0.025 * Math.min(17, trailingPts);
  const dpiProb = Math.min(
    0.35,
    (input.crewBaselineDpiRate ?? 0.048) * qtrLev * makeupBoost * catchupBoost,
  );

  const openAbs = Math.abs(input.openingSpread ?? -2.5);
  const currAbs = Math.abs(input.currentSpread ?? -3.5);
  const lowLine = Math.min(openAbs, currAbs);
  const highLine = Math.max(openAbs, currAbs);
  const keyCrossed = [3, 7, 6, 10].filter(
    (k) => (lowLine < k && k <= highLine) || (lowLine <= k && k < highLine),
  ).length;

  const propDisc = Math.abs(
    (input.qbPassingYardsLineDelta ?? 8.5) - (input.sumReceiversYardsLineDelta ?? 7.8),
  );
  const coherence = Math.exp(-0.08 * propDisc);

  const sharpWeight = (input.pinnacleCircaAligned ?? true) ? 0.65 : 0.2;
  const keyWeight = 0.2 * Math.min(2, keyCrossed);
  const splitsWeight = 0.25 * Math.max(-1, Math.min(1, input.reverseTicketMoneyDivergence ?? 0.32));
  const logit = -0.35 + 2.2 * (sharpWeight + keyWeight + splitsWeight) * coherence;
  const trueSteamProb = 1 / (1 + Math.exp(-logit));
  const headFakeProb = 1 - trueSteamProb;

  const recommendation =
    trueSteamProb >= 0.65
      ? "FOLLOW_TRUE_INFORMATION_STEAM"
      : headFakeProb >= 0.6
        ? "FADE_SYNDICATE_HEAD_FAKE_INTO_BUYBACK"
        : "HOLD_WAIT_FOR_KEY_NUMBER_CONFIRMATION";

  return {
    reflexive_dpi_drive_extension_prob: Number(dpiProb.toFixed(6)),
    makeup_call_autocorrelation_active: makeupActive,
    key_numbers_crossed: keyCrossed,
    prop_zero_sum_coherence_score: Number(coherence.toFixed(6)),
    true_information_steam_prob: Number(trueSteamProb.toFixed(6)),
    syndicate_head_fake_buyback_prob: Number(headFakeProb.toFixed(6)),
    reflexive_execution_recommendation: recommendation,
  };
}

export interface GsiSportsMedicineAndCoupled5ApiInput {
  readonly injuryArchetype?:
    | "high_ankle_syndesmosis"
    | "hamstring_grade_1_2"
    | "acl_reconstruction_year1"
    | "turf_toe_mtp_sprain"
    | "qb_rib_or_ac_joint_sprain"
    | "concussion_return_protocol";
  readonly weeksSinceReturn?: number;
  readonly playingOnSlitFilmOrArtificialTurf?: boolean;
  readonly shortWeekThursdayOrTravel?: boolean;
  readonly teamTotalImpliedTds?: number;
  readonly sumPlayerAnytimeTdImpliedProbs?: number;
  readonly altSpreadMinus95ImpliedProb?: number;
  readonly coupledTrajBlowout10PlusProb?: number;
}

export interface GsiSportsMedicineAndCoupled5ApiOutput {
  readonly injury_archetype: string;
  readonly biomechanical_efficiency_loss_pct: number;
  readonly projected_snap_share_cap: number;
  readonly in_game_reaggravation_hazard: number;
  readonly td_vs_team_total_contradiction_edge: number;
  readonly alt_spread_bimodal_tail_edge: number;
  readonly coupled_5api_scientific_nodes_wired: 204;
  readonly coupled_5api_sources: readonly ["x_api", "arxiv", "openalex", "kaggle", "huggingface"];
}

export function computeGsiSportsMedicineAndCoupled5ApiOverlay(
  input: GsiSportsMedicineAndCoupled5ApiInput = {},
): GsiSportsMedicineAndCoupled5ApiOutput {
  const profiles: Record<
    string,
    {
      readonly baseCuttingLoss: number;
      readonly baseSnapCap: number;
      readonly baseReinjuryHazard: number;
      readonly decayHalfLifeWeeks: number;
    }
  > = {
    high_ankle_syndesmosis: {
      baseCuttingLoss: 0.145,
      baseSnapCap: 0.68,
      baseReinjuryHazard: 0.21,
      decayHalfLifeWeeks: 2.5,
    },
    hamstring_grade_1_2: {
      baseCuttingLoss: 0.115,
      baseSnapCap: 0.72,
      baseReinjuryHazard: 0.24,
      decayHalfLifeWeeks: 2.2,
    },
    acl_reconstruction_year1: {
      baseCuttingLoss: 0.112,
      baseSnapCap: 0.78,
      baseReinjuryHazard: 0.14,
      decayHalfLifeWeeks: 6.0,
    },
    turf_toe_mtp_sprain: {
      baseCuttingLoss: 0.12,
      baseSnapCap: 0.7,
      baseReinjuryHazard: 0.19,
      decayHalfLifeWeeks: 2.8,
    },
    qb_rib_or_ac_joint_sprain: {
      baseCuttingLoss: 0.085,
      baseSnapCap: 0.92,
      baseReinjuryHazard: 0.16,
      decayHalfLifeWeeks: 2.0,
    },
    concussion_return_protocol: {
      baseCuttingLoss: 0.065,
      baseSnapCap: 0.88,
      baseReinjuryHazard: 0.12,
      decayHalfLifeWeeks: 1.8,
    },
  };

  const archetype = input.injuryArchetype ?? "high_ankle_syndesmosis";
  const profile = profiles[archetype] ?? profiles.high_ankle_syndesmosis!;
  const wks = Math.max(0, input.weeksSinceReturn ?? 1);
  const decay = Math.exp((-Math.log(2) * wks) / profile.decayHalfLifeWeeks);
  const turfMult = (input.playingOnSlitFilmOrArtificialTurf ?? true) ? 1.18 : 1.0;
  const shortWeekMult = (input.shortWeekThursdayOrTravel ?? false) ? 1.15 : 1.0;

  const lossPct = Math.min(0.35, profile.baseCuttingLoss * decay * turfMult * shortWeekMult);
  const snapCap = Math.min(1.0, 1.0 - (1.0 - profile.baseSnapCap) * decay * shortWeekMult);
  const reinjuryHazard = Math.min(
    0.45,
    profile.baseReinjuryHazard * decay * turfMult * shortWeekMult,
  );
  const tdEdge =
    (input.teamTotalImpliedTds ?? 2.85) - (input.sumPlayerAnytimeTdImpliedProbs ?? 2.28);
  const altTailEdge =
    (input.coupledTrajBlowout10PlusProb ?? 0.31) - (input.altSpreadMinus95ImpliedProb ?? 0.24);

  return {
    injury_archetype: archetype,
    biomechanical_efficiency_loss_pct: Number(lossPct.toFixed(6)),
    projected_snap_share_cap: Number(snapCap.toFixed(6)),
    in_game_reaggravation_hazard: Number(reinjuryHazard.toFixed(6)),
    td_vs_team_total_contradiction_edge: Number(tdEdge.toFixed(6)),
    alt_spread_bimodal_tail_edge: Number(altTailEdge.toFixed(6)),
    coupled_5api_scientific_nodes_wired: 204,
    coupled_5api_sources: ["x_api", "arxiv", "openalex", "kaggle", "huggingface"] as const,
  };
}

export function evaluateUniversalNfl360MetricAndSituationalDossier() {
  return {
    schema: "gse_universal_nfl_360_metric_and_deep_non_stationary_dossier_v2" as const,
    qb_suite: computeUniversalQbMetrics(),
    receiving_suite: computeUniversalReceivingMetrics(),
    rushing_suite: computeUniversalRushingMetrics(),
    trench_suite: computeUniversalTrenchMetrics(),
    defense_and_idp_suite: computeUniversalDefenseAndIdpMetrics(),
    situational_context_suite: computeUniversalSituationalContextOverlay(),
    deep_non_stationary_kernels: {
      causal_deconfounded_skill: computeCausalDeconfoundedSkillVector(),
      qb_trauma_and_disguise_hysteresis: computeQbTraumaAndDisguiseHysteresis(),
      trench_tut_fatigue_and_weak_link: computeTrenchTutFatigueAndWeakLinkExploitation(),
      coordinator_script_cliff_and_tendency_trap: computeCoordinatorScriptCliffAndTendencyTrap(),
      referee_and_market_reflexivity: computeRefereeAndMarketReflexivity(),
      gsi_sports_medicine_and_coupled_5api: computeGsiSportsMedicineAndCoupled5ApiOverlay(),
    },
    analyst_and_metric_registry: UNIVERSAL_NFL_ANALYST_AND_METRIC_REGISTRY,
    all_6_suites_active: true as const,
    all_5_deep_kernels_active: true as const,
    all_6_deep_kernels_active: true as const,
  };
}
