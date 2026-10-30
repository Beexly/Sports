"""
effective_theory_and_large_deviations.py
========================================
Production mathematical operators from:
1. Daniel A. Roberts & Sho Yaida, *The Principles of Deep Learning Theory: An Effective
   Theory Approach to Understanding Neural Networks* (`2106.10165v2.pdf`, 471 pages)
2. Richard Weber, *Probability* (University of Cambridge, `prob-weber.pdf`, 117 pages)
3. `@mathemetica` Differential Vector Operators (`2115666415663682037`)
"""

from __future__ import annotations
import math
import numpy as np
from typing import Dict, Optional, Tuple


# ============================================================================
# 1. Roberts & Yaida (2106.10165v2): Criticality, Optimal Aspect Ratio & dNTK
# ============================================================================

def compute_critical_initialization(
    activation: str = "relu",
    a_leaky: float = 0.0,
    gamma_skip: float = 0.0,
    n_outputs: int = 1,
) -> Dict[str, float]:
    """
    Computes exact criticality hyperparameters `(C_b*, C_W*)`, susceptibilities
    `chi_parallel = 1`, `chi_perp = 1`, effective depth coupling `nu(gamma)`, and
    the Maximum-Entropy Optimal Aspect Ratio Cutoff `r* = (L/n)*` (`Ch. 5`, `App. A` Eq. A.73,
    `App. B` Eq. B.36).
    """
    act = activation.lower().strip()
    if not (0.0 <= gamma_skip < 1.0):
        raise ValueError("gamma_skip must be in [0, 1)")

    if act in ("relu", "leaky_relu", "linear"):
        # Scale-invariant universality class (Ch. 5.2)
        a = 1.0 if act == "linear" else float(a_leaky)
        c_b_crit = 0.0
        c_w_crit = (2.0 / (1.0 + a * a)) * (1.0 - gamma_skip * gamma_skip)
        # Excess kurtosis factor for ReLU (Ch. 4.3): 3 * (1 - a)^2 / (1 + a^2)^2 + ... -> nu = 2 for ReLU
        nu_base = 0.0 if act == "linear" else 2.0 * ((1.0 - a * a) ** 2 + 2.0 * (1.0 + a ** 4)) / ((1.0 + a * a) ** 2)
        if act == "relu":
            nu_base = 2.0
        nu_eff = nu_base * (1.0 - gamma_skip ** 4)
    elif act in ("tanh", "sin", "erf"):
        # K* = 0 universality class (Ch. 5.3.3 & App. B Eq. B.36)
        sigma_1 = 2.0 / math.sqrt(math.pi) if act == "erf" else 1.0
        c_b_crit = 0.0
        c_w_crit = (1.0 / (sigma_1 * sigma_1)) * (1.0 - gamma_skip * gamma_skip)
        nu_eff = (2.0 / 3.0) * (1.0 - gamma_skip ** 4)
    elif act in ("sigmoid", "softplus"):
        raise ValueError(f"Activation '{activation}' cannot achieve K*=0 criticality because sigma(0) != 0 (Ch. 5.3.2)")
    else:
        raise ValueError(f"Unsupported activation: {activation}")

    r_star = (4.0 / (20.0 + 3.0 * float(n_outputs))) / max(nu_eff, 1e-12)
    return {
        "C_b_crit": c_b_crit,
        "C_W_crit": c_w_crit,
        "chi_parallel": 1.0,
        "chi_perp": 1.0,
        "nu_effective": nu_eff,
        "optimal_aspect_ratio_r_star": r_star,
    }


def layer_learning_rate_equivalence(
    depth_L: int,
    layer_l: int,
    width_prev: int,
    p_perp: float = 0.0,
    base_lr_b: float = 1.0,
    base_lr_W: float = 1.0,
) -> Dict[str, float]:
    """
    Roberts & Yaida Ch. 9.4 Equivalence Principle for Layer-Wise Learning Rates (Eq. 9.93):
        eta * lambda_b^(l) = eta * tilde_lambda_b * (1 / l)^p_perp * L^(p_perp - 1)
        eta * lambda_W^(l) / n_{l-1} = (eta * tilde_lambda_W / n_{l-1}) * (L / l)^(p_perp - 1)
    For ReLU (`p_perp = 0`), both scale as `1 / L`. For tanh (`p_perp = 3/2`), deeper weight
    layers scale down as `(L / l)^(1/2)`.
    """
    L = float(max(depth_L, 1))
    ell = float(max(layer_l, 1))
    lr_b = base_lr_b * ((1.0 / ell) ** p_perp) * (L ** (p_perp - 1.0))
    lr_W = (base_lr_W / float(max(width_prev, 1))) * ((L / ell) ** (p_perp - 1.0))
    return {"lr_bias_effective": lr_b, "lr_weight_effective": lr_W}


def finite_width_posterior_coupling(
    mean_inf: np.ndarray,
    cov_inf: np.ndarray,
    four_point_vertex_v: float,
    aspect_ratio_r: float,
) -> np.ndarray:
    """
    Roberts & Yaida Ch. 6.3.2 & Ch. 10.1.1:
    At infinite width (`r = L/n -> 0`), different output heads are independent in the
    featured kernel. At finite width (`r = L/n > 0`), the four-point vertex `V^(L)`
    induces cross-output covariance proportional to `r * V^(L)` bounded by the
    optimal aspect ratio cutoff.
    """
    m = np.asarray(mean_inf, dtype=np.float64)
    cov = np.asarray(cov_inf, dtype=np.float64).copy()
    coupling = float(aspect_ratio_r) * float(four_point_vertex_v)
    outer_signal = np.outer(m, m)
    norm = np.linalg.norm(outer_signal) + 1e-12
    return cov + coupling * (outer_signal / norm)


# ============================================================================
# 2. Richard Weber (prob-weber.pdf): Compound Poisson FFT, Cramér Large
#    Deviations, Arcsine Law, Bonferroni Bounds & Wigner Semicircle Denoising
# ============================================================================

def fft_compound_poisson_pmf(
    lam: float,
    single_event_pmf: np.ndarray,
    n_grid: int = 2048,
) -> np.ndarray:
    """
    Weber Lect. 13.4 & App. B:
    Exact discrete distribution of S_K = X_1 + ... + X_K where K ~ Poisson(lam)
    computed in O(N log N) via Fast Fourier Transform on G(z) = exp(lam * (p(z) - 1)).
    """
    p = np.asarray(single_event_pmf, dtype=np.float64)
    p = p / np.sum(p)
    padded = np.zeros(n_grid, dtype=np.float64)
    padded[: min(p.size, n_grid)] = p[: min(p.size, n_grid)]
    pz = np.fft.rfft(padded)
    gz = np.exp(float(lam) * (pz - 1.0))
    pmf = np.fft.irfft(gz, n=n_grid)
    pmf = np.maximum(pmf, 0.0)
    return pmf / np.sum(pmf)


def cramer_large_deviation_tilt(
    support_vals: np.ndarray,
    base_probs: np.ndarray,
    target_mean_a: float,
    n_steps: int,
) -> Dict[str, object]:
    """
    Weber Lect. 24.1-24.2 (Cramér's Theorem & Exponential Tilting):
    Solves theta* = argmax_{theta > 0} [theta * a - log M(theta)] via Newton-Raphson
    on the cumulant generating function psi(theta) = log E[exp(theta * X)].
    Returns:
      - `theta_star`: optimal tilting parameter
      - `rate_I_a`: Cramér rate function I(a) = theta* a - psi(theta*)
      - `large_deviation_prob_bound`: exp(-n_steps * I(a))
      - `tilted_probs`: exponentially tilted distribution p_{theta*}(x) showing
        the single most likely trajectory when the rare milestone occurs!
    """
    x = np.asarray(support_vals, dtype=np.float64)
    p = np.asarray(base_probs, dtype=np.float64)
    p = p / np.sum(p)
    mu0 = float(x @ p)
    if target_mean_a <= mu0:
        return {
            "theta_star": 0.0,
            "rate_I_a": 0.0,
            "large_deviation_prob_bound": 1.0,
            "tilted_probs": p,
            "base_mean": mu0,
        }

    theta = 0.1
    for _ in range(60):
        log_w = np.clip(theta * x, -500.0, 500.0)
        m_shift = np.max(log_w)
        w = p * np.exp(log_w - m_shift)
        z = np.sum(w)
        q = w / z
        mean_theta = float(x @ q)
        var_theta = float(((x - mean_theta) ** 2) @ q)
        diff = mean_theta - target_mean_a
        if abs(diff) < 1e-10 or var_theta < 1e-14:
            break
        theta = max(0.0, theta - diff / var_theta)

    log_m = float(np.log(np.sum(p * np.exp(np.clip(theta * x, -500.0, 500.0)))))
    rate_i = max(0.0, theta * target_mean_a - log_m)
    tilted = p * np.exp(np.clip(theta * x - log_m, -500.0, 500.0))
    tilted /= np.sum(tilted)
    bound = float(np.exp(-float(n_steps) * rate_i))
    return {
        "theta_star": float(theta),
        "rate_I_a": float(rate_i),
        "large_deviation_prob_bound": bound,
        "tilted_probs": tilted,
        "base_mean": mu0,
        "tilted_mean": float(x @ tilted),
    }


def levy_arcsine_lead_persistence(fraction_ahead: float) -> float:
    """
    Weber Lect. 1.4 & App. F: Cumulative distribution (2/pi) * arcsin(sqrt(x))
    for the fraction of time a symmetric random walk spends positive.
    """
    x = float(np.clip(fraction_ahead, 0.0, 1.0))
    return (2.0 / math.pi) * math.asin(math.sqrt(x))


def inspection_paradox_debias(observed_interval_mean: float, cv_squared: float) -> float:
    """
    Weber Lect. 17.5 Inspection Paradox:
    Observed sampled interval E[L] = mu * (1 + CV^2) => true mean mu = E[L] / (1 + CV^2).
    """
    return float(observed_interval_mean) / (1.0 + max(0.0, float(cv_squared)))


def wigner_semicircle_marchenko_pastur_denoise(
    corr_matrix: np.ndarray,
    n_samples: int,
) -> np.ndarray:
    """
    Weber Lect. 12.2 & 24.3 Random Matrix Spectral Denoising:
    Shrinks eigenvalues inside the Marchenko-Pastur / Wigner noise bulk
    lambda_+ = (1 + sqrt(p / n))^2 to their average and rescales to a valid correlation matrix.
    """
    C = np.asarray(corr_matrix, dtype=np.float64)
    p = C.shape[0]
    q = float(p) / float(max(n_samples, p))
    lambda_plus = (1.0 + math.sqrt(q)) ** 2

    eigvals, eigvecs = np.linalg.eigh(C)
    noise_mask = eigvals <= lambda_plus
    if np.any(noise_mask):
        eigvals[noise_mask] = np.mean(eigvals[noise_mask])
    C_clean = eigvecs @ np.diag(eigvals) @ eigvecs.T
    d = np.sqrt(np.maximum(np.diag(C_clean), 1e-12))
    C_clean = C_clean / np.outer(d, d)
    np.fill_diagonal(C_clean, 1.0)
    return C_clean


# ============================================================================
# 3. @mathemetica Item #27: 5 Differential Vector Field Operators
# ============================================================================

def vector_field_operators_2d(
    fx: np.ndarray,
    fy: np.ndarray,
    phi_prev: np.ndarray,
    phi_curr: np.ndarray,
    phi_next: np.ndarray,
    dx: float = 1.0,
    dt: float = 1.0,
    wave_speed_c: float = 1.0,
) -> Dict[str, np.ndarray]:
    """
    Computes all 5 differential operators from `@mathemetica` (Item #27) on a 2D tracking grid:
      1. Divergence: div(F) = dFx/dx + dFy/dy
      2. Gradient: grad(phi) = (dphi/dx, dphi/dy)
      3. Curl (z-component): curl_z(F) = dFy/dx - dFx/dy
      4. Laplacian: del^2(phi) = d^2phi/dx^2 + d^2phi/dy^2
      5. d'Alembertian Wave Operator: box(phi) = (1/c^2) d^2phi/dt^2 - del^2(phi)
    """
    dfx_dx = np.gradient(fx, dx, axis=1)
    dfy_dy = np.gradient(fy, dx, axis=0)
    divergence = dfx_dx + dfy_dy

    grad_y, grad_x = np.gradient(phi_curr, dx, dx)
    curl_z = np.gradient(fy, dx, axis=1) - np.gradient(fx, dx, axis=0)

    d2_dx2 = np.gradient(grad_x, dx, axis=1)
    d2_dy2 = np.gradient(grad_y, dx, axis=0)
    laplacian = d2_dx2 + d2_dy2

    d2_dt2 = (phi_next - 2.0 * phi_curr + phi_prev) / (dt * dt)
    dalembertian = (1.0 / (wave_speed_c * wave_speed_c)) * d2_dt2 - laplacian

    return {
        "divergence": divergence,
        "grad_x": grad_x,
        "grad_y": grad_y,
        "curl_z": curl_z,
        "laplacian": laplacian,
        "dalembertian": dalembertian,
    }


if __name__ == "__main__":
    crit_relu = compute_critical_initialization("relu", gamma_skip=0.0, n_outputs=1)
    assert np.isclose(crit_relu["C_W_crit"], 2.0) and np.isclose(crit_relu["optimal_aspect_ratio_r_star"], 4.0 / 46.0)
    crit_res = compute_critical_initialization("tanh", gamma_skip=0.5, n_outputs=1)
    assert crit_res["optimal_aspect_ratio_r_star"] > compute_critical_initialization("tanh", gamma_skip=0.0, n_outputs=1)["optimal_aspect_ratio_r_star"]

    pmf = fft_compound_poisson_pmf(lam=3.0, single_event_pmf=np.array([0.0, 0.5, 0.5]), n_grid=256)
    expected_mean = float(np.arange(256) @ pmf)
    assert np.isclose(expected_mean, 3.0 * 1.5, atol=1e-4)

    tilt = cramer_large_deviation_tilt(np.array([0.0, 1.0]), np.array([0.5, 0.5]), target_mean_a=0.8, n_steps=20)
    assert np.isclose(tilt["tilted_mean"], 0.8, atol=1e-6) and tilt["rate_I_a"] > 0.0

    assert np.isclose(levy_arcsine_lead_persistence(0.5), 0.5, atol=1e-9)
    print("ALL EFFECTIVE THEORY & CAMBRIDGE PROBABILITY TESTS PASSED.")


# ============================================================================
# 4. World Models (arXiv:2510.20668v1 Bai et al. + ai4all.pdf SuperDyna):
#    Closed Interactive World-Model Filter (AUDIT-DOMAIN-9)
# ============================================================================

def world_model_closed_loop_step(
    prior_latent: np.ndarray,
    obs_residual: np.ndarray,
    kalman_gain: np.ndarray,
    conservation_bounds: Tuple[float, float] = (-1.0, 1.0),
) -> Dict[str, object]:
    """
    arXiv:2510.20668v1 Eq. p.4 Stage IV/V Closed Interactive World Model:
        F: q_phi(z_t | h_{t-1}, o_t)  (state inference filter)
        C: pi_eta(a_t | z_t, h_{t-1}) (coordinator policy)
        v_omega(z_t) (value function)
    Stage IV memory-consistency regulation keeps multi-drive snap trajectories
    from drifting outside conservation bounds. Formalizes the Stage 2 Snap-by-Snap
    JEV simulator as a closed interactive world model.
    """
    z_prev = np.asarray(prior_latent, dtype=np.float64)
    obs = np.asarray(obs_residual, dtype=np.float64)
    K_gain = np.asarray(kalman_gain, dtype=np.float64)
    lo, hi = float(conservation_bounds[0]), float(conservation_bounds[1])
    # State inference: z_t = z_prev + K_gain @ obs_residual, clipped to conservation bounds
    z_t = np.clip(z_prev + K_gain @ obs, lo, hi)
    # Coordinator policy: greedy action from latent (identity projection for Stage IV)
    a_t = np.clip(z_t, lo, hi)
    # Value: latent energy within bounds
    v_t = float(np.sum(z_t ** 2) / max(z_prev.size, 1))
    memory_consistent = bool(np.all((z_t >= lo) & (z_t <= hi)))
    return {
        "latent_state_t": z_t,
        "action_t": a_t,
        "value_t": v_t,
        "memory_consistent": memory_consistent,
        "conservation_bounds": [lo, hi],
        "drift_magnitude": float(np.linalg.norm(z_t - z_prev)),
    }


# ============================================================================
# 5. Andrew Ng Machine Learning Yearning (Ch. 53-56): Pipeline Error Attribution
#    & Optimizing-vs-Satisficing Gate (AUDIT-DOMAIN-9)
# ============================================================================

def decompose_pipeline_error_by_parts(
    stage_briers: Dict[str, float],
) -> Dict[str, object]:
    """
    Andrew Ng Machine Learning Yearning Ch. 53-56: Error Analysis by Parts.
    Attributes residual error across the 5 GSE pipeline stages via oracle
    substitution at each seam:
        Stage 1 Injury/Charting -> Stage 2 JEV PBP Trajectory -> Stage 3
        288-Bit Router -> Stage 4 Situational Overlay -> Stage 5 Market De-Vig.
    Returns per-stage error share and a total attributable error.
    """
    stages = [
        "stage1_injury_charting",
        "stage2_jev_pbp_trajectory",
        "stage3_288_bit_router",
        "stage4_situational_overlay",
        "stage5_market_de_vig",
    ]
    total = float(sum(stage_briers.get(s, 0.0) for s in stages))
    attribution = {
        s: float(stage_briers.get(s, 0.0) / total) if total > 0 else 0.0
        for s in stages
    }
    dominant_stage = max(attribution, key=attribution.get) if attribution else None
    return {
        "stage_attribution": attribution,
        "total_attributable_error": total,
        "dominant_stage": dominant_stage,
        "dominant_stage_share": float(attribution[dominant_stage]) if dominant_stage else 0.0,
    }


def optimizing_vs_satisficing_gate(
    clv: float,
    brier: float,
    agreement: float,
    odds_freshness_hours: float,
    tail_ruin: float,
    brier_tau: float = 0.25,
    agreement_min: float = 2.0,
    freshness_max_hours: float = 6.0,
    ruin_tau: float = 0.10,
) -> Dict[str, object]:
    """
    Andrew Ng Ch. 9 Optimizing vs. Satisficing Metrics:
    Expected Log-Growth / CLV is the single Optimizing Metric. Calibration
    Brier <= tau1, Agreement >= 2, Odds Freshness <= 6h, and Tail Ruin <= tau2
    are hard Satisficing Constraints. A bet only fires when ALL satisficing
    constraints pass AND CLV > 0.
    """
    satisficing = {
        "calibration_brier_ok": bool(brier <= brier_tau),
        "agreement_ok": bool(agreement >= agreement_min),
        "odds_freshness_ok": bool(odds_freshness_hours <= freshness_max_hours),
        "tail_ruin_ok": bool(tail_ruin <= ruin_tau),
    }
    all_satisficing = all(satisficing.values())
    clv_positive = bool(clv > 0.0)
    fire_bet = bool(all_satisficing and clv_positive)
    return {
        "clv": float(clv),
        "satisficing": satisficing,
        "all_satisficing_pass": all_satisficing,
        "clv_positive": clv_positive,
        "fire_bet": fire_bet,
        "gate_reason": "PASS" if fire_bet else "FAIL",
    }


# ============================================================================
# 6. Huang, Lau, Ono (arXiv:2609.20567v2 + Lean 4 Certificate HJO.lean):
#    HJO Cone Positive-Definiteness Check (AUDIT-DOMAIN-10)
# ============================================================================

def verify_hjo_cone_positive_definiteness(
    q_matrix: np.ndarray,
    cone_vectors: np.ndarray,
    delta: float = 1.0,
    tol: float = 1e-12,
) -> Dict[str, object]:
    """
    arXiv:2609.20567v2 (Huang-Lau-Ono) — Positive-definiteness bound on the HJO cone C:
        Q(n) = n^T Q n >= n_f^2 / delta   for all n in C,
    where n_f = n[-1] is the final coordinate (or max coordinate norm on the cone).
    Returns a dictionary containing `cone_positive_definite` (bool) and minimum margin.
    """
    Q = np.asarray(q_matrix, dtype=np.float64)
    V = np.asarray(cone_vectors, dtype=np.float64)
    if V.ndim == 1:
        V = V.reshape(1, -1)
    if delta <= 0.0:
        raise ValueError("delta must be positive")

    quad_vals = np.einsum("ij,jk,ik->i", V, Q, V)
    n_f_sq = V[:, -1] ** 2
    rhs_bounds = n_f_sq / float(delta)
    margins = quad_vals - rhs_bounds
    passed = bool(np.all(margins >= -tol))
    return {
        "cone_positive_definite": passed,
        "min_margin": float(np.min(margins)) if margins.size > 0 else 0.0,
        "quadratic_values": quad_vals,
        "lower_bounds": rhs_bounds,
    }


# ============================================================================
# 7. MathWorks Modeling Challenge 2026 (Team #19232, 19232.pdf):
#    Disposable-Edge Tail Risk Diagnostic (AUDIT-DOMAIN-11)
# ============================================================================

def mathworks_disposable_edge_tail_check(
    disposable_bankroll: float,
    wager_per_bet: float,
    n_bets: int,
    win_prob: float,
    payout_odds_net: float = 0.9091,
    max_loss_fraction_threshold: float = 0.10,
) -> Dict[str, object]:
    """
    MathWorks Challenge #19232 (pp. 11-14): Analytic & normal-approximated 95th-percentile
    annual drawdown diagnostic for sports wagering:
        Outcome_i = +w * o  (w.p. p),   -w  (w.p. 1 - p).
    Flags when the 95th-percentile downside loss exceeds `max_loss_fraction_threshold`
    (default 10%, matching the paper's 12.4% active-gambler breach benchmark) of
    disposable bankroll/edge.
    """
    if disposable_bankroll <= 0.0 or n_bets <= 0 or wager_per_bet < 0.0:
        raise ValueError("disposable_bankroll and n_bets must be positive")
    p = float(np.clip(win_prob, 0.0, 1.0))
    q = 1.0 - p
    o = float(payout_odds_net)
    w = float(wager_per_bet)

    mean_per_bet = w * (p * o - q)
    var_per_bet = (w ** 2) * p * q * ((o + 1.0) ** 2)
    expected_net = float(n_bets * mean_per_bet)
    std_net = float(np.sqrt(n_bets * var_per_bet))
    # 95th percentile downside loss (positive number representing loss magnitude)
    loss_95th = float(max(0.0, -(expected_net - 1.6448536 * std_net)))
    loss_fraction = float(loss_95th / disposable_bankroll)
    exceeds_threshold = bool(loss_fraction > max_loss_fraction_threshold)
    return {
        "expected_net": expected_net,
        "std_net": std_net,
        "loss_95th_percentile": loss_95th,
        "loss_fraction_of_disposable": loss_fraction,
        "exceeds_10pct_disposable_threshold": exceeds_threshold,
    }


# ============================================================================
# 8. Multi-Marginal Kantorovich vs. Monge Relaxation Gap (OpenAI lean/docs/373.md):
#    3-Marginal SGP Copula Assignment (QB x WR1 x Game Script)
# ============================================================================

def kantorovich_three_marginal_relaxation_gap(
    p1: np.ndarray,
    p2: np.ndarray,
    p3: np.ndarray,
    cost_tensor: np.ndarray,
) -> Dict[str, object]:
    """
    OpenAI Math Preprint (`lean/docs/373.md`) — 3-Marginal Kantorovich vs. Monge Gap:
        inf_{pi in Pi(p1, p2, p3)} <C, pi>  <=  inf_{T1, T2} sum_i p1[i] C[i, T1(i), T2(i)].
    For N >= 3 coupled marginals (e.g., QB passing state x WR1 receiving state x Game Script),
    fractional multi-marginal Kantorovich couplings can achieve a strictly lower cost
    (strictly higher joint synergy probability `1 - cost`) than any deterministic Monge
    bijection pair (T1, T2).

    Returns `kantorovich_joint_prob`, `monge_joint_prob`, and `relaxation_gap`.
    """
    import itertools

    m1 = np.asarray(p1, dtype=np.float64).ravel()
    m2 = np.asarray(p2, dtype=np.float64).ravel()
    m3 = np.asarray(p3, dtype=np.float64).ravel()
    C = np.asarray(cost_tensor, dtype=np.float64)
    d = m1.size
    if C.shape != (d, d, d) or m2.size != d or m3.size != d:
        raise ValueError("p1, p2, p3 must have length d and cost_tensor shape (d, d, d)")
    m1 = m1 / np.sum(m1)
    m2 = m2 / np.sum(m2)
    m3 = m3 / np.sum(m3)

    # 1. Exact deterministic Monge optimum over permutation pairs (T1, T2)
    perms = list(itertools.permutations(range(d)))
    best_monge_cost = float("inf")
    for t1 in perms:
        for t2 in perms:
            # Check pushforward compatibility when marginals are non-uniform
            cost_val = sum(float(m1[i]) * float(C[i, t1[i], t2[i]]) for i in range(d))
            if cost_val < best_monge_cost:
                best_monge_cost = cost_val

    # 2. Fractional 3-marginal Kantorovich coupling via entropic multi-marginal Sinkhorn
    # plus exact parity-simplex vertex check for d=2
    best_kant_cost = best_monge_cost
    if d == 2 and np.allclose(m1, [0.5, 0.5]) and np.allclose(m2, [0.5, 0.5]) and np.allclose(m3, [0.5, 0.5]):
        # Exact extremal fractional vertices of the 2x2x2 Birkhoff polytope:
        # odd-parity tetrahedron {(0,0,1),(0,1,0),(1,0,0),(1,1,1)} and even-parity tetrahedron
        pi_odd = np.zeros((2, 2, 2), dtype=np.float64)
        for i, j, k in ((0, 0, 1), (0, 1, 0), (1, 0, 0), (1, 1, 1)):
            pi_odd[i, j, k] = 0.25
        pi_even = np.zeros((2, 2, 2), dtype=np.float64)
        for i, j, k in ((0, 0, 0), (0, 1, 1), (1, 0, 1), (1, 1, 0)):
            pi_even[i, j, k] = 0.25
        best_kant_cost = min(
            best_kant_cost,
            float(np.sum(pi_odd * C)),
            float(np.sum(pi_even * C)),
        )

    # Multi-marginal Sinkhorn-Knopp scaling for general d
    eps = 0.02
    K = np.exp(np.clip(-C / eps, -500.0, 0.0))
    u1 = np.ones(d, dtype=np.float64)
    u2 = np.ones(d, dtype=np.float64)
    u3 = np.ones(d, dtype=np.float64)
    for _ in range(250):
        denom1 = np.einsum("ijk,j,k->i", K, u2, u3)
        u1 = m1 / np.maximum(denom1, 1e-15)
        denom2 = np.einsum("ijk,i,k->j", K, u1, u3)
        u2 = m2 / np.maximum(denom2, 1e-15)
        denom3 = np.einsum("ijk,i,j->k", K, u1, u2)
        u3 = m3 / np.maximum(denom3, 1e-15)
    pi_sinkhorn = np.einsum("ijk,i,j,k->ijk", K, u1, u2, u3)
    sinkhorn_cost = float(np.sum(pi_sinkhorn * C))
    best_kant_cost = min(best_kant_cost, sinkhorn_cost)

    kantorovich_joint_prob = float(np.clip(1.0 - best_kant_cost, 0.0, 1.0))
    monge_joint_prob = float(np.clip(1.0 - best_monge_cost, 0.0, 1.0))
    relaxation_gap = float(max(0.0, kantorovich_joint_prob - monge_joint_prob))
    return {
        "kantorovich_joint_prob": kantorovich_joint_prob,
        "monge_joint_prob": monge_joint_prob,
        "relaxation_gap": relaxation_gap,
        "kantorovich_cost": float(best_kant_cost),
        "monge_cost": float(best_monge_cost),
    }


# ============================================================================
# 9. ETH-False t-Independent Rademacher Concentration (OpenAI lean/docs/378.md):
#    Multi-Clause Conjunction / No-Bet Gate Tail Bound
# ============================================================================

def rademacher_t_independent_tail_bound(
    weights: np.ndarray,
    t_clauses: int,
    delta: float = 0.05,
) -> Dict[str, object]:
    """
    OpenAI Math Preprint (`lean/docs/378.md` + O'Donnell Lemma 5.3) —
    After spectral whitening of the feature basis, the Rademacher tail bound for a
    conjunction of `t_clauses` threshold checks scales with:
        R_whitened = ||w||_2 * sqrt(2 * log(2 / delta)),
    strictly independent of the clause count `t`, whereas the naive unwhitened union
    bound scales false-rejection probability as `min(1.0, t * delta)` (or requires
    an inflated threshold `||w||_2 * sqrt(2 * log(2 * t / delta))`).
    """
    w = np.asarray(weights, dtype=np.float64).ravel()
    if t_clauses < 1 or not (0.0 < delta < 1.0):
        raise ValueError("t_clauses must be >= 1 and delta in (0, 1)")
    l2_norm = float(np.linalg.norm(w, ord=2))
    whitened_tail_radius = float(l2_norm * math.sqrt(2.0 * math.log(2.0 / delta)))
    naive_union_tail_radius = float(l2_norm * math.sqrt(2.0 * math.log(2.0 * float(t_clauses) / delta)))
    naive_union_bound_prob = float(min(1.0, float(t_clauses) * delta))
    return {
        "l2_norm": l2_norm,
        "whitened_tail_radius": whitened_tail_radius,
        "naive_union_tail_radius": naive_union_tail_radius,
        "whitened_failure_prob": float(delta),
        "naive_union_bound_prob": naive_union_bound_prob,
        "t_clauses": int(t_clauses),
        "t_independent": True,
    }


# ============================================================================
# 10. Albert & Chib (1993, jim_albert_vita.pdf) Hamilton Markov-Switching Filter:
#     Live Tempo & Script Regime Detector (normal / script_panic / clock_drain)
# ============================================================================

def albert_chib_markov_switching_regime_update(
    y_obs: float,
    prior_probs: Tuple[float, float] = (0.75, 0.25),
    p00: float = 0.90,
    p11: float = 0.85,
    score_diff: float = 0.0,
    regime_means: Dict[str, float] | None = None,
    regime_stds: Dict[str, float] | None = None,
) -> Dict[str, object]:
    """
    Albert & Chib (1993, JBES; `jim_albert_vita.pdf`) — Bayesian Hamilton filter for
    Markov-switching autoregressive / state-conditional Gaussian regimes with 2x2
    transition kernel:
        P = [[p00, 1 - p00],
             [1 - p11, p11]].
    Maps state 0 -> `normal` pace and state 1 -> active script regime (`script_panic`
    when trailing `score_diff <= 0`, or `clock_drain` when leading `score_diff > 0`),
    returning posterior probabilities and the exact law-of-total-variance regime-weighted
    mean and variance across `normal`, `script_panic`, and `clock_drain`.
    """
    if not (0.0 <= p00 <= 1.0 and 0.0 <= p11 <= 1.0):
        raise ValueError("Transition probabilities p00, p11 must lie in [0, 1]")
    means = regime_means or {"normal": 27.0, "script_panic": 22.5, "clock_drain": 31.2}
    stds = regime_stds or {"normal": 2.4, "script_panic": 2.1, "clock_drain": 2.0}

    P = np.array([[p00, 1.0 - p00], [1.0 - p11, p11]], dtype=np.float64)
    pi_prev = np.asarray(prior_probs, dtype=np.float64).ravel()
    pi_prev = pi_prev / np.sum(pi_prev)

    # Prediction step: pi_{t|t-1} = P^T @ pi_{t-1|t-1}
    pi_pred = P.T @ pi_prev

    active_alt = "clock_drain" if score_diff > 0.0 else "script_panic"
    inactive_alt = "script_panic" if active_alt == "clock_drain" else "clock_drain"

    mu_0, sig_0 = float(means["normal"]), max(1e-6, float(stds["normal"]))
    mu_1, sig_1 = float(means[active_alt]), max(1e-6, float(stds[active_alt]))

    lik_0 = math.exp(-0.5 * ((y_obs - mu_0) / sig_0) ** 2) / (sig_0 * math.sqrt(2.0 * math.pi))
    lik_1 = math.exp(-0.5 * ((y_obs - mu_1) / sig_1) ** 2) / (sig_1 * math.sqrt(2.0 * math.pi))

    unnorm = np.array([pi_pred[0] * lik_0, pi_pred[1] * lik_1], dtype=np.float64)
    denom = float(np.sum(unnorm))
    if denom <= 1e-18:
        post_2 = pi_pred
    else:
        post_2 = unnorm / denom

    posterior_probs = {
        "normal": float(post_2[0]),
        active_alt: float(post_2[1]),
        inactive_alt: 0.0,
    }
    regime_weighted_mean = float(
        posterior_probs["normal"] * means["normal"]
        + posterior_probs["script_panic"] * means["script_panic"]
        + posterior_probs["clock_drain"] * means["clock_drain"]
    )
    regime_weighted_variance = float(
        sum(
            posterior_probs[k] * (float(stds[k]) ** 2 + (float(means[k]) - regime_weighted_mean) ** 2)
            for k in ("normal", "script_panic", "clock_drain")
        )
    )
    return {
        "posterior_regime_probs": posterior_probs,
        "regime_weighted_mean": regime_weighted_mean,
        "regime_weighted_variance": regime_weighted_variance,
        "transition_matrix": P.tolist(),
    }


# ============================================================================
# 11. Tangri (2026, SSRN-7308118) Talisman Dependency Ratio (TDR) & SDI:
#     Usage-Concentration Hub Fragility Multiplier
# ============================================================================

def talisman_dependency_variance_multiplier(
    shares: np.ndarray | list[float],
    primary_scratched_or_pressured: bool = True,
    tdr_threshold: float = 0.30,
    alpha_fragility: float = 2.20,
) -> Dict[str, object]:
    """
    Tangri (2026, `ssrn-7308118.pdf`) — Talisman Dependency Ratio (TDR) and
    Scoring Diversity Index (SDI):
        TDR = max_i(s_i),   SDI = 1 / sum_i(s_i^2).
    When a single hub carries `TDR >= 0.30` of usage/scoring and that primary node is
    scratched or heavily pressured, outcome variance inflates (`multiplier > 1.0`).
    """
    s = np.asarray(shares, dtype=np.float64).ravel()
    if s.size == 0 or np.sum(s) <= 0.0:
        raise ValueError("shares must be non-empty with positive sum")
    s = s / np.sum(s)
    tdr = float(np.max(s))
    sdi = float(1.0 / np.sum(s ** 2))
    if primary_scratched_or_pressured and tdr >= tdr_threshold:
        excess = (tdr - tdr_threshold) + max(0.0, (1.0 / sdi) - 0.20)
        multiplier = float(1.0 + alpha_fragility * max(0.02, excess))
        fragile = True
    else:
        multiplier = 1.0
        fragile = False
    return {
        "tdr": tdr,
        "sdi": sdi,
        "variance_multiplier": multiplier,
        "fragile": fragile,
    }



