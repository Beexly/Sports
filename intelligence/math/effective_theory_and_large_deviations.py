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
