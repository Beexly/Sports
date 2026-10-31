import numpy as np
import pytest
from argon_drop.live_certs import four_marginal_gap, trotter_step_comparison
from engine.gates.number_theory_fences import (
    NumberTheoreticFenceError,
    bsd_selmer_corank_gate,
    hilbert_tenth_rational_fence,
    ordinary_correlation_check,
    zero_free_landau_siegel_fence,
)
from engine.kernels.brenier_stability import compute_optimal_reallocation_map
from engine.kernels.control_and_calibration import (
    katch_mcardle_metabolic_fence,
    postgame_dual_luck_grade,
    rademacher_whitened_tail_fence,
    solenoidal_conservation_gate,
    solve_lqr_riccati_live,
    tau_hat_shrinkage_live,
)
from engine.transport.kantorovich_mmot import solve_multimarginal_kantorovich
from engine.transport.sinkhorn_hydrodynamic import (
    SinkhornLyapunovError,
    ghosal_nutz_sinkhorn_rate_certificate,
    heavy_tail_tsallis_sinkhorn,
    janati_unbalanced_gaussian_sinkhorn_closed_form,
    lavenant_riemannian_sinkhorn_divergence,
    madelung_schrodinger_bridge_flow,
    sinkhorn_dual_ascent_live,
)


def test_birkhoff_two_marginal_collapse():
    cost = np.array([[4.0, 1.0, 3.0], [2.0, 0.0, 5.0], [3.0, 2.0, 2.0]], dtype=float)
    mu = np.array([1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0], dtype=float)
    res = solve_multimarginal_kantorovich(cost, [mu, mu], lift_to_continuum=False)
    assert abs(res["friesecke_certificate"]["friesecke_gap"]) < 1e-10
    assert abs(res["kantorovich_cost"] - 5.0 / 3.0) < 1e-10
    assert res["birkhoff_certificate"]["max_marginal_error"] < 1e-10


def test_friesecke_three_marginal_half_gap_and_superposition():
    cost = np.zeros((2, 2, 2), dtype=float)
    for i in range(2):
        for j in range(2):
            for k in range(2):
                cost[i, j, k] = float(i ^ j ^ k)
    mu = np.array([0.5, 0.5], dtype=float)
    res = solve_multimarginal_kantorovich(cost, [mu, mu, mu], require_half_gap_certificate=True, lift_to_continuum=True)
    assert abs(res["kantorovich_cost"] - 0.0) < 1e-10
    assert abs(res["monge_cost"] - 0.5) < 1e-10
    assert abs(res["friesecke_certificate"]["friesecke_gap"] - 0.5) < 1e-10
    assert res["superposition_certificate"]["microstructure_formed"] is True
    assert abs(res["superposition_certificate"]["integral_mass"] - 1.0) < 1e-10


def test_four_marginal_ot_blocked_until_exhibited():
    with pytest.raises(NotImplementedError):
        four_marginal_gap()


def test_sinkhorn_dual_ascent_and_madelung_bridge():
    grid_x = np.linspace(0.0, 1.0, 5)
    C = (grid_x[:, None] - grid_x[None, :]) ** 2
    rho0 = np.array([0.32, 0.25, 0.18, 0.15, 0.10], dtype=float)
    rho1 = np.array([0.10, 0.15, 0.22, 0.25, 0.28], dtype=float)
    s1 = sinkhorn_dual_ascent_live(C, rho0, rho1, eps=0.08, trotter_h=1.0)
    assert s1["dual_residual"] < 1e-8
    assert s1["lyapunov_residual_drop"] > 0.0
    bridge = madelung_schrodinger_bridge_flow(grid_x, rho0, rho1, eps=0.08, trotter_h=1.75)
    assert bridge["max_bridge_mass_error"] < 1e-10
    trot = trotter_step_comparison(tol=1e-8)
    assert trot["iterations_h175"] < trot["iterations_h1"]


def test_heavy_tail_tsallis_sinkhorn_unbounded():
    grid_x = np.linspace(0.0, 2.0, 5)
    C = (grid_x[:, None] - grid_x[None, :]) ** 2
    mu = np.array([0.35, 0.25, 0.20, 0.12, 0.08], dtype=float)
    nu = np.array([0.10, 0.18, 0.24, 0.26, 0.22], dtype=float)
    res = heavy_tail_tsallis_sinkhorn(C, mu, nu, q=1.5, eps=0.5)
    assert res["dual_residual"] < 1e-6
    assert res["tsallis_entropy"] > 0.0


def test_brenier_one_third_stability_live_path():
    src = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0]], dtype=float)
    t_mu = np.array([[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]], dtype=float)
    t_nu = np.array([[0.15, 0.1], [0.85, 0.15], [0.1, 0.85], [0.9, 0.9]], dtype=float)
    w = np.array([0.25, 0.25, 0.25, 0.25], dtype=float)
    res = compute_optimal_reallocation_map(src, t_mu, t_nu, w, w, w)
    cert = res["brenier_certificate"]
    assert cert["l2_map_diff"] <= cert["brenier_bound_envelope"]


def test_openai_003_qrh_and_landau_siegel_fence():
    res = zero_free_landau_siegel_fence(conductor_q=19, candidate_zero_real=0.85)
    assert abs(res["certified_siegel_constant_c"] - (1.0 / 8.0) * np.log(3.0)) < 1e-12
    assert res["actual_siegel_gap_product"] >= res["certified_siegel_constant_c"]
    with pytest.raises(NumberTheoreticFenceError):
        zero_free_landau_siegel_fence(conductor_q=19, candidate_zero_real=0.91)


def test_openai_007_ordinary_elliott_off_diagonal():
    seq = np.array([(-1.0) ** i for i in range(200)], dtype=float)
    res = ordinary_correlation_check(seq, a1=2, b1=1, a2=3, b2=2)
    assert res["off_diagonal_determinant"] == 1.0
    assert abs(res["ordinary_correlation_average"]) <= res["elliott_log_envelope"]
    with pytest.raises(NumberTheoreticFenceError):
        ordinary_correlation_check(seq, a1=2, b1=2, a2=3, b2=3)


def test_openai_004_hilbert_tenth_and_sun_86_fence():
    res = hilbert_tenth_rational_fence([(7, 30), (11, 20)], num_polynomial_variables=12)
    assert res["pole_parity_certified"] == 1.0
    with pytest.raises(NumberTheoreticFenceError):
        hilbert_tenth_rational_fence([], num_polynomial_variables=86)
    with pytest.raises(NumberTheoreticFenceError):
        hilbert_tenth_rational_fence([(1, 7)], num_polynomial_variables=4)


def test_openai_006_bsd_low_selmer_corank():
    res = bsd_selmer_corank_gate(selmer_2_inf_corank=1, mordell_weil_rank=1, analytic_rank=1)
    assert res["bsd_exactness_certified"] == 1.0
    with pytest.raises(NumberTheoreticFenceError):
        bsd_selmer_corank_gate(selmer_2_inf_corank=0, mordell_weil_rank=1, analytic_rank=0)


def test_lqr_riccati_and_rademacher_t_invariance():
    A = np.array([[0.92, -0.05], [0.0, 0.88]], dtype=float)
    B = np.array([[0.15], [0.25]], dtype=float)
    Q = np.diag([1.0, 0.5])
    R = np.array([[0.5]], dtype=float)
    x0 = np.array([5.0, 3.0], dtype=float)
    lqr = solve_lqr_riccati_live(A, B, Q, R, x0)
    assert lqr["V_lyapunov_drop"] > 0.0
    assert lqr["bellman_residual"] < 1e-10

    rng = np.random.default_rng(42)
    X = rng.normal(size=(60, 4))
    r6 = rademacher_whitened_tail_fence(X, horizon_t=6)
    r20 = rademacher_whitened_tail_fence(X, horizon_t=20)
    assert abs(r6["rademacher_tail_radius"] - r20["rademacher_tail_radius"]) < 1e-12


def test_anchor_free_dual_luck_and_tau_hat():
    supp = np.linspace(-10.0, 10.0, 9)
    skill = np.array([0.05, 0.08, 0.12, 0.20, 0.25, 0.15, 0.08, 0.04, 0.03], dtype=float)
    realized = np.array([0.02, 0.05, 0.10, 0.18, 0.22, 0.20, 0.12, 0.07, 0.04], dtype=float)
    grade = postgame_dual_luck_grade(realized, skill, supp)
    assert grade["tangri_survey_anchors_removed"] == 1.0
    assert grade["sinkhorn_dual_residual"] < 1e-8

    y = np.array([-4.0, -1.5, 0.5, 2.0, 5.5], dtype=float)
    v = np.array([2.0, 2.0, 2.0, 2.0, 2.0], dtype=float)
    sh = tau_hat_shrinkage_live(y, v)
    assert np.var(sh["tau_hat"]) < np.var(y)

    flow = np.array([[0.0, 2.0, 0.0], [0.0, 0.0, 2.0], [2.0, 0.0, 0.0]], dtype=float)
    sol = solenoidal_conservation_gate(flow)
    assert sol["max_nodal_divergence"] == 0.0
    met = katch_mcardle_metabolic_fence(80.0)
    assert abs(met["bmr_kcal"] - 2098.0) < 1e-9


def test_ghosal_nutz_rate_lavenant_riemannian_and_janati_unbalanced():
    grid_x = np.linspace(0.0, 1.0, 5)
    C = (grid_x[:, None] - grid_x[None, :]) ** 2
    mu = np.array([0.32, 0.25, 0.18, 0.15, 0.10], dtype=float)
    nu = np.array([0.10, 0.15, 0.22, 0.25, 0.28], dtype=float)

    gn = ghosal_nutz_sinkhorn_rate_certificate(C, mu, nu, eps=0.10)
    assert gn["rate_certificate_passed"] is True
    assert gn["dual_residual"] <= gn["ghosal_nutz_1_over_t_bound"]
    assert 0.0 < gn["birkhoff_hopf_kappa"] < 1.0

    lav = lavenant_riemannian_sinkhorn_divergence(C, mu, nu, eps=0.10)
    assert lav["debiased_sinkhorn_divergence"] >= 0.0
    assert lav["self_divergence_mu"] == 0.0
    assert lav["riemannian_hessian_metric_g_eps"] > 0.0
    with pytest.raises(SinkhornLyapunovError, match="not jointly convex"):
        lavenant_riemannian_sinkhorn_divergence(C, mu, nu, eps=0.10, assume_joint_convexity=True)
    with pytest.raises(SinkhornLyapunovError, match="fails the triangle inequality"):
        lavenant_riemannian_sinkhorn_divergence(C, mu, nu, eps=0.10, assume_sqrt_triangle_inequality=True)

    jan = janati_unbalanced_gaussian_sinkhorn_closed_form(24.0, 36.0, 21.0, 40.0, eps=0.15, tau_kl=1.2)
    assert jan["closed_form_cross_covariance"] > 0.0
    assert 0.0 < jan["unbalanced_mass_scaling_factor"] <= 1.0

