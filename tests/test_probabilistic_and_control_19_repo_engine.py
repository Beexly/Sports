r"""Comprehensive Multi-Pass Test Suite for the 19-Repository (20-URL) Probabilistic & Control Engine.

Verifies mathematical invariants, edge cases, error paths, and hardware-aware replacements across:
  - Target A: Personal Hardware & Software Optimization (~)
  - Target B: Galaxy Sports Edge (GSE) Prediction Engine, SGP Copula & Player Tracking
  - Target C: Galaxy Science Institute (GSI) Biomechanical Kinematics, Survival & Clinical Safety Gates
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from intelligence.ecosystem.probabilistic_and_control_19_repo_engine import (
    AlgorithmicNumericalKernelLibrary,
    DmpAndProMPBiomechanicalEngine,
    DynamaxKalmanAndRtsSmootherEngine,
    Eli5PermutationAndTaylorExplainer,
    FaultTreeGate,
    LumibotEventBrokerAndDrawdownGuard,
    LumibotPositionOrder,
    MppiStochasticOptimalControlEngine,
    NeuralProphetArNetDecomposer,
    NGBoostNaturalGradientDistributionalEngine,
    NixtlaMinTCoherentReconciler,
    OpenTurnsSobolAndFormReliabilityEngine,
    OrbitBayesianStructuralTimeSeriesEngine,
    OryxBijectorAndLogDetJacobianEngine,
    PgmpyCausalDagAndDoCalculusEngine,
    PomegranateComposableHmmEngine,
    PyMCHierarchicalNutsAndPartialPoolingEngine,
    PyroReparameterizedSviElboEngine,
    ScramFaultTreeMocusAndBirnbaumEngine,
    SkproProbabilisticMetricsAndSurvivalEngine,
    WiseoddVariationalAndNonparametricEngine,
    run_probabilistic_and_control_19_repo_integration,
)


def test_repo1_neural_prophet_piecewise_trend_fourier_and_ar_net() -> None:
    decomposer = NeuralProphetArNetDecomposer(n_changepoints=3, fourier_order=2, ar_lags=2)
    t = np.arange(24, dtype=float)
    # Construct synthetic NFL EPA / GSI circadian trajectory with a slope break at t=12 (t_norm ~ 0.522)
    y = 0.05 + 0.012 * t + np.maximum(0.0, t - 12.0) * 0.025 + 0.04 * np.sin(2.0 * math.pi * t / 17.0)
    cov = np.cos(0.3 * t)[:, None]
    res = decomposer.fit_and_decompose(y, covariates=cov)

    assert res["n_obs"] == 24
    assert res["r2_score"] > 0.99
    assert res["rmse"] < 0.02
    assert len(res["changepoint_deltas"]) == 3
    assert len(res["ar_weights"]) == 2
    # Break at t=12/23 (~0.5217) must map to the middle changepoint (0.5333), not the first (0.2667)
    assert abs(res["dominant_structural_break_t"] - 0.5333) < 1e-3

    # Edge case: too few observations must raise ValueError
    with pytest.raises(ValueError, match="at least 6 observations"):
        decomposer.fit_and_decompose([1.0, 2.0, 3.0])


def test_repo2_eli5_conditional_permutation_taylor_and_80_rule_firewall() -> None:
    rng = np.random.default_rng(11)
    X = rng.standard_normal((90, 3))
    y = 3.2 * X[:, 0] - 0.8 * X[:, 1] + 0.5 * (X[:, 0] ** 2)
    strata = (X[:, 0] > 0.0).astype(int)

    clean = Eli5PermutationAndTaylorExplainer.compute_permutation_and_taylor_attribution(
        predict_fn=lambda M: 3.2 * M[:, 0] - 0.8 * M[:, 1] + 0.5 * (M[:, 0] ** 2),
        X=X,
        y=y,
        feature_names=["pressure_rate_over_expected", "yprr_vs_man", "neutral_pace_sec"],
        strata=strata,
    )
    assert clean["top_feature"] == "pressure_rate_over_expected"
    assert clean["80_rule_firewall_clean"] is True
    assert clean["ranked_features"][0]["importance_mean"] > clean["ranked_features"][2]["importance_mean"]
    assert clean["ranked_features"][0]["structural_weight"] > 2.5

    # Banned raw misleading stat must be flagged by the 80-rule firewall
    flagged = Eli5PermutationAndTaylorExplainer.compute_permutation_and_taylor_attribution(
        predict_fn=lambda M: M[:, 0],
        X=X[:, :1],
        y=X[:, 0],
        feature_names=["raw_qb_win_loss_record"],
    )
    assert flagged["80_rule_firewall_clean"] is False
    assert "raw_qb_win_loss_record" in flagged["banned_features_detected"]

    with pytest.raises(ValueError, match="Strata vector length"):
        Eli5PermutationAndTaylorExplainer.compute_permutation_and_taylor_attribution(
            predict_fn=lambda M: M[:, 0],
            X=X,
            y=y,
            feature_names=["f1", "f2", "f3"],
            strata=np.array([0, 1]),
        )


def test_repo3_tanu_python_algorithmic_vectorization_benchmark_gate() -> None:
    res = AlgorithmicNumericalKernelLibrary.benchmark_vectorization_speedup(dim=28)
    assert res["numerical_parity"] is True
    assert res["max_abs_error"] < 1e-10
    assert res["speedup_factor"] > 1.5

    with pytest.raises(ValueError, match="Incompatible or empty"):
        AlgorithmicNumericalKernelLibrary.naive_triple_loop_matmul([[1.0, 2.0]], [[1.0]])


def test_repo4_lumibot_event_broker_kelly_sizing_and_drawdown_breaker() -> None:
    broker = LumibotEventBrokerAndDrawdownGuard(
        initial_bankroll=10000.0,
        kelly_fraction=0.25,
        max_single_stake_pct=0.03,
        max_drawdown_halt_pct=0.10,
    )
    # 1. Valid positive-EV order that cleared the conjunction gate
    filled = broker.evaluate_order_sizing(
        LumibotPositionOrder("T1", "DraftKings_NFL", model_prob=0.60, decimal_odds=1.95, publish_allowed=True)
    )
    assert filled["status"] == "FILLED_PARITY_VERIFIED"
    assert 0.0 < filled["stake_dollars"] <= 300.0

    # 2. Order blocked by conjunction gate (`publish_allowed=False`)
    passed = broker.evaluate_order_sizing(
        LumibotPositionOrder("T2", "DraftKings_NFL", model_prob=0.65, decimal_odds=1.95, publish_allowed=False)
    )
    assert passed["status"] == "PASS_CONJUNCTION_GATE"
    assert passed["stake_dollars"] == 0.0

    # 3. Polymarket compliance hold enforcement
    poly = broker.evaluate_order_sizing(
        LumibotPositionOrder("T3", "Polymarket_Contracts", model_prob=0.70, decimal_odds=2.0, publish_allowed=True)
    )
    assert poly["status"] == "REJECTED_COMPLIANCE_HOLD"

    # 4. Trigger 12% drawdown -> circuit breaker halts all subsequent sizing and stays latched
    broker.record_settlement(stake_dollars=1200.0, decimal_odds=1.91, won=False)
    assert broker.circuit_breaker_tripped is True
    # Even if an open winning ticket settles and brings drawdown below 10%, the tripped breaker stays latched
    broker.record_settlement(stake_dollars=500.0, decimal_odds=2.0, won=True)
    halted = broker.evaluate_order_sizing(
        LumibotPositionOrder("T4", "DraftKings_NFL", model_prob=0.65, decimal_odds=2.0, publish_allowed=True)
    )
    assert halted["status"] == "HALTED_DRAWDOWN_CIRCUIT_BREAKER"


def test_repo5_ngboost_fisher_natural_gradient_and_closed_form_crps() -> None:
    rng = np.random.default_rng(55)
    X = rng.uniform(-1.5, 1.5, size=(100, 2))
    true_mu = 75.0 + 15.0 * X[:, 0] - 8.0 * X[:, 1]
    true_sigma = np.exp(0.4 + 0.25 * X[:, 0])
    y = true_mu + rng.normal(0.0, true_sigma)

    # URL 1: NormalLogScore natural gradient boosting
    ngb_log = NGBoostNaturalGradientDistributionalEngine(n_estimators=35, learning_rate=0.08, score_rule="logscore")
    fit_log = ngb_log.fit(X, y)
    assert fit_log["nll_improved"] is True
    assert fit_log["final_nll"] < fit_log["initial_nll"]

    # URL 2: NormalCRPScore Riemannian natural gradient boosting
    ngb_crps = NGBoostNaturalGradientDistributionalEngine(n_estimators=30, learning_rate=0.04, score_rule="crps")
    fit_crps = ngb_crps.fit(X, y)
    assert fit_crps["crps_improved"] is True
    assert fit_crps["mean_crps"] < fit_crps["initial_crps"]

    dist = ngb_log.predict_dist(X[:5])
    assert dist["mu"].shape == (5,)
    assert np.all(dist["sigma"] > 0.0)

    # Verify closed-form CRPS is non-negative and minimized near y == mu
    crps_exact = ngb_log.normal_crps_closed_form(np.array([80.0]), np.array([80.0]), np.array([5.0]))[0]
    crps_far = ngb_log.normal_crps_closed_form(np.array([105.0]), np.array([80.0]), np.array([5.0]))[0]
    assert 0.0 < crps_exact < crps_far


def test_repo6_pymc_hierarchical_partial_pooling_and_nuts_hmc() -> None:
    # Low-sample player (n=4 snaps, noisy mean=9.5) must shrink heavily toward hyper-mean (~4.5)
    pool = PyMCHierarchicalNutsAndPartialPoolingEngine.fit_hierarchical_partial_pooling(
        group_means=[4.4, 4.6, 4.5, 9.5],
        group_counts=[150, 140, 160, 4],
        obs_sigma=2.0,
    )
    assert pool["shrinkage_factors"][3] > pool["shrinkage_factors"][0]
    assert pool["posterior_means"][3] < 7.5

    target = np.array([1.2, -0.7])
    hmc = PyMCHierarchicalNutsAndPartialPoolingEngine.sample_nuts_hmc_posterior(
        logp_and_grad=lambda th: (-0.5 * float(np.sum((th - target) ** 2)), -(th - target)),
        init_theta=np.zeros(2),
        n_Draws=160,
    )
    assert hmc["accept_rate"] > 0.5
    assert abs(hmc["posterior_mean"][0] - 1.2) < 0.45
    assert hmc["max_r_hat"] < 1.35
    assert hmc["min_ess"] > 2.0


def test_repo7_pyro_reparameterized_autodiagonal_normal_svi() -> None:
    target = np.array([2.5, -1.5])
    svi = PyroReparameterizedSviElboEngine.fit_autodiagonal_normal_svi(
        log_joint_and_grad=lambda z: (-0.5 * float(np.sum(((z - target) / 0.5) ** 2)), -(z - target) / 0.25),
        dim=2,
        n_steps=85,
        lr=0.08,
        stick_the_landing=True,
    )
    assert svi["elbo_improved"] is True
    assert svi["sticking_the_landing"] is True
    assert abs(svi["guide_loc"][0] - 2.5) < 0.35
    assert abs(svi["guide_loc"][1] + 1.5) < 0.35


def test_repo8_pomegranate_log_domain_hmm_forward_backward_and_viterbi() -> None:
    hmm = PomegranateComposableHmmEngine(
        init_probs=np.array([0.8, 0.2]),
        transition_matrix=np.array([[0.85, 0.15], [0.10, 0.90]]),
        emission_means=np.array([28.0, 17.0]),
        emission_stds=np.array([1.5, 1.5]),
    )
    obs = [28.2, 27.9, 28.5, 17.1, 16.8, 17.3]
    res = hmm.forward_backward_and_viterbi(obs)
    assert res["viterbi_path"] == [0, 0, 0, 1, 1, 1]
    assert res["posterior_row_sums_valid"] is True
    assert res["posterior_state_probs_last"][1] > 0.90

    # Baum-Welch EM must monotonically improve log-evidence
    bw = hmm.fit_baum_welch(obs, n_iter=8)
    assert bw["baum_welch_improved"] is True
    assert bw["final_log_evidence"] >= bw["initial_log_evidence"]

    # General Mixture Model EM must separate the two modes
    gmm = PomegranateComposableHmmEngine.fit_general_mixture_model(obs, n_components=2, n_iter=15)
    assert gmm["log_likelihood_improved"] is True
    assert abs(min(gmm["means"]) - 17.07) < 0.5
    assert abs(max(gmm["means"]) - 28.20) < 0.5


def test_repo9_pgmpy_causal_dag_d_separation_and_do_calculus() -> None:
    dag = PgmpyCausalDagAndDoCalculusEngine([
        ("ScoreDeficit", "PassRate"),
        ("ScoreDeficit", "WinGame"),
        ("PassRate", "WinGame"),
    ])
    bd_set = dag.find_minimal_backdoor_set("PassRate", "WinGame")
    assert bd_set == {"ScoreDeficit"}

    # Cardinality-3 minimal backdoor adjustment set with an extra irrelevant node:
    # Must return ONLY {C1, C2, C3} and exclude Irrelevant!
    dag3 = PgmpyCausalDagAndDoCalculusEngine([
        ("C1", "X"), ("C1", "Y"),
        ("C2", "X"), ("C2", "Y"),
        ("C3", "X"), ("C3", "Y"),
        ("Irrelevant", "X"),
    ])
    assert dag3.find_minimal_backdoor_set("X", "Y") == {"C1", "C2", "C3"}

    # Chain A -> B -> C: A and C are d-separated given B
    chain = PgmpyCausalDagAndDoCalculusEngine([("A", "B"), ("B", "C")])
    assert chain.is_d_separated("A", "C", set()) is False
    assert chain.is_d_separated("A", "C", {"B"}) is True

    # Variable Elimination exact posterior check against observational conditioning
    ve = PgmpyCausalDagAndDoCalculusEngine.variable_elimination_query(
        factors=[
            (["Z"], np.array([0.6, 0.4])),
            (["Z", "X"], np.array([[0.8, 0.2], [0.1, 0.9]])),
            (["X", "Z", "Y"], np.array([[[0.30, 0.70], [0.85, 0.15]], [[0.24, 0.76], [0.79, 0.21]]])),
        ],
        query_var="Y",
        evidence={"X": 1},
    )
    # P(Y=1 | X=1) = (0.76 * 0.2 * 0.6 + 0.21 * 0.9 * 0.4) / (0.2 * 0.6 + 0.9 * 0.4) = 0.1668 / 0.48 = 0.3475
    assert abs(ve["posterior_probs"][1] - 0.3475) < 1e-4

    # Simpson's paradox / game-script confounding test
    do_res = PgmpyCausalDagAndDoCalculusEngine.compute_backdoor_do_intervention(
        p_z=np.array([0.6, 0.4]),
        p_x_given_z=np.array([[0.8, 0.1], [0.2, 0.9]]),
        p_y1_given_x_z=np.array([[0.70, 0.15], [0.76, 0.21]]),
    )
    assert do_res["causal_ate"] > 0.05
    assert do_res["naive_observational_diff"] < 0.0


def test_repo10_uber_orbit_bayesian_structural_dlt_lgt_forecaster() -> None:
    orbit = OrbitBayesianStructuralTimeSeriesEngine(damped_factor=0.85, seasonality=4, lgt_coef=0.0)
    # 40-step bounded seasonal wave in [18, 22] must not suffer seasonal buffer explosion
    t = np.arange(40, dtype=float)
    y_wave = 20.0 + 2.0 * np.sin(2.0 * math.pi * t / 4.0)
    res = orbit.fit_predict_dlt_lgt(y_wave, horizon=4)
    assert len(res["forecast"]) == 4
    for lo, mid, hi in zip(res["lower_90"], res["forecast"], res["upper_90"]):
        assert lo < mid < hi
        assert 17.0 <= mid <= 23.0


def test_repo11_dynamax_kalman_filter_rts_smoother_and_huber_gate() -> None:
    dt = 0.1
    F = np.array([[1.0, dt], [0.0, 1.0]])
    H = np.array([[1.0, 0.0]])
    Q = np.eye(2) * 0.01
    R = np.array([[0.2]])
    emissions = np.linspace(0.0, 5.0, 20)[:, None]
    # Inject a massive tracking glitch at t=10 to test Huber robustness
    emissions_glitch = emissions.copy()
    emissions_glitch[10, 0] += 25.0

    res = DynamaxKalmanAndRtsSmootherEngine.lgssm_filter_and_rts_smoother(
        emissions=emissions_glitch,
        F=F,
        H=H,
        Q=Q,
        R=R,
        init_mean=np.array([0.0, 2.5]),
        init_cov=np.eye(2) * 0.5,
        huber_threshold=3.5,
    )
    assert res["rts_reduced_uncertainty"] is True
    assert res["mean_smoothed_cov_trace"] < res["mean_filtered_cov_trace"]
    assert res["huber_outliers_gated"] >= 1
    assert abs(float(res["smoothed_means"][10, 0]) - 2.5) < 1.2

    # Unscented Kalman Filter (UKF) on nonlinear polar observations [range, bearing]
    true_states = np.column_stack([np.linspace(2.0, 6.0, 12), np.linspace(1.5, 4.5, 12)])
    polar_y = np.column_stack([
        np.hypot(true_states[:, 0], true_states[:, 1]),
        np.arctan2(true_states[:, 1], true_states[:, 0]),
    ])
    ukf = DynamaxKalmanAndRtsSmootherEngine.unscented_kalman_filter(
        emissions=polar_y,
        f_transition=lambda x: x + np.array([4.0 / 11.0, 3.0 / 11.0]),
        h_observation=lambda x: np.array([math.hypot(x[0], x[1]), math.atan2(x[1], x[0])]),
        Q=np.eye(2) * 0.01,
        R=np.diag([0.02, 0.005]),
        init_mean=np.array([2.0, 1.5]),
        init_cov=np.eye(2) * 0.2,
    )
    assert abs(ukf["ukf_filtered_mean_last"][0] - 6.0) < 0.25
    assert abs(ukf["ukf_filtered_mean_last"][1] - 4.5) < 0.25


def test_repo12_nixtla_hierarchical_mint_coherent_prop_reconciliation() -> None:
    S = np.array([
        [1.0, 1.0, 1.0, 1.0],  # Game Total
        [1.0, 1.0, 0.0, 0.0],  # Home Total
        [0.0, 0.0, 1.0, 1.0],  # Away Total
        [1.0, 0.0, 0.0, 0.0],  # Home Pass pts
        [0.0, 1.0, 0.0, 0.0],  # Home Rush/FG pts
        [0.0, 0.0, 1.0, 0.0],  # Away Pass pts
        [0.0, 0.0, 0.0, 1.0],  # Away Rush/FG pts
    ])
    y_hat = np.array([47.5, 26.0, 23.0, 14.5, 10.5, 13.5, 8.5])
    rng = np.random.default_rng(12)
    residuals = rng.normal(0.0, 2.0, size=(7, 30))

    rec = NixtlaMinTCoherentReconciler.reconcile_mint(S, y_hat, residuals=residuals, method="mint_shrink")
    assert rec["coherence_violation_before"] > 0.5
    assert rec["is_coherent"] is True
    assert rec["coherence_violation_after"] < 1e-9

    # Edge case 1: wls_var with single-column (n_obs=1) or zero-variance residuals must not produce NaNs
    S_small = np.array([[1.0, 1.0], [1.0, 0.0], [0.0, 1.0]])
    rec_1col = NixtlaMinTCoherentReconciler.reconcile_mint(
        S_small, np.array([10.0, 6.0, 5.0]), residuals=np.ones((3, 1)), method="wls_var"
    )
    assert rec_1col["is_coherent"] is True
    assert not any(math.isnan(v) for v in rec_1col["reconciled_forecasts"])

    # Edge case 2: active-set non-negative WLS reconciliation when a bottom node is negative
    rec_nn = NixtlaMinTCoherentReconciler.reconcile_mint(
        S_small, np.array([10.0, 12.0, -3.0]), method="ols", enforce_non_negative=True
    )
    assert rec_nn["is_coherent"] is True
    assert all(v >= 0.0 for v in rec_nn["reconciled_forecasts"])
    assert abs(rec_nn["reconciled_forecasts"][0] - 11.0) < 1e-6


def test_repo13_openturns_jansen_sobol_and_hasofer_lind_form() -> None:
    sobol = OpenTurnsSobolAndFormReliabilityEngine.compute_jansen_sobol_indices(
        model_fn=lambda X: 5.0 * X[:, 0] + 0.5 * X[:, 1],
        bounds=[(0.0, 1.0), (0.0, 1.0)],
        n_samples=1024,
    )
    assert sobol["dominant_variable_index"] == 0
    assert sobol["first_order_sobol"][0] > 0.90

    # Linear limit state g(R, S) = R - S where R ~ N(200, 15^2), S ~ N(120, 20^2)
    # Exact analytical Hasofer-Lind beta = (200 - 120) / sqrt(15^2 + 20^2) = 80 / 25 = 3.20
    # On a linear surface, SORM curvature is 0 and SORM failure probability equals FORM failure probability
    form = OpenTurnsSobolAndFormReliabilityEngine.solve_hasofer_lind_form_reliability(
        limit_state_g=lambda x: float(x[0] - x[1]),
        means=np.array([200.0, 120.0]),
        stds=np.array([15.0, 20.0]),
    )
    assert abs(form["hasofer_lind_beta"] - 3.20) < 1e-3
    assert abs(form["sorm_curvatures"][0]) < 1e-5
    assert abs(form["sorm_failure_probability"] - form["form_failure_probability"]) < 1e-6

    # Curved quadratic limit state: SORM curvature is non-zero and adjusts failure probability
    sorm_curved = OpenTurnsSobolAndFormReliabilityEngine.solve_hasofer_lind_form_reliability(
        limit_state_g=lambda x: float(x[0] - x[1] - 0.002 * ((x[1] - 120.0) ** 2)),
        means=np.array([200.0, 120.0]),
        stds=np.array([15.0, 20.0]),
    )
    assert sorm_curved["sorm_curvatures"][0] != 0.0
    assert sorm_curved["sorm_failure_probability"] != sorm_curved["form_failure_probability"]


def test_repo14_skpro_crps_pinball_coverage_and_harrell_c_index() -> None:
    mu = np.array([50.0, 60.0, 70.0, 80.0, 90.0])
    sigma = np.full(5, 5.0)
    y = np.array([51.0, 58.0, 72.0, 79.0, 91.0])
    res = SkproProbabilisticMetricsAndSurvivalEngine.evaluate_probabilistic_and_survival_predictions(
        y_true=y,
        pred_mu=mu,
        pred_sigma=sigma,
        nominal_coverage=0.90,
        survival_times=np.array([2.0, 5.0, 9.0, 15.0]),
        event_observed=np.array([1, 1, 1, 1]),
        risk_scores=np.array([0.95, 0.70, 0.40, 0.10]),
    )
    assert res["mean_crps"] > 0.0
    assert res["empirical_coverage"] == 1.0
    assert res["harrell_c_index"] == 1.0


def test_repo15_oryx_bijector_inverse_and_log_det_jacobian() -> None:
    bij = OryxBijectorAndLogDetJacobianEngine(shift=0.5, scale=1.1, skewness=0.3, tailweight=1.15)
    x = np.linspace(-2.0, 2.0, 9)
    y = bij.forward(x)
    assert np.all(y > 0.0)
    x_rec = bij.inverse(y)
    assert np.allclose(x, x_rec, atol=1e-10)

    # Verify analytical ILDJ against central finite differences of log |dx / dy|
    eps = 1e-6
    dx_dy_num = (bij.inverse(y + eps) - bij.inverse(y - eps)) / (2.0 * eps)
    ildj_num = np.log(np.abs(dx_dy_num))
    ildj_ana = bij.inverse_log_det_jacobian(y)
    assert np.allclose(ildj_ana, ildj_num, atol=1e-5)

    with pytest.raises(ValueError, match="strictly positive"):
        bij.inverse(np.array([0.0]))


def test_repo16_mppi_numba_cpu_vectorized_stochastic_optimal_control() -> None:
    mppi = MppiStochasticOptimalControlEngine(horizon_steps=20, num_rollouts=512)
    res = mppi.solve_mppi_control(
        start_state=(0.0, 0.0, 0.0),
        goal_xy=(3.8, 1.8),
        obstacle_xy_radius=(1.9, 0.9, 0.5),
    )
    assert res["optimized_free_energy_cost"] < res["initial_mean_cost"]
    assert res["final_dist_to_goal"] < res["start_dist_to_goal"]
    assert res["collision_free"] is True


def test_repo17_movement_primitives_dmp_rk4_and_promp_via_point_conditioning() -> None:
    engine = DmpAndProMPBiomechanicalEngine(n_weights=12)
    t = np.linspace(0.0, 1.0, 50)
    demo = 2.0 * (10.0 * (t**3) - 15.0 * (t**4) + 6.0 * (t**5))

    # 1. DMP imitation & goal scaling (imitation_rmse must be evaluated against scaled trajectory, not 0.0)
    dmp_res = engine.imitate_and_rollout_dmp(t, demo, new_goal=3.0)
    assert dmp_res["goal_convergence_error"] < 0.15
    assert 0.0 < dmp_res["imitation_rmse"] < 0.08

    # 2. ProMP conditioning at midpoint via-point
    demos = np.array([demo + 0.1 * (i - 2) * np.sin(math.pi * t) for i in range(5)])
    promp_res = engine.fit_and_condition_promp(t, demos, cond_time_idx=25, cond_y_star=1.42)
    assert promp_res["via_point_error"] < 0.01
    assert promp_res["posterior_std_at_via_point"] < 0.02


def test_repo18_wiseodd_cavi_variational_gmm_and_gaussian_process() -> None:
    rng = np.random.default_rng(18)
    X = np.vstack([rng.normal(-4.0, 0.5, size=(25, 2)), rng.normal(4.0, 0.5, size=(25, 2))])
    gmm = WiseoddVariationalAndNonparametricEngine.fit_cavi_variational_gmm(X, n_components=2)
    assert sorted(gmm["cluster_counts"]) == [25, 25]
    assert gmm["elbo_monotonic"] is True
    assert gmm["final_elbo"] >= gmm["initial_elbo"]

    X_tr = np.linspace(0.0, 2.0, 8)[:, None]
    y_tr = np.cos(X_tr[:, 0])
    gp = WiseoddVariationalAndNonparametricEngine.predict_rbf_gaussian_process(X_tr, y_tr, np.array([[1.0]]))
    assert abs(gp["posterior_mean"][0] - math.cos(1.0)) < 0.08

    # RBM Contrastive Divergence & EBM Hyvärinen Score Matching
    X_bin = (X > 0.0).astype(float)
    rbm = WiseoddVariationalAndNonparametricEngine.fit_rbm_contrastive_divergence_and_score_matching(X_bin, X)
    assert rbm["rbm_recon_improved"] is True
    assert rbm["final_recon_mse"] < rbm["initial_recon_mse"]


def test_repo19_scram_mocus_minimal_cut_sets_and_birnbaum_importance() -> None:
    # Construct fault tree where Basic Event A is a single-point failure AND also appears in a 2-event cut set {A, B}
    # Boolean absorption MUST eliminate {A, B} and keep only {A} and {C, D}!
    gates = {
        "Top": FaultTreeGate("Top", "OR", ["G1", "G2"]),
        "G1": FaultTreeGate("G1", "OR", ["A", "G_redundant"]),
        "G_redundant": FaultTreeGate("G_redundant", "AND", ["A", "B"]),
        "G2": FaultTreeGate("G2", "AND", ["C", "D"]),
    }
    probs = {"A": 0.10, "B": 0.20, "C": 0.30, "D": 0.40}
    scram = ScramFaultTreeMocusAndBirnbaumEngine(gates, probs)
    res = scram.analyze_fault_tree("Top")

    # Minimal cut sets must be [['A'], ['C', 'D']] (with ['A', 'B'] absorbed!)
    assert res["minimal_cut_sets"] == [["A"], ["C", "D"]]
    assert res["single_point_failures"] == ["A"]
    # Exact probability: P(A union (C intersect D)) = 1 - (1 - 0.10) * (1 - 0.30 * 0.40) = 1 - 0.90 * 0.88 = 0.208
    assert abs(res["top_event_probability"] - 0.208) < 1e-6
    assert res["dominant_birnbaum_event"] == "A"

    # Stress-test >16 basic events (20 basic events with p=0.20):
    # Shannon BDD + singleton factorization must compute exact probability 1 - 0.8^20 and Birnbaum 0.8^19
    events_20 = [f"E{i:02d}" for i in range(20)]
    gates_20 = {"Top20": FaultTreeGate("Top20", "OR", events_20)}
    probs_20 = {e: 0.20 for e in events_20}
    scram_20 = ScramFaultTreeMocusAndBirnbaumEngine(gates_20, probs_20)
    res_20 = scram_20.analyze_fault_tree("Top20")
    assert abs(res_20["top_event_probability"] - (1.0 - (0.8**20))) < 1e-6
    assert abs(res_20["importance_measures"]["E00"]["birnbaum_importance"] - (0.8**19)) < 1e-5

    # Test K/N (2-of-3 ATLEAST) voting gate expansion
    gates_kn = {"TopKN": FaultTreeGate("TopKN", "K/N", ["X1", "X2", "X3"], k_threshold=2)}
    probs_kn = {"X1": 0.5, "X2": 0.5, "X3": 0.5}
    res_kn = ScramFaultTreeMocusAndBirnbaumEngine(gates_kn, probs_kn).analyze_fault_tree("TopKN")
    assert res_kn["minimal_cut_set_count"] == 3
    assert abs(res_kn["top_event_probability"] - 0.5) < 1e-6


def test_end_to_end_19_repo_20_url_integration_receipt() -> None:
    receipt = run_probabilistic_and_control_19_repo_integration()
    assert receipt["two_pass_status"] == "PASS_ALL_19_UNIQUE_REPOS_20_URLS_VERIFIED"
    assert len(receipt["repos"]) == 19
    assert receipt["hardware_telemetry"]["zero_disk_bloat_enforced"] is True
