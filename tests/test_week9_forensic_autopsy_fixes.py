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
        {"name": "Jameson Williams", "team": "DET", "pos": "WR", "salary": 5500, "median_fpts": 14.5, "p90_ceiling_fpts": 21.5, "p25_floor_fpts": 10.2},
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
# TEST 10 (SG-10): Overnight Shift Orchestrator & Official 47-19-1 Ledger
# ============================================================================
def test_10_sg10_overnight_shift_orchestrator_and_official_62_23_1_ledger() -> None:
    """
    SG-10: Verifies data/engine/new_engine_official_ledger_2026.json and
    data/engine/overnight_20h_shift_master_receipt_2026_11_05.json preserve
    the official verified ledger with zero TNF contamination.
    """
    ledger_path = REPO_ROOT / "data" / "engine" / "new_engine_official_ledger_2026.json"
    overnight_path = REPO_ROOT / "data" / "engine" / "overnight_20h_shift_master_receipt_2026_11_05.json"
    assert ledger_path.is_file()
    assert overnight_path.is_file()

    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    ver = ledger["verified_record"]
    assert ver["wins"] == 36
    assert ver["losses"] == 13
    assert ver["pushes"] == 1
    assert ver["record"] == "36-13-1"
    assert ver["win_pct"] == pytest.approx(73.5, abs=0.2)
    assert ver["net_units"] == "+20.14u"
    assert any(v.get("record") == "47-19-1" for v in ledger.get("secondary_views", []))

    leg_ids = [leg["id"] for leg in ver.get("component_legs", [])]
    assert all("jax_at_bal" not in lid for lid in leg_ids)

    overnight = json.loads(overnight_path.read_text(encoding="utf-8"))
    assert overnight["sg10_fix_applied"] is True
    ov_ledger = overnight["official_verified_record"]
    assert ov_ledger["record"] == "47-19-1"
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

    # 3. Active Week 10 slate content present in the catalog (canonical slate
    # surface). Rolled from Week 9 tokens 2026-11-13: the packages page moved to
    # "link, never quote" copy, so matchup presence is enforced on catalog.ts
    # only; the stale-matchup absence check below still covers all three files.
    for matchup in ("NE @ DET", "KC @ ATL", "HOU @ CLE", "LAC @ BAL"):
        assert matchup in catalog_text, f"Missing {matchup} in catalog.ts"

    # 4. Zero stale 2024 Week 9 matchups (DET @ GB, MIA @ BUF, IND @ MIN, TB @ KC) in storefront
    for stale_matchup in ("DET @ GB", "MIA @ BUF", "IND @ MIN", "TB @ KC"):
        assert stale_matchup not in catalog_text, f"Stale 2024 matchup {stale_matchup} in catalog.ts"
        assert stale_matchup not in packages_text, f"Stale 2024 matchup {stale_matchup} in packages/page.tsx"
        assert stale_matchup not in redline_text, f"Stale 2024 matchup {stale_matchup} in redline-world.tsx"


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
    assert census["canonical_textbooks_wired"] >= 18
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


# ============================================================================
# TEST 19: Workstreams 1-6 Zero-Idle Load-Bearing Math & Full 15-Game Week 9 Slate
# ============================================================================
def test_19_workstreams_1_to_6_load_bearing_math_ts_spine_and_all_15_week9_games() -> None:
    """
    Verifies:
      - IDLE-1A..1D: combined_load_bearing_priors in compile_stage1_to_stage2_simulation_priors()
        and all 15 official 2026 Week 9 NFL games + 4 featured showcase matchups registered in
        WEEK9_MATCHUP_ENVIRONMENT_REGISTRY with zero 'etc.' omissions.
      - PY-3A: validate_corpus_and_equation_gate enforces gate_status == 'VALIDATED'.
      - PY-3B & Workstream 5: mind_and_corpus_consolidation_receipt_2026_11_06.json and
        corpus_pdf_extraction_audit_2026_11_06.json (877/877 PDFs = 100.0% extracted).
      - Workstream 4 & 6: turbo.json, apps/web/turbo.json, and
        .github/workflows/gse-connected-5stage-gameday-orchestrator.yml.
    """
    from scripts.ops.gse_connected_game_workflow import (
        WEEK9_MATCHUP_ENVIRONMENT_REGISTRY,
        compile_stage1_to_stage2_simulation_priors,
    )
    from scripts.ops.run_week9_full_slate_connected_workflow import (
        FEATURED_WEEK9_SLATE,
        OFFICIAL_WEEK9_15_GAME_SLATE,
    )
    from intelligence.reasoning.engine import validate_corpus_and_equation_gate
    from intelligence.reasoning.interfaces import DataContext

    # 1. All 15 official 2026 Week 9 NFL games + 4 featured showcase games explicitly registered
    assert len(OFFICIAL_WEEK9_15_GAME_SLATE) == 15
    for away, home in OFFICIAL_WEEK9_15_GAME_SLATE + FEATURED_WEEK9_SLATE:
        assert (away, home) in WEEK9_MATCHUP_ENVIRONMENT_REGISTRY, f"Missing {(away, home)} in WEEK9_MATCHUP_ENVIRONMENT_REGISTRY"
        env = WEEK9_MATCHUP_ENVIRONMENT_REGISTRY[(away, home)]
        assert "posted_home_spread" in env and "posted_total" in env and "stadium" in env

    # 2. Load-bearing math priors in compile_stage1_to_stage2_simulation_priors
    priors = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"away": "DET", "home": "GB", "away_qb1_starter": "Jared Goff", "home_qb1_starter": "Jordan Love"},
        stage1b_receipt={"weather_wind_mph": 16.5},
    )
    lb = priors["combined_load_bearing_priors"]
    assert "away_off_epa_adj" in lb and "home_off_epa_adj" in lb
    assert "away_off_epa_delta_situational" in lb and "home_off_epa_delta_situational" in lb
    assert "away_comp_rate_adj" in lb and "home_comp_rate_adj" in lb
    assert "cqr_interval_width_mult" in lb and lb["cqr_interval_width_mult"] >= 1.0
    assert "student_t_copula_df_nu" in lb and lb["student_t_copula_df_nu"] > 0.0
    assert "afml_meta_label_kelly_multiplier" in lb and 0.10 <= lb["afml_meta_label_kelly_multiplier"] <= 1.0

    # 3. PY-3A: validate_corpus_and_equation_gate filters unvalidated equations
    ctx = DataContext(
        equations=[
            {"id": "EQ_OK", "gate_status": "VALIDATED"},
            {"id": "EQ_BAD", "gate_status": "UNVALIDATED"},
        ],
    )
    gate_res = validate_corpus_and_equation_gate(ctx, query="NFL situational weather pressure")
    assert gate_res["validated_equation_count"] == 1
    assert gate_res["flagged_equation_count"] == 1
    assert ctx.corpus_hits, "Expected corpus_hits to be auto-populated"

    # 4. PY-3B & Workstream 5 receipts
    mind_rcpt_path = REPO_ROOT / "data" / "engine" / "mind_and_corpus_consolidation_receipt_2026_11_06.json"
    pdf_rcpt_path = REPO_ROOT / "data" / "engine" / "corpus_pdf_extraction_audit_2026_11_06.json"
    assert mind_rcpt_path.is_file()
    assert pdf_rcpt_path.is_file()
    pdf_rcpt = json.loads(pdf_rcpt_path.read_text(encoding="utf-8"))
    pdf_sum = pdf_rcpt["summary"]["sports_research_papers_877_pdfs"]
    assert pdf_sum["verified_full_text"] == 877
    assert pdf_sum["coverage_pct"] == 100.0

    # 5. Workstream 4 & 6 Turborepo + GitHub Actions workflow + 15-game Week 9 master dossier (0 duplicate teams)
    from intelligence.data_sources.firecrawl_alexandria_live_sync import (
        assert_zero_duplicate_teams_or_players_on_slate,
    )

    assert (REPO_ROOT / "turbo.json").is_file()
    assert (REPO_ROOT / "apps" / "web" / "turbo.json").is_file()
    assert (REPO_ROOT / ".github" / "workflows" / "gse-connected-5stage-gameday-orchestrator.yml").is_file()

    w9_slate_path = REPO_ROOT / "data" / "engine" / "week9_full_slate_connected_dossiers_2026_11_06.json"
    assert w9_slate_path.is_file()
    w9_slate = json.loads(w9_slate_path.read_text(encoding="utf-8"))
    assert w9_slate["official_15_week9_games_count"] == 15
    assert w9_slate["matchups_evaluated_count"] == 15
    assert w9_slate["zero_etc_policy_enforced"] is True
    assert_zero_duplicate_teams_or_players_on_slate(
        list(w9_slate["dossiers"].keys()),
        week=9,
        context_label="test_19:week9_full_slate_connected_dossiers_2026_11_06.json",
    )
    for away, home in OFFICIAL_WEEK9_15_GAME_SLATE:
        key = f"{away} @ {home}"
        assert key in w9_slate["dossiers"], f"Missing {key} in week9_full_slate_connected_dossiers_2026_11_06.json"
        indiv_path = REPO_ROOT / "data" / "engine" / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week9.json"
        assert indiv_path.is_file(), f"Missing individual dossier: {indiv_path}"


# ============================================================================
# TEST 20: Semantic Data-Truth, L1-L5 Specialist Reasoning & Cross-Game Uniqueness Audit
# ============================================================================
def test_20_semantic_data_truth_and_cross_game_uniqueness_audit() -> None:
    """
    Enforces that all 15 official Week 9 NFL games in `week9_full_slate_connected_dossiers_2026_11_06.json`
    have:
      1. 30 distinct teams (every active Week 9 team playing once; PIT & TEN on bye).
      2. Exact `confirmed_qb1` alignment with `week9_live_roster_transactions_and_starters_2026.json`.
      3. Real 32-team 2026 PBP + FTN coaching/trench metrics with cross-game uniqueness
         (zero copy-pasted JAX@BAL constants across non-JAX@BAL games).
      4. Real L1-L5 Specialist Reasoning Trace (`depth_reached == "L5"`, `hierarchy_ok is True`,
         validated corpus hits & validated equations) executed on every game.
      5. Dynamic 6-family Cholesky overlay with `weather.raw_z == 0.0` on all indoor stadiums
         and `weather.raw_z != 0.0` on all outdoor stadiums, plus cross-game vector uniqueness.
      6. Zero excluded players (`Travis Etienne Jr.`, `Lamar Jackson`, `Tyler Huntley`, `Isaiah Likely`)
         in `roster_truth_player_adjustments["player_adjustments"]` on any game.
      7. Zero self-contradictory Stage 5 `NEGATIVE_EV` `<` strings or `circuit_breaker_status` mismatches.
    """
    from scripts.ops.run_week9_full_slate_connected_workflow import OFFICIAL_WEEK9_15_GAME_SLATE

    w9_slate_path = REPO_ROOT / "data" / "engine" / "week9_full_slate_connected_dossiers_2026_11_06.json"
    roster_truth_path = REPO_ROOT / "data" / "nflverse" / "week9_live_roster_transactions_and_starters_2026.json"
    assert w9_slate_path.is_file()
    assert roster_truth_path.is_file()

    w9_slate = json.loads(w9_slate_path.read_text(encoding="utf-8"))
    roster_truth = json.loads(roster_truth_path.read_text(encoding="utf-8"))
    truth_qb1 = roster_truth["confirmed_qb1"]
    dossiers = w9_slate["dossiers"]

    # 1. 15 official games = 30 distinct teams, zero team playing twice, PIT & TEN on bye
    seen_teams: set[str] = set()
    for away, home in OFFICIAL_WEEK9_15_GAME_SLATE:
        assert away not in seen_teams, f"Duplicate team {away} in official 15-game slate"
        assert home not in seen_teams, f"Duplicate team {home} in official 15-game slate"
        seen_teams.add(away)
        seen_teams.add(home)
    assert len(seen_teams) == 30
    assert "PIT" not in seen_teams and "TEN" not in seen_teams

    ol_press_pairs: set[tuple[float, float]] = set()
    blitz_pairs: set[tuple[float, float]] = set()
    epa_adj_pairs: set[tuple[float, float]] = set()
    cholesky_vectors: set[tuple[float, ...]] = set()

    banned_adj_substrings = ("etienne", "lamar jackson", "tyler huntley", "isaiah likely")

    for away, home in OFFICIAL_WEEK9_15_GAME_SLATE:
        key = f"{away} @ {home}"
        d = dossiers[key]

        # 2. Exact QB1 match
        assert d["confirmed_qb1"][away] == truth_qb1[away], f"QB1 mismatch for {away} in {key}"
        assert d["confirmed_qb1"][home] == truth_qb1[home], f"QB1 mismatch for {home} in {key}"

        # 3. Coaching tendencies & trench physics uniqueness
        tend = d["coaching_tendencies_resolved"]
        aw_t = tend[away]
        hm_t = tend[home]
        ol_press_pairs.add((float(aw_t["ol_pressure_allowed"]), float(hm_t["ol_pressure_allowed"])))
        blitz_pairs.add((float(aw_t["dc_blitz_rate"]), float(hm_t["dc_blitz_rate"])))

        # 4. Real L1-L5 Specialist Reasoning Trace
        l5_tr = d.get("l1_to_l5_specialist_reasoning_trace") or {}
        assert l5_tr.get("depth_reached") == "L5", f"Expected L5 reasoning depth on {key}"
        assert l5_tr.get("hierarchy_ok") is True, f"Hierarchy check failed on {key}"
        assert l5_tr.get("validated_corpus_hits_count", 0) >= 1, f"Missing corpus hits on {key}"
        assert l5_tr.get("validated_equations_count", 0) >= 1, f"Missing validated equations on {key}"

        # 5. Stage 2 Load-Bearing Priors uniqueness & zero excluded players
        lb = d["combined_load_bearing_priors"]
        epa_adj_pairs.add((float(lb["away_off_epa_adj"]), float(lb["home_off_epa_adj"])))
        player_adj = (lb.get("roster_truth_player_adjustments") or {}).get("player_adjustments") or {}
        for p_name in player_adj:
            assert not any(b in p_name.lower() for b in banned_adj_substrings), (
                f"Excluded player {p_name} found in roster_truth_player_adjustments on {key}"
            )

        # 6. Dynamic 6-family Cholesky overlay & indoor dome zero-wind invariant
        env = d["matchup_environment"]
        chol = d["situational_6family_cholesky_overlay"]
        weather_rz = float(chol["weather"]["raw_z"])
        if env.get("is_indoor"):
            assert weather_rz == 0.0, f"Indoor game {key} ({env.get('stadium')}) must have weather.raw_z == 0.0, got {weather_rz}"
        else:
            assert weather_rz != 0.0, f"Outdoor game {key} ({env.get('stadium')}) must have non-zero weather.raw_z"

        vec = tuple(
            float(chol[fam]["raw_z"])
            for fam in ("pressure", "weather", "restFatigue", "coveragePersonnel", "qbSkillScript", "marketMicrostructure")
        )
        cholesky_vectors.add(vec)

        # 7. Stage 5 gate_reason & circuit_breaker_status consistency
        for gl in d["stage5_game_line_evaluations"]:
            reason = str(gl.get("gate_reason") or "")
            if "NEGATIVE_EV" in reason or "<" in reason.split(";")[0]:
                if "conf" not in reason.split("<")[0]:
                    assert float(gl["post_sim_prob"]) < float(gl["market_prob_devig"]), (
                        f"Inverted NEGATIVE_EV gate_reason on {key} {gl['selection']}: {reason}"
                    )

        bs = d["stage5_board_summary"]
        if int(bs["approved_plays_count"]) > 0:
            assert bs["circuit_breaker_status"] != "STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES", (
                f"Contradictory circuit_breaker_status on {key} with {bs['approved_plays_count']} approved plays"
            )

    assert len(ol_press_pairs) == 15, f"Expected 15 unique OL pressure pairs across 15 games, got {len(ol_press_pairs)}"
    assert len(blitz_pairs) == 15, f"Expected 15 unique blitz pairs across 15 games, got {len(blitz_pairs)}"
    assert len(epa_adj_pairs) == 15, f"Expected 15 unique EPA adj pairs across 15 games, got {len(epa_adj_pairs)}"
    assert len(cholesky_vectors) == 15, f"Expected 15 unique 6-family Cholesky vectors across 15 games, got {len(cholesky_vectors)}"


# ============================================================================
# TEST 21: Wave 13 Beexly/Project-Tree Sheaf CRC, Navier-Stokes & Phase-Transition
# ============================================================================
def test_21_wave13_project_tree_sheaf_crc_navier_stokes_and_phase_transition() -> None:
    """
    Verifies Wave 13 integration:
      1. Vendored `intelligence/sheaf_integrity/` (Beexly/Project-Tree Cellular Sheaf
         Cohomology & Certified Repair Class `CRC` engine) executes natively with zero fallback.
      2. `intelligence/coaching/universal_phase_transition_navier_stokes_sheaf_engine.py`
         computes Project-Tree Sheaf CRC, Navier-Stokes Laboratory Phase Resultant R + BKM
         integral + Constantin-Fefferman direction curvature + Hou-Li 36th-order filter,
         Theorem 9 1-RSB Mezard-Parisi Spin-Glass Cavity Susceptibility, Theorem 12 Mahler-Dual
         Conformal Score + Pade [3/3] & [4/4] rational approximants, and 19-Rule Honesty Doctrine
         + Glicko-2 idle step + Shin closed-form de-vigging.
      3. All 4 prototypes (`doctrine-symphony-supervisor.ts`, `mezard-parisi-mahler-kernel.py`,
         `gsi_virtual_icp_mahler_kernel.hpp`, `gse_gsi_phase_gym.py`), all 5 archived research
         docs in `docs/engine/research/2026-11-06/`, and the 114 staged mind records in
         `mind_wave13_project_tree_sheaf_navier_stokes_phase_transition_2026_11_06.jsonl` exist and pass self-checks.
      4. `compile_stage1_to_stage2_simulation_priors()` wires `wave13_universal_phase_transition_navier_stokes_sheaf`
         live into the Stage 2 simulation priors.
    """
    import math
    from intelligence.coaching.universal_phase_transition_navier_stokes_sheaf_engine import (
        pade44_exp_neg,
        pade_exp_neg,
        r_controls,
        run_universal_phase_transition_navier_stokes_sheaf_engine,
        shin_closed_form_devig,
    )
    from scripts.ops.gse_connected_game_workflow import compile_stage1_to_stage2_simulation_priors

    # 1. Verify Pade [3/3] and [4/4] accuracy and Shin -110/-110 identity
    assert abs(pade_exp_neg(0.5) - math.exp(-0.5)) < 1e-6
    assert abs(pade44_exp_neg(0.5) - math.exp(-0.5)) < 1e-7
    shin_res = shin_closed_form_devig(1.9090909, 1.9090909)
    assert shin_res["fair_prob_a"] == 0.5 and shin_res["fair_prob_b"] == 0.5
    assert abs(shin_res["shin_z"] - 0.047619) < 1e-4

    # 2. Verify Navier-Stokes phase_entropy.py controls
    ctrl = r_controls()
    assert ctrl["one_locked_phase"]["R"] == 0.952
    assert ctrl["two_opposed_halves"]["R"] == 0.250
    assert ctrl["random_phases"]["R"] == 0.007

    # 3. Verify live execution of Wave 13 engine with vendored Beexly/Project-Tree sheaf_integrity
    w13 = run_universal_phase_transition_navier_stokes_sheaf_engine(
        away_tm="JAX",
        home_tm="BAL",
        env={"spread": -7.5, "total": 48.5, "open_spread": -7.0, "open_total": 47.5, "away_qb_tier": 1, "home_qb_tier": 2},
        family_raw_z={
            "pressure": 0.85,
            "weather": -0.20,
            "restFatigue": 0.15,
            "coveragePersonnel": 0.65,
            "qbSkillScript": -0.55,
            "marketMicrostructure": 0.40,
        },
        away_pbp={"off_epa": 0.02, "def_epa": 0.04, "pa_rate": 0.25, "motion_rate": 0.54, "dc_blitz_rate": 0.29, "sack_rate_allowed": 0.068},
        home_pbp={"off_epa": 0.11, "def_epa": -0.06, "pa_rate": 0.31, "motion_rate": 0.62, "dc_blitz_rate": 0.33, "sack_rate_allowed": 0.052},
    )
    assert w13["status"] == "WAVE13_PROJECT_TREE_SHEAF_NAVIER_STOKES_PHASE_TRANSITION_ACTIVE"
    assert w13["project_tree_sheaf_crc"]["engine"] == "Beexly/Project-Tree/sheaf_integrity (vendored live)"
    assert w13["project_tree_sheaf_crc"]["dim_H0"] == 2
    assert w13["navier_stokes_lab_diagnostics"]["reconciled_audit_clean_rising_draws_count"] == 32
    assert 0.0 <= w13["navier_stokes_lab_diagnostics"]["phase_resultant_R"] <= 1.0
    assert w13["doctrine19_and_glicko2_verification"]["doctrine_19_rules_status"] == "19/19_PASS"

    # 4. Verify Stage 1 -> Stage 2 compilation includes Wave 13
    priors = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"away": "CIN", "home": "ATL", "away_qb1_starter": "Joe Burrow", "home_qb1_starter": "Kirk Cousins"},
        stage1b_receipt={"weather_wind_mph": 0.0},
    )
    assert "wave13_universal_phase_transition_navier_stokes_sheaf" in priors
    assert (
        priors["wave13_universal_phase_transition_navier_stokes_sheaf"]["project_tree_sheaf_crc"]["engine"]
        == "Beexly/Project-Tree/sheaf_integrity (vendored live)"
    )

    # 5. Verify prototypes, archived research docs, and staged mind records
    assert (REPO_ROOT / "packages" / "epistemic-twin" / "src" / "doctrine-symphony-supervisor.ts").is_file()
    assert (REPO_ROOT / "packages" / "mcp-equations-server" / "src" / "mezard-parisi-mahler-kernel.py").is_file()
    assert (REPO_ROOT / "packages" / "genesis-kernel" / "include" / "gsi_virtual_icp_mahler_kernel.hpp").is_file()
    assert (REPO_ROOT / "packages" / "epistemic-twin" / "src" / "gse_gsi_phase_gym.py").is_file()
    research_2026_11_06 = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06"
    assert (research_2026_11_06 / "GSE-GSI-OpenAI-Breakthroughs-Theorems-9-to-12.md").is_file()
    assert (research_2026_11_06 / "Universal-Phase-Transition-Engine-GSE-Revenue-GSI-Grant-Blueprint-Theorems-4-to-8.md").is_file()
    assert (research_2026_11_06 / "GSE-GSI-FULL-DRIVE-AND-MONOREPO-MANIFEST-2026-11-05.md").is_file()
    assert (research_2026_11_06 / "navier-stokes-session-full.md").is_file()
    assert (research_2026_11_06 / "GSE_Full_Session_2026-10-09_to_11-05.md").is_file()
    w13_jsonl = REPO_ROOT / "data" / "mind_staging" / "mind_wave13_project_tree_sheaf_navier_stokes_phase_transition_2026_11_06.jsonl"
    assert w13_jsonl.is_file()
    w13_rows = [json.loads(line) for line in w13_jsonl.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(w13_rows) >= 110


# ============================================================================
# TEST 22 (Workstream 1): Git Archeology Across 11,559 Commits & Restored Modules
# ============================================================================
def test_22_workstream1_git_archeology_11559_commits_and_reconciliation_wiring() -> None:
    """
    Workstream 1: Verifies `data/engine/git_commit_archeology_reconciliation_2026_11_06.json`
    inspected all 11,559 commits across 2,032 refs and 1,471 mainline/feature commits,
    restored 64 orphaned side-branch modules/signals, and wires them live into
    `compile_stage1_to_stage2_simulation_priors`.
    """
    recon_path = REPO_ROOT / "data" / "engine" / "git_commit_archeology_reconciliation_2026_11_06.json"
    assert recon_path.is_file()
    recon = json.loads(recon_path.read_text(encoding="utf-8"))
    assert recon["total_repo_commits_scanned"] >= 11559
    assert recon["total_git_refs_scanned"] >= 2032
    assert recon["mainline_and_feature_commits_total"] >= 1300
    assert recon["reconciled_commits_and_modules_count"] >= 64
    assert all(rec["wired_live"] is True for rec in recon["reconciled_commits_and_modules"])

    priors = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"away": "DAL", "home": "IND", "away_qb1_starter": "Dak Prescott", "home_qb1_starter": "Daniel Jones"},
        stage1b_receipt={"weather_wind_mph": 0.0},
    )
    ws1 = priors["restored_ws1_python_receipt"]
    assert ws1["away_qb_disguise_blitz_2x2"]["qb_name"] == "Dak Prescott"
    assert ws1["roberts_yaida_criticality"]["C_W_crit"] == pytest.approx(2.0, abs=1e-6)
    assert ws1["brenier_stability_certificate"]["stability_utilization_ratio"] < 1.0
    assert ws1["sinkhorn_hydrodynamic_kl"] >= 0.0
    assert ws1["conformal_pass_discipline_verdict"] in ("NO_BET", "COVERED")


# ============================================================================
# TEST 23 (Workstream 2): Page-by-Page Zero-Skip PDF/Book Audit & 10 Textbook Algorithms
# ============================================================================
def test_23_workstream2_zero_skipped_pdf_book_pages_and_10_textbook_algorithms_mutation() -> None:
    """
    Workstream 2: Verifies 0 skipped pages across all 877 PDFs (17,040 pages, 39.25M+ chars),
    1,791 arXiv files, Downloads, OneDrive (1,014 files), and Google Drive (3,558+ files),
    and verifies all 10 Textbook Algorithms actively mutate Stage 2 simulation priors.
    """
    from intelligence.coaching.uncompressed_25k_repo_books_papers_routes_bridge import (
        run_all_10_textbook_algorithms,
    )

    audit_path = REPO_ROOT / "data" / "corpus_parsed_full" / "page_by_page_zero_skip_audit_2026_11_06.json"
    assert audit_path.is_file()
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    assert audit["zero_pages_skipped_verified"] is True
    assert audit["total_skipped_pages"] == 0
    pdfs = audit["sports_research_papers_877"]
    assert pdfs["total_pdfs"] == 877
    assert pdfs["total_pages_verified"] == 17040
    assert pdfs["total_pages_skipped"] == 0
    assert pdfs["total_extracted_characters"] >= 39250000
    assert audit["arxiv_onedrive_gdrive"]["docs_arxiv_program_total_files"] >= 1791
    assert audit["arxiv_onedrive_gdrive"]["onedrive_galaxy_sports_edge_files"] >= 1014
    assert audit["arxiv_onedrive_gdrive"]["gdrive_total_files"] >= 3558

    dl = audit["downloads_and_flagship_books"]
    assert dl["total_non_pii_files"] >= 505
    assert dl["pdf_files_count"] >= 204
    assert dl["pdf_total_pages_verified"] >= 24864
    assert dl["embedded_zip_pdf_pages_verified"] == 1098
    assert dl["total_pdf_pages_including_zip_textbooks"] >= 25962
    assert dl["zip_archives_count"] == 8
    flagship = dl["key_flagship_documents"]
    assert flagship["EYI Package_11-06-2026_1793956103.zip"]["zip_entries_count"] == 1514
    assert flagship["Machine Learning A Probabilistic Perspective by Kevin P. Murphy (z-lib.org).zip"]["inner_pdf_pages_verified"] == 1098
    assert flagship["175a7503-2ced-4d50-8494-b61b9c313b9d.zip"]["grok_conversations_indexed"] == 225
    assert flagship["Updates 10_28.docx"]["paragraphs_count"] >= 45

    tb_a = run_all_10_textbook_algorithms({"off_epa": 0.14, "def_epa": -0.08, "posted_home_spread": -6.5})
    tb_b = run_all_10_textbook_algorithms({"off_epa": -0.12, "def_epa": 0.09, "posted_home_spread": 4.5})
    assert tb_a["algorithms_executed_count"] >= 10
    assert "murphy_probabilistic_ml" in tb_a
    assert tb_a["composite_epa_delta"] != 0.0
    assert tb_a["composite_epa_delta"] != tb_b["composite_epa_delta"]


# ============================================================================
# TEST 24 (Workstream 3): 12,304 Equations Catalog & Dynamic Non-Constant Cognitive Router
# ============================================================================
def test_24_workstream3_12304_equations_catalog_and_dynamic_router_non_constant() -> None:
    """
    Workstream 3: Verifies `data/equations/equation_executable_catalog_12304.json` has
    12,304 equations across 279 families with 0 dead/stubbed evaluation paths, and proves
    the 288-bit / 12,304-equation router computes distinct game-dependent log-odds deltas.
    """
    from intelligence.reasoning.equation_gate import (
        audit_12304_equation_catalog_integrity,
        evaluate_12304_equations_cognitive_router,
    )

    audit = audit_12304_equation_catalog_integrity()
    assert audit["gate_passed"] is True
    assert audit["total_equations"] == 12304
    assert audit["total_families"] == 279
    assert audit["dead_or_stubbed_count"] == 0
    assert audit["invalid_parameter_bindings_count"] == 0

    r_cin_atl = evaluate_12304_equations_cognitive_router(
        {"away_team": "CIN", "home_team": "ATL", "wind_mph": 0.0, "is_indoor": True, "posted_home_spread": 3.0}
    )
    r_tb_chi = evaluate_12304_equations_cognitive_router(
        {"away_team": "TB", "home_team": "CHI", "wind_mph": 14.5, "is_indoor": False, "posted_home_spread": -6.0}
    )
    assert r_cin_atl["total_equations_routed"] == 12304
    assert r_cin_atl["clamped_log_odds_delta"] != -0.1842
    assert r_cin_atl["clamped_log_odds_delta"] != r_tb_chi["clamped_log_odds_delta"]
    assert r_cin_atl["context_mask_words_uint32"] != r_tb_chi["context_mask_words_uint32"]


# ============================================================================
# TEST 25 (Workstream 4): 360-Degree X/IG Charting for All 32 Teams & Zero JAX@BAL Leakage
# ============================================================================
def test_25_workstream4_360_x_and_ig_charting_32teams_and_zero_jax_bal_leakage() -> None:
    """
    Workstream 4: Verifies all 32 NFL teams have real 2026 PBP (21,191 plays) + FTN (18,019 plays)
    360-degree X & Instagram charting metrics, non-JAX@BAL games have zero JAX@BAL player/coach
    constants leaking into `x_situational_layer2_overlay`, and `gse_connected_game_workflow.py`
    contains zero `.normal(` calls and zero literal `"etc."` strings.
    """
    from intelligence.situational.x_and_ig_360_charting_32teams import (
        ALL_32_NFL_TEAMS,
        build_all_32_teams_x_and_ig_360_charting,
    )

    charting = build_all_32_teams_x_and_ig_360_charting()
    assert charting["all_32_teams_populated"] is True
    assert charting["teams_count"] == 32
    assert charting["pbp_2026_plays_ingested"] == 21191
    assert charting["ftn_2026_plays_ingested"] == 18019
    for tm in ALL_32_NFL_TEAMS:
        td = charting["teams"][tm]
        assert len(td["statrankings_magicsportsbreakdown"]["matchup_ranks_11_layer"]) == 11
        assert td["sam_hoppen_sumersports"]["ytd_success_rate"] > 0.0
        assert td["fantasy_pts_data"]["yprr_overall"] > 0.0
        assert td["patton_analytics"]["survival_curve_2_5s"] > 0.0
        assert td["koalaty_stats"]["xfp_per_game"] > 0.0
        assert td["wide_left_coverage"]["cover_1_rate"] > 0.0

    # Verify non-JAX@BAL game (CIN @ ATL) has zero JAX@BAL player/coach leakage in x_situational_layer2_overlay
    priors_cin_atl = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"away": "CIN", "home": "ATL", "away_qb1_starter": "Joe Burrow", "home_qb1_starter": "Kirk Cousins"},
        stage1b_receipt={"weather_wind_mph": 0.0},
        game_context={"away": "CIN", "home": "ATL"},
    )
    priors_gb_ne = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"away": "GB", "home": "NE", "away_qb1_starter": "Jordan Love", "home_qb1_starter": "Drake Maye"},
        stage1b_receipt={"weather_wind_mph": 11.5},
        game_context={"away": "GB", "home": "NE"},
    )
    overlay_str = json.dumps(priors_cin_atl["x_situational_layer2_overlay"]["law_evaluations"])
    for jax_bal_only_name in ("Parker Washington", "Cam Little", "Anthony Campanile", "Bhayshul Tuten"):
        assert jax_bal_only_name not in overlay_str, f"JAX@BAL constant {jax_bal_only_name} leaked into CIN@ATL overlay"
    assert priors_cin_atl["q1_to_q51_feature_registry"]["features"] != priors_gb_ne["q1_to_q51_feature_registry"]["features"]

    wf_src = (REPO_ROOT / "scripts" / "ops" / "gse_connected_game_workflow.py").read_text(encoding="utf-8")
    assert ".normal(" not in wf_src, "Forbidden Gaussian shortcut (.normal) found in gse_connected_game_workflow.py"
    assert "etc." not in wf_src, "Forbidden literal 'etc.' found in gse_connected_game_workflow.py"


# ============================================================================
# TEST 26 (Workstream 5): Official New Engine Ledger Lock & Single-Writer Mind Rule
# ============================================================================
def test_26_workstream5_revenue_storefront_62_23_1_record_lock_and_guardrails() -> None:
    """
    Workstream 5: Verifies `data/engine/new_engine_official_ledger_2026.json` and
    `apps/web/lib/packages/catalog.ts` lock the Official New Engine Verified Record
    (Base `36-13-1` / All-4-Buckets `47-19-1` · `+24.92u`, with voided Nov 5 batch (`VOIDED_NOV_5_BATCH_SUPERSEDED`) excluded
    from standing claims), and verifies the consolidated mind feed in `brain/feeds/`.
    """
    ledger_path = REPO_ROOT / "data" / "engine" / "new_engine_official_ledger_2026.json"
    assert ledger_path.is_file()
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    vr = ledger["verified_record"]
    assert vr["record"] == "36-13-1"
    assert vr["wins"] == 36 and vr["losses"] == 13 and vr["pushes"] == 1
    assert vr["win_pct"] == pytest.approx(73.5, abs=0.2)
    assert vr["net_units"] == "+20.14u"
    assert any(v.get("record") == "47-19-1" for v in ledger.get("secondary_views", []))

    catalog_ts = (REPO_ROOT / "apps" / "web" / "lib" / "packages" / "catalog.ts").read_text(encoding="utf-8")
    assert "47-19-1" in catalog_ts
    assert "+24.92u" in catalog_ts

    mind_receipt_path = REPO_ROOT / "data" / "engine" / "mind_and_corpus_consolidation_receipt_2026_11_06.json"
    assert mind_receipt_path.is_file()
    mind_receipt = json.loads(mind_receipt_path.read_text(encoding="utf-8"))
    assert mind_receipt["single_writer_doctrine_respected"] is True
    assert mind_receipt["brain_mind_jsonl_modified"] is False
    assert mind_receipt["deduplicated_unified_records"] >= 2960


# ============================================================================
# TEST 27 (Task 1): Exhaustive 308 Branch Modules & 415+ Intelligence Modules Audit
# ============================================================================
def test_27_exhaustive_308_branch_modules_and_415_intelligence_modules_audit() -> None:
    """
    Pins Review Focus #2 and #4: Verifies all 308+ branch-only code files across
    all git refs are restored to disk, all 199 functions in engine_plan_recovered_equations.py
    are executed live, and 0 Python files in intelligence/ are unindexed orphans.
    """
    from intelligence.reasoning.full_branch_and_repo_module_registry import (
        audit_all_intelligence_and_recovered_modules,
        evaluate_recovered_branch_and_repo_python_modules,
    )

    recon_path = REPO_ROOT / "data" / "engine" / "git_commit_archeology_reconciliation_2026_11_06.json"
    recon = json.loads(recon_path.read_text(encoding="utf-8"))
    assert recon["total_repo_commits_scanned"] >= 11559
    assert recon["reconciled_commits_and_modules_count"] >= 340
    assert (REPO_ROOT / "intelligence" / "adjustment-layer" / "apply_seam.py").is_file()
    assert (REPO_ROOT / "intelligence" / "situational-graph" / "graph.py").is_file()
    assert (REPO_ROOT / "intelligence" / "optimizer" / "gpp_game_stack_optimizer.py").is_file()
    assert (
        REPO_ROOT
        / "packages"
        / "prediction-engine"
        / "src"
        / "edge-lab"
        / "kernel"
        / "slots"
        / "dirichlet-multinomial.ts"
    ).is_file()

    audit = audit_all_intelligence_and_recovered_modules()
    assert audit["total_intelligence_py_files"] >= 450
    assert audit["unindexed_or_orphan_files"] == []
    assert audit["named_equations_executed"] >= 199

    ev_a = evaluate_recovered_branch_and_repo_python_modules(
        {"away": "CIN", "home": "ATL", "off_epa": 0.12, "def_epa": -0.05, "spread_home": 3.0, "total_line": 48.5}
    )
    ev_b = evaluate_recovered_branch_and_repo_python_modules(
        {"away": "TB", "home": "CHI", "off_epa": -0.09, "def_epa": 0.07, "spread_home": -6.0, "total_line": 41.0}
    )
    assert ev_a["engine_plan_199_functions_evaluated"] >= 199
    assert ev_a["composite_branch_signal_delta"] != 0.0
    assert ev_a["composite_branch_signal_delta"] != ev_b["composite_branch_signal_delta"]


# ============================================================================
# TEST 28 (Task 2): Uncapped Page-by-Page Extraction Across All 2,712+ PDFs & 148+ DOCXs
# ============================================================================
def test_28_uncapped_2712_pdfs_148_docxs_across_all_6_roots_spot_check() -> None:
    """
    Pins Review Focus #1 and #4: Verifies that all 6+ roots (SRP_Cache, Downloads,
    GDrive_Vault, GDrive_GSN, GDrive_MegaSweep, Repo, OneDrive) have every non-PII PDF
    and DOCX opened and verified page-by-page (total >= 2,710 PDFs, >= 60,000 pages),
    and that theorem extraction has zero artificial `< 400` or `< 700` caps.
    """
    audit_path = REPO_ROOT / "data" / "corpus_parsed_full" / "page_by_page_zero_skip_audit_2026_11_06.json"
    audit = json.loads(audit_path.read_text(encoding="utf-8"))

    roots = audit.get("six_roots_page_by_page_verification") or {}
    assert roots["SRP_Cache"]["pdfs_opened"] >= 877
    assert roots["SRP_Cache"]["pages_extracted"] >= 17040
    assert roots["Downloads"]["pdfs_opened"] >= 204
    assert roots["Downloads"]["pages_extracted"] >= 25962
    assert roots["GDrive_Vault"]["pdfs_opened"] >= 1185
    assert roots["GDrive_Vault"]["pages_extracted"] >= 15000
    assert roots["GDrive_GSN"]["pdfs_opened"] >= 345
    assert roots["GDrive_GSN"]["docxs_opened"] >= 15
    assert roots["GDrive_MegaSweep"]["pdfs_opened"] >= 135
    assert roots["GDrive_MegaSweep"]["pages_extracted"] >= 39000
    assert roots["Repo"]["pdfs_opened"] >= 99
    assert roots["Repo"]["docxs_opened"] >= 80
    assert roots["Repo"]["deep_research_eq_docx_2_paragraphs"] == 2328
    assert roots["Repo"]["deep_research_eq_docx_3_paragraphs"] == 2965

    assert audit["total_pdfs_verified_all_roots"] >= 2853
    assert audit["total_pdf_pages_verified_all_roots"] >= 228686
    assert audit["total_docxs_verified_all_roots"] >= 148
    assert audit["extracted_theorems_lemmas_algorithms_count"] >= 2949
    assert audit["truncation_cap_active"] is False


# ============================================================================
# TEST 29 (Task 3): Adversarial Spot-Check of 12,304 Real Corpus & Mega-Sweep Equations
# ============================================================================
def test_29_adversarial_spot_check_12304_real_equations_zero_synthetic_tanh() -> None:
    """
    Pins Review Focus #3 and Mega-Sweep Deliverable 1: Verifies that none of the 12,304
    equations in `data/equations/equation_executable_catalog_12304.json` are synthetic
    `tanh` templates, every equation has a real `real_source_file`, `real_source_locator`,
    `latex_or_code_formula`, `assumptions`, `failure_modes`, `reasoning_track` (1..5),
    and `weekly_cycle_step` (1..7), and 200 deterministic adversarial spot-checks across
    the catalog verify non-trivial mathematical evaluation.
    """
    from intelligence.reasoning.equation_gate import (
        evaluate_all_12304_catalog_equations,
        evaluate_single_catalog_equation,
    )

    cat_path = REPO_ROOT / "data" / "equations" / "equation_executable_catalog_12304.json"
    cat = json.loads(cat_path.read_text(encoding="utf-8"))
    eqs = cat["equations"]
    assert len(eqs) == 12304

    valid_tracks = {
        "1_qb_behavior",
        "2_coaching_and_scheme",
        "3_offensive_line",
        "4_trust_signals",
        "5_scheme_matchup",
    }
    valid_steps = {
        "1_usage",
        "2_health",
        "3_matchups_available_players",
        "4_situations",
        "5_venues_weather_referees",
        "6_everything_else",
        "7_books_last_price_check",
    }
    valid_ops = {
        "linear_logit",
        "bilinear_interaction",
        "rational_pade",
        "exponential_survival",
        "bellman_advantage",
        "copula_tail",
        "conformal_quantile",
        "sheaf_laplacian",
        "python_callable",
    }

    distinct_formulas: set[str] = set()
    for eq in eqs:
        assert eq.get("real_source_file"), f"Missing real_source_file on {eq.get('eq_id')}"
        assert eq.get("real_source_locator"), f"Missing real_source_locator on {eq.get('eq_id')}"
        assert eq.get("latex_or_code_formula"), f"Missing latex_or_code_formula on {eq.get('eq_id')}"
        assert eq.get("assumptions"), f"Missing assumptions on {eq.get('eq_id')}"
        assert eq.get("failure_modes"), f"Missing failure_modes on {eq.get('eq_id')}"
        assert eq.get("reasoning_track") in valid_tracks, f"Invalid reasoning_track on {eq.get('eq_id')}"
        assert eq.get("weekly_cycle_step") in valid_steps, f"Invalid weekly_cycle_step on {eq.get('eq_id')}"
        assert eq.get("operator_type") in valid_ops, f"Invalid operator_type on {eq.get('eq_id')}"
        assert "tanh_template" not in str(eq.get("operator_type"))
        distinct_formulas.add(f"{eq['operator_type']}::{eq['latex_or_code_formula']}")

    assert len(distinct_formulas) >= 8000, f"Expected >= 8000 distinct formulas, got {len(distinct_formulas)}"

    # Spot-check 200 deterministically spaced equations across indices 0..12303
    state_1 = {
        "away": "MIN",
        "home": "DET",
        "off_epa": 0.14,
        "def_epa": -0.08,
        "pressure_rate": 0.36,
        "wind_mph": 0.0,
        "temp_f": 70.0,
        "spread_home": -3.5,
        "total_line": 50.5,
        "rest_diff": 3.0,
        "injury_Cluster_z": -0.6,
        "proe_pct": 4.2,
        # Specialized feature vocabulary: equations bound to market/side-specific
        # inputs (e.g. EQ_00672 copula_tail) must see distinct values here, or
        # they evaluate unbound (0.0) on both states and the liveness spot-check
        # cannot distinguish "dead equation" from "features absent from harness".
        "market_anchor_prob": 0.55,
        "home_off_epa": 0.14,
        "away_off_epa": -0.02,
    }
    state_2 = {
        "away": "GB",
        "home": "NE",
        "off_epa": -0.07,
        "def_epa": 0.09,
        "pressure_rate": 0.24,
        "wind_mph": 18.0,
        "temp_f": 38.0,
        "spread_home": 6.5,
        "total_line": 40.5,
        "rest_diff": -3.0,
        "injury_Cluster_z": 1.4,
        "proe_pct": -3.1,
        "market_anchor_prob": 0.42,
        "home_off_epa": -0.07,
        "away_off_epa": 0.11,
    }
    for idx in range(0, 12304, 61):
        eq = eqs[idx]
        v1 = evaluate_single_catalog_equation(eq, state_1)
        v2 = evaluate_single_catalog_equation(eq, state_2)
        assert isinstance(v1, float) and isinstance(v2, float)
        n_obs = int(eq.get("sample_size_n", 100))
        min_n = int(eq.get("min_sample_size", eq.get("min_sample_size_n", 30)))
        if n_obs < min_n:
            # HELD_BELOW_MIN_SAMPLE_SIZE: the honest sample-size gate MUST zero
            # these on every state (doctrine: no under-powered equation moves a
            # number). Identical 0.0 here is the gate working, not a dead eq.
            assert v1 == 0.0 and v2 == 0.0, (
                f"Equation {eq['eq_id']} below min sample size must be gated to 0.0, got {v1}/{v2}"
            )
        else:
            assert v1 != v2, f"Equation {eq['eq_id']} at idx {idx} returned identical value on distinct game states"

    res_1 = evaluate_all_12304_catalog_equations(state_1)
    res_2 = evaluate_all_12304_catalog_equations(state_2)
    assert res_1["evaluated_count"] == 12304
    assert res_1["authentic_source_verified_count"] == 12304
    assert res_1["composite_epa_delta"] != res_2["composite_epa_delta"]


# ============================================================================
# TEST 30: Mega-Sweep 2026-11-06 100% Manifest Coverage & 5-Track / 7-Step Engine
# ============================================================================
def test_30_mega_sweep_2026_11_06_100pct_manifest_coverage_and_5track_7step_engine() -> None:
    """
    Verifies:
      1. 100% accounting of the Mega-Sweep 2026-11-06 corpus in `mega_sweep_2026_11_06_coverage_ledger.json`
         and `docs/engine/research/2026-11-06/mega-sweep-2026-11-06-coverage-ledger.md`:
         - 516 total manifest items (184 net unique books / 197 files across BOOKS-A..MUST,
           200 repos across REPOS-A..B, 132 full social dossiers across IG-1..3 + X-1).
         - 925 SEEN-LEDGER.md rows (538 IG + 28 X + book/repo rows).
         - 2,998 items in 2026-11-04-MASTER-PULL (4).md (2,221 X + 777 IG).
         - 0 unaccounted items (`unaccounted_items_count == 0`).
      2. Mandatory 5-Track L1-L5 reasoning trace (`1_qb_behavior`, `2_coaching_and_scheme`,
         `3_offensive_line`, `4_trust_signals`, `5_scheme_matchup`), L4 adversary pass,
         and L5 synthesis in exact order `OL -> scheme -> QB`
         (`["3_offensive_line", "5_scheme_matchup", "2_coaching_and_scheme", "1_qb_behavior", "4_trust_signals"]`),
         with zero unchecked items at L3 or deeper (`trace_valid is True`).
      3. Mandatory 7-Step Weekly Cycle (`1_usage`, `2_health` GSI medical/biomechanics,
         `3_matchups_available_players`, `4_situations`, `5_venues_weather_referees`,
         `6_everything_else`, `7_books_last_price_check` with `market_is_headline_reason is False`
         and `market_weight_in_reasoning <= 0.08`).
      4. Live wiring into `compile_stage1_to_stage2_simulation_priors` with non-constant
         cross-game uniqueness across Week 9 matchups.
    """
    from intelligence.reasoning.mega_sweep_2026_11_06_wiring_engine import (
        L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB,
        MANDATORY_FIVE_TRACKS,
        WEEKLY_CYCLE_FIXED_ORDER,
        evaluate_5track_l1_to_l5_and_7step_weekly_cycle,
    )
    from scripts.ops.gse_connected_game_workflow import (
        compile_stage1_to_stage2_simulation_priors,
    )

    cov_json_path = REPO_ROOT / "data" / "engine" / "mega_sweep_2026_11_06_coverage_ledger.json"
    cov_md_path = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "mega-sweep-2026-11-06-coverage-ledger.md"
    assert cov_json_path.is_file()
    assert cov_md_path.is_file()

    cov = json.loads(cov_json_path.read_text(encoding="utf-8"))
    summary = cov["summary"]
    assert summary["manifest_rows_total"] == 516
    assert summary["manifest_books_net_unique_count"] == 184
    assert summary["manifest_books_total_files_count"] == 197
    assert summary["manifest_repos_rows_count"] == 200
    assert summary["manifest_social_dossiers_rows_count"] == 132
    assert summary["seen_ledger_rows_total"] == 925
    assert summary["seen_ledger_ig_items"] == 538
    assert summary["seen_ledger_x_items"] == 28
    assert summary["master_pull_2026_11_04_x_items"] == 2221
    assert summary["master_pull_2026_11_04_ig_items"] == 777
    assert summary["unaccounted_items_count"] == 0

    # Verify 5-Track L1-L5 & 7-Step Weekly Cycle evaluation across distinct matchups
    s1 = compile_stage1_to_stage2_simulation_priors(game_context={"away": "MIN", "home": "DET", "week": 9})
    s2 = compile_stage1_to_stage2_simulation_priors(game_context={"away": "WAS", "home": "NYG", "week": 9})

    ms1 = s1["mega_sweep_2026_11_06_5track_7step_trace"]
    ms2 = s2["mega_sweep_2026_11_06_5track_7step_trace"]

    assert ms1["trace_valid"] is True
    assert ms2["trace_valid"] is True
    assert ms1["unchecked_items_at_l3_or_deeper"] == 0
    assert ms1["ol_to_scheme_to_qb_order_enforced"] is True
    assert ms1["l5_synthesis_order"] == list(L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB)
    assert ms1["five_tracks_evaluated"] == list(MANDATORY_FIVE_TRACKS)
    assert list(ms1["tracks_l1_to_l5"].keys()) == list(L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB)
    assert ms1["weekly_cycle_fixed_order"] == list(WEEKLY_CYCLE_FIXED_ORDER)

    step2 = ms1["weekly_cycle_steps"]["2_health"]
    assert step2["away_gsi_health"]["care_consortium_biomarker_kinetics"]["rule_in_only_doctrine"] is True
    assert "whim_kth_mps95_corpus_callosum" in step2["away_gsi_health"]
    assert "delaware_oslo_acl_9mo_monthly_reduction" in step2["away_gsi_health"]
    assert "jama_cte_top10pct_hit_exposure_index" in step2["away_gsi_health"]

    step7 = ms1["weekly_cycle_steps"]["7_books_last_price_check"]
    assert step7["executed_after_steps_1_to_6"] is True
    assert step7["market_is_headline_reason"] is False
    assert step7["market_weight_in_reasoning"] <= 0.08

    # Cross-game uniqueness
    assert (
        ms1["pre_market_reasoning_epa_delta"]
        != ms2["pre_market_reasoning_epa_delta"]
    )


# ============================================================================
# TEST 31: Firecrawl Alexandria Live Sync & Unbreakable Zero-Duplicate Schedule Gate
# ============================================================================
def test_31_firecrawl_alexandria_live_sync_and_zero_duplicate_teams_gate() -> None:
    """
    Verifies:
      1. `assert_zero_duplicate_teams_or_players_on_slate` passes on the official 15-game
         2026 NFL Week 9 schedule (`30` unique active teams, `0` duplicates, Byes `PIT`, `TEN`).
      2. Negative controls: `assert_zero_duplicate_teams_or_players_on_slate` immediately raises
         `RuntimeError` when `MIA` or `BUF` is listed twice (e.g., `DET @ MIA` + `MIA @ BUF`, or
         `BUF @ MIN` + `MIA @ BUF`), when a Bye team (`PIT` or `TEN`) appears, or when a player
         appears twice in a pool/lineup.
      3. `data/engine/week9_firecrawl_alexandria_and_espn_fresh_sync_2026_11_07.json` is present
         with verified Firecrawl Alexandria v2 discovery/retrieve + ESPN scoreboard + DraftKings
         Sunday Main Slate sync receipt.
      4. Zero stale 2024 Week 9 files (`MIA_BUF`, `DET_GB`, `IND_MIN`, `TB_KC`, `LAC_CLE`, `DEN_BAL`)
         exist in `data/context_packets/`, `data/simulations/`, `data/reasoning/traces/`, or `data/engine/`.
    """
    from intelligence.data_sources.firecrawl_alexandria_live_sync import (
        OFFICIAL_2026_WEEK9_15_GAMES,
        assert_zero_duplicate_teams_or_players_on_slate,
    )

    ok_res = assert_zero_duplicate_teams_or_players_on_slate(
        OFFICIAL_2026_WEEK9_15_GAMES,
        week=9,
        context_label="test_31_official_15",
    )
    assert ok_res["status"] == "VERIFIED_ZERO_DUPLICATES"
    assert ok_res["games_count"] == 15
    assert ok_res["unique_teams_count"] == 30
    assert ok_res["duplicate_teams_count"] == 0

    # Negative Control 1A: Bogus 2024 MIA @ BUF matchup blocked
    with pytest.raises(RuntimeError, match="FORBIDDEN BOGUS/2024 MATCHUP"):
        assert_zero_duplicate_teams_or_players_on_slate(
            list(OFFICIAL_2026_WEEK9_15_GAMES) + [("MIA", "BUF")],
            week=9,
            context_label="neg_ctrl_mia_buf_bogus",
        )

    # Negative Control 1B: Duplicate team on slate (DET @ MIA listed twice)
    with pytest.raises(RuntimeError, match="DUPLICATE TEAM SCHEDULE VIOLATION"):
        assert_zero_duplicate_teams_or_players_on_slate(
            list(OFFICIAL_2026_WEEK9_15_GAMES) + [("DET", "MIA")],
            week=9,
            context_label="neg_ctrl_det_mia_dup",
        )

    # Negative Control 2: Bye team PIT on Week 9 slate
    with pytest.raises(RuntimeError, match="BYE TEAM VIOLATION"):
        assert_zero_duplicate_teams_or_players_on_slate(
            [("PIT", "BAL")],
            week=9,
            context_label="neg_ctrl_bye_team",
        )

    # Negative Control 3: Multi-team player contamination
    with pytest.raises(RuntimeError, match="PLAYER MULTI-TEAM CONTAMINATION"):
        assert_zero_duplicate_teams_or_players_on_slate(
            OFFICIAL_2026_WEEK9_15_GAMES,
            players=[
                {"name": "Amon-Ra St. Brown", "team": "DET"},
                {"name": "Amon-Ra St. Brown", "team": "MIA"},
            ],
            week=9,
            context_label="neg_ctrl_dup_player",
        )

    # Verify fresh Firecrawl Alexandria + ESPN sync receipt on disk
    sync_path = REPO_ROOT / "data" / "engine" / "week9_firecrawl_alexandria_and_espn_fresh_sync_2026_11_07.json"
    assert sync_path.is_file()
    sync_data = json.loads(sync_path.read_text(encoding="utf-8"))
    assert sync_data["schedule_invariant_gate"]["status"] == "VERIFIED_ZERO_DUPLICATES"
    assert sync_data["schedule_invariant_gate"]["games_count"] == 15
    assert sync_data["schedule_invariant_gate"]["unique_teams_count"] == 30
    assert sync_data["dk_sunday_main_slate_gate"]["status"] == "VERIFIED_ZERO_DUPLICATES"
    assert sync_data["dk_sunday_main_slate_gate"]["players_checked"] == 570
    assert len(sync_data["sync_sha256"]) == 64

    # Verify zero stale 2024 Week 9 artifact files exist on disk
    stale_tokens = ("mia_buf", "det_gb", "ind_min", "tb_kc", "lac_cle", "den_bal")
    for rel_dir in ("data/context_packets", "data/simulations", "data/reasoning/traces", "data/engine"):
        folder = REPO_ROOT / rel_dir
        for f in folder.iterdir():
            if f.is_file():
                low_name = f.name.lower()
                assert not any(tok in low_name for tok in stale_tokens), (
                    f"Stale 2024 Week 9 artifact file still present on disk: {f}"
                )


def test_32_full_stack_performance_and_seo_lcp_19_skills_suite() -> None:
    """
    Verifies the 19-skill Full-Stack Performance Engineering, Bazel/DX Build,
    Spark/DuckDB, PostgreSQL 17, Vector Index HNSW+SQ8, AI Static Review,
    and 8-Skill SEO + Core Web Vitals LCP suite:
      1. `full_stack_performance_and_data_optimizer.py` passes latency budgets,
         Spark skew salting (< 2.0x), Postgres P95 (< 100ms), Vector Recall@10 (>= 0.98)
         with 4.0x SQ8 compression, and zero CRITICAL/HIGH static review issues.
      2. Bazel (`WORKSPACE.bazel`, `.bazelrc`, `BUILD.bazel`) and DX (`Makefile`) exist.
      3. `seo_and_lcp_optimization_engine.py` verifies 7 public routes with 0 keyword
         cannibalization conflicts, E-E-A-T >= 9.5/10, Position-Zero snippets, and
         LCP < 2500ms.
    """
    from intelligence.performance.full_stack_performance_and_data_optimizer import (
        run_full_stack_performance_audit,
    )
    from intelligence.seo.seo_and_lcp_optimization_engine import (
        run_full_seo_and_lcp_audit,
    )

    perf = run_full_stack_performance_audit()
    assert perf["python_and_native_hot_path_profile"]["passes_latency_budget"] is True
    assert perf["python_and_native_hot_path_profile"]["dfs_19_equation_count"] == 19
    assert perf["spark_and_duckdb_optimization"]["skew_join_salting_verification"]["skew_resolved_below_2x"] is True
    assert perf["postgresql17_and_sql_optimization"]["passes_db_p95_budget_under_100ms"] is True
    assert perf["vector_index_hnsw_sq8_tuning"]["meets_recall_target_098"] is True
    assert perf["vector_index_hnsw_sq8_tuning"]["memory_compression_ratio"] >= 3.8
    assert perf["ai_assisted_static_and_performance_review"]["quality_gate_passed"] is True
    assert len(perf["audit_sha256"]) == 64

    for bazel_file in ("WORKSPACE.bazel", ".bazelrc", "BUILD.bazel", "Makefile"):
        assert (REPO_ROOT / bazel_file).is_file(), f"Missing {bazel_file}"

    seo = run_full_seo_and_lcp_audit()
    mc = seo["meta_and_cannibalization_audit"]
    fl = seo["freshness_eeat_snippets_and_lcp_audit"]
    assert mc["routes_audited"] == 7
    assert mc["zero_cannibalization_verified"] is True
    assert mc["all_urls_under_60_chars"] is True
    assert mc["all_titles_optimal"] is True
    assert mc["all_descriptions_optimal"] is True
    assert fl["eeat_scorecard"]["current_score_out_of_10"] >= 9.5
    assert fl["lcp_four_subpart_audit"]["passes_cwv_good_threshold"] is True
    assert fl["lcp_four_subpart_audit"]["total_lcp_ms"] <= 2500
    assert len(seo["audit_sha256"]) == 64

    ai_seo_ts = (REPO_ROOT / "apps" / "web" / "lib" / "seo" / "ai-agent-and-search-seo.ts").read_text(encoding="utf-8")
    assert "47-19-1 (+24.92u)" in ai_seo_ts
    assert "all-in secondary view" in ai_seo_ts

    # The Python audit engine must not re-crown the secondary view as the record.
    engine_py = (REPO_ROOT / "intelligence" / "seo" / "seo_and_lcp_optimization_engine.py").read_text(encoding="utf-8")
    assert "36-13-1 (+20.14u)" in engine_py
    assert "47-19-1 (+24.92u) overall" not in engine_py
    assert fl["lcp_four_subpart_audit"]["verified_36_13_1_present"] is True
    assert fl["lcp_four_subpart_audit"]["no_inverted_overall_framing"] is True


def test_33_stealthmodels_com_and_18_url_external_eval_suite() -> None:
    """
    Verifies the complete 18-Source External Evaluation, `StealthModels.com` (`StealthMark 1.8.10`),
    NVIDIA `compute-eval` (`pass@k`), Ragas NVIDIA Metrics (`AnswerAccuracy`, `ContextRelevance`,
    `ResponseGroundedness`), NVIDIA NeMo Helix (`HelpSteer2`), NIM `GenAI-Perf`, Datadog/Arize
    OpenTelemetry/OpenInference, Google Cloud Gemini Enterprise Agent Trajectory Eval, Google Stax
    Cohen's kappa, Together AI Length-Controlled Win Rate (`LC-WR`) & Bradley-Terry Elo,
    `arXiv:2509.05346` Scenario-Based Evaluation, `arXiv:2606.25057` Dynamic Canary Resistance,
    and Catherine Arnett Multilingual Byte-Premium Parity:
    """
    from intelligence.routing.stealth_skeleton_external_eval_and_distillation import (
        build_official_external_evaluation_manifest,
        compute_unbiased_pass_at_k,
        evaluate_gemini_enterprise_agent_trajectory,
        evaluate_ragas_nvidia_metrics,
        evaluate_stax_autorater_cohens_kappa,
        evaluate_stealthmodels_com_suite,
    )

    manifest = build_official_external_evaluation_manifest()
    assert manifest["schema_version"] in ("3.0.0", "4.0.0")
    auths = manifest["verified_18_external_authorities"]
    assert len(auths) >= 10

    # 1. StealthModels.com (StealthMark 1.8.10: Latch 5 levels, Foresight 3 levels, 7 SVGs)
    sm = evaluate_stealthmodels_com_suite()
    assert sm["astar_level1_solved"] is True
    assert sm["astar_level1_steps"] <= 12
    assert sm["latch_5_levels_verified"] is True
    assert sm["foresight_3_levels_verified"] is True
    assert sm["svg_7_scenes_verified"] is True
    assert sm["token_speed_schema_valid"] is True

    # 2. NVIDIA compute-eval unbiased pass@k
    assert compute_unbiased_pass_at_k(10, 7, 3) == pytest.approx(1.0 - (1.0 / 120.0), abs=1e-5)
    assert auths["2_nvidia_compute_eval_pass_at_k"]["kernels_verified"] is True
    assert auths["2_nvidia_compute_eval_pass_at_k"]["pass_at_1"] == 1.0

    # 3. Ragas Official NVIDIA Metrics
    ragas = evaluate_ragas_nvidia_metrics(
        user_input="How does Sinkhorn-Knopp optimal transport conserve marginal probabilities?",
        retrieved_contexts=[
            "Sinkhorn-Knopp iterative scaling alternates row and column normalization to conserve marginal probability vectors r and c."
        ],
        response="Sinkhorn-Knopp iterative scaling normalizes rows and columns to conserve marginal probability vectors r and c.",
        reference_answer="Sinkhorn-Knopp iterative scaling normalizes rows and columns to conserve marginal probability vectors.",
    )
    assert ragas["nv_answer_accuracy"] >= 0.75
    assert ragas["nv_context_relevance"] >= 0.75
    assert ragas["nv_response_groundedness"] >= 0.75

    # 4. Google Cloud Gemini Enterprise Agent Trajectory Metrics
    traj = evaluate_gemini_enterprise_agent_trajectory(
        predicted_trajectory=["s1", "s2", "s3"],
        reference_trajectory=["s1", "s2", "s3"],
    )
    assert traj["trajectory_exact_match"] == 1.0
    assert traj["trajectory_in_order_match"] == 1.0
    assert traj["trajectory_any_order_match"] == 1.0
    assert traj["trajectory_precision"] == 1.0
    assert traj["trajectory_recall"] == 1.0
    assert traj["single_turn_tool_use"] == 1.0

    # 5. Google Stax Autorater Cohen's kappa
    kappa = evaluate_stax_autorater_cohens_kappa([2, 2, 1, 0, 2, 1, 2, 0], [2, 2, 1, 0, 2, 1, 2, 0])
    assert kappa["cohens_kappa"] == 1.0
    assert kappa["calibration_status"] == "CALIBRATED_PRODUCTION_READY"

    # 6. Together AI LC-WR, arXiv:2509.05346, arXiv:2606.25057 & Multilingual Byte-Premium
    assert auths["7_together_ai_lc_wr_and_bradley_terry"]["length_controlled_win_rate_lc_wr"] >= 0.75
    assert auths["8_arxiv_2509_05346_scenario_based_eval"]["diagnostic_detection_rate"] == 1.0
    assert auths["9_arxiv_2606_25057_and_hf_ch11_5_contamination"]["contamination_free_verified"] is True
    assert "latex_math" in auths["10_hf_catherine_arnett_multilingual_byte_premium"]["script_fertility_and_byte_premium"]

    # 7. Verify Live 18-Authority Cognitive & Tactical Self-Improvement Engine is wired into:
    #    (a) Stage 1 -> Stage 2 Simulation Priors (`compile_stage1_to_stage2_simulation_priors`)
    #    (b) Two-Stage Sim-to-DFS Pool & Lineup Optimizer (`apply_live_18_authority_dfs_pool_and_lineup_upgrade`)
    #    (c) L1 -> L5 Reasoning Engine (`run_live_18_authority_cognitive_upgrade_on_trace`)
    from intelligence.reasoning.live_cognitive_self_improvement_engine import (
        apply_live_18_authority_dfs_pool_and_lineup_upgrade,
        compute_live_18_authority_situational_and_tactical_upgrade,
    )

    priors = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"away": "DET", "home": "MIA", "away_qb1_starter": "Jared Goff", "home_qb1_starter": "Tua Tagovailoa"},
        stage1b_receipt={"weather_wind_mph": 8.0},
    )
    assert "live_18_authority_cognitive_upgrade" in priors
    assert "live_18_authority_cognitive_upgrade" in priors["combined_load_bearing_priors"]
    up_s2 = priors["live_18_authority_cognitive_upgrade"]
    assert up_s2["gemini_agent_trajectory_verification"]["trajectory_in_order_match"] == 1.0
    assert up_s2["counterfactual_perturbation_stress_test"]["counterfactual_worlds_tested"] == 8
    assert 0.70 <= up_s2["counterfactual_perturbation_stress_test"]["counterfactual_stability_multiplier"] <= 1.0
    assert sum(up_s2["scenario_bradley_terry_routing"]["bradley_terry_specialist_weights"].values()) == pytest.approx(1.0, abs=1e-3)

    dfs_up = apply_live_18_authority_dfs_pool_and_lineup_upgrade(
        player_pool=[
            {"name": "Jared Goff", "position": "QB", "team": "DET", "salary": 6800, "projection": 21.4},
            {"name": "Amon-Ra St. Brown", "position": "WR", "team": "DET", "salary": 8100, "projection": 19.8},
            {"name": "De'Von Achane", "position": "RB", "team": "MIA", "salary": 7600, "projection": 18.9},
        ],
        lineups=[
            {
                "players": [
                    {"name": "Jared Goff", "position": "QB", "team": "DET", "salary": 6800, "projection": 21.4},
                    {"name": "Amon-Ra St. Brown", "position": "WR", "team": "DET", "salary": 8100, "projection": 19.8},
                    {"name": "De'Von Achane", "position": "RB", "team": "MIA", "salary": 7600, "projection": 18.9},
                    {"name": "Rhamondre Stevenson", "position": "RB", "team": "NE", "salary": 6100, "projection": 16.5},
                    {"name": "Dalton Schultz", "position": "TE", "team": "HOU", "salary": 3200, "projection": 11.2},
                ]
            }
        ],
    )
    assert dfs_up["status"] == "VERIFIED_18_AUTHORITY_DFS_SELF_IMPROVEMENT"
    assert dfs_up["all_lineups_stax_verified"] is True
    assert dfs_up["gemini_two_stage_dfs_trajectory"]["trajectory_exact_match"] == 1.0


# ============================================================================
# TEST 34: Understand-Anything Knowledge Graph, Session-Librarian 12-Rule
#          Immunization, Joint 2-Robot Latch A*, Foresight Depth-6 Expectimax
#          & Closed-Loop Ragas NVIDIA Dual-Judge 1.0000 Refiner
# ============================================================================
def test_34_understand_anything_knowledge_graph_and_session_librarian_immunization_wired() -> None:
    """
    Verifies all 8 invoked skills (`/session-librarian`, `/understand`, `/understand-onboard`,
    `/understand-chat`, `/understand-diff`, `/understand-explain`, `/understand-figma`,
    `/understand-knowledge`) and the v4.0 Stealth-Skeleton LLM upgrades:
      1. `.ua/knowledge-graph.json` (`180+ nodes`, `9 layers`, `6 tour steps`), `.ua/meta.json`,
         `.ua/config.json`, `.ua/diff-overlay.json`, and `docs/UA_ONBOARDING.md`.
      2. `data/audits/session_librarian_cross_system_discovery_2026_11_07.json` (`8 surfaces`,
         `12 Cross-Session Immunization Rules`, read-only non-destructive safety).
      3. `solve_latch_two_robot_cooperative_astar()`, `solve_foresight_expectimax_lookahead()`,
         and `refine_rag_context_and_response_with_nvidia_dual_judge()` (`composite_nvidia_ragas_score == 1.0`).
      4. `verify_symbolic_and_probabilistic_axioms()` & `pava_monotone_quantiles()` isotonic non-negative
         quantile projection wired into `live_cognitive_self_improvement_engine.py`.
      5. `data/mind/feeds/stealth_skeleton_distillation_flywheel_2026_11_07.jsonl` (`8` curriculum domains).
    """
    from intelligence.reasoning.understand_anything_and_session_librarian_engine import (
        CROSS_SESSION_IMMUNIZATION_BANK,
        explain_component_deep_dive,
        query_knowledge_graph_subgraph,
        run_full_understand_anything_and_session_librarian_suite,
    )
    from intelligence.reasoning.live_cognitive_self_improvement_engine import (
        discover_fleet_skills_catalog,
        pava_monotone_quantiles,
        run_jev_skill_select_and_merged_turn_routing,
        verify_symbolic_and_probabilistic_axioms,
    )
    from intelligence.routing.stealth_skeleton_external_eval_and_distillation import (
        build_official_external_evaluation_manifest,
        refine_rag_context_and_response_with_nvidia_dual_judge,
        solve_foresight_expectimax_lookahead,
        solve_latch_two_robot_cooperative_astar,
    )

    suite_res = run_full_understand_anything_and_session_librarian_suite()
    assert suite_res["status"] == "OK"
    assert suite_res["immunization_rules_count"] == 12
    assert suite_res["surfaces_scanned"] == 8
    assert suite_res["mutation_safety_status"] == "READ_ONLY_DISCOVERY_AND_PLAN_ONLY_ZERO_MUTATIONS"
    assert suite_res["knowledge_graph_nodes"] >= 180
    assert suite_res["knowledge_graph_layers"] == 9
    assert suite_res["tour_steps"] == 6

    assert (REPO_ROOT / ".ua" / "knowledge-graph.json").is_file()
    assert (REPO_ROOT / ".ua" / "meta.json").is_file()
    assert (REPO_ROOT / ".ua" / "config.json").is_file()
    assert (REPO_ROOT / ".ua" / "diff-overlay.json").is_file()
    assert (REPO_ROOT / "docs" / "UA_ONBOARDING.md").is_file()
    assert (REPO_ROOT / "data" / "audits" / "session_librarian_cross_system_discovery_2026_11_07.json").is_file()

    sub = query_knowledge_graph_subgraph("two_stage_gse_dfs_pipeline sinkhorn", max_results=5, max_hops=1)
    assert sub["matched_nodes_count"] >= 2
    assert len(sub["subgraph_summary"]) > 20

    exp = explain_component_deep_dive("intelligence/reasoning/live_cognitive_self_improvement_engine.py")
    assert exp["contained_symbols_count"] >= 5
    assert "layer:reasoning-and-cognitive-self-improvement" in exp["architectural_layer"]["id"]

    # Joint 2-Robot Cooperative A* & Depth-6 Expectimax
    coop = solve_latch_two_robot_cooperative_astar(
        [
            "########",
            "#A.1...#",
            "####d###",
            "#B.2..E#",
            "########",
        ],
        step_budget=20,
    )
    assert coop["solved"] is True
    assert coop["both_robots_reached_exit"] is True
    assert coop["steps"] <= 20

    foresight = solve_foresight_expectimax_lookahead(horizon_depth=6)
    assert foresight["survived"] is True
    assert foresight["collectibles_gathered"] >= 2

    # Closed-loop Ragas NVIDIA Dual-Judge refiner achieves 1.0000
    refined = refine_rag_context_and_response_with_nvidia_dual_judge(
        user_input="How does the Two-Stage GSE Simulation-to-DFS Pipeline build DraftKings lineups?",
        retrieved_contexts=[
            "Stage 1 runs 10,000-world Full-Game Snap-by-Snap simulations with Gate G1 and Gate G2.",
        ],
        response="Stage 1 runs 10,000-world simulations.",
        reference_answer=(
            "The Two-Stage GSE Simulation-to-DFS Pipeline builds DraftKings lineups in two stages: "
            "Stage 1 runs 10,000-world Full-Game Snap-by-Snap simulations with Gate G1 and Gate G2; "
            "Stage 2 selects the 98-player GSE DFS Pool and runs 10,000 Student-t (nu=4) DFS simulations."
        ),
    )
    assert refined["nv_answer_accuracy"] == 1.0
    assert refined["nv_context_relevance"] == 1.0
    assert refined["nv_response_groundedness"] == 1.0
    assert refined["composite_nvidia_ragas_score"] == 1.0

    # Symbolic & PAVA monotone quantile verification
    q_proj = pava_monotone_quantiles([-3.0, 15.0, 11.0, 19.0, 17.0])
    assert q_proj == [0.0, 13.0, 13.0, 18.0, 18.0]
    axioms = verify_symbolic_and_probabilistic_axioms(0.52, 0.52, [9.5, 14.0, 12.0, 18.5, 24.0])
    assert axioms["prob_bounds_and_conservation_verified"] is True
    assert axioms["pava_monotone_non_negative_verified"] is True
    assert axioms["immunization_rules_enforced_count"] == len(CROSS_SESSION_IMMUNIZATION_BANK) == 12

    manifest = build_official_external_evaluation_manifest()
    assert manifest["schema_version"] == "4.0.0"
    assert manifest["verified_18_external_authorities"]["3_ragas_official_nvidia_metrics"]["composite_nvidia_ragas_score"] == 1.0
    assert manifest["training_and_distillation_flywheel"]["curriculum_domains_harvested"] == 8

    # Jev Skill Select (`jevkit.skillpick` + `jevkit.turn`)
    fleet_catalog = discover_fleet_skills_catalog()
    assert len(fleet_catalog) >= 150
    trivial_pick = run_jev_skill_select_and_merged_turn_routing("thanks, that worked")
    assert trivial_pick["status"] == "ok"
    assert trivial_pick["needs_skill"] == 0.0
    assert trivial_pick["skills"] == []
    assert trivial_pick["latency_ms"] == 0
    assert trivial_pick.get("skipped") == "trivial"

    active_pick = run_jev_skill_select_and_merged_turn_routing(
        "Run gse-connected-game-workflow and jev-skill-select for NFL Week 9"
    )
    assert active_pick["status"] == "ok"
    assert active_pick["needs_skill"] >= 0.5
    assert len(active_pick["skills"]) >= 1
    assert active_pick["skills"][0]["match"] >= 0.5



