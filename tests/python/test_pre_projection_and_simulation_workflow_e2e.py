"""End-to-End Verification Suite for Pre-Projection & 10,000-World × 175-Snap Simulation Workflows.

Verifies that:
1. `universal_nfl_metric_and_situational_engine.py` (6 Universal Metric Suites + 6 Deep Non-Stationary Kernels),
2. `mega_sweep_2026_11_06_wiring_engine.py` (Double-DQN, PER-DQN, CPC-SimCLR, autoresearch, Laptop Hardware Governor,
   gse-ml-service 5 models, Kats BOCPD, NOFX 4-plan gate, 30 CSVs + 10 Innovation Kernels),
3. `pinecone_hybrid_corpus_index.py` (Hybrid dense + BM25 sparse + RRF + cross-encoder rerank), and
4. `posthog_cloud_context_layer.py` (Cloud feature flags + HogQL warehouse SQL + error tracking + LLM analytics)
are directly wired into:
- `scripts/ops/gse_coach_mind_simulator.py` (`compute_pre_projection_universal_and_deep_non_stationary_priors`,
  `simulate_matchup_pbp`, and `simulate_full_game`), and
- `scripts/ops/gse_connected_game_workflow.py` (`compile_stage1_to_stage2_simulation_priors`).
"""

from __future__ import annotations

import time
import numpy as np
import pytest

from scripts.ops.gse_coach_mind_simulator import (
    compute_pre_projection_universal_and_deep_non_stationary_priors,
    load_sealed_object_readonly,
    simulate_full_game,
    simulate_matchup_pbp,
)
from scripts.ops.gse_connected_game_workflow import (
    compile_stage1_to_stage2_simulation_priors,
)


def test_pre_projection_universal_and_deep_non_stationary_priors_full_stack() -> None:
    priors = compute_pre_projection_universal_and_deep_non_stationary_priors(
        "JAX",
        "BAL",
        context={
            "away_off_epa_base": 0.048,
            "home_off_epa_base": -0.195,
            "away_proe": 0.024,
            "home_proe": -0.060,
            "away_qb_tier": "QB1",
            "home_qb_tier": "EMERGENCY_QB3_UDFA",
            "wind_mph": 11.0,
            "temp_f": 54.0,
            "is_indoor": False,
            "posted_home_spread": 2.5,
            "posted_total": 43.5,
            "open_home_spread": -6.5,
            "away_ol_starters_out": 0,
            "home_ol_starters_out": 2,
            "away_dc_blitz_rate": 0.309,
            "home_dc_blitz_rate": 0.265,
            "away_dc_man_rate": 0.31,
            "home_dc_man_rate": 0.28,
        },
    )

    assert priors["away_team"] == "JAX"
    assert priors["home_team"] == "BAL"

    # Verify all 6 Universal Metric Suites and all 6 Deep Non-Stationary Kernels for both away & home
    for side_key in ("away_universal_360", "home_universal_360"):
        dossier = priors[side_key]
        for suite_key in ("qb", "receiving", "rushing", "trench", "defense_idp", "situational"):
            assert suite_key in dossier, f"Missing suite {suite_key} in {side_key}"
        deep = dossier["deep_non_stationary_kernels"]
        for kernel_key in (
            "causal_deconfounded_skill",
            "qb_trauma_and_disguise_hysteresis",
            "trench_tut_fatigue_and_weak_link",
            "coordinator_script_cliff_and_tendency_trap",
            "referee_and_market_reflexivity",
            "gsi_sports_medicine_and_coupled_5api",
        ):
            assert kernel_key in deep, f"Missing deep kernel {kernel_key} in {side_key}"

    # Verify Mega-Sweep 2026-11-06 full pipeline outputs
    ms = priors["mega_sweep_pipeline"]
    assert ms["all_100_percent_models_active"] is True
    assert ms["zero_compression_verified"] is True
    assert "double_dqn_fourth_down" in ms
    assert "per_td_surprise" in ms
    assert "cpc_drive_alignment" in ms
    assert "autoresearch_hyperparam" in ms
    assert "laptop_governor" in ms
    assert "ml_service_5_models" in ms
    assert "kats_bocpd" in ms
    assert "nofx_4_plan_gate" in ms
    assert "morning_sweep_30_csv_and_10_kernels" in ms
    assert ms["morning_sweep_30_csv_and_10_kernels"]["ngs_and_commercial_100_percent_ingested"] is True

    # Verify Pinecone hybrid corpus & PostHog cloud context layers
    assert priors["pinecone_hybrid_corpus"]["hybrid_pipeline_verified"] is True
    assert priors["posthog_cloud_context"]["all_4_pillars_verified"] is True

    # Verify Simulation Trajectory Conditioners
    cond = priors["simulation_trajectory_conditioners"]
    assert cond["away_scripted_15_epa_boost"] > 0.0
    assert cond["home_post_script_15_epa_cliff"] <= 0.0
    assert cond["home_tut_fatigue_q3_q4_sack_mult"] >= 1.0
    assert cond["home_qb_trauma_twp_hazard_mult"] >= 1.0
    assert 0.0 <= cond["double_dqn_go_for_it_4th_short_prob"] <= 1.0


def test_non_stationary_trauma_and_tut_fatigue_scale_monotonically_with_trench_duress() -> None:
    clean_priors = compute_pre_projection_universal_and_deep_non_stationary_priors(
        "JAX",
        "BAL",
        context={
            "home_qb_tier": "QB1",
            "home_ol_starters_out": 0,
            "away_dc_blitz_rate": 0.20,
            "away_dc_man_rate": 0.22,
        },
    )
    duress_priors = compute_pre_projection_universal_and_deep_non_stationary_priors(
        "JAX",
        "BAL",
        context={
            "home_qb_tier": "EMERGENCY_QB3_UDFA",
            "home_ol_starters_out": 3,
            "away_dc_blitz_rate": 0.42,
            "away_dc_man_rate": 0.40,
        },
    )

    clean_cond = clean_priors["simulation_trajectory_conditioners"]
    duress_cond = duress_priors["simulation_trajectory_conditioners"]

    assert duress_cond["home_tut_fatigue_q3_q4_sack_mult"] > clean_cond["home_tut_fatigue_q3_q4_sack_mult"]
    assert duress_cond["home_qb_trauma_twp_hazard_mult"] > clean_cond["home_qb_trauma_twp_hazard_mult"]
    assert duress_cond["home_qb_trauma_comp_decay_per_hit"] > clean_cond["home_qb_trauma_comp_decay_per_hit"]


def test_simulate_matchup_pbp_conditioned_10k_worlds_175_snaps_and_speed() -> None:
    sealed_state, expected_hash = load_sealed_object_readonly()
    w1_w7_override = {
        "wind_mph": 11.0,
        "temp_f": 54.0,
        "is_indoor": False,
        "posted_home_spread": 2.5,
        "posted_total": 43.5,
        "away": {"qb_tier": "QB1", "off_epa_override": 0.048},
        "home": {"qb_tier": "EMERGENCY_QB3_UDFA", "off_epa_override": -0.246, "sack_rate_mult": 1.48},
    }

    # Warm-up run
    _ = simulate_matchup_pbp(
        "JAX",
        "BAL",
        [],
        ["EMERGENCY_QB3_UDFA", "OL"],
        sealed_state,
        expected_hash,
        n_sims=1000,
        seed=20261106,
        w1_w7_override=w1_w7_override,
        return_vectors=True,
        posted_home_spread=2.5,
        posted_total=43.5,
    )

    # Timed 10,000-world × 175-snap (1,750,000 snaps) run
    t0 = time.perf_counter()
    sim = simulate_full_game(
        "JAX",
        "BAL",
        [],
        ["EMERGENCY_QB3_UDFA", "OL"],
        sealed_state,
        expected_hash,
        n_sims=10000,
        seed=20261106,
        w1_w7_override=w1_w7_override,
        return_vectors=True,
        posted_home_spread=2.5,
        posted_total=43.5,
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    assert sim["matchup"] == "JAX @ BAL"
    assert sim["coachMindsetHash"] == expected_hash
    assert "pre_projection_universal_and_deep_priors" in sim
    assert sim["pre_projection_universal_and_deep_priors"]["simulation_trajectory_conditioners"]["wired_into_10k_world_175_snap_simulation"] is True

    vecs = sim["vectors"]
    assert isinstance(vecs["home_score"], np.ndarray)
    assert vecs["home_score"].shape == (10000,)
    assert vecs["away_score"].shape == (10000,)
    assert vecs["home_wr1_yds"].shape == (10000,)
    assert vecs["away_wr1_yds"].shape == (10000,)
    assert elapsed_ms < 3500.0, f"Expected vectorized 10k×175 simulation < 3500ms, got {elapsed_ms:.1f}ms"


def test_compile_stage1_to_stage2_simulation_priors_couples_pre_projection_priors() -> None:
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
    assert "pre_projection_universal_and_deep_priors" in priors
    assert "pre_projection_universal_and_deep_priors" in priors["combined_load_bearing_priors"]
    assert "pre_projection_universal_and_deep_priors" in priors["restored_ws1_python_receipt"]

    pp = priors["pre_projection_universal_and_deep_priors"]
    assert pp["away_team"] == "JAX"
    assert pp["home_team"] == "BAL"
    assert pp["mega_sweep_pipeline"]["all_100_percent_models_active"] is True
    assert "simulation_trajectory_conditioners" in pp
