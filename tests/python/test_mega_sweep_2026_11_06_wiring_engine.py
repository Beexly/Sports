"""
Unit tests for `intelligence.coaching.mega_sweep_2026_11_06_wiring_engine`.
Covers:
  1. Existing 5-Track (`L1-L5`, `L4` adversary, `L5` synthesis order `OL -> scheme -> QB`)
     and 7-Step Weekly Cycle (`1_usage` .. `7_books_last_price_check`) + GSI Step 2 Health.
  2. Lightning Bolts RL & Self-Supervised Drive Embeddings:
     - `compute_double_dqn_fourth_down_q_values`
     - `compute_per_td_surprise_priority`
     - `compute_cpc_contrastive_drive_alignment`
  3. Karpathy `autoresearch` Single-Process Keep-or-Reset Gate:
     - `evaluate_autoresearch_keep_or_reset`
  4. Laptop Hardware Governor (`12th Gen Intel Core i7-1255U` + `Intel Iris Xe` + `32GB RAM`):
     - `evaluate_laptop_hardware_execution_plan`
  5. `gse-ml-service` 5-Model Bridge (`TDA`, `MPS`, `IRL`, `Friston Free Energy`, `ETKF`):
     - `compute_gse_ml_service_5_model_ensemble`
  6. `2026-11-06-AM.md` (`AM-01..AM-20`) Kernels (`Kats` BOCPD, `NOFX` 4-plan gate):
     - `compute_kats_bocpd_regime_changepoint`
     - `evaluate_nofx_four_plan_conjunction_gate`
  7. `30` Morning Sweep CSVs + `10` Innovation Kernels (`84d88751f`) with Stage-0
     Roster Verification & 100% Ingest-and-Learn Synthesis:
     - `evaluate_morning_sweep_30_csv_and_10_innovation_kernels`
"""

from __future__ import annotations

import math
from pathlib import Path

from intelligence.coaching.mega_sweep_2026_11_06_wiring_engine import (
    CPU_WORKER_CAP,
    IGPU_SHARED_MEMORY_CEILING_MB,
    L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB,
    MANDATORY_FIVE_TRACKS,
    MANDATORY_L5_SYNTHESIS_ORDER,
    MANDATORY_SEVEN_STEP_WEEKLY_CYCLE,
    WEEKLY_CYCLE_FIXED_ORDER,
    compute_cpc_contrastive_drive_alignment,
    compute_double_dqn_fourth_down_q_values,
    compute_gse_ml_service_5_model_ensemble,
    compute_gsi_step2_health_and_biomechanics,
    compute_kats_bocpd_regime_changepoint,
    compute_per_td_surprise_priority,
    evaluate_5track_l1_to_l5_and_7step_weekly_cycle,
    evaluate_autoresearch_keep_or_reset,
    evaluate_laptop_hardware_execution_plan,
    evaluate_morning_sweep_30_csv_and_10_innovation_kernels,
    evaluate_nofx_four_plan_conjunction_gate,
    load_mega_sweep_coverage_ledger,
)


def test_5track_and_7step_weekly_cycle_preserves_full_contract() -> None:
    trace = evaluate_5track_l1_to_l5_and_7step_weekly_cycle(
        {
            "away": "JAX",
            "home": "BAL",
            "away_off_epa": 0.02,
            "home_off_epa": 0.09,
            "away_def_epa": 0.01,
            "home_def_epa": -0.04,
            "away_ol_starters_out": 1,
            "home_ol_starters_out": 0,
            "spread_home": -6.5,
        }
    )
    assert trace["trace_valid"] is True
    assert trace["unchecked_items_at_l3_or_deeper"] == 0
    assert tuple(trace["five_tracks_evaluated"]) == MANDATORY_FIVE_TRACKS
    assert tuple(trace["l5_synthesis_order"]) == MANDATORY_L5_SYNTHESIS_ORDER
    assert L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB[0] == "3_offensive_line"
    assert L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB[1] == "5_scheme_matchup"
    assert trace["ol_to_scheme_to_qb_order_enforced"] is True
    assert tuple(trace["weekly_cycle_fixed_order"]) == MANDATORY_SEVEN_STEP_WEEKLY_CYCLE
    assert WEEKLY_CYCLE_FIXED_ORDER[-1] == "7_books_last_price_check"
    assert trace["weekly_cycle_steps"]["7_books_last_price_check"]["market_is_headline_reason"] is False
    assert trace["weekly_cycle_steps"]["7_books_last_price_check"]["market_weight_in_reasoning"] == 0.06


def test_gsi_step2_health_and_coverage_ledger() -> None:
    health = compute_gsi_step2_health_and_biomechanics(
        game_ctx={},
        team_abbr="MIA",
        opponent_abbr="BUF",
        is_home=False,
        ol_starters_out=2,
        skill_injuries_count=2,
        qb_tier="STARTER",
        is_turf=True,
        rest_diff_days=-3.0,
        dc_blitz_rate=0.31,
        sack_rate_allowed=0.075,
    )
    assert health["whim_kth_mps95_corpus_callosum"] > 0.0
    assert health["shaake_sign_ppv_football"] == 0.92
    assert health["care_consortium_biomarker_kinetics"]["biomarker_negative_true_concussion_rate"] == 0.37
    assert health["rupture_report_turf_hazard_mult"] == 1.24

    ledger = load_mega_sweep_coverage_ledger()
    assert isinstance(ledger, dict)


def test_double_dqn_fourth_down_decouples_selection_from_evaluation() -> None:
    res = compute_double_dqn_fourth_down_q_values(
        online_q_current={"go_for_it": 1.90, "field_goal": 1.50, "punt": 0.60},
        online_q_next={"go_for_it": 2.30, "field_goal": 1.80, "punt": 0.70},
        target_q_next={"go_for_it": 2.00, "field_goal": 2.45, "punt": 0.75},
        immediate_rewards={"go_for_it": 0.45, "field_goal": 0.25, "punt": -0.05},
        gamma=0.98,
        done=False,
    )
    assert res["action_selection_decoupled_from_evaluation"] is True
    # Online network selects go_for_it (2.30 > 1.80 > 0.70)
    assert res["greedy_next_action"] == "go_for_it"
    # Target network evaluates go_for_it at 2.00 instead of naive max (2.45 on field_goal)
    assert math.isclose(res["target_evaluated_q_next"], 2.00, rel_tol=1e-6)
    assert math.isclose(res["naive_max_target_q_next"], 2.45, rel_tol=1e-6)
    assert math.isclose(res["overestimation_bias_removed"], 0.45, rel_tol=1e-6)
    assert res["recommended_action"] == "go_for_it"


def test_per_td_surprise_priority_and_is_weights() -> None:
    res = compute_per_td_surprise_priority(
        td_errors=[1.20, -0.30, 0.05, -2.10],
        alpha=0.6,
        beta=0.4,
        epsilon=1e-5,
    )
    assert res["count"] == 4
    assert math.isclose(sum(res["sampling_probabilities"]), 1.0, abs_tol=1e-5)
    # Largest |delta_i| = 2.10 at index 3 must receive highest priority & lowest IS weight
    assert res["raw_priorities"][3] == max(res["raw_priorities"])
    assert res["normalized_is_weights"][2] == 1.0
    assert all(0.0 < w <= 1.0 for w in res["normalized_is_weights"])


def test_cpc_contrastive_drive_alignment_and_regularized_glm() -> None:
    res = compute_cpc_contrastive_drive_alignment(
        current_drive_vector=[0.74, 0.49, 0.63, 0.32, 0.57],
        temperature=0.12,
        l1_lambda=0.005,
        l2_lambda=0.015,
    )
    assert res["cosine_similarity_positive_mean"] > res["cosine_similarity_negative_mean"]
    assert 0.5 < res["contrastive_alignment_prob"] <= 1.0
    assert res["infonce_loss"] >= 0.0
    assert 0.0 < res["glm_logistic_prob"] < 1.0
    assert 0.0 < res["regularized_drive_td_prob"] < 1.0


def test_autoresearch_keep_or_reset_gate() -> None:
    keep_res = evaluate_autoresearch_keep_or_reset(
        candidate_brier=0.1880,
        baseline_brier=0.1890,  # delta_brier = -0.0010 < -0.0005
        candidate_ece=0.0215,
        baseline_ece=0.0210,  # delta_ece = +0.0005 <= 0.0010
        complexity_delta=0.0,
    )
    assert keep_res["decision"] == "keep"
    assert keep_res["keep_mutation"] is True
    assert keep_res["trigger_git_reset"] is False

    reset_brier = evaluate_autoresearch_keep_or_reset(
        candidate_brier=0.1888,
        baseline_brier=0.1890,  # delta_brier = -0.0002 (not < -0.0005)
        candidate_ece=0.0205,
        baseline_ece=0.0210,
        complexity_delta=0.0,
    )
    assert reset_brier["decision"] == "reset"
    assert reset_brier["keep_mutation"] is False
    assert reset_brier["trigger_git_reset"] is True

    reset_ece = evaluate_autoresearch_keep_or_reset(
        candidate_brier=0.1870,
        baseline_brier=0.1890,
        candidate_ece=0.0235,
        baseline_ece=0.0210,  # delta_ece = +0.0025 > 0.0010
        complexity_delta=0.1,
    )
    assert reset_ece["decision"] == "reset"
    assert reset_ece["keep_mutation"] is False


def test_laptop_hardware_governor_enforces_caps_and_zero_model_drop() -> None:
    plan = evaluate_laptop_hardware_execution_plan(
        requested_workers=16,
        requested_igpu_memory_mb=8192,
        wind_mph=18.0,
    )
    assert plan["cpu_worker_cap"] == CPU_WORKER_CAP == 6
    assert plan["enforced_cpu_workers"] == 6
    assert plan["mkl_num_threads"] == 6
    assert plan["igpu_shared_memory_ceiling_mb"] == IGPU_SHARED_MEMORY_CEILING_MB == 4096
    assert plan["allocated_igpu_memory_mb"] <= 4096
    assert plan["within_igpu_4096mb_ceiling"] is True
    assert plan["backends"]["DirectML"]["enabled"] is True
    assert plan["backends"]["Kompute"]["enabled"] is True
    assert plan["backends"]["FluidX3D"]["precision"] == "FP16S"
    assert plan["backends"]["Taichi"]["runtime"] == "ti.vulkan"
    assert plan["backends"]["AirLLM"]["enabled"] is True
    assert plan["local_cuda_docker_vllm_blocked"] is True
    assert plan["heavy_workload_route"] == "tier_c_cloud_offload"
    assert plan["cloud_or_serverless_execution"] is True
    assert plan["zero_model_drop_or_compression"] is True
    assert plan["models_executed_pct"] == 100.0


def test_gse_ml_service_5_model_ensemble() -> None:
    res = compute_gse_ml_service_5_model_ensemble()
    assert res["all_5_models_active"] is True
    assert res["tda_persistence_entropy"] > 0.0
    assert 0.0 < res["tda_normalized_entropy"] <= 1.0
    assert res["mps_schmidt_entanglement"] > 0.0
    assert res["mps_effective_bond_dimension"] > 1.0
    assert isinstance(res["irl_coaching_reward_recovery"], float)
    assert isinstance(res["friston_variational_free_energy"], float)
    assert res["friston_kl_divergence"] >= 0.0
    assert res["etkf_kalman_innovation"] > 0.0
    assert len(res["etkf_posterior_state"]) == 3


def test_kats_bocpd_and_nofx_four_plan_gate() -> None:
    bocpd = compute_kats_bocpd_regime_changepoint(
        series=[0.48, 0.50, 0.49, 0.51, 0.84, 0.86, 0.85, 0.87],
        hazard_rate=0.12,
        threshold=0.50,
    )
    assert bocpd["regime_shift_detected"] is True
    assert bocpd["most_likely_changepoint_index"] == 4
    assert bocpd["post_regime_mean"] > bocpd["pre_regime_mean"]

    gate_pass = evaluate_nofx_four_plan_conjunction_gate(
        situational_edge_epa=0.032,
        devig_clv=0.018,
        conformal_interval_width=0.14,
        current_drawdown=0.03,
        proposed_exposure_units=1.0,
    )
    assert gate_pass["publish_allowed"] is True
    assert gate_pass["decision"] == "PUBLISH"
    assert gate_pass["plans_passed_count"] == 4

    gate_fail = evaluate_nofx_four_plan_conjunction_gate(
        situational_edge_epa=0.032,
        devig_clv=0.004,  # fails Plan 2 De-Vig CLV
        conformal_interval_width=0.14,
        current_drawdown=0.03,
        proposed_exposure_units=1.0,
    )
    assert gate_fail["publish_allowed"] is False
    assert gate_fail["decision"] == "PASS"
    assert gate_fail["plan_verdicts"]["Plan_2_DeVig_CLV"] is False


def test_morning_sweep_30_csv_and_10_innovation_kernels_and_zero_shortcuts() -> None:
    res = evaluate_morning_sweep_30_csv_and_10_innovation_kernels(
        roster_verified=True,
        player_gp=6,
        team_gp=9,
    )
    assert res["stage0_roster_verified"] is True
    assert res["active_player_gp_used"] == 6
    assert math.isclose(res["per_active_game_normalizer"], 1.0 / 6.0, rel_tol=1e-5)
    assert res["internal_only_ngs_Protected"] is True
    assert res["internal_only_ngs_protected"] is True
    assert res["raw_xy_coordinates_exported_publicly"] is False
    assert res["ngs_and_commercial_features_active_in_reasoning"] is True
    assert res["all_30_csvs_ingested"] is True
    assert res["ingested_csv_count"] == 30
    assert res["innovation_kernels_count"] == 10

    expected_kernels = {
        "sub_diffusion_fractional_ou",
        "rough_heston_vol_of_vol",
        "navier_stokes_wind_drag",
        "fisher_rao_geodesic_distance",
        "marchenko_pastur_covariance_denoising",
        "nhpp_sack_hazard",
        "epidemic_fatigue_contagion",
        "schnakenberg_play_call_limit_cycle",
        "ising_defensive_phase_transition",
        "optimal_stopping_timeout_boundary",
    }
    assert set(res["innovation_kernels_10"].keys()) == expected_kernels
    for k_name, k_val in res["innovation_kernels_10"].items():
        assert isinstance(k_val, float), f"{k_name} must be float"
        assert math.isfinite(k_val), f"{k_name} must be finite"

    # Verify source file contains zero `.normal(` and zero `tanh` templates
    engine_path = (
        Path(__file__).resolve().parents[2]
        / "intelligence"
        / "coaching"
        / "mega_sweep_2026_11_06_wiring_engine.py"
    )
    src_text = engine_path.read_text(encoding="utf-8")
    assert ".normal(" not in src_text
    assert "tanh(" not in src_text
