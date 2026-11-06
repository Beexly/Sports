"""
Unit tests for `intelligence.coaching.universal_nfl_metric_and_situational_engine`.
Covers all 6 Foundational Universal NFL Metric Suites and all 5 Deep Second- &
Third-Order Non-Stationary Football Intelligence Kernels.
"""

from __future__ import annotations

import math
from pathlib import Path

from intelligence.coaching.universal_nfl_metric_and_situational_engine import (
    UNIVERSAL_NFL_ANALYST_AND_METRIC_REGISTRY,
    compute_causal_deconfounded_skill_vector,
    compute_coordinator_script_cliff_and_tendency_trap,
    compute_gsi_sports_medicine_and_coupled_5api_overlay,
    compute_qb_trauma_and_disguise_hysteresis,
    compute_referee_and_market_reflexivity,
    compute_trench_tut_fatigue_and_weak_link_exploitation,
    compute_universal_defense_and_idp_metrics,
    compute_universal_qb_metrics,
    compute_universal_receiving_metrics,
    compute_universal_rushing_metrics,
    compute_universal_situational_context_overlay,
    compute_universal_trench_metrics,
    evaluate_universal_nfl_360_metric_and_situational_dossier,
)


def test_universal_qb_metrics_suite() -> None:
    res = compute_universal_qb_metrics(
        play_epas=[0.40, -0.10, 0.60, 0.20, 0.95],
        play_win_probs=[0.50, 0.55, 0.45, 0.62, 0.99],  # last snap excluded by 0.05..0.95 WP filter
        pass_attempts=30,
        completions=21,
        expected_completion_pct=65.0,
        pass_yards=270.0,
        pass_tds=2,
        interceptions=1,
        sacks=2,
        sack_yards=15.0,
        scrambles=3,
        air_yards=250.0,
        pressures=10,
        big_time_throws=3,
        turnover_worthy_plays=1,
        first_read_targets=20,
        targeted_dropbacks=30,
        tight_window_attempts=6,
    )
    assert res["garbage_time_snaps_excluded"] == 1
    assert math.isclose(res["epa_per_play"], (0.40 - 0.10 + 0.60 + 0.20) / 4.0, rel_tol=1e-5)
    assert math.isclose(res["cpoe"], 70.0 - 65.0, rel_tol=1e-5)
    assert math.isclose(res["dakota_composite"], 0.20 * res["epa_per_play"] + 0.009 * 5.0 + 0.09, rel_tol=1e-5)
    # ANY/A = (270 + 40 - 45 - 15) / (30 + 2) = 250 / 32 = 7.8125
    assert math.isclose(res["any_a"], 7.8125, rel_tol=1e-5)
    assert math.isclose(res["pff_btt_rate"], 3.0 / 30.0, abs_tol=1e-5)
    assert math.isclose(res["pff_twp_rate"], 1.0 / 35.0, abs_tol=1e-5)
    assert math.isclose(res["pressure_to_sack_rate"], 0.20, abs_tol=1e-5)
    assert 0.0 < res["patton_pressure_survival_score"] <= 1.0
    assert math.isclose(res["first_read_target_rate"], 20.0 / 30.0, abs_tol=1e-5)
    assert math.isclose(res["aggressiveness_pct"], 20.0, rel_tol=1e-5)
    assert math.isclose(res["pacr"], 270.0 / 250.0, rel_tol=1e-5)


def test_universal_receiving_metrics_suite() -> None:
    res = compute_universal_receiving_metrics(
        receiving_yards=96.0,
        routes_run=32,
        target_share=0.30,
        air_yards_share=0.40,
        air_yards=120.0,
        targets=10,
    )
    assert math.isclose(res["yprr_overall"], 3.0, rel_tol=1e-5)
    assert math.isclose(res["tprr"], 10.0 / 32.0, rel_tol=1e-5)
    # WOPR = 1.5 * 0.30 + 0.7 * 0.40 = 0.45 + 0.28 = 0.73
    assert math.isclose(res["wopr"], 0.73, rel_tol=1e-5)
    assert math.isclose(res["racr"], 96.0 / 120.0, rel_tol=1e-5)
    assert res["yprr_vs_man"] > 0.0
    assert res["yprr_vs_zone"] > 0.0
    assert res["yprr_vs_single_high"] > 0.0
    assert res["yprr_vs_two_high"] > 0.0
    assert res["espn_rtm_open_catch_yac_composite"] > 50.0
    assert res["ngs_xyac_over_expected"] > 0.0


def test_universal_rushing_metrics_suite() -> None:
    res = compute_universal_rushing_metrics(
        rush_attempts=20,
        rushing_yards=100.0,
        expected_rushing_yards=80.0,
        yards_before_contact=40.0,
        yards_after_contact=60.0,
        missed_tackles_forced_rush=6,
        missed_tackles_forced_rec=2,
        receptions=5,
    )
    assert math.isclose(res["ngs_ryoe_per_att"], 1.0, rel_tol=1e-5)
    assert math.isclose(res["yards_before_contact_per_att"], 2.0, rel_tol=1e-5)
    assert math.isclose(res["yards_after_contact_per_att"], 3.0, rel_tol=1e-5)
    assert math.isclose(res["missed_tackles_forced_per_att"], 0.30, rel_tol=1e-5)
    # Elusive Rating = (8 / 25) * 3.0 * 100 = 96.0
    assert math.isclose(res["pff_elusive_rating"], 96.0, rel_tol=1e-5)
    assert res["koalaty_xfp_over_expected"] > 0.0


def test_universal_trench_metrics_suite() -> None:
    res = compute_universal_trench_metrics(
        pass_block_snaps=40,
        pbwr_wins_2_5s=26,
        hurries_allowed=4,
        hits_allowed=2,
        sacks_allowed=1,
        pass_rush_snaps=30,
        sacks_generated=2,
        hits_generated=2,
        hurries_generated=6,
        carry_yards_sequence=[-2.0, 3.0, 8.0, 15.0],
    )
    # PBE = (40 - (3.0 + 1.5 + 1.0)) / 40 * 100 = 34.5 / 40 * 100 = 86.25
    assert math.isclose(res["pff_pass_blocking_efficiency"], 86.25, rel_tol=1e-5)
    # PRP = (2 + 0.75 * 8) / 30 * 100 = 8 / 30 * 100 = 26.666667
    assert math.isclose(res["pff_pass_rush_productivity"], 800.0 / 30.0, rel_tol=1e-5)
    # ALY: -2.0 -> -2.4; 3.0 -> 3.0; 8.0 -> 4 + 0.5*4 = 6.0; 15.0 -> 7.0 => sum = 13.6 / 4 = 3.40
    assert math.isclose(res["ftn_adjusted_line_yards"], 3.40, rel_tol=1e-5)
    assert res["brandon_thorn_true_pass_set_pressure_rate"] > 0.0


def test_universal_defense_idp_and_situational_suites() -> None:
    def_res = compute_universal_defense_and_idp_metrics(
        coverage_snaps=40,
        cover1_snaps=10,
        cover3_snaps=12,
        cover0_snaps=2,
        cover2_snaps=6,
        cover4_quarters_snaps=6,
        cover6_palms_snaps=4,
    )
    assert math.isclose(def_res["mofc_rate"], 24.0 / 40.0, rel_tol=1e-5)
    assert math.isclose(def_res["mofo_rate"], 16.0 / 40.0, rel_tol=1e-5)
    assert def_res["idp_stadium_scorekeeper_assist_multiplier"] > 1.0
    assert 0.0 < def_res["co_sack_0_25_half_sack_clear_prob"] < 1.0

    sit_res = compute_universal_situational_context_overlay(
        actual_pass_rate=0.62,
        expected_pass_rate=0.55,
        west_to_east_early_kickoff=True,
        is_tnf_short_week=True,
    )
    assert math.isclose(sit_res["proe"], 0.07, rel_tol=1e-5)
    assert sit_res["circadian_rest_travel_fatigue_index"] > 0.40
    assert sit_res["contract_incentive_and_milestone_escalator_boost"] > 0.0


def test_deep_5_non_stationary_second_order_kernels() -> None:
    # Kernel 1: Causal De-Confounding & True Skill Isolation
    causal = compute_causal_deconfounded_skill_vector(
        snap_epas=[0.60, 0.55, -0.15, 0.50, -0.25, 0.45, -0.10, -0.20],
        scheme_assisted_flags=[True, True, False, True, False, True, False, False],
        opposing_dc_disruption_score=0.80,
    )
    assert causal["scheme_manufactured_epa_component"] > 0.0
    assert causal["true_unschemed_duress_epa"] < causal["raw_observed_epa_per_play"]
    assert 0.0 < causal["scheme_dependency_fragility_ratio"] < 1.0
    assert 0.0 < causal["playoff_dc_clamp_survival_prob"] < 1.0

    # Kernel 2: QB Post-Hit Trauma Hysteresis & Disguise-Spin Cognitive Breakdown
    trauma = compute_qb_trauma_and_disguise_hysteresis(
        hit_events=[(3.0, 1.1, True), (9.0, 1.3, True), (18.0, 1.2, True)],
        current_snap_index=20.0,
        baseline_clean_ttt_sec=2.80,
        baseline_twp_rate=0.025,
        post_snap_safety_spin_rate=0.45,
    )
    assert trauma["clean_pocket_ttt_compression_sec"] < -0.20
    assert trauma["effective_clean_pocket_ttt_sec"] < 2.60
    assert trauma["phantom_pressure_bailout_prob"] > 0.25
    assert trauma["pocket_climb_angle_deg"] < 30.0
    assert trauma["post_snap_disguise_spin_twp_hazard"] > 0.025

    # Kernel 3: Trench Time-Under-Tension (TUT) & Weakest-Link Backup OL Exploitation
    tut = compute_trench_tut_fatigue_and_weak_link_exploitation(
        drive_snap_durations_sec=[3.9, 5.4, 6.2, 4.8, 5.1],
        ol_five_ratings=[0.85, 0.80, 0.84, 0.38, 0.81],
        backup_ol_active_slot=3,
    )
    assert tut["weak_link_slot_index"] == 3
    assert tut["weak_link_min_anchor"] < tut["naive_mean_ol_rating"]
    assert tut["mean_vs_min_illusion_gap"] > 0.35
    assert tut["weak_link_collapse_prob"] > 0.50

    # Kernel 4: Coordinator Script-Exhaustion Cliff & 3-Snap Tendency-Baiting Trap
    cliff = compute_coordinator_script_cliff_and_tendency_trap(
        scripted_plays_1_to_15_epa=0.34,
        unscripted_plays_16_to_65_epa=-0.08,
    )
    assert math.isclose(cliff["script_cliff_epa_delta"], -0.42, rel_tol=1e-5)
    assert cliff["non_markovian_entropy_collapse"] > 0.0
    assert cliff["kl_tilt_divergence"] > 0.0
    assert cliff["tendency_trap_interception_sack_hazard"] > 0.0

    # Kernel 5: Dynamic Referee Game-State Reflexivity & True Steam vs Head-Fake Detector
    ref_mkt = compute_referee_and_market_reflexivity(
        score_differential_trailing=-10.0,
        quarter=4,
        prior_controversial_flag_against_team=True,
        opening_spread=-2.5,
        current_spread=-3.5,
        pinnacle_circa_aligned=True,
    )
    assert ref_mkt["reflexive_dpi_drive_extension_prob"] > 0.06
    assert ref_mkt["key_numbers_crossed"] >= 1
    assert ref_mkt["true_information_steam_prob"] > 0.65
    assert ref_mkt["reflexive_execution_recommendation"] == "FOLLOW_TRUE_INFORMATION_STEAM"


def test_full_360_dossier_and_zero_shortcuts() -> None:
    gsi = compute_gsi_sports_medicine_and_coupled_5api_overlay(
        injury_archetype="high_ankle_syndesmosis",
        weeks_since_return=1,
        playing_on_slit_film_or_artificial_turf=True,
    )
    assert gsi["biomechanical_efficiency_loss_pct"] > 0.10
    assert gsi["projected_snap_share_cap"] < 0.80
    assert gsi["coupled_5api_scientific_nodes_wired"] == 204

    dossier = evaluate_universal_nfl_360_metric_and_situational_dossier()
    assert dossier["all_6_suites_active"] is True
    assert dossier["all_5_deep_kernels_active"] is True
    assert dossier["all_6_deep_kernels_active"] is True
    assert len(UNIVERSAL_NFL_ANALYST_AND_METRIC_REGISTRY) >= 7

    engine_path = (
        Path(__file__).resolve().parents[2]
        / "intelligence"
        / "coaching"
        / "universal_nfl_metric_and_situational_engine.py"
    )
    src = engine_path.read_text(encoding="utf-8")
    assert ".normal(" not in src
    assert "tanh(" not in src
