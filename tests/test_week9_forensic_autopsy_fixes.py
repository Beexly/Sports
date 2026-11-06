#!/usr/bin/env python3
"""
tests/test_week9_forensic_autopsy_fixes.py

Comprehensive Week 9 Forensic Autopsy & Situational Engine Verification Suite (21 Tests).
Verifies SG-1 through SG-10, RunPod Serverless & Zero-Waste Routing, Wave 10 GCP Catalog &
ML Design Patterns (240 rows), Wave 11 X-Situational Layer-2 Compiler (12 laws + 51 Q1-Q51
features), Full-Stack Stage 1 -> Stage 2 Situational Parameter Coupling, and Storefront
Quarantine invariants.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "intelligence") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "intelligence"))

from intelligence.coaching.gcp_ml_design_patterns_and_agent_workbench_engine import (
    gcp_cloud_run_mcp_and_agent_starter_telemetry,
    gcp_healthcare_data_engine_fhir_mimic_bridge,
    ml_pattern_model_armor_invariant_shield,
    run_gcp_ml_design_patterns_and_agent_workbench_suite,
)
from intelligence.coaching.x_situational_layer2_compiler import (
    build_jax_at_bal_week9_forensic_context,
    compile_x_situational_layer2_overlay,
    evaluate_q1_to_q51_feature_registry,
)
from intelligence.routing.runpod_gpu_orchestrator import (
    build_nvidia_nim_on_runpod_deployment_spec,
    dispatch_runpod_serverless_burst,
    mask_api_key,
)
from intelligence.routing.zero_waste_model_router import (
    TaskTier,
    build_constitutional_gatekeeper_prompt,
    get_cloud_credit_lanes_summary,
    route_zero_waste_task,
)
from scripts.ops.gse_coach_mind_simulator import (
    compute_qb_tier_adjusted_epa,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
    verify_jev_spine_freshness_and_qb1,
)
from scripts.ops.gse_connected_game_workflow import (
    compile_stage1_to_stage2_simulation_priors,
)
from scripts.ops.render_tnf_social_cards import (
    verify_stage5_publish_permission,
)
from scripts.ops.run_halftime_live_simulator import (
    simulate_halftime_live_2h,
    verify_pregame_receipt_direction_integrity,
)
from scripts.ops.runpod_serverless_sim_handler import (
    handler as runpod_serverless_handler,
)
from scripts.ops.solve_showdown_dfs_milp import (
    build_jax_bal_showdown_pool,
    solve_dk_classic_milp,
    solve_dk_showdown_milp,
)
from scripts.ops.week8_forensic_kernels import (
    allocate_stochastic_conserved_box_score,
    assert_prop_distribution_invariants,
    detect_injury_decoy_or_pitch_count_trap,
    evaluate_empirical_prop_probability,
)


# ============================================================================
# TEST 1 (SG-1): Stale JEV Spine Invalidation & Fresh Spine Acceptance
# ============================================================================
def test_01a_sg1_stale_jev_spine_invalidation_raises_runtime_error() -> None:
    """SG-1: Rejects stale 2026-10-29T16:55:00Z spine (>18h old and wrong QB1) with RuntimeError."""
    stale_spine = {
        "week": 8,
        "updated_at": "2026-10-29T16:55:00Z",
        "confirmed_qb1": {
            "away": "Trevor Lawrence",
            "home": "Lamar Jackson",
        },
    }
    with pytest.raises(RuntimeError, match="STALE_OR_MISMATCHED_JEV_SPINE"):
        verify_jev_spine_freshness_and_qb1(
            stale_spine,
            expected_week=9,
            expected_away_qb1="Trevor Lawrence",
            expected_home_qb1="Joe Fagnano",
            max_age_hours=18.0,
            reference_utc="2026-11-05T20:00:00Z",
            strict=True,
        )


def test_01b_sg1_fresh_jev_spine_and_matching_qb1_accepted() -> None:
    """SG-1: Accepts fresh JEV spine (<18h old) with matching Week 9 and confirmed QB1s."""
    fresh_spine = {
        "week": 9,
        "updated_at": "2026-11-05T15:30:00Z",
        "confirmed_qb1": {
            "away": "Trevor Lawrence",
            "home": "Joe Fagnano",
        },
    }
    res = verify_jev_spine_freshness_and_qb1(
        fresh_spine,
        expected_week=9,
        expected_away_qb1="Trevor Lawrence",
        expected_home_qb1="Joe Fagnano",
        max_age_hours=18.0,
        reference_utc="2026-11-05T20:00:00Z",
        strict=True,
    )
    assert res["valid"] is True
    assert res["reason"] == "FRESH_AND_QB1_VERIFIED"
    assert res["age_hours"] == pytest.approx(4.5, abs=0.05)


# ============================================================================
# TEST 2 (SG-2): Stage 1 -> Stage 2 Situational Parameter Coupling
# ============================================================================
def test_02a_sg2_compile_stage1_to_stage2_uncompressed_situational_stack() -> None:
    """
    SG-2: Verifies compile_stage1_to_stage2_simulation_priors executes the full
    uncompressed situational stack (X-Situational Layer-2 12 laws, Q1-Q51 features,
    GCP ML Design Pattern gates, and Agent 6/7 situational overlays) and exposes all
    coupled parameter deltas.
    """
    priors = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"base_away_off_epa": 0.015, "base_home_off_epa": 0.134},
        stage1b_receipt={"weather_wind_mph": 6.5},
        qb_status_override={
            "away_qb_tier": "QB1",
            "home_qb_tier": "EMERGENCY_QB3_UDFA",
            "home_qb1": "Joe Fagnano",
        },
    )
    assert priors["stage1_parameter_coupling_verified"] is True
    required_keys = [
        "away_off_epa",
        "home_off_epa",
        "away_def_epa",
        "home_def_epa",
        "away_proe",
        "home_proe",
        "completion_floor",
        "sack_rate_mult",
        "clamped_2h_pass_rate",
        "wr1_is_decoy_trap",
        "q50_ex_leader_rec_yards_proj",
        "stage5_byzantine_quorum",
    ]
    for key in required_keys:
        assert key in priors, f"Missing required coupled situational parameter: {key}"

    assert priors["home_off_epa"] == pytest.approx(-0.246, abs=1e-4)
    assert priors["completion_floor"] == pytest.approx(0.34, abs=1e-4)
    assert priors["clamped_2h_pass_rate"] == pytest.approx(0.34, abs=1e-4)
    assert priors["sack_rate_mult"] == pytest.approx(1.48, abs=1e-4)
    assert priors["wr1_is_decoy_trap"] is True
    assert priors["q50_ex_leader_rec_yards_proj"] > 100.0
    assert priors["x_situational_layer2_overlay"]["laws_evaluated_count"] == 12
    assert priors["q1_to_q51_feature_registry"]["all_51_present"] is True
    assert "gcp_ml_design_patterns_gates" in priors
    assert "full_repo_279_family_situational_matrix" in priors
    assert "google_drive_and_onedrive_omni_overlay" in priors


def test_02b_sg2_simulate_matchup_pbp_dynamic_parameter_coupling() -> None:
    """SG-2: Verifies simulate_matchup_pbp consumes compiled Stage 1/2 situational priors."""
    sealed_obj, sealed_hash = load_sealed_object_readonly()
    priors_emergency = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"base_away_off_epa": 0.015, "base_home_off_epa": 0.134},
        stage1b_receipt={"weather_wind_mph": 6.5},
        qb_status_override={"away_qb_tier": "QB1", "home_qb_tier": "EMERGENCY_QB3_UDFA"},
    )
    priors_healthy = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"base_away_off_epa": 0.015, "base_home_off_epa": 0.134},
        stage1b_receipt={"weather_wind_mph": 6.5},
        qb_status_override={"away_qb_tier": "QB1", "home_qb_tier": "QB1_STARTER", "home_qb1": "Lamar Jackson"},
    )
    sim_emerg = simulate_matchup_pbp(
        away="JAX",
        home="BAL",
        away_inj=["RB1"],
        home_inj=["QB1", "EMERGENCY_QB3_UDFA"],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=400,
        seed=20261105,
        w1_w7_override=priors_emergency,
        return_vectors=True,
    )
    sim_healthy = simulate_matchup_pbp(
        away="JAX",
        home="BAL",
        away_inj=["RB1"],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=400,
        seed=20261105,
        w1_w7_override=priors_healthy,
        return_vectors=True,
    )
    assert priors_emergency["stage1_parameter_coupling_verified"] is True
    assert float(np.mean(sim_emerg["vectors"]["home_score"])) < float(
        np.mean(sim_healthy["vectors"]["home_score"])
    )


# ============================================================================
# TEST 3 (SG-3): Emergency QB3 / UDFA EPA Cliff & Completion Floor
# ============================================================================
def test_03_sg3_emergency_qb3_udfa_epa_cliff_and_completion_floor() -> None:
    """
    SG-3: Verifies compute_qb_tier_adjusted_epa(0.134, 'EMERGENCY_QB3_UDFA') drops
    Baltimore's EPA from +0.134 to -0.246 EPA/play, lowers completion_floor to 0.34,
    sets execution_multiplier = 0.62, and sets lambda_margin = 0.25.
    """
    res = compute_qb_tier_adjusted_epa(0.134, "EMERGENCY_QB3_UDFA")
    assert res["qb_tier"] == "EMERGENCY_QB3_UDFA"
    assert res["base_off_epa"] == pytest.approx(0.134, abs=1e-4)
    assert res["epa_dropoff"] == pytest.approx(0.38, abs=1e-4)
    assert res["adjusted_off_epa"] == pytest.approx(-0.246, abs=1e-4)
    assert res["completion_floor"] == pytest.approx(0.34, abs=1e-4)
    assert res["execution_multiplier"] == pytest.approx(0.62, abs=1e-4)
    assert res["lambda_margin"] == pytest.approx(0.25, abs=1e-4)


# ============================================================================
# TEST 4 (SG-4): Stochastic Dirichlet-Multinomial Box Score Conservation & Variance Floor
# ============================================================================
def test_04a_sg4_stochastic_dirichlet_box_score_conservation_and_variance_floor() -> None:
    """
    SG-4: Verifies allocate_stochastic_conserved_box_score conserves sum_k Y_{w,k} = T_w
    across 10,000 worlds while guaranteeing std >= 1.15 on tackles/receptions and
    max(p_over, p_under) <= 0.780.
    """
    rng = np.random.default_rng(20261105)
    n_worlds = 10000
    team_receptions = rng.poisson(lam=21.0, size=n_worlds).astype(np.float64)
    shares = {
        "Parker Washington": 0.27,
        "Jakobi Meyers": 0.24,
        "Brenton Strange": 0.19,
        "Travis Etienne": 0.16,
        "Brian Thomas Jr.": 0.14,
    }
    alloc = allocate_stochastic_conserved_box_score(
        team_total_vec=team_receptions,
        baseline_shares=shares,
        stat_family="receptions",
        concentration_kappa=12.0,
        seed=20261105,
    )
    summed = sum(alloc[p] for p in shares)
    np.testing.assert_allclose(summed, team_receptions, atol=1e-6)

    for player, vec in alloc.items():
        std_val = float(np.std(vec))
        assert std_val >= 1.15, f"{player} std {std_val:.3f} < 1.15 floor"
        line = round(float(np.median(vec)) - 0.5, 1) + 0.5
        prop_eval = evaluate_empirical_prop_probability(
            samples=vec,
            line=line,
            market_over_american=-110,
            market_under_american=-110,
            stat_type="receptions",
        )
        assert max(prop_eval["p_over"], prop_eval["p_under"]) <= 0.780


def test_04b_sg4_assert_prop_distribution_invariants_rejects_collapsed_variance() -> None:
    """SG-4: Verifies assert_prop_distribution_invariants raises ValueError on collapsed std < 1.10."""
    collapsed_samples = np.full(10000, 5.0, dtype=np.float64)
    with pytest.raises(ValueError, match="VARIANCE_COLLAPSE_DETECTED"):
        assert_prop_distribution_invariants(
            collapsed_samples,
            stat_type="receptions",
        )


# ============================================================================
# TEST 5 (SG-5): Simulated QB Attempts, Completions, Scrambles & Kneeldown Exclusion
# ============================================================================
def test_05_sg5_simulated_qb_attempts_completions_scrambles_and_kneeldowns() -> None:
    """
    SG-5: Verifies simulate_matchup_pbp(..., return_vectors=True) returns integer vectors
    for home_pass_att, away_pass_att, home_pass_comp, away_pass_comp, home_qb_scrambles,
    away_qb_scrambles, home_sacks, away_sacks, home_ints, away_ints.
    """
    sealed_obj, sealed_hash = load_sealed_object_readonly()
    sim = simulate_matchup_pbp(
        away="JAX",
        home="BAL",
        away_inj=["RB1"],
        home_inj=["QB1", "EMERGENCY_QB3_UDFA"],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=500,
        seed=20261105,
        return_vectors=True,
    )
    vecs = sim["vectors"]
    required_int_vecs = [
        "home_pass_att",
        "away_pass_att",
        "home_pass_comp",
        "away_pass_comp",
        "home_qb_scrambles",
        "away_qb_scrambles",
        "home_sacks",
        "away_sacks",
        "home_ints",
        "away_ints",
    ]
    for k in required_int_vecs:
        assert k in vecs, f"Missing required vector: {k}"
        arr = vecs[k]
        assert isinstance(arr, np.ndarray)
        assert arr.shape == (500,)
        assert np.issubdtype(arr.dtype, np.integer)

    assert np.all(vecs["home_pass_comp"] <= vecs["home_pass_att"])
    assert np.all(vecs["away_pass_comp"] <= vecs["away_pass_att"])
    assert np.all(vecs["home_qb_scrambles"] >= 0)
    assert np.all(vecs["away_qb_scrambles"] >= 0)


# ============================================================================
# TEST 6 (SG-6): Real MILP DraftKings Showdown & Classic Optimizer
# ============================================================================
def test_06a_sg6_real_milp_dk_showdown_cash_and_gpp() -> None:
    """
    SG-6: Verifies solve_dk_showdown_milp (mode='cash' and mode='gpp') satisfies
    total_salary <= 50000, 1 CPT + 5 FLEX, excludes Brian Thomas Jr. (is_decoy_trap=True)
    from Cash, and selects healthy Parker Washington, Jakobi Meyers, Travis Etienne,
    Trevor Lawrence.
    """
    pool = build_jax_bal_showdown_pool()
    cash_res = solve_dk_showdown_milp(pool, mode="cash", salary_cap=50000)
    gpp_res = solve_dk_showdown_milp(pool, mode="gpp", salary_cap=50000)

    for res in (cash_res, gpp_res):
        assert res["status"] == "OPTIMAL"
        assert res["total_salary"] <= 50000
        roster = res["roster"]
        assert len(roster) == 6
        assert sum(1 for r in roster if str(r["slot"]).startswith("CPT")) == 1
        assert sum(1 for r in roster if r["slot"] == "FLEX") == 5
        assert len({r["team"] for r in roster}) >= 2

    cash_names = cash_res["selected_players"]
    assert "Brian Thomas Jr." not in cash_names
    for core_healthy in ("Parker Washington", "Jakobi Meyers", "Travis Etienne", "Trevor Lawrence"):
        assert core_healthy in cash_names, f"Expected {core_healthy} in Cash Showdown optimal"


def test_06b_sg6_real_milp_dk_classic_9_roster_constraints() -> None:
    """SG-6: Verifies solve_dk_classic_milp satisfies 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST <= $50,000."""
    classic_pool = [
        {"name": "Jared Goff", "team": "DET", "pos": "QB", "salary": 6300, "median_fpts": 20.5, "p90_ceiling_fpts": 27.0, "p25_floor_fpts": 15.5},
        {"name": "Josh Allen", "team": "BUF", "pos": "QB", "salary": 7600, "median_fpts": 24.8, "p90_ceiling_fpts": 33.0, "p25_floor_fpts": 18.8},
        {"name": "Jahmyr Gibbs", "team": "DET", "pos": "RB", "salary": 6800, "median_fpts": 19.2, "p90_ceiling_fpts": 27.5, "p25_floor_fpts": 14.1},
        {"name": "De'Von Achane", "team": "MIA", "pos": "RB", "salary": 6900, "median_fpts": 20.1, "p90_ceiling_fpts": 29.0, "p25_floor_fpts": 14.5},
        {"name": "Aaron Jones", "team": "MIN", "pos": "RB", "salary": 5800, "median_fpts": 15.8, "p90_ceiling_fpts": 22.0, "p25_floor_fpts": 11.9},
        {"name": "Amon-Ra St. Brown", "team": "DET", "pos": "WR", "salary": 7200, "median_fpts": 21.0, "p90_ceiling_fpts": 29.5, "p25_floor_fpts": 15.2},
        {"name": "Justin Jefferson", "team": "MIN", "pos": "WR", "salary": 7500, "median_fpts": 22.4, "p90_ceiling_fpts": 31.5, "p25_floor_fpts": 16.8},
        {"name": "Jayden Reed", "team": "GB", "pos": "WR", "salary": 5500, "median_fpts": 14.5, "p90_ceiling_fpts": 21.5, "p25_floor_fpts": 10.2},
        {"name": "Khalil Shakir", "team": "BUF", "pos": "WR", "salary": 5100, "median_fpts": 13.8, "p90_ceiling_fpts": 19.5, "p25_floor_fpts": 10.4},
        {"name": "Josh Downs", "team": "IND", "pos": "WR", "salary": 4800, "median_fpts": 13.2, "p90_ceiling_fpts": 19.0, "p25_floor_fpts": 9.8},
        {"name": "Tucker Kraft", "team": "GB", "pos": "TE", "salary": 4300, "median_fpts": 11.8, "p90_ceiling_fpts": 17.5, "p25_floor_fpts": 8.4},
        {"name": "Travis Kelce", "team": "KC", "pos": "TE", "salary": 5400, "median_fpts": 14.9, "p90_ceiling_fpts": 21.0, "p25_floor_fpts": 11.0},
        {"name": "Vikings", "team": "MIN", "pos": "DST", "salary": 3100, "median_fpts": 8.9, "p90_ceiling_fpts": 14.0, "p25_floor_fpts": 5.8},
        {"name": "Chiefs", "team": "KC", "pos": "DST", "salary": 3300, "median_fpts": 8.5, "p90_ceiling_fpts": 13.5, "p25_floor_fpts": 5.6},
    ]
    res = solve_dk_classic_milp(classic_pool, mode="cash", salary_cap=50000, min_salary=40000)
    assert res["status"] == "OPTIMAL"
    assert res["total_salary"] <= 50000
    assert len(res["roster"]) == 9


# ============================================================================
# TEST 7 (SG-7): Stage 5 Conjunction Gate & Card Renderer Circuit Breaker
# ============================================================================
def test_07_sg7_stage5_conjunction_gate_and_card_renderer_circuit_breaker() -> None:
    """
    SG-7: Verifies evaluate_empirical_prop_probability returns publishAllowed: False
    when market_over_american is None and verify_stage5_publish_permission halts
    rendering when publishAllowed is False.
    """
    rng = np.random.default_rng(42)
    samples = rng.normal(loc=48.0, scale=16.0, size=10000).clip(min=0.0)
    unanchored = evaluate_empirical_prop_probability(
        samples=samples,
        line=36.5,
        market_over_american=None,
        market_under_american=None,
        stat_type="receiving_yards",
    )
    assert unanchored["publishAllowed"] is False
    assert unanchored["decision"] == "PASS_UNPRICED_MARKET"

    blocked_receipt = {
        "publishAllowed": False,
        "approved_bets": 0,
        "stage5_conjunction_gate": {
            "publishAllowed": False,
            "approved_bets": 0,
            "gate_decision": "PASS — ALL SIDES/TOTALS/PROPS FAILED CONJUNCTION GATE",
        },
    }
    with pytest.raises(RuntimeError, match="STAGE_5_PASS_CIRCUIT_BREAKER"):
        verify_stage5_publish_permission(blocked_receipt)


# ============================================================================
# TEST 8 (SG-8): Injury Decoy / Pitch-Count Detector
# ============================================================================
def test_08_sg8_injury_decoy_or_pitch_count_detector() -> None:
    """
    SG-8: Verifies detect_injury_decoy_or_pitch_count_trap('Brian Thomas Jr.',
    'Questionable', 12.5, 58.0, ...) flags is_decoy_trap: True, block_over_bets: True,
    block_cash_dfs: True, and reallocates 65% of vacated target share to healthy teammates.
    """
    res = detect_injury_decoy_or_pitch_count_trap(
        player_name="Brian Thomas Jr.",
        injury_designation="Questionable",
        market_line=12.5,
        healthy_prior_mean=58.0,
        teammate_shares={
            "Brian Thomas Jr.": 0.26,
            "Parker Washington": 0.16,
            "Jakobi Meyers": 0.21,
            "Brenton Strange": 0.13,
        },
    )
    assert res["is_decoy_trap"] is True
    assert res["block_over_bets"] is True
    assert res["block_cash_dfs"] is True
    assert res["share_reallocated_fraction"] == pytest.approx(0.65, abs=1e-4)
    assert res["retained_share_multiplier"] == pytest.approx(0.35, abs=1e-4)
    assert sum(res["reallocated_shares"].values()) == pytest.approx(1.0, abs=1e-4)
    assert res["reallocated_shares"]["Parker Washington"] > (0.16 / 0.76)


# ============================================================================
# TEST 9 (SG-9): Live Halftime Simulator Rules H1, H2, H3
# ============================================================================
def test_09a_sg9_halftime_live_simulator_rules_h1_and_h2() -> None:
    """
    SG-9: Verifies simulate_halftime_live_2h clamps 2H pass rate to 0.34 (Rule H1
    for Joe Fagnano 2.4 YPA) and decays Questionable Bhayshul Tuten 2H carry share by
    -45% when up >= 10 (Rule H2).
    """
    state_1h = {
        "away": "JAX",
        "home": "BAL",
        "score_away": 20.0,
        "score_home": 3.0,
        "1h_ypa": {"JAX": 7.9, "BAL": 2.4},
        "1h_plays": {"JAX": 34, "BAL": 26},
        "qb_tier_map": {"JAX": "QB1_STARTER", "BAL": "EMERGENCY_QB3_UDFA"},
        "injury_status_map": {"Bhayshul Tuten": "Questionable", "Travis Etienne": "Active"},
        "1h_player_stats": {
            "Bhayshul Tuten": {"team": "JAX", "carry_share": 0.42, "target_share": 0.08, "rush_yds_1h": 28.0, "rec_yds_1h": 6.0},
            "Travis Etienne": {"team": "JAX", "carry_share": 0.48, "target_share": 0.14, "rush_yds_1h": 41.0, "rec_yds_1h": 18.0},
        },
    }
    res = simulate_halftime_live_2h(state_1h, n_sims=2000, seed=20261105)
    assert res["rule_h1_white_flag_run_clamp"]["BAL"]["active"] is True
    assert res["rule_h1_white_flag_run_clamp"]["BAL"]["clamped_2h_pass_rate"] == pytest.approx(0.34, abs=1e-4)
    assert res["rule_h2_questionable_starter_blowout_preservation"]["Bhayshul Tuten"]["share_decay_2h"] == pytest.approx(-0.45, abs=1e-4)
    assert res["player_2h_projections"]["Bhayshul Tuten"]["rule_h2_preserved"] is True
    assert res["player_2h_projections"]["Bhayshul Tuten"]["share_multiplier_2h"] == pytest.approx(0.55, abs=1e-4)


def test_09b_sg9_halftime_rule_h3_pregame_direction_flip_raises() -> None:
    """
    SG-9 (Rule H3): Verifies verify_pregame_receipt_direction_integrity and
    simulate_halftime_live_2h raise RuntimeError('PREGAME_DIRECTION_FLIP_DETECTED')
    if a pregame UNDER is flipped to an OVER receipt.
    """
    pregame = [{"player": "Brenton Strange", "market": "receiving_yards", "direction": "UNDER", "line": 31.5}]
    mutated = [{"player": "Brenton Strange", "market": "receiving_yards", "claimed_direction": "OVER", "line": 31.5}]

    with pytest.raises(RuntimeError, match="PREGAME_DIRECTION_FLIP_DETECTED"):
        verify_pregame_receipt_direction_integrity(pregame, mutated)

    with pytest.raises(RuntimeError, match="PREGAME_DIRECTION_FLIP_DETECTED"):
        simulate_halftime_live_2h(
            {
                "away": "JAX",
                "home": "BAL",
                "score_away": 20.0,
                "score_home": 3.0,
                "1h_ypa": {"JAX": 7.9, "BAL": 2.4},
                "qb_tier_map": {"JAX": "QB1_STARTER", "BAL": "EMERGENCY_QB3_UDFA"},
                "pregame_published_picks": pregame,
                "proposed_receipt_claims": mutated,
            },
            n_sims=100,
        )


# ============================================================================
# TEST 10 (SG-10): Overnight Shift Orchestrator & Official 62-23-1 Ledger
# ============================================================================
def test_10_sg10_overnight_shift_orchestrator_and_official_62_23_1_ledger() -> None:
    """
    SG-10: Verifies data/engine/new_engine_official_ledger_2026.json and
    data/engine/overnight_20h_shift_master_receipt_2026_11_05.json preserve
    62-23-1 (72.9%, +26.50u) with zero TNF contamination.
    """
    ledger_path = REPO_ROOT / "data" / "engine" / "new_engine_official_ledger_2026.json"
    overnight_path = REPO_ROOT / "data" / "engine" / "overnight_20h_shift_master_receipt_2026_11_05.json"
    assert ledger_path.is_file()
    assert overnight_path.is_file()

    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    ver = ledger["verified_record"]
    assert ver["wins"] == 62
    assert ver["losses"] == 23
    assert ver["pushes"] == 1
    assert ver["record"] == "62-23-1"
    assert ver["win_pct"] == pytest.approx(72.9, abs=0.1)
    assert ver["net_units"] == "+26.50u"

    leg_ids = [leg["id"] for leg in ver.get("component_legs", [])]
    assert all("jax_at_bal" not in lid for lid in leg_ids)

    overnight = json.loads(overnight_path.read_text(encoding="utf-8"))
    assert overnight["sg10_fix_applied"] is True
    ov_ledger = overnight["official_verified_record"]
    assert ov_ledger["record"] == "62-23-1"
    assert ov_ledger["win_pct"] == pytest.approx(72.9, abs=0.1)
    assert ov_ledger["net_units"] == "+26.50u"


# ============================================================================
# TEST 11: RunPod Live GraphQL Orchestrator & Zero-Waste Router
# ============================================================================
def test_11_runpod_live_graphql_orchestrator_and_zero_waste_router() -> None:
    """
    Verifies zero_waste_model_router.py and runpod_gpu_orchestrator.py +
    runpod_serverless_sim_handler.py execute 't85m_injury_resim' and
    'halftime_live_slate_burst' with zero raw API key leaks.
    """
    route_w = route_zero_waste_task("pbp_tendency_parse", TaskTier.TIER_1_FREE_OR_LOCAL)
    route_f = route_zero_waste_task("jev_snap_synthesis", TaskTier.TIER_2_JEV_VALIDATED)
    assert route_w["zero_waste_doctrine_compliant"] is True
    assert route_f["zero_waste_doctrine_compliant"] is True

    lanes = get_cloud_credit_lanes_summary()
    assert lanes["nvidia_nim"]["nvidia_cloud_account_id"] == "1086418431979798"
    assert lanes["google_vertex_ai"]["case_id"] == "00318218"

    gate_prompt = build_constitutional_gatekeeper_prompt(
        "JAX @ BAL",
        {"spine_age_hours": 3.0, "stage1_to_stage2_coupled": True, "std": 2.4, "model_prob": 0.58},
    )
    assert gate_prompt["passed_all_invariants"] is True
    assert "INV-3" in gate_prompt["system_prompt"]

    masked = mask_api_key("rpa_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
    assert "ABCDEFGHIJKLMNOP" not in masked
    assert masked.startswith("rpa_")

    res_t85m = runpod_serverless_handler(
        {
            "input": {
                "job_type": "t85m_injury_resim",
                "game_id": "NFL_2026_W09_DET_GB",
                "inactive_players": ["Isaiah Likely"],
                "n_worlds": 1000,
            }
        }
    )
    assert res_t85m["job_type"] == "t85m_injury_resim"
    assert res_t85m["pbp_conservation_verified"] is True

    res_ht = runpod_serverless_handler(
        {
            "input": {
                "job_type": "halftime_live_slate_burst",
                "n_worlds": 1000,
            }
        }
    )
    assert res_ht["job_type"] == "halftime_live_slate_burst"
    assert res_ht["within_halftime_sla"] is True
    assert res_ht["games_processed"] >= 1

    burst_dispatch = dispatch_runpod_serverless_burst(
        endpoint_id="local",
        payload={"job_type": "t85m_injury_resim", "game_id": "NFL_2026_W09_DET_GB", "n_worlds": 500},
    )
    serialized_burst = json.dumps(burst_dispatch)
    assert not re.search(r"rpa_[A-Za-z0-9]{15,}", serialized_burst)
    nim_spec = build_nvidia_nim_on_runpod_deployment_spec()
    assert nim_spec["nvidia_inception_status"] == "APPROVED"
    assert all(t["workersMin"] == 0 for t in nim_spec["serverless_flashboot_templates"])


# ============================================================================
# TEST 12: Wave 10 GCP 188 Products, 34 GitHub Repos & ML Design Patterns Engine
# ============================================================================
def test_12_wave10_gcp_188_products_34_github_repos_and_ml_design_patterns() -> None:
    """
    Verifies gcp_ml_design_patterns_and_agent_workbench_engine.py and
    mind_wave10_gcp_catalog_and_34_github_repos_2026_11_05.jsonl (240 trainer-ready rows).
    """
    jsonl_path = (
        REPO_ROOT
        / "data"
        / "mind_staging"
        / "mind_wave10_gcp_catalog_and_34_github_repos_2026_11_05.jsonl"
    )
    assert jsonl_path.is_file()
    lines = [ln for ln in jsonl_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert len(lines) == 240
    parsed_rows = [json.loads(ln) for ln in lines]
    assert all(row.get("trainer_ready") is True for row in parsed_rows)

    suite = run_gcp_ml_design_patterns_and_agent_workbench_suite()
    inv_map = suite["reframing_pattern"]["invariants_verified"]
    assert inv_map["all_cv_ge_0_35"] is True
    assert inv_map["all_std_ge_1_10"] is True
    assert inv_map["all_max_prob_le_0_780"] is True
    assert suite["feature_store_decoy_gate"]["anomaly_flag"] == "DECOY_PITCH_COUNT_ANOMALY"
    assert suite["feature_store_decoy_gate"]["is_decoy_anomaly"] is True
    assert suite["feature_store_decoy_gate"]["over_bet_allowed"] is False
    assert suite["checkpoint_eventarc_sg1"]["status"] == "FRESH_CHECKPOINT_VALID"
    assert suite["model_armor_shield_sg4_sg7"]["shield_verdict"] == "CLEARED_FOR_PUBLICATION"
    assert suite["healthcare_fhir_mimic_bridge"]["log_signature_lyndon_dimension"] > 0
    assert suite["cloud_run_mcp_otel_sg2"]["sg2_coupling_verified"] is True


# ============================================================================
# TEST 13: Wave 11 27-Downloads Situational Layer-2 Compiler & All 51 Q1-Q51 Features
# ============================================================================
def test_13_wave11_situational_layer2_compiler_12_laws_and_51_q_features() -> None:
    """
    Verifies compile_x_situational_layer2_overlay (12/12 laws) and
    evaluate_q1_to_q51_feature_registry (51/51 features) in x_situational_layer2_compiler.py.
    """
    ctx = build_jax_at_bal_week9_forensic_context()
    overlay = compile_x_situational_layer2_overlay(ctx)
    assert overlay["laws_evaluated_count"] == 12
    assert overlay["laws_triggered_count"] == 12
    assert overlay["rescued_sources_count"] >= 10

    q_reg = evaluate_q1_to_q51_feature_registry({})
    assert q_reg["feature_count"] == 51
    assert q_reg["all_51_present"] is True
    for i in range(1, 52):
        assert f"Q{i}" in q_reg["features"]


# ============================================================================
# TEST 14: Storefront Quarantine Verification
# ============================================================================
def test_14_storefront_quarantine_verification() -> None:
    """
    Verifies apps/web/lib/packages/catalog.ts, apps/web/app/packages/page.tsx, and
    apps/web/components/redline/redline-world.tsx have tnf-all-in-pack set to
    forSale: false, zero 'Mark Andrews OVER 2.5 Rec' teasers, and active Week 9
    Sunday/MNF (DET @ GB, MIA @ BUF, IND @ MIN, TB @ KC) content.
    """
    catalog_path = REPO_ROOT / "apps" / "web" / "lib" / "packages" / "catalog.ts"
    packages_page_path = REPO_ROOT / "apps" / "web" / "app" / "packages" / "page.tsx"
    redline_path = REPO_ROOT / "apps" / "web" / "components" / "redline" / "redline-world.tsx"

    catalog_text = catalog_path.read_text(encoding="utf-8")
    packages_text = packages_page_path.read_text(encoding="utf-8")
    redline_text = redline_path.read_text(encoding="utf-8")

    # 1. tnf-all-in-pack must have forSale: false
    tnf_block_match = re.search(
        r'slug:\s*"tnf-all-in-pack"[\s\S]{0,1200}?forSale:\s*(true|false)',
        catalog_text,
    )
    assert tnf_block_match is not None, "Could not locate tnf-all-in-pack block in catalog.ts"
    assert tnf_block_match.group(1) == "false"

    # 2. Zero 'Mark Andrews OVER 2.5 Rec' teasers across all three storefront files
    for path_name, content in [
        ("catalog.ts", catalog_text),
        ("packages/page.tsx", packages_text),
        ("redline-world.tsx", redline_text),
    ]:
        assert "Mark Andrews OVER 2.5" not in content, f"Found banned teaser in {path_name}"

    # 3. Active Week 9 Sunday/MNF (DET @ GB, MIA @ BUF, IND @ MIN, TB @ KC) content present
    for matchup in ("DET @ GB", "MIA @ BUF", "IND @ MIN", "TB @ KC"):
        assert matchup in catalog_text, f"Missing {matchup} in catalog.ts"
        assert matchup in packages_text, f"Missing {matchup} in packages/page.tsx"
        assert matchup in redline_text, f"Missing {matchup} in redline-world.tsx"


# ============================================================================
# BONUS TESTS 15 & 16: Healthcare FHIR Rough-Path & Model Armor Violation Shield
# ============================================================================
def test_15_wave10_model_armor_shield_blocks_sg4_and_sg7_violations() -> None:
    """Verifies ml_pattern_model_armor_invariant_shield blocks props violating std < 1.15 or max_prob > 0.78."""
    bad_props = [
        {"player": "Roquan Smith", "std": 0.42, "max_prob": 0.968},
    ]
    res = ml_pattern_model_armor_invariant_shield(bad_props, stage5_publish_allowed=True)
    assert res["shield_verdict"] == "HALT_PUBLICATION_PASS_ONLY"
    assert res["violations_count"] >= 2


def test_16_wave10_fhir_mimic_rough_path_and_otel_coupling_span() -> None:
    """Verifies gcp_healthcare_data_engine_fhir_mimic_bridge and gcp_cloud_run_mcp_and_agent_starter_telemetry."""
    fhir = gcp_healthcare_data_engine_fhir_mimic_bridge(vital_stream_hz=500.0, rough_path_depth=3)
    assert fhir["full_signature_dimension"] == 155
    assert fhir["log_signature_lyndon_dimension"] == 55
    assert fhir["lie_algebra_compression_ratio"] == pytest.approx(155 / 55, abs=0.05)

    otel = gcp_cloud_run_mcp_and_agent_starter_telemetry(
        stage1a_hash="a" * 64,
        stage1b_hash="b" * 64,
        stage2_params={"home_off_epa": -0.246, "completion_floor": 0.34},
    )
    assert otel["sg2_coupling_verified"] is True
    assert otel["otel_status_code"] == "OK"


# ============================================================================
# TEST 17: Full-Repo 279-Family, 83-Rule, 12,304-Equation & 25K Monorepo/Books Bridge
# ============================================================================
def test_17_full_repo_25k_books_papers_routes_and_83_rules_live_bridge() -> None:
    """
    Verifies full_repo_279_family_situational_reasoning_matrix.py (83 X-Situational rules,
    3 measured primitives, 6-family Cholesky aggregator, 288-bit / 279-family / 12,304-equation
    router, 1,221+ TS modules, 377+ Python modules) and uncompressed_25k_repo_books_papers_routes_bridge.py
    (24,957+ repo files, 11,078+ docs, 1,791 arxiv papers, 25 packages, 35 intelligence domains,
    12 canonical textbooks) execute live inside compile_stage1_to_stage2_simulation_priors().
    """
    from intelligence.coaching.full_repo_279_family_situational_reasoning_matrix import (
        run_full_repo_situational_reasoning_engine,
    )
    from intelligence.coaching.uncompressed_25k_repo_books_papers_routes_bridge import (
        evaluate_uncompressed_books_papers_and_monorepo_priors,
    )

    repo_matrix = run_full_repo_situational_reasoning_engine({"home_qb_tier": "EMERGENCY_QB3_UDFA"})
    assert repo_matrix["total_ts_modules_cataloged"] >= 1221
    assert repo_matrix["total_python_intelligence_modules_cataloged"] >= 377
    assert repo_matrix["x_situational_80_rules_count"] >= 80
    assert repo_matrix["measured_primitives_count"] == 3
    assert repo_matrix["context_mask_bits"] == 288
    assert repo_matrix["equation_families_count"] == 279
    assert repo_matrix["total_equations_routed"] >= 12304
    assert repo_matrix["cholesky_families_orthogonalized"] == 6
    assert abs(repo_matrix["clamped_log_odds_delta"]) <= 0.35

    bridge_25k = evaluate_uncompressed_books_papers_and_monorepo_priors(
        {"home_qb_tier": "EMERGENCY_QB3_UDFA", "wind_mph": 16.0, "home_ol_starters_out": 2}
    )
    census = bridge_25k["monorepo_census_summary"]
    assert census["total_repo_files_indexed"] >= 24900
    assert census["docs_files_indexed"] >= 11000
    assert census["arxiv_program_files_indexed"] >= 1790
    assert census["packages_count"] == 25
    assert census["intelligence_domains_count"] == 35
    assert census["canonical_textbooks_wired"] == 12
    assert census["master_equations_wired"] >= 12304

    priors = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"home_qb1_starter": "Joe Fagnano"},
        stage1b_receipt={"weather_wind_mph": 14.0},
    )
    assert "full_repo_279_family_situational_matrix" in priors
    assert "google_drive_and_onedrive_omni_overlay" in priors
    assert "uncompressed_25k_repo_books_papers_routes_bridge" in priors
    assert priors["uncompressed_25k_repo_books_papers_routes_bridge"]["monorepo_census_summary"]["total_repo_files_indexed"] >= 24900


# ============================================================================
# TEST 18: Wave 12 Entire Google Drive & OneDrive Omni-Situational Engine
# ============================================================================
def test_18_wave12_entire_google_drive_and_onedrive_omni_situational_engine() -> None:
    """
    Verifies google_drive_and_onedrive_omni_situational_engine.py and
    mind_wave12_entire_google_drive_and_onedrive_2026_11_05.jsonl (169 trainer-ready records).
    """
    from intelligence.coaching.google_drive_and_onedrive_omni_situational_engine import (
        run_google_drive_and_onedrive_omni_situational_overlay,
    )

    w12_jsonl = (
        REPO_ROOT
        / "data"
        / "mind_staging"
        / "mind_wave12_entire_google_drive_and_onedrive_2026_11_05.jsonl"
    )
    assert w12_jsonl.is_file()
    rows = [json.loads(line) for line in w12_jsonl.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(rows) >= 150
    assert all(r.get("trainer_ready") is True for r in rows)

    overlay = run_google_drive_and_onedrive_omni_situational_overlay({})
    adj = overlay["situational_adjustment_vector"]
    assert adj["cqr_ess_gate_passed"] is True
    assert 0.01 <= adj["calibrated_win_prob"] <= 0.99
    assert len(overlay["cryptographic_provenance_sha256"]) == 64

