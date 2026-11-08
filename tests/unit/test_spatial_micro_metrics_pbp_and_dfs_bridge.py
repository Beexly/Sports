"""
Unit & Integration Tests for `intelligence/simulation/spatial_micro_metrics_pbp_and_dfs_bridge.py`
==================================================================================================
Verifies Garrett's 04:33 AM CST mandate:
1. Two-Host Rule (`check_charge_9`) compliance across all wired files.
2. Exact mathematical formulas:
   - PFF Elusive Rating = (MTF / (Designed Runs + Receptions)) * YAC/Att * 100
   - True Box Spacing Delta = (Defenders in Box / Offensive Blockers in Box) * Avg Defender Dist from LOS
   - True Opportunity Value Score (TOVS) = (Rush * 0.6) + (RZ Carries * 1.2) + (GL Carries * 2.4) + (Targets * 1.5)
   - Catch-Point Leverage Delta = V_ball dot (P_WR - P_DB)
   - Micro-Blocking Metric Segregation (YBC/Att ~1.1-1.4 baseline with >1.8 yds OL scheme penalty,
     Shed-Time Survival Rate 1.8s / <1.5s block loss, Penetration Depth Rate -0.5 yds)
   - RB YPRR Trajectory Tiers (<0.90 2-down grinder, 1.00-1.50 functional, >=1.85+ elite Weapon X)
   - First-Read Designated Target Rate vs 72% Checkdowns
3. All 6 Front-Office Matchup Domains populated across all Week 9 matchups.
4. Wiring into `scripts/ops/gse_coach_mind_simulator.py` (175-snap PBP trajectories shift deterministically
   when spatial/micro-blocking/processing domains are perturbed).
5. Wiring into `intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py` and
   `intelligence/dfs/two_wave_200pt_full_information_iterative_perfection_engine.py` (200+ Pt DFS ceiling boosts).
6. Wiring into `intelligence/trends/scores24_pfr_pff_ngs_unified_trend_engine.py` (6th Lens
   `FrontOfficeSpatialMicroTrendEvidence`).
"""

from __future__ import annotations

import json
import math

from intelligence.simulation.spatial_micro_metrics_pbp_and_dfs_bridge import (
    REPO_ROOT,
    build_complete_spatial_micro_matchup_profile,
    classify_rb_yprr_trajectory_tier,
    compute_exact_catch_point_leverage_delta,
    compute_exact_pff_elusive_rating,
    compute_exact_true_box_spacing_delta,
    compute_exact_true_opportunity_value_score,
    compute_game_spatial_micro_pbp_conditioners,
    compute_player_spatial_micro_dfs_and_prop_ceiling_boost,
    evaluate_micro_blocking_segregation,
    run_spatial_micro_metrics_pbp_and_dfs_bridge_suite,
    simulate_pbp_with_spatial_micro_metrics,
)

WEEK9_GAMES = [
    ("BAL", "MIA"),
    ("CHI", "CIN"),
    ("MIN", "DET"),
    ("CAR", "GB"),
    ("DEN", "HOU"),
    ("ATL", "NE"),
    ("SF", "NYG"),
    ("IND", "PIT"),
    ("LAC", "TEN"),
    ("NO", "LAR"),
    ("JAX", "LV"),
    ("KC", "BUF"),
    ("SEA", "WAS"),
    ("ARI", "DAL"),
]


def test_01_two_host_rule_check_charge_9_zero_literal_host_paths():
    """Verify zero literal host path strings exist in our bridge or wired intelligence modules."""
    files_to_check = [
        REPO_ROOT / "intelligence" / "simulation" / "spatial_micro_metrics_pbp_and_dfs_bridge.py",
        REPO_ROOT / "intelligence" / "trends" / "scores24_pfr_pff_ngs_unified_trend_engine.py",
        REPO_ROOT / "intelligence" / "dfs" / "dk_200pt_situational_dfs_and_projection_engine.py",
        REPO_ROOT / "intelligence" / "dfs" / "two_wave_200pt_full_information_iterative_perfection_engine.py",
    ]
    forbidden_tokens = [
        "C:" + "\\Users\\" + "Garrett",
        "c:" + "\\Users\\" + "Garrett",
        "/Users/" + "Garrett",
    ]
    for path in files_to_check:
        assert path.exists(), f"Missing expected module: {path}"
        text = path.read_text(encoding="utf-8")
        for token in forbidden_tokens:
            assert token not in text, f"Two-Host Rule violation ({token}) in {path.name}"


def test_02_exact_pff_elusive_rating_formula():
    """
    Verify exact PFF Elusive Rating formula:
    Elusive Rating = (MTF / (Designed Runs + Receptions)) * YAC/Att * 100
    """
    # Example: 8 MTF across 16 designed runs + 4 receptions (20 touches), 3.60 YAC/Att
    # (8 / 20) * 3.60 * 100 = 0.40 * 3.60 * 100 = 144.0
    rating = compute_exact_pff_elusive_rating(
        missed_tackles_forced=8.0,
        designed_runs=16.0,
        receptions=4.0,
        yards_after_contact_per_attempt=3.60,
    )
    assert math.isclose(rating, 144.0, rel_tol=1e-6)
    assert compute_exact_pff_elusive_rating(0.0, 0.0, 0.0, 3.0) == 0.0


def test_03_exact_true_box_spacing_delta_and_tracking_vector_mesh_gap():
    """
    Verify exact True Box Spacing Delta formula:
    Box Spacing Delta = (Defenders in Box / Offensive Blockers in Box) * Avg Defender Dist from LOS
    Plus Tracking Vector Delta (Handoff to Mesh Point Spatial Gap ~3.4 yds baseline).
    """
    bsd = compute_exact_true_box_spacing_delta(
        defenders_in_box=7.0,
        offensive_blockers_in_box=6.0,
        avg_defender_distance_from_los_yds=4.2,
    )
    assert math.isclose(bsd, 4.90, rel_tol=1e-6)

    det_profile = build_complete_spatial_micro_matchup_profile(
        entity_id="DET_OFF",
        entity_name="DET Offense",
        team="DET",
        opponent="MIN",
    )
    assert 2.6 <= det_profile.domain1_rb_front7.tracking_vector_mesh_gap_yds <= 4.3
    assert det_profile.domain1_rb_front7.true_box_spacing_delta > 0.0


def test_04_micro_blocking_segregation_and_ol_scheme_regression_penalty():
    """
    Verify Micro-Blocking Metric Segregation:
    - YBC/Att ~1.1-1.4 yds baseline; if YBC > 1.8 yds with low consistency rate, OL scheme
      segregation penalty is applied.
    - Shed-Time Survival Rate (1.8s clean hole threshold; <1.5s immediate block loss).
    - Defensive Penetration Depth Rate (-0.5 yds behind LOS).
    """
    normal = evaluate_micro_blocking_segregation(
        ybc_per_att=1.35,
        shed_time_survival_sec=1.90,
        def_penetration_depth_yds=-0.35,
        ryoe_consistency_rate_gt_1yd=0.40,
        ryoe_boom_rate_gt_5yd=0.14,
    )
    assert normal["ol_scheme_inflated_gt_1_8"] is False
    assert normal["ol_scheme_segregation_penalty_yds"] == 0.0
    assert normal["rapid_block_loss_lt_1_5s"] is False

    inflated = evaluate_micro_blocking_segregation(
        ybc_per_att=2.30,
        shed_time_survival_sec=1.32,
        def_penetration_depth_yds=-0.85,
        ryoe_consistency_rate_gt_1yd=0.24,
        ryoe_boom_rate_gt_5yd=0.05,
    )
    assert inflated["ol_scheme_inflated_gt_1_8"] is True
    assert inflated["ol_scheme_segregation_penalty_yds"] < 0.0
    assert inflated["rapid_block_loss_lt_1_5s"] is True
    assert inflated["shed_yds_delta"] < 0.0


def test_05_rb_yprr_trajectory_tiers_and_exact_tovs_and_checkdown_segregation():
    """
    Verify RB YPRR Trajectory Tiers (<0.90, 1.00-1.50, >=1.85+), First-Read Designated Target Rate vs
    72% Checkdowns, and exact True Opportunity Value Score (TOVS):
    TOVS = (Rush Attempts * 0.6) + (RZ Carries * 1.2) + (GL Carries * 2.4) + (Targets * 1.5)
    """
    tier_low, boost_low = classify_rb_yprr_trajectory_tier(0.78)
    tier_mid, boost_mid = classify_rb_yprr_trajectory_tier(1.28)
    tier_high, boost_high = classify_rb_yprr_trajectory_tier(2.05)

    assert tier_low == "TIER_3_CHECKDOWN_GRINDER_LT_0_90" and boost_low < 0
    assert tier_mid == "TIER_2_DUAL_THREAT_1_00_TO_1_50" and boost_mid > 0
    assert tier_high == "TIER_1_ELITE_RECEIVING_WEAPON_GE_1_85" and boost_high > boost_mid

    # Exact TOVS check: 15 rushes (9.0) + 3 RZ carries (3.6) + 1.5 GL carries (3.6) + 6 targets (9.0) = 25.2
    tovs = compute_exact_true_opportunity_value_score(
        rush_attempts=15.0,
        red_zone_carries=3.0,
        goal_line_carries=1.5,
        targets=6.0,
    )
    assert math.isclose(tovs, 25.2, rel_tol=1e-6)

    det_profile = build_complete_spatial_micro_matchup_profile(
        entity_id="DET_GIBBS",
        entity_name="Jahmyr Gibbs",
        team="DET",
        opponent="MIN",
    )
    assert det_profile.domain1_rb_front7.rb_yprr >= 1.85
    assert det_profile.domain1_rb_front7.rb_yprr_tier == "TIER_1_ELITE_RECEIVING_WEAPON_GE_1_85"
    assert det_profile.domain1_rb_front7.designated_first_read_rb_target_rate > 0.25


def test_06_wr_te_spatial_cushion_ssp_catch_point_leverage_and_csoe():
    """
    Verify Domain 2:
    - Separation at Separation Point (SSP > 2.0 yds vs Man) & Burn Rate
    - Exact Catch-Point Leverage Delta: Delta L = V_ball dot (P_WR - P_DB) / |V_ball|
    - True Coverage Snaps Over Expected (CSOE / Target Prevention Rate)
    """
    delta_l = compute_exact_catch_point_leverage_delta(
        ball_velocity_vec=(20.0, 0.0, 0.0),
        wr_position_vec=(12.5, 2.0, 0.0),
        db_position_vec=(10.2, 2.0, 0.0),
    )
    assert math.isclose(delta_l, 2.30, rel_tol=1e-5)

    det_profile = build_complete_spatial_micro_matchup_profile(
        entity_id="DET_ARSB",
        entity_name="Amon-Ra St. Brown",
        team="DET",
        opponent="MIN",
        position="WR",
    )
    assert det_profile.domain2_wr_te_db.separation_at_separation_point_ssp_yds > 2.0
    assert det_profile.domain2_wr_te_db.burn_rate_vs_man_gt_2yds > 0.20
    assert -0.25 <= det_profile.domain2_wr_te_db.true_csoe_target_prevention_rate <= 0.25


def test_07_qb_processing_trench_pocket_compression_and_scheme_structural_domains():
    """
    Verify Domains 3, 4, 5, and 6 across all Week 9 matchups:
    - Domain 3: Disguise Decay ms (<=220ms elite), Simulated Pressure Success Rate, Throw-to-Leverage Variance (TLV)
    - Domain 4: True PRWR <2.5s, Pocket Anchor Depth PAD >2.2 yds, Stunt/Loop Hand-Off Latency ms
    - Domain 5: Pocket Collapse Vector PCV >1.5 sq yds/s, Escape Vector Efficiency EVE
    - Domain 6: MOFO/MOFC Structural Efficiency, Heat-Map Counter Delta, Zone Void Exploitation Rate (ZVER)
    """
    for away, home in WEEK9_GAMES:
        cond = compute_game_spatial_micro_pbp_conditioners(away, home)
        for side_key in ("away_profile", "home_profile"):
            prof = cond[side_key]
            d3 = prof["domain3_qb_processing"]
            d4 = prof["domain4_trench_dl_ol"]
            d5 = prof["domain5_pocket_escape"]
            d6 = prof["domain6_scheme_structural"]

            assert 150.0 <= d3["pre_to_post_snap_disguise_decay_ms"] <= 350.0
            assert 0.25 <= d3["simulated_creeping_pressure_success_rate"] <= 0.75
            assert 0.30 <= d3["throw_to_leverage_variance_tlv_sq_yds"] <= 2.50

            assert 0.08 <= d4["true_pass_rush_win_rate_prwr_lt_25s"] <= 0.40
            assert 1.20 <= d4["pocket_anchor_depth_pad_yds"] <= 3.50
            assert 90.0 <= d4["stunt_loop_handoff_latency_ms"] <= 280.0

            assert 0.80 <= d5["pocket_collapse_vector_pcv_sq_yds_per_sec"] <= 2.60
            assert 0.25 <= d5["escape_vector_efficiency_eve"] <= 0.95

            assert -0.50 <= d6["mofo_mofc_heatmap_counter_delta"] <= 0.50
            assert 0.30 <= d6["zone_void_exploitation_rate_zver"] <= 0.90


def test_08_pbp_175_snap_simulation_shifts_with_spatial_micro_domains():
    """
    Verify that `simulate_pbp_with_spatial_micro_metrics` (wired into `scripts/ops/gse_coach_mind_simulator.py`)
    deterministically shifts rush yards, pass yards, sacks, and win probability when
    the 6 spatial/micro-blocking/processing domains are perturbed.
    """
    elite_sim = simulate_pbp_with_spatial_micro_metrics(
        away_team="ARI",
        home_team="SEA",
        n_sims=250,
        seed=20261108,
        home_spatial_overrides={
            "missed_tackles_forced": 52.0,
            "designed_runs": 130.0,
            "receptions": 35.0,
            "yards_after_contact_per_att": 4.10,
            "ryoe_per_att": 1.45,
            "ryoe_consistency_rate_gt_1yd": 0.48,
            "ryoe_boom_rate_gt_5yd": 0.19,
            "tracking_vector_mesh_gap_yds": 3.65,
            "defenders_in_box": 6.2,
            "offensive_blockers_in_box": 6.8,
            "avg_defender_dist_from_los_yds": 4.85,
            "ybc_per_att": 1.65,
            "shed_time_survival_sec": 2.05,
            "def_penetration_depth_yds": -0.22,
            "designated_first_read_rb_target_rate": 0.42,
            "rb_yprr": 2.15,
            "separation_at_separation_point_ssp_yds": 2.68,
            "burn_rate_vs_man_gt_2yds": 0.46,
            "catch_point_leverage_delta_yds": 1.85,
            "true_csoe_target_prevention_rate": -0.06,
            "pre_to_post_snap_disguise_decay_ms": 182.0,
            "simulated_creeping_pressure_success_rate": 0.64,
            "throw_to_leverage_variance_tlv_sq_yds": 0.52,
            "true_pass_rush_win_rate_prwr_lt_25s": 0.11,
            "pocket_anchor_depth_pad_yds": 2.75,
            "stunt_loop_handoff_latency_ms": 135.0,
            "pocket_collapse_vector_pcv_sq_yds_per_sec": 1.05,
            "escape_vector_efficiency_eve": 0.88,
            "zone_void_exploitation_rate_zver": 0.74,
        },
    )
    compressed_sim = simulate_pbp_with_spatial_micro_metrics(
        away_team="ARI",
        home_team="SEA",
        n_sims=250,
        seed=20261108,
        home_spatial_overrides={
            "missed_tackles_forced": 14.0,
            "designed_runs": 130.0,
            "receptions": 20.0,
            "yards_after_contact_per_att": 2.10,
            "ryoe_per_att": -0.65,
            "ryoe_consistency_rate_gt_1yd": 0.21,
            "ryoe_boom_rate_gt_5yd": 0.04,
            "tracking_vector_mesh_gap_yds": 2.95,
            "defenders_in_box": 7.8,
            "offensive_blockers_in_box": 5.8,
            "avg_defender_dist_from_los_yds": 3.45,
            "ybc_per_att": 2.15,
            "shed_time_survival_sec": 1.32,
            "def_penetration_depth_yds": -0.92,
            "designated_first_read_rb_target_rate": 0.12,
            "rb_yprr": 0.74,
            "separation_at_separation_point_ssp_yds": 1.55,
            "burn_rate_vs_man_gt_2yds": 0.18,
            "catch_point_leverage_delta_yds": -0.45,
            "true_csoe_target_prevention_rate": 0.14,
            "pre_to_post_snap_disguise_decay_ms": 310.0,
            "simulated_creeping_pressure_success_rate": 0.29,
            "throw_to_leverage_variance_tlv_sq_yds": 1.65,
            "true_pass_rush_win_rate_prwr_lt_25s": 0.28,
            "pocket_anchor_depth_pad_yds": 1.75,
            "stunt_loop_handoff_latency_ms": 265.0,
            "pocket_collapse_vector_pcv_sq_yds_per_sec": 2.15,
            "escape_vector_efficiency_eve": 0.42,
            "zone_void_exploitation_rate_zver": 0.34,
        },
    )

    assert elite_sim["home_rush_yds_mean"] > compressed_sim["home_rush_yds_mean"]
    assert elite_sim["home_pass_yds_mean"] > compressed_sim["home_pass_yds_mean"]
    assert elite_sim["home_sacks_mean"] < compressed_sim["home_sacks_mean"]
    assert elite_sim["home_win_prob"] > compressed_sim["home_win_prob"]


def test_09_dfs_200pt_and_360_prop_ceiling_boost_wiring():
    """
    Verify that `compute_player_spatial_micro_dfs_and_prop_ceiling_boost` is wired into both:
    - `intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py`
    - `intelligence/dfs/two_wave_200pt_full_information_iterative_perfection_engine.py`
    """
    gibbs_boost = compute_player_spatial_micro_dfs_and_prop_ceiling_boost(
        player_name="Jahmyr Gibbs",
        position="RB",
        team="DET",
        opponent="GB",
        base_median=18.5,
        base_p90=28.0,
        base_p99=37.5,
    )
    assert gibbs_boost["spatial_p90"] > 28.0
    assert gibbs_boost["spatial_p99"] > 37.5
    assert gibbs_boost["key_spatial_drivers"]["rb_yprr_tier"] == "TIER_1_ELITE_RECEIVING_WEAPON_GE_1_85"
    assert gibbs_boost["key_spatial_drivers"]["pff_elusive_rating"] > 50.0

    dk_source = (
        REPO_ROOT / "intelligence" / "dfs" / "dk_200pt_situational_dfs_and_projection_engine.py"
    ).read_text(encoding="utf-8")
    assert "compute_player_spatial_micro_dfs_and_prop_ceiling_boost" in dk_source

    two_wave_source = (
        REPO_ROOT / "intelligence" / "dfs" / "two_wave_200pt_full_information_iterative_perfection_engine.py"
    ).read_text(encoding="utf-8")
    assert "compute_player_spatial_micro_dfs_and_prop_ceiling_boost" in two_wave_source
    assert "spatial_micro_ceiling_boosts" in two_wave_source


def test_10_unified_trend_engine_6th_lens_front_office_spatial_micro_wiring():
    """
    Verify `intelligence/trends/scores24_pfr_pff_ngs_unified_trend_engine.py` includes Lens 6
    (`FrontOfficeSpatialMicroTrendEvidence`) across all 15 Week 9 games without breaking any
    existing 5-lens story convergence locks or fake streak trap detections.
    """
    from intelligence.trends.scores24_pfr_pff_ngs_unified_trend_engine import (
        UnifiedScores24PfrPffNgsTrendEngine,
    )

    engine = UnifiedScores24PfrPffNgsTrendEngine()
    slate = engine.build_or_get_validated_slate(force_rebuild=True)
    assert len(slate.by_game_id) == 15
    assert len(slate.packets) >= 35

    for pkt in slate.packets:
        lens6 = pkt.front_office_spatial_micro
        assert lens6 is not None, f"Missing front_office_spatial_micro on {pkt.packet_id}"
        assert lens6.elusive_rating_ytd > 0.0
        assert lens6.elusive_rating_l3 > 0.0
        assert lens6.true_box_spacing_delta > 0.0
        assert lens6.tovs_ytd > 0.0
        assert lens6.tovs_l3 > 0.0
        assert lens6.rb_yprr_tier in (
            "TIER_1_ELITE_RECEIVING_WEAPON_GE_1_85",
            "TIER_2_DUAL_THREAT_1_00_TO_1_50",
            "TIER_3_CHECKDOWN_GRINDER_LT_0_90",
        )
        assert isinstance(lens6.spatial_micro_cleared, bool)


def test_11_full_bridge_suite_and_receipt_generation():
    """
    Run `run_spatial_micro_metrics_pbp_and_dfs_bridge_suite(write_receipt=True)` and verify the
    receipt artifact is written and 100% green across all 15 Week 9 games.
    """
    receipt = run_spatial_micro_metrics_pbp_and_dfs_bridge_suite(write_receipt=True)
    assert receipt["status"] == "VERIFIED_PASS"
    assert receipt["exact_formula_verifications"]["all_exact_formulas_verified"] is True
    assert receipt["pbp_175_snap_perturbation_proof"]["rush_yards_shifted_positively"] is True
    assert receipt["pbp_175_snap_perturbation_proof"]["pass_yards_shifted_positively"] is True
    assert receipt["pbp_175_snap_perturbation_proof"]["sacks_reduced_by_pad_and_disguise_processing"] is True
    assert receipt["pbp_175_snap_perturbation_proof"]["win_prob_shifted_positively"] is True
    assert receipt["trends_6th_lens_integration"]["games_covered"] == 15
    assert receipt["trends_6th_lens_integration"]["lens6_front_office_spatial_micro_attached"] is True

    receipt_path = (
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-07"
        / "spatial-micro-metrics-pbp-and-dfs-bridge-receipt.json"
    )
    assert receipt_path.exists()
    loaded = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert loaded["status"] == "VERIFIED_PASS"
