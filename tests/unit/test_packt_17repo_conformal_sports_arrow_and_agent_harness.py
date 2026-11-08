#!/usr/bin/env python3
"""
Unit & Integration Tests for the 95-Repository PacktPublishing + 5-PDF Clean-Room Engine
(`intelligence/conformal_and_arrow_memory/packt_17repo_conformal_sports_arrow_and_agent_harness_engine.py`)
and its integration with `intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py`.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from intelligence.conformal_and_arrow_memory.packt_17repo_conformal_sports_arrow_and_agent_harness_engine import (
    CLINICAL_HEALTHCARE_WORKFLOWS_PERMITTED,
    GSI_HEALTHCARE_REPO_SLUG,
    GSI_KGRAPH_HEALTHCARE_SUBTREE_SLUG,
    LOCAL_5_PDFS_CATALOG,
    PACKT_73_UNIQUE_REPOSITORIES_CATALOG,
    PACKT_95_UNIQUE_REPOSITORIES_CATALOG,
    PACKT_WAVE1_16_REPOS,
    PACKT_WAVE2_17_REPOS,
    PACKT_WAVE3_40_REPOS,
    PACKT_WAVE4_22_REPOS,
    SPORTS_SPINE_IMPORT_PERMITTED,
    ActionRisk,
    AgenticProgrammingAndSecureHarnessEngine,
    AntiOverfittingAndDataHygieneEngine,
    AppliedConformalPredictionEngine,
    BayesianCausalAndNetworkScienceEngine,
    DataClass,
    SimulationVarianceReductionFEMGraphRAGAndDRLEngine,
    SpatialStadiumGISAndWindVectorEngine,
    SportsAnalyticsAndEnsemblePredictionEngine,
    TrustTier,
    ZeroCopyArrowAndArenaMemoryEngine,
    run_packt_95repo_conformal_sports_arrow_bayesian_simulation_and_harness_suite,
    verify_local_pdfs_and_95_quarantine_manifest,
)
from intelligence.dfs.dk_200pt_situational_dfs_and_projection_engine import (
    run_complete_omniverse_reasoning_simulation_projection_and_200pt_dfs_suite,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_all_95_unique_packt_repos_and_5_pdfs_cataloged_and_quarantined() -> None:
    """Verifies Waves 1 (16), 2 (17), 3 (40), and 4 (22) total 95 unique Packt repos + 5 PDFs."""
    assert len(PACKT_WAVE1_16_REPOS) == 16
    assert len(PACKT_WAVE2_17_REPOS) == 17
    assert len(PACKT_WAVE3_40_REPOS) == 40
    assert len(PACKT_WAVE4_22_REPOS) == 22
    assert len(PACKT_73_UNIQUE_REPOSITORIES_CATALOG) == 73
    assert len(PACKT_95_UNIQUE_REPOSITORIES_CATALOG) == 95
    assert len(set(PACKT_95_UNIQUE_REPOSITORIES_CATALOG)) == 95
    assert len(LOCAL_5_PDFS_CATALOG) == 5

    # Verify GSI healthcare quarantine flags
    assert CLINICAL_HEALTHCARE_WORKFLOWS_PERMITTED is False
    assert SPORTS_SPINE_IMPORT_PERMITTED is False
    assert GSI_HEALTHCARE_REPO_SLUG in PACKT_WAVE2_17_REPOS
    assert GSI_KGRAPH_HEALTHCARE_SUBTREE_SLUG in PACKT_WAVE4_22_REPOS

    check = verify_local_pdfs_and_95_quarantine_manifest()
    assert check["total_unique_packt_repos"] == 95
    assert check["total_local_pdfs"] == 5
    assert check["all_95_registered_in_quarantine_manifest"] is True
    assert check["all_95_install_permitted_in_prod_false"] is True
    assert check["healthcare_repo_gsi_quarantined"] is True
    for pdf_entry in check["pdfs_verified"]:
        assert pdf_entry["valid_pdf_header"] is True
        assert len(pdf_entry["sha256"]) == 64


def test_pillar1_applied_conformal_prediction_and_edge_cases() -> None:
    """Tests Split ICP, Weighted CQR, Mondrian 7-category thresholds, Venn-Abers, and EnbPI/ACI."""
    with pytest.raises(ValueError, match="cannot be empty"):
        AppliedConformalPredictionEngine.split_inductive_conformal_interval([], [], [250.0])

    with pytest.raises(ValueError, match="cannot be empty"):
        AppliedConformalPredictionEngine.conformalized_quantile_regression_cqr([], [], [], [200.0], [260.0])

    cal_y = [240.0, 255.0, 270.0, 230.0, 285.0, 260.0, 250.0, 275.0, 265.0, 245.0]
    cal_hat = [245.0, 250.0, 265.0, 238.0, 278.0, 258.0, 252.0, 270.0, 262.0, 248.0]
    icp = AppliedConformalPredictionEngine.split_inductive_conformal_interval(
        cal_y, cal_hat, [262.0, 274.0], alpha=0.10
    )
    assert icp["conformal_radius_q_hat"] > 0.0
    assert len(icp["lower_bounds"]) == 2
    assert icp["lower_bounds"][0] < 262.0 < icp["upper_bounds"][0]

    cqr = AppliedConformalPredictionEngine.conformalized_quantile_regression_cqr(
        cal_true=cal_y,
        cal_q_lo=[v - 8.0 for v in cal_hat],
        cal_q_hi=[v + 8.0 for v in cal_hat],
        test_q_lo=[60.0, 240.0],
        test_q_hi=[85.0, 285.0],
        alpha=0.10,
        recency_decay_rho=0.95,
    )
    assert cqr["conformal_upper_bounds"][0] > cqr["conformal_lower_bounds"][0]

    va = AppliedConformalPredictionEngine.inductive_venn_abers_multiprobability(
        cal_scores=[0.30, 0.40, 0.48, 0.52, 0.58, 0.64, 0.71, 0.80],
        cal_labels=[0, 0, 0, 1, 0, 1, 1, 1],
        test_score=0.61,
    )
    assert 0.0 < va["p0_lower"] <= va["venn_abers_prob"] <= va["p1_upper"] <= 1.0

    # Edge cases: tied calibration scores, test_score equal to calibration score, all-0 and all-1 labels
    va_tie = AppliedConformalPredictionEngine.inductive_venn_abers_multiprobability(
        cal_scores=[0.10, 0.50, 0.50, 0.90],
        cal_labels=[0, 1, 0, 0],
        test_score=0.50,
    )
    assert abs(va_tie["p0_lower"] - 0.25) < 1e-4
    assert abs(va_tie["p1_upper"] - 0.50) < 1e-4
    assert va_tie["p0_lower"] <= va_tie["venn_abers_prob"] <= va_tie["p1_upper"]

    va_all_zero = AppliedConformalPredictionEngine.inductive_venn_abers_multiprobability(
        cal_scores=[0.20, 0.40, 0.60, 0.80],
        cal_labels=[0, 0, 0, 0],
        test_score=0.50,
    )
    assert va_all_zero["p0_lower"] == 0.0
    assert 0.0 <= va_all_zero["venn_abers_prob"] <= va_all_zero["p1_upper"] <= 1.0

    va_all_one = AppliedConformalPredictionEngine.inductive_venn_abers_multiprobability(
        cal_scores=[0.20, 0.40, 0.60, 0.80],
        cal_labels=[1, 1, 1, 1],
        test_score=0.50,
    )
    assert va_all_one["p1_upper"] == 1.0
    assert 0.0 <= va_all_one["p0_lower"] <= va_all_one["venn_abers_prob"] <= 1.0

    with pytest.raises(ValueError, match="cannot be empty"):
        AppliedConformalPredictionEngine.inductive_venn_abers_multiprobability([], [], 0.5)

    aci = AppliedConformalPredictionEngine.adaptive_conformal_enbpi_aci_step(
        rolling_residuals=[4.0, 6.0, 5.5, 8.0, 7.2, 6.8],
        realized_errors=[1, 1, 1, 0, 1, 1],  # High error rate -> alpha_t must tighten (decrease)
        target_alpha=0.10,
        gamma_step=0.02,
    )
    assert aci["updated_alpha_t"] < 0.10


def test_pillar2_sports_analytics_and_superlearner_simplex() -> None:
    """Tests Pythagorean expectation (gamma=2.37), Bradley-Terry, Dixon-Coles, and SuperLearner."""
    res = SportsAnalyticsAndEnsemblePredictionEngine.evaluate_pythagorean_bradley_terry_and_dixon_coles(
        home_pf_per_g=28.5,
        home_pa_per_g=19.2,
        away_pf_per_g=21.4,
        away_pa_per_g=24.0,
        home_elo=1610.0,
        away_elo=1495.0,
    )
    assert res["pythagorean_home_wp"] > res["pythagorean_away_wp"]
    assert 0.5 < res["bradley_terry_log5_wp"] < 0.95
    assert 0.5 < res["blended_home_win_prob"] < 0.95

    X_oof = np.array([[0.70, 0.30], [0.65, 0.35], [0.25, 0.75], [0.80, 0.20]], dtype=np.float64)
    y_oof = np.array([0.72, 0.64, 0.24, 0.81], dtype=np.float64)
    sl = SportsAnalyticsAndEnsemblePredictionEngine.fit_simplex_superlearner_stacking(X_oof, y_oof)
    assert sl["weights_sum_to_one"] is True
    assert sl["optimal_simplex_weights"][0] > sl["optimal_simplex_weights"][1]
    assert sl["stacking_beats_or_ties_best_single"] is True

    # Collinear base learners stress test: Frank-Wolfe must still beat or tie best single model
    X_col = np.array(
        [
            [0.52, 0.53, 0.90],
            [0.48, 0.49, 0.10],
            [0.61, 0.60, 0.85],
            [0.39, 0.40, 0.15],
        ],
        dtype=np.float64,
    )
    y_col = X_col[:, 0].copy()
    sl_col = SportsAnalyticsAndEnsemblePredictionEngine.fit_simplex_superlearner_stacking(X_col, y_col)
    assert sl_col["weights_sum_to_one"] is True
    assert sl_col["stacking_beats_or_ties_best_single"] is True


def test_pillar3_spatial_stadium_gis_and_barometric_air_density() -> None:
    """Tests Denver altitude air-density carry boost vs Buffalo crosswind vs indoor dome."""
    den = SpatialStadiumGISAndWindVectorEngine.evaluate_stadium_gis_wind_and_air_density(
        "DEN", wind_speed_mph=8.0, wind_from_bearing_deg=90.0, temperature_c=15.0
    )
    buf = SpatialStadiumGISAndWindVectorEngine.evaluate_stadium_gis_wind_and_air_density(
        "BUF", wind_speed_mph=25.0, wind_from_bearing_deg=208.0, temperature_c=2.0
    )
    det = SpatialStadiumGISAndWindVectorEngine.evaluate_stadium_gis_wind_and_air_density(
        "DET", wind_speed_mph=30.0, wind_from_bearing_deg=180.0, temperature_c=21.0
    )
    assert den["air_density_kg_m3"] < 1.08  # High altitude thin air
    assert den["aerodynamic_drag_reduction_ratio"] > 0.12
    assert buf["crosswind_shear_mph"] > 20.0
    assert buf["deep_pass_cpoe_delta"] < 0.0
    assert det["crosswind_shear_mph"] == 0.0
    assert det["axial_wind_mph"] == 0.0


def test_pillar4_zero_copy_apache_arrow_and_64byte_arena() -> None:
    """Tests 64-byte cache-line alignment, columnar Fortran layout, and zero-copy buffer sharing."""
    view, meta = ZeroCopyArrowAndArenaMemoryEngine.allocate_64byte_aligned_columnar_arena(
        n_rows=4096, n_cols=8, dtype=np.float64
    )
    assert view.shape == (4096, 8)
    assert meta["aligned_64byte_address_mod_64"] == 0
    assert meta["is_64byte_cache_aligned"] is True
    assert meta["columnar_fortran_contiguous"] is True
    assert meta["zero_copy_shares_memory"] is True
    assert meta["zero_copy_buffer_protocol_verified"] is True
    assert int(view[:, 0].__array_interface__["data"][0]) == int(view.__array_interface__["data"][0])


def test_pillar5_llm_as_code_dag_context_and_harnesslab_security() -> None:
    """Tests compounding failure decay proof, DAG O(depth) unwinding, and HarnessLab security gate."""
    proof = AgenticProgrammingAndSecureHarnessEngine.compute_orchestrator_compounding_failure_vs_llm_as_code(
        per_step_accuracy=0.95, horizon_steps=50
    )
    assert proof["llm_as_orchestrator_survival_prob"] < 0.10
    assert proof["llm_as_code_deterministic_loop_compliance"] == 1.0

    dag = AgenticProgrammingAndSecureHarnessEngine.execute_dag_scoped_context_call_graph()
    assert dag["step3_live_context_excludes_c_raw_transcript"] is True
    assert dag["step3_retains_c_one_line_summary"] is True

    deny = AgenticProgrammingAndSecureHarnessEngine.evaluate_harnesslab_security_and_persistent_memory(
        TrustTier.EXTERNAL, DataClass.SECRET, ActionRisk.PRIVILEGED_OPERATION, phase="tool_call"
    )
    assert deny["decision"] == "deny"
    assert deny["sampling_temperature"] == 0.15


def test_pillar6_no_more_lucky_models_purged_cv_and_heavy_juice_firewall() -> None:
    """Tests multiple-testing Lucky Model rejection, purged/embargoed CV, and -300 heavy-juice trap rejection."""
    lucky = AntiOverfittingAndDataHygieneEngine.evaluate_no_more_lucky_models_deflation_gate(
        observed_hit_rate=0.56, sample_size_n=75, num_candidate_models_tested=200
    )
    assert lucky["passes_no_more_lucky_models_gate"] is False

    purged_cv = AntiOverfittingAndDataHygieneEngine.time_blocked_purged_and_embargoed_cv_splits(
        n_samples=120, n_splits=5, purge_window=2, embargo_pct=0.025
    )
    assert purged_cv["zero_lookahead_leakage_verified"] is True
    assert all(f["zero_overlap_verified"] for f in purged_cv["folds"])

    juice_trap = AntiOverfittingAndDataHygieneEngine.evaluate_heavy_juice_and_expected_utility_gate(
        model_win_prob=0.77, american_odds=-320
    )
    assert juice_trap["heavy_juice_trap_blocked"] is True
    assert juice_trap["publish_allowed"] is False


def test_pillar7_bayesian_causal_network_science_symbolic_huber_and_gsi_survival() -> None:
    """Tests Empirical Bayes player_gp shrinkage, do-calculus, PageRank, Hilbert cap, symbolic/Huber, and GSI Weibull."""
    eb_small = BayesianCausalAndNetworkScienceEngine.hierarchical_empirical_bayes_player_prop_shrinkage(
        observed_player_mean=95.0, player_active_gp=2, within_player_sigma=24.0, positional_prior_mean=65.0, between_player_tau=12.0
    )
    eb_large = BayesianCausalAndNetworkScienceEngine.hierarchical_empirical_bayes_player_prop_shrinkage(
        observed_player_mean=95.0, player_active_gp=15, within_player_sigma=24.0, positional_prior_mean=65.0, between_player_tau=12.0
    )
    # 2 active games shrinks much more toward positional prior than 15 active games
    assert eb_small["shrinkage_factor_b"] > eb_large["shrinkage_factor_b"]
    assert eb_small["posterior_shrunk_mean"] < eb_large["posterior_shrunk_mean"]

    hilbert = BayesianCausalAndNetworkScienceEngine.bounded_hilbert_context_interference(
        prior_prob=0.55, context_phase_rad=0.0, interference_strength=2.5
    )
    assert hilbert["bounded_within_0_35_cap"] is True
    assert abs(hilbert["delta_log_odds"]) == 0.35

    sym_huber = BayesianCausalAndNetworkScienceEngine.symbolic_pareto_discovery_and_huber_spline_regression(
        x_pressure=[0.18, 0.22, 0.26, 0.30, 0.34, 0.38, 0.42, 0.46, 0.25, 0.35],
        x_wind_mph=[5.0, 8.0, 12.0, 16.0, 20.0, 24.0, 28.0, 30.0, 10.0, 22.0],
        y_epa_with_outliers=[0.16, 0.11, 0.05, -0.02, -0.10, -0.21, -0.34, -2.85, 0.08, -0.14],
    )
    assert sym_huber["huber_beats_or_ties_ols_under_outliers"] is True

    gsi = AntiOverfittingAndDataHygieneEngine.gsi_orthopedic_weibull_return_to_play_hazard(
        days_since_injury=21.0, weibull_scale_lambda=28.0, weibull_shape_k=1.8, reinjury_history_count=1
    )
    assert gsi["clinical_workflows_permitted"] is False
    assert gsi["sports_spine_import_permitted"] is False
    assert 0.0 < gsi["survival_not_yet_cleared_prob"] < 1.0


def test_pillar8_wave4_simulation_variance_reduction_markov_fem_graphrag_drl() -> None:
    """Tests Wave 4 Simulation Variance Reduction, LHS/Sobol QMC, Absorbing Markov (including near-singular), RK4, FEM, GraphRAG & DRL."""
    vr = SimulationVarianceReductionFEMGraphRAGAndDRLEngine.antithetic_and_control_variate_dfs_monte_carlo()
    assert vr["variance_reduction_factor_vrf"] > 1.5
    assert vr["control_variate_improves_over_antithetic"] is True
    assert vr["variance_reduced_standard_error"] < vr["antithetic_only_standard_error"] < vr["crude_standard_error"]

    qmc = SimulationVarianceReductionFEMGraphRAGAndDRLEngine.latin_hypercube_and_sobol_qmc_simulation()
    assert qmc["qmc_discrepancy_beats_crude"] is True
    assert qmc["qmc_se_beats_crude"] is True

    tail = SimulationVarianceReductionFEMGraphRAGAndDRLEngine.importance_sampling_200pt_dfs_tail_estimator()
    assert tail["tail_se_reduction_ratio"] > 1.5
    assert abs(tail["importance_sampling_prob_200plus"] - tail["crude_prob_200plus"]) < 0.02

    markov = SimulationVarianceReductionFEMGraphRAGAndDRLEngine.absorbing_markov_chain_drive_fundamental_matrix()
    for zone, probs in markov["absorption_probabilities"].items():
        assert abs(probs["row_sum"] - 1.0) < 1e-5
    assert markov["expected_points_by_zone"]["RED_ZONE"] > markov["expected_points_by_zone"]["PLUS_TERRITORY"]
    assert markov["expected_points_by_zone"]["PLUS_TERRITORY"] > markov["expected_points_by_zone"]["MIDFIELD"]

    # Near-singular stress test: transient row of T has spectral radius rho(T) -> 1.0
    T_near_singular = np.array(
        [
            [0.9995, 0.0004, 0.0000, 0.0000],
            [0.04, 0.30, 0.38, 0.06],
            [0.01, 0.05, 0.28, 0.42],
            [0.00, 0.00, 0.04, 0.36],
        ],
        dtype=np.float64,
    )
    S_near_singular = np.array(
        [
            [0.0000, 0.0000, 0.0001, 0.0000],
            [0.04, 0.04, 0.11, 0.03],
            [0.08, 0.12, 0.02, 0.02],
            [0.39, 0.18, 0.00, 0.03],
        ],
        dtype=np.float64,
    )
    markov_ns = SimulationVarianceReductionFEMGraphRAGAndDRLEngine.absorbing_markov_chain_drive_fundamental_matrix(
        T=T_near_singular, S=S_near_singular, max_spectral_radius=0.999
    )
    assert markov_ns["near_singular_contraction_applied"] is True
    assert markov_ns["effective_spectral_radius_rho"] <= 0.999 + 1e-6
    for zone, probs in markov_ns["absorption_probabilities"].items():
        assert abs(probs["row_sum"] - 1.0) < 1e-5

    rk4 = SimulationVarianceReductionFEMGraphRAGAndDRLEngine.rk4_richardson_fatigue_and_welch_batch_means_diagnostics()
    assert rk4["richardson_truncation_error_bound"] < 1e-5
    assert rk4["batch_means_decorrelated_pass"] is True

    fem_rag_drl = SimulationVarianceReductionFEMGraphRAGAndDRLEngine.gsi_fem_von_mises_graphrag_context_and_drl_4th_down()
    assert fem_rag_drl["gsi_fem_biomechanics"]["clinical_workflows_permitted"] is False
    assert fem_rag_drl["applied_context_engineering"]["highest_priority_at_edges"] is True
    assert fem_rag_drl["drl_4th_down_and_curriculum"]["optimal_action"] == "GO_FOR_IT"


def test_end_to_end_packt_95_suite_and_dk_200pt_integration() -> None:
    """Runs the full 95-repo + 5-PDF suite and verifies its integration into the 200+ Pt DFS engine."""
    suite_res = run_packt_95repo_conformal_sports_arrow_bayesian_simulation_and_harness_suite(write_receipt=False)
    assert suite_res["status"] == "PASS"
    assert suite_res["quarantine_and_pdfs_verification"]["total_unique_packt_repos"] == 95
    assert suite_res["quarantine_and_pdfs_verification"]["total_local_pdfs"] == 5

    # Verify Two-Host Rule: zero literal home paths in receipt JSON
    serialized = json.dumps(suite_res)
    assert str(Path.home()).lower() not in serialized.lower()
    assert Path.home().as_posix().lower() not in serialized.lower()

    omniverse_res = run_complete_omniverse_reasoning_simulation_projection_and_200pt_dfs_suite(write_receipt=True)
    assert omniverse_res["status"] == "PASS"
    w2_sim = omniverse_res["draftkings_200pt_championship_dfs"]["wave2_lineup_vs_field_contest_simulation_summary"]
    assert w2_sim["antithetic_and_control_variate_diagnostics"]["control_variate_improves_over_antithetic"] is True
    assert w2_sim["latin_hypercube_and_sobol_qmc_diagnostics"]["qmc_discrepancy_beats_crude"] is True
    assert w2_sim["importance_sampling_200pt_tail_diagnostics"]["tail_se_reduction_ratio"] > 1.5
    assert w2_sim["absorbing_markov_drive_ep_by_zone"]["RED_ZONE"] > w2_sim["absorbing_markov_drive_ep_by_zone"]["OWN_TERRITORY"]
    packt_sec = omniverse_res["packt_95repo_conformal_simulation_arrow_and_harness"]
    assert packt_sec["status"] == "PASS"
    assert packt_sec["total_unique_packt_repos"] == 95
    assert packt_sec["total_local_pdfs"] == 5
    assert packt_sec["all_95_quarantined"] is True
