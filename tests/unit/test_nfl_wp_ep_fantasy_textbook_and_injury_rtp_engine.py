#!/usr/bin/env python3
"""
Unit Tests for `intelligence/nfl_analytics_and_injury_biomechanics/nfl_wp_ep_fantasy_textbook_and_injury_rtp_engine.py`
and its integration with the 360-degree post-simulation projection & 200+ Pt DraftKings DFS pipeline.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from intelligence.nfl_analytics_and_injury_biomechanics import (
    FANTASY_FOOTBALL_ANALYTICS_TEXTBOOK_29_CHAPTERS_CATALOG,
    NFL_38_SPORTS_MEDICINE_AND_BIOMECHANICS_CORPUS_CATALOG,
    NFL_RULEBOOKS_AND_EVOLUTION_CATALOG,
    NFL_WP_EP_25_PAPERS_AND_MODELS_CATALOG,
    apply_nfl_wp_ep_fantasy_and_injury_rtp_to_dfs_projections,
    compute_blown_lead_pathwise_calibration_adjustment,
    compute_fantasy_textbook_29chapter_projection_and_portfolio_suite,
    compute_fourth_down_humility_and_hmm_play_call_priors,
    compute_hybrid_pythagorean_and_ingame_wp,
    compute_injury_biomechanics_and_rtp_fantasy_decay_kernel,
    compute_multinomial_ep_and_nflwar_replacement_delta,
    compute_nfl_rulebook_and_dynamic_kickoff_environment_modifiers,
    evaluate_nfl_wp_ep_fantasy_and_injury_rtp_overlay,
)
from intelligence.nfl_analytics_and_injury_biomechanics.nfl_wp_ep_fantasy_textbook_and_injury_rtp_engine import (
    DEEP_RESEARCH_MD_PATH,
    MANIFEST_JSON_PATH,
    write_nfl_wp_ep_fantasy_and_injury_rtp_manifest_and_report,
)


def test_catalog_counts_and_manifest_artifacts() -> None:
    assert len(NFL_WP_EP_25_PAPERS_AND_MODELS_CATALOG) == 25
    assert len(FANTASY_FOOTBALL_ANALYTICS_TEXTBOOK_29_CHAPTERS_CATALOG) == 29
    assert len(NFL_RULEBOOKS_AND_EVOLUTION_CATALOG) == 4
    assert len(NFL_38_SPORTS_MEDICINE_AND_BIOMECHANICS_CORPUS_CATALOG) == 38

    manifest = write_nfl_wp_ep_fantasy_and_injury_rtp_manifest_and_report()
    assert manifest["summary_counts"]["total_corpus_items_wired"] == 96
    assert MANIFEST_JSON_PATH.is_file()
    assert DEEP_RESEARCH_MD_PATH.is_file()

    loaded = json.loads(MANIFEST_JSON_PATH.read_text(encoding="utf-8"))
    assert loaded["digest_sha256"] == manifest["digest_sha256"]


def test_suite1_blown_lead_paradox_pathwise_stopping_time_calibration() -> None:
    # Trajectory that climbs from 0.52 to 0.91 (crosses q=0.85 at index 3) and then experiences blown-lead volatility
    traj = [0.52, 0.64, 0.78, 0.88, 0.91, 0.74, 0.61]
    res = compute_blown_lead_pathwise_calibration_adjustment(traj, stopping_threshold_q=0.85)
    assert res["paper_id"] == "arXiv:2602.10784v1"
    assert res["crossed_threshold_q"] is True
    assert res["stopping_time_tau_q"] == 3
    assert res[" empirical_pathwise_calibration_gap_delta_q" if False else "empirical_pathwise_calibration_gap_delta_q"] < 0.0
    assert 0.70 <= res["martingale_shrinkage_damper_lambda"] < 1.0
    assert res["pathwise_calibrated_peak_wp"] < res["sup_wp_trajectory"]
    assert res["blown_lead_hazard_prob"] > (1.0 - res["raw_wp_at_tau_q"])

    # Trajectory that never crosses q=0.90
    res_no_cross = compute_blown_lead_pathwise_calibration_adjustment([0.50, 0.58, 0.65, 0.72], stopping_threshold_q=0.90)
    assert res_no_cross["crossed_threshold_q"] is False
    assert res_no_cross["stopping_time_tau_q"] is None

    # 2D trajectory matrix (n_worlds x n_snaps) with empirical outcomes
    worlds = np.array(
        [
            [0.52, 0.70, 0.87, 0.92, 0.95],
            [0.52, 0.68, 0.86, 0.72, 0.40],
            [0.52, 0.60, 0.75, 0.81, 0.84],
        ],
        dtype=np.float64,
    )
    res_2d = compute_blown_lead_pathwise_calibration_adjustment(
        worlds,
        stopping_threshold_q=0.85,
        observed_outcomes_given_crossed=[1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
    )
    assert res_2d["crossed_threshold_q"] is True
    assert res_2d["stopping_time_tau_q"] == 2
    # At tau_q=2, crossing worlds (0 and 1) have raw WP 0.87 and 0.86 -> mean 0.865 (not supremum 0.905)
    assert pytest.approx(res_2d["raw_wp_at_tau_q"], abs=1e-4) == 0.865
    assert pytest.approx(res_2d["empirical_win_rate_given_sup_ge_q"], rel=1e-3) == 0.70
    assert pytest.approx(res_2d["empirical_pathwise_calibration_gap_delta_q"], rel=1e-3) == -0.15

    # Sparse crossing 2D worlds: 1 crossing world [0.50, 0.86, 0.96] and 2 losing worlds [0.50, 0.20, 0.10]
    sparse_worlds = np.array(
        [
            [0.50, 0.86, 0.96],
            [0.50, 0.20, 0.10],
            [0.50, 0.20, 0.10],
        ],
        dtype=np.float64,
    )
    res_sparse = compute_blown_lead_pathwise_calibration_adjustment(sparse_worlds, stopping_threshold_q=0.85)
    assert res_sparse["crossed_threshold_q"] is True
    assert res_sparse["stopping_time_tau_q"] == 1
    assert pytest.approx(res_sparse["raw_wp_at_tau_q"], abs=1e-4) == 0.86
    # Calibrated WP at tau_q must reflect the crossing world (~0.75..0.85), never the unconditional mean (~0.42)
    assert 0.70 < res_sparse["pathwise_calibrated_wp_at_tau_q"] < 0.86

    # Losing favorite trajectory: pregame p0=0.80 falling to 0.05 must NOT be inflated upward toward p0
    losing_fav = compute_blown_lead_pathwise_calibration_adjustment([0.80, 0.45, 0.15, 0.05], stopping_threshold_q=0.85)
    assert pytest.approx(losing_fav["pathwise_calibrated_trajectory"][-1], abs=1e-4) == 0.05

    # Edge cases
    with pytest.raises(ValueError):
        compute_blown_lead_pathwise_calibration_adjustment([], stopping_threshold_q=0.85)
    with pytest.raises(ValueError):
        compute_blown_lead_pathwise_calibration_adjustment([0.5, 0.6], stopping_threshold_q=0.45)
    with pytest.raises(ValueError):
        compute_blown_lead_pathwise_calibration_adjustment([0.5, 0.6], stopping_threshold_q=1.0)
    with pytest.raises(ValueError):
        compute_blown_lead_pathwise_calibration_adjustment(np.zeros((2, 2, 2)), stopping_threshold_q=0.85)


def test_suite1_hybrid_pythagorean_multinomial_ep_nflwar_and_fourth_down_humility() -> None:
    wp_out = compute_hybrid_pythagorean_and_ingame_wp(
        points_for=245.0,
        points_against=170.0,
        games_played=8,
        score_diff=10.0,
        time_remaining_sec=900.0,
        pregame_spread_home=-3.5,
    )
    assert 0.55 < wp_out["pythagorean_morey_2_37_wp"] < 0.90
    assert 1.85 <= wp_out["pythagorean_dynamic_exponent_k"] <= 2.95
    assert 0.70 < wp_out["pathwise_calibrated_ingame_wp"] < wp_out["raw_ml_ensemble_ingame_wp"]
    assert wp_out["burke_leverage_index"] > 0.0

    # Extreme negative and positive score_diff as time_remaining_sec -> 0.0
    wp_terminal_loss = compute_hybrid_pythagorean_and_ingame_wp(
        points_for=260.0,
        points_against=150.0,
        games_played=8,
        score_diff=-14.0,
        time_remaining_sec=0.0,
        pregame_spread_home=-11.5,
        timeouts_diff=3,
        is_home_possession=True,
    )
    assert wp_terminal_loss["brownian_bridge_pfr_stern_wp"] < 0.001
    assert wp_terminal_loss["raw_ml_ensemble_ingame_wp"] <= 0.002
    assert wp_terminal_loss["pathwise_calibrated_ingame_wp"] <= 0.002

    wp_terminal_win = compute_hybrid_pythagorean_and_ingame_wp(
        points_for=170.0,
        points_against=240.0,
        games_played=8,
        score_diff=14.0,
        time_remaining_sec=0.0,
        pregame_spread_home=7.5,
    )
    assert wp_terminal_win["raw_ml_ensemble_ingame_wp"] >= 0.998
    assert wp_terminal_win["pathwise_calibrated_ingame_wp"] >= 0.998

    # Multinomial 7-State Expected Points & nflWAR
    ep_redzone = compute_multinomial_ep_and_nflwar_replacement_delta(down=1, ydstogo=10.0, yardline_100=14.0, GoalToGo=False)
    ep_backed_up = compute_multinomial_ep_and_nflwar_replacement_delta(down=3, ydstogo=12.0, yardline_100=88.0, GoalToGo=False)
    assert ep_redzone["probabilities_sum_to_one"] is True
    assert ep_backed_up["probabilities_sum_to_one"] is True
    assert len(ep_redzone["seven_state_probabilities"]) == 7
    assert ep_redzone["ep_catalytic_smoothed"] > ep_backed_up["ep_catalytic_smoothed"]
    assert ep_redzone["nflwar_decomposition"]["nfl_war"] > 0.5

    # 4th-Down Humility (arXiv:2311.03490) + HMM Play-Call Sequence Predictor (arXiv:2003.10791)
    # Case 1: Close toss-up where 90% CI straddles zero -> must trigger humility pass
    tossup = compute_fourth_down_humility_and_hmm_play_call_priors(
        ydstogo=3.8,
        yardline_100=37.0,
        score_diff=0.0,
        time_remaining_sec=1200.0,
        bootstrap_se_wp=0.035,
    )
    audit_tossup = tossup["fourth_down_humility_audit"]
    assert audit_tossup["humility_pass_if_interval_straddles_zero"] is True
    assert audit_tossup["recommendation"] == "HUMILITY_TOSSUP_DEFER_TO_SITUATIONAL_TRENCH"
    assert tossup["hmm_play_call_sequence_predictor"]["priors_sum_to_one"] is True
    assert len(tossup["hmm_play_call_sequence_predictor"]["off_play_call_priors"]) == 5

    # Case 2: Clear 4th & 1 at opponent 46 with small SE -> GO_FOR_IT
    clear_go = compute_fourth_down_humility_and_hmm_play_call_priors(
        ydstogo=1.0,
        yardline_100=46.0,
        score_diff=-3.0,
        time_remaining_sec=900.0,
        bootstrap_se_wp=0.008,
    )
    assert clear_go["fourth_down_humility_audit"]["humility_pass_if_interval_straddles_zero"] is False
    assert clear_go["fourth_down_humility_audit"]["recommendation"] == "GO_FOR_IT"


def test_suite2_all_29_fantasy_football_analytics_textbook_chapters() -> None:
    expected_29_slugs = {
        "intro",
        "fantasy-football",
        "getting-started",
        "download-football-data",
        "data-visualization",
        "player-evaluation",
        "draft",
        "research-methods",
        "basic-statistics",
        "correlation",
        "multiple-regression",
        "mixed-models",
        "causal-inference",
        "cognitive-bias",
        "actuarial",
        "base-rates",
        "evaluating-prediction-accuracy",
        "mythbusters",
        "machine-learning",
        "modern-portfolio-theory",
        "cluster-analysis",
        "factor-analysis",
        "pca",
        "simulation",
        "time-series-analysis",
        "decision-making",
        "sports-cognitive-psychology",
        "conclusion",
        "references",
    }
    assert len(expected_29_slugs) == 29

    res = compute_fantasy_textbook_29chapter_projection_and_portfolio_suite(
        player_name="Jahmyr Gibbs",
        position="RB",
        age=23.5,
        games_sample_n=8,
        raw_projection_fpts=19.4,
        positional_mean_fpts=13.2,
        replacement_level_fpts=8.8,
        recent_3wk_fpts=23.5,
        opportunity_xfp=18.2,
        is_contract_year=True,
    )
    assert res["all_29_chapters_verified"] is True
    assert res["total_chapters_evaluated"] == 29
    assert set(res["chapters"].keys()) == expected_29_slugs
    assert res["chapters"]["draft"]["vorp_fpts"] > 0.0
    assert res["chapters"]["modern-portfolio-theory"]["markowitz_sharpe_ratio"] > 0.0
    assert res["chapters"]["simulation"]["p99"] > res["chapters"]["simulation"]["p90"] > res["chapters"]["simulation"]["p50"]

    # Verify actuarial age curve penalizes a 30-year-old RB relative to a 24-year-old peak RB
    rb_peak = compute_fantasy_textbook_29chapter_projection_and_portfolio_suite(position="RB", age=24.5)
    rb_aging = compute_fantasy_textbook_29chapter_projection_and_portfolio_suite(position="RB", age=30.5)
    assert rb_peak["actuarial_age_multiplier"] > rb_aging["actuarial_age_multiplier"]


def test_suite3_nfl_rulebooks_and_dynamic_kickoff_environment_modifiers() -> None:
    mod_2026 = compute_nfl_rulebook_and_dynamic_kickoff_environment_modifiers(season_year=2026, is_dome_or_closed_roof=True)
    mod_2024 = compute_nfl_rulebook_and_dynamic_kickoff_environment_modifiers(season_year=2024, is_dome_or_closed_roof=True)
    mod_2022 = compute_nfl_rulebook_and_dynamic_kickoff_environment_modifiers(season_year=2022, is_dome_or_closed_roof=True)

    assert mod_2026["projected_kickoff_return_rate"] > mod_2024["projected_kickoff_return_rate"] > mod_2022["projected_kickoff_return_rate"]
    assert mod_2026["starting_field_position_shift_yds"] > mod_2024["starting_field_position_shift_yds"] > mod_2022["starting_field_position_shift_yds"]
    assert mod_2026["scoring_drive_prob_multiplier"] > 1.0


def test_suite4_38study_injury_biomechanics_post_concussion_cascade_and_rtp_curves() -> None:
    # 1. Post-concussion lower-extremity injury cascade (10.1016/j.asmr.2022.04.017): OR in [1.6, 2.3] in weeks 1..4
    for wk in (1, 2, 3, 4):
        conc_res = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
            position="WR",
            injury_type="concussion",
            weeks_since_return=wk,
            returned_from_concussion_within_4_weeks=True,
            weeks_since_concussion_return=wk,
            subconcussive_nfl_biomarker_z=1.2,
            cumulative_head_impact_index=0.45,
            cervical_neck_strength_z=-0.5,
        )
        cascade = conc_res["post_concussion_lower_extremity_cascade"]
        assert cascade["in_4_week_post_concussion_window"] is True
        assert 1.60 <= cascade["lower_extremity_injury_odds_ratio"] <= 2.30
        assert cascade["route_break_deceleration_penalty"] > 0.0

    # Stronger cervical neck strength (Le 2022, MTU 345) attenuates angular acceleration & hazard OR
    weak_neck = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR",
        injury_type="concussion",
        weeks_since_return=1,
        cervical_neck_strength_z=-1.5,
    )
    strong_neck = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR",
        injury_type="concussion",
        weeks_since_return=1,
        cervical_neck_strength_z=1.8,
    )
    assert (
        strong_neck["post_concussion_lower_extremity_cascade"]["cervical_angular_accel_attenuation"]
        < weak_neck["post_concussion_lower_extremity_cascade"]["cervical_angular_accel_attenuation"]
    )

    # 2. Empirical RTP Fantasy Decay Curves (Cureus 2025 10.7759/cureus.99333; Achilles 2026 10.1080/00913847.2026.2682120)
    achilles_wk1 = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="RB", injury_type="achilles", weeks_since_return=1
    )
    achilles_wk8 = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="RB", injury_type="achilles", weeks_since_return=8
    )
    healthy_rb = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="RB", injury_type="healthy", weeks_since_return=8
    )
    assert achilles_wk1["combined_fantasy_efficiency_multiplier"] < achilles_wk8["combined_fantasy_efficiency_multiplier"]
    assert achilles_wk8["combined_fantasy_efficiency_multiplier"] < healthy_rb["combined_fantasy_efficiency_multiplier"]
    # Healthy baseline with no prior concussion must have OR == 1.0
    assert healthy_rb["post_concussion_lower_extremity_cascade"]["lower_extremity_injury_odds_ratio"] == 1.0

    # Post-concussion residual decay beyond 4 weeks (week 5 > week 8) when weeks_since_return is varied
    conc_wk5 = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR", injury_type="concussion", weeks_since_return=5
    )
    conc_wk8 = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR", injury_type="concussion", weeks_since_return=8
    )
    assert (
        conc_wk5["post_concussion_lower_extremity_cascade"]["lower_extremity_injury_odds_ratio"]
        > conc_wk8["post_concussion_lower_extremity_cascade"]["lower_extremity_injury_odds_ratio"]
        > 1.0
    )

    # Compound multi-injury histories: ACL tear at week 6 + acute concussion at week 2
    acl_only = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR", injury_type="acl", weeks_since_return=6
    )
    conc_only = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR", injury_type="concussion", weeks_since_return=2
    )
    acl_plus_conc_flag = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR",
        injury_type="acl",
        weeks_since_return=6,
        returned_from_concussion_within_4_weeks=True,
        weeks_since_concussion_return=2,
    )
    acl_plus_conc_str = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="WR",
        injury_type="acl+concussion",
        weeks_since_return=6,
        weeks_since_concussion_return=2,
    )
    assert acl_plus_conc_flag["combined_fantasy_efficiency_multiplier"] < acl_only["combined_fantasy_efficiency_multiplier"]
    assert acl_plus_conc_flag["combined_fantasy_efficiency_multiplier"] < conc_only["combined_fantasy_efficiency_multiplier"]
    assert pytest.approx(
        acl_plus_conc_flag["combined_fantasy_efficiency_multiplier"], abs=1e-4
    ) == acl_plus_conc_str["combined_fantasy_efficiency_multiplier"]

    # Verify all cataloged injuries in MED-14..MED-34 produce non-unity RTP multipliers
    for catalog_inj in (
        "knee_oa",
        "sports_hernia",
        "shoulder_labrum",
        "ucl",
        "jones_fracture",
        "quadriceps",
        "calf",
        "pectoralis",
        "meniscus",
        "hip_labrum",
    ):
        cat_res = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
            position="WR", injury_type=catalog_inj, weeks_since_return=2
        )
        assert cat_res["combined_fantasy_efficiency_multiplier"] < 0.96, f"{catalog_inj} did not apply RTP decay"

    # 3. Exertional Heat Stroke & Trench Cardiovascular Fatigue (PMC11569638 — 97% in linemen)
    dl_hot = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="DL", injury_type="healthy", wet_bulb_globe_temp_f=92.0
    )
    qb_hot = compute_injury_biomechanics_and_rtp_fantasy_decay_kernel(
        position="QB", injury_type="healthy", wet_bulb_globe_temp_f=92.0
    )
    assert (
        dl_hot["exertional_heat_stroke_and_trench_fatigue"]["q3_q4_trench_pass_rush_run_block_multiplier"]
        < qb_hot["exertional_heat_stroke_and_trench_fatigue"]["q3_q4_trench_pass_rush_run_block_multiplier"]
    )


def test_unified_overlay_dfs_projection_integration_and_host_path_guard() -> None:
    overlay = evaluate_nfl_wp_ep_fantasy_and_injury_rtp_overlay()
    assert overlay["catalog_counts"]["wp_ep_papers_and_models"] == 25
    assert overlay["catalog_counts"]["fantasy_textbook_chapters"] == 29
    assert overlay["catalog_counts"]["nfl_rulebook_epochs"] == 4
    assert overlay["catalog_counts"]["sports_medicine_and_biomechanics_studies"] == 38

    sample_df = pd.DataFrame(
        [
            {"player": "Amon-Ra St. Brown", "position": "WR", "gse_dk_projection": 19.5, "injury_type": "healthy"},
            {"player": "Returning RB", "position": "RB", "gse_dk_projection": 15.0, "injury_type": "achilles", "weeks_since_return": 2},
            {"player": "Post-Concussion WR", "position": "WR", "gse_dk_projection": 14.0, "injury_type": "concussion", "weeks_since_return": 1},
        ]
    )
    dfs_res = apply_nfl_wp_ep_fantasy_and_injury_rtp_to_dfs_projections(
        sample_df,
        game_context={"season_year": 2026, "is_dome_or_closed_roof": True, "stopping_threshold_q": 0.85},
    )
    assert dfs_res["players_evaluated_count"] == 3
    rows = dfs_res["enriched_player_rows"]
    assert rows[0]["rtp_fantasy_multiplier"] > rows[1]["rtp_fantasy_multiplier"]
    assert rows[2]["post_concussion_lower_extremity_or"] >= 1.60

    # Verify zero hardcoded host paths in `intelligence/nfl_analytics_and_injury_biomechanics/`
    pkg_dir = Path(__file__).resolve().parents[2] / "intelligence" / "nfl_analytics_and_injury_biomechanics"
    forbidden_win = "C:\\" + "Users\\Garrett"
    forbidden_posix = "C:/" + "Users/Garrett"
    for py_file in pkg_dir.glob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        assert forbidden_win not in content, f"Forbidden host path found in {py_file}"
        assert forbidden_posix not in content, f"Forbidden host path found in {py_file}"
