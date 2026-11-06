import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  UNIVERSAL_NFL_ANALYST_AND_METRIC_REGISTRY,
  computeCausalDeconfoundedSkillVector,
  computeCoordinatorScriptCliffAndTendencyTrap,
  computeGsiSportsMedicineAndCoupled5ApiOverlay,
  computeQbTraumaAndDisguiseHysteresis,
  computeRefereeAndMarketReflexivity,
  computeTrenchTutFatigueAndWeakLinkExploitation,
  computeUniversalDefenseAndIdpMetrics,
  computeUniversalQbMetrics,
  computeUniversalReceivingMetrics,
  computeUniversalRushingMetrics,
  computeUniversalSituationalContextOverlay,
  computeUniversalTrenchMetrics,
  evaluateUniversalNfl360MetricAndSituationalDossier,
} from "../universal-nfl-metric-and-situational-engine.js";

describe("universal-nfl-metric-and-situational-engine", () => {
  it("computes the Universal QB Suite with WP garbage-time filtering, DAKOTA, ANY/A, P2S%, and Patton survival", () => {
    const res = computeUniversalQbMetrics({
      playEpas: [0.4, -0.1, 0.6, 0.2, 0.95],
      playWinProbs: [0.5, 0.55, 0.45, 0.62, 0.99],
      passAttempts: 30,
      completions: 21,
      expectedCompletionPct: 65.0,
      passYards: 270.0,
      passTds: 2,
      interceptions: 1,
      sacks: 2,
      sackYards: 15.0,
      scrambles: 3,
      airYards: 250.0,
      pressures: 10,
      bigTimeThrows: 3,
      turnoverWorthyPlays: 1,
      firstReadTargets: 20,
      targetedDropbacks: 30,
      tightWindowAttempts: 6,
    });

    expect(res.garbage_time_snaps_excluded).toBe(1);
    expect(res.epa_per_play).toBeCloseTo(0.275, 5);
    expect(res.cpoe).toBeCloseTo(5.0, 5);
    expect(res.dakota_composite).toBeCloseTo(0.2 * 0.275 + 0.009 * 5.0 + 0.09, 5);
    expect(res.any_a).toBeCloseTo(7.8125, 5);
    expect(res.pff_btt_rate).toBeCloseTo(0.1, 5);
    expect(res.pff_twp_rate).toBeCloseTo(1 / 35, 5);
    expect(res.pressure_to_sack_rate).toBeCloseTo(0.2, 5);
    expect(res.patton_pressure_survival_score).toBeGreaterThan(0);
    expect(res.first_read_target_rate).toBeCloseTo(2 / 3, 5);
    expect(res.aggressiveness_pct).toBeCloseTo(20.0, 5);
    expect(res.pacr).toBeCloseTo(270 / 250, 5);
  });

  it("computes the Universal Receiving Suite (YPRR splits, TPRR, WOPR, RACR, ASS, ESPN RTM, YACOE, 1D/RR)", () => {
    const res = computeUniversalReceivingMetrics({
      receivingYards: 96.0,
      routesRun: 32,
      targetShare: 0.3,
      airYardsShare: 0.4,
      airYards: 120.0,
      targets: 10,
    });

    expect(res.yprr_overall).toBeCloseTo(3.0, 5);
    expect(res.tprr).toBeCloseTo(10 / 32, 5);
    expect(res.wopr).toBeCloseTo(0.73, 5);
    expect(res.racr).toBeCloseTo(0.8, 5);
    expect(res.yprr_vs_man).toBeGreaterThan(0);
    expect(res.yprr_vs_zone).toBeGreaterThan(0);
    expect(res.yprr_vs_single_high).toBeGreaterThan(0);
    expect(res.yprr_vs_two_high).toBeGreaterThan(0);
    expect(res.espn_rtm_open_catch_yac_composite).toBeGreaterThan(50);
    expect(res.ngs_xyac_over_expected).toBeGreaterThan(0);
  });

  it("computes the Universal Rushing Suite (RYOE/Att, ROE%, Box Rates, YBC, YACo, MTF, PFF Elusive Rating, Koalaty XFP)", () => {
    const res = computeUniversalRushingMetrics({
      rushAttempts: 20,
      rushingYards: 100.0,
      expectedRushingYards: 80.0,
      yardsBeforeContact: 40.0,
      yardsAfterContact: 60.0,
      missedTacklesForcedRush: 6,
      missedTacklesForcedRec: 2,
      receptions: 5,
    });

    expect(res.ngs_ryoe_per_att).toBeCloseTo(1.0, 5);
    expect(res.yards_before_contact_per_att).toBeCloseTo(2.0, 5);
    expect(res.yards_after_contact_per_att).toBeCloseTo(3.0, 5);
    expect(res.missed_tackles_forced_per_att).toBeCloseTo(0.3, 5);
    expect(res.pff_elusive_rating).toBeCloseTo(96.0, 5);
    expect(res.koalaty_xfp_over_expected).toBeGreaterThan(0);
  });

  it("computes the Universal Trench Warfare Suite (PBWR, PRWR, RBWR, RSWR, PBE, PRP, TPS, FTN ALY, Stunt & Creeper rates)", () => {
    const res = computeUniversalTrenchMetrics({
      passBlockSnaps: 40,
      pbwrWins25s: 26,
      hurriesAllowed: 4,
      hitsAllowed: 2,
      sacksAllowed: 1,
      passRushSnaps: 30,
      sacksGenerated: 2,
      hitsGenerated: 2,
      hurriesGenerated: 6,
      carryYardsSequence: [-2.0, 3.0, 8.0, 15.0],
    });

    expect(res.pff_pass_blocking_efficiency).toBeCloseTo(86.25, 5);
    expect(res.pff_pass_rush_productivity).toBeCloseTo(800 / 30, 5);
    expect(res.ftn_adjusted_line_yards).toBeCloseTo(3.4, 5);
    expect(res.brandon_thorn_true_pass_set_pressure_rate).toBeGreaterThan(0);
  });

  it("computes the Universal Defense/IDP and Situational Context Suites", () => {
    const defRes = computeUniversalDefenseAndIdpMetrics({
      coverageSnaps: 40,
      cover1Snaps: 10,
      cover3Snaps: 12,
      cover0Snaps: 2,
      cover2Snaps: 6,
      cover4QuartersSnaps: 6,
      cover6PalmsSnaps: 4,
    });
    expect(defRes.mofc_rate).toBeCloseTo(0.6, 5);
    expect(defRes.mofo_rate).toBeCloseTo(0.4, 5);
    expect(defRes.idp_stadium_scorekeeper_assist_multiplier).toBeGreaterThan(1.0);
    expect(defRes.co_sack_0_25_half_sack_clear_prob).toBeGreaterThan(0);

    const sitRes = computeUniversalSituationalContextOverlay({
      actualPassRate: 0.62,
      expectedPassRate: 0.55,
      westToEastEarlyKickoff: true,
      isTnfShortWeek: true,
    });
    expect(sitRes.proe).toBeCloseTo(0.07, 5);
    expect(sitRes.circadian_rest_travel_fatigue_index).toBeGreaterThan(0.4);
    expect(sitRes.contract_incentive_and_milestone_escalator_boost).toBeGreaterThan(0);
  });

  it("computes all 5 Deep Non-Stationary Second- & Third-Order Football Intelligence Kernels", () => {
    // Kernel 1: Causal De-Confounding & True Skill Isolation
    const causal = computeCausalDeconfoundedSkillVector({
      snapEpas: [0.6, 0.55, -0.15, 0.5, -0.25, 0.45, -0.1, -0.2],
      schemeAssistedFlags: [true, true, false, true, false, true, false, false],
      opposingDcDisruptionScore: 0.8,
    });
    expect(causal.scheme_manufactured_epa_component).toBeGreaterThan(0);
    expect(causal.true_unschemed_duress_epa).toBeLessThan(causal.raw_observed_epa_per_play);
    expect(causal.scheme_dependency_fragility_ratio).toBeGreaterThan(0);
    expect(causal.playoff_dc_clamp_survival_prob).toBeGreaterThan(0);

    // Kernel 2: QB Post-Hit Trauma Hysteresis & Disguise-Spin Cognitive Breakdown
    const trauma = computeQbTraumaAndDisguiseHysteresis({
      hitEvents: [
        [3.0, 1.1, true],
        [9.0, 1.3, true],
        [18.0, 1.2, true],
      ],
      currentSnapIndex: 20.0,
      baselineCleanTttSec: 2.8,
      baselineTwpRate: 0.025,
      postSnapSafetySpinRate: 0.45,
    });
    expect(trauma.clean_pocket_ttt_compression_sec).toBeLessThan(-0.2);
    expect(trauma.effective_clean_pocket_ttt_sec).toBeLessThan(2.6);
    expect(trauma.phantom_pressure_bailout_prob).toBeGreaterThan(0.25);
    expect(trauma.pocket_climb_angle_deg).toBeLessThan(30);
    expect(trauma.post_snap_disguise_spin_twp_hazard).toBeGreaterThan(0.025);

    // Kernel 3: Trench TUT Fatigue & Weakest-Link Backup OL Exploitation
    const tut = computeTrenchTutFatigueAndWeakLinkExploitation({
      driveSnapDurationsSec: [3.9, 5.4, 6.2, 4.8, 5.1],
      olFiveRatings: [0.85, 0.8, 0.84, 0.38, 0.81],
      backupOlActiveSlot: 3,
    });
    expect(tut.weak_link_slot_index).toBe(3);
    expect(tut.weak_link_min_anchor).toBeLessThan(tut.naive_mean_ol_rating);
    expect(tut.mean_vs_min_illusion_gap).toBeGreaterThan(0.35);
    expect(tut.weak_link_collapse_prob).toBeGreaterThan(0.5);

    // Kernel 4: Coordinator Script-Exhaustion Cliff & 3-Snap Tendency-Baiting Trap
    const cliff = computeCoordinatorScriptCliffAndTendencyTrap({
      scriptedPlays1To15Epa: 0.34,
      unscriptedPlays16To65Epa: -0.08,
    });
    expect(cliff.script_cliff_epa_delta).toBeCloseTo(-0.42, 5);
    expect(cliff.non_markovian_entropy_collapse).toBeGreaterThan(0);
    expect(cliff.kl_tilt_divergence).toBeGreaterThan(0);
    expect(cliff.tendency_trap_interception_sack_hazard).toBeGreaterThan(0);

    // Kernel 5: Dynamic Referee Game-State Reflexivity & True Steam vs Head-Fake Detector
    const refMkt = computeRefereeAndMarketReflexivity({
      scoreDifferentialTrailing: -10.0,
      quarter: 4,
      priorControversialFlagAgainstTeam: true,
      openingSpread: -2.5,
      currentSpread: -3.5,
      pinnacleCircaAligned: true,
    });
    expect(refMkt.reflexive_dpi_drive_extension_prob).toBeGreaterThan(0.06);
    expect(refMkt.key_numbers_crossed).toBeGreaterThanOrEqual(1);
    expect(refMkt.true_information_steam_prob).toBeGreaterThan(0.65);
    expect(refMkt.reflexive_execution_recommendation).toBe("FOLLOW_TRUE_INFORMATION_STEAM");
  });

  it("evaluates the full 12-module 360 dossier (incl. GSI Sports Medicine & Coupled 5-API) and verifies zero banned patterns", () => {
    const gsi = computeGsiSportsMedicineAndCoupled5ApiOverlay({
      injuryArchetype: "high_ankle_syndesmosis",
      weeksSinceReturn: 1,
      playingOnSlitFilmOrArtificialTurf: true,
    });
    expect(gsi.biomechanical_efficiency_loss_pct).toBeGreaterThan(0.1);
    expect(gsi.projected_snap_share_cap).toBeLessThan(0.8);
    expect(gsi.coupled_5api_scientific_nodes_wired).toBe(204);

    const dossier = evaluateUniversalNfl360MetricAndSituationalDossier();
    expect(dossier.all_6_suites_active).toBe(true);
    expect(dossier.all_5_deep_kernels_active).toBe(true);
    expect(dossier.all_6_deep_kernels_active).toBe(true);
    expect(Object.keys(UNIVERSAL_NFL_ANALYST_AND_METRIC_REGISTRY).length).toBeGreaterThanOrEqual(7);

    const srcFile = path.resolve(__dirname, "../universal-nfl-metric-and-situational-engine.ts");
    const srcText = fs.readFileSync(srcFile, "utf-8");
    expect(srcText.includes(".normal(")).toBe(false);
    expect(srcText.includes("tanh(")).toBe(false);
  });
});
