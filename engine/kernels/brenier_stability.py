from typing import Dict
import numpy as np
from engine.transport.kantorovich_mmot import solve_multimarginal_kantorovich


class BrenierStabilityViolation(RuntimeError):
    """Raised when a live transport map violates the OpenAI #374 sharp 1/3 stability bound."""
    pass


def assert_brenier_one_third_modulus(
    T_mu: np.ndarray,
    T_nu: np.ndarray,
    rho_weights: np.ndarray,
    w2_mu_nu: float,
    domain_diameter: float,
    c_structural: float = 2.5
) -> Dict[str, float]:
    """
    Live-path certificate enforcing OpenAI Math Corpus Result #374 (Brenier.lean):
      || T_mu - T_nu ||_{L^2(rho)} <= C(Omega, K) * W_2(mu, nu)^(1/3).
    Also computes the Moreau-Yosida regularization parameter t* = W_2(mu, nu)^(2/3)
    and verifies that the empirical map variation respects the 1/3 cube-root envelope.
    """
    diff_sq = np.sum((T_mu - T_nu) ** 2, axis=-1)
    l2_map_diff = float(np.sqrt(np.sum(diff_sq * rho_weights)))
    C_bound = float(c_structural * max(domain_diameter, 1.0) ** (2.0 / 3.0))
    cube_root_w2 = float(max(w2_mu_nu, 0.0) ** (1.0 / 3.0))
    upper_envelope = C_bound * cube_root_w2 + 1e-9

    if l2_map_diff > upper_envelope:
        raise BrenierStabilityViolation(
            f"Brenier 1/3 stability violated: ||T_mu - T_nu||_L2 = {l2_map_diff:.5f} > "
            f"C * W_2^(1/3) = {upper_envelope:.5f} (W_2={w2_mu_nu:.5f})"
        )
    moreau_yosida_t = float(max(w2_mu_nu, 1e-12) ** (2.0 / 3.0))
    return {
        "l2_map_diff": l2_map_diff,
        "w2_target_distance": float(w2_mu_nu),
        "cube_root_w2": cube_root_w2,
        "brenier_bound_envelope": upper_envelope,
        "stability_utilization_ratio": float(l2_map_diff / upper_envelope),
        "moreau_yosida_scale_t": moreau_yosida_t,
    }


def compute_optimal_reallocation_map(
    source_pts: np.ndarray,
    target_mu_pts: np.ndarray,
    target_nu_pts: np.ndarray,
    rho_weights: np.ndarray,
    mu_weights: np.ndarray,
    nu_weights: np.ndarray
) -> Dict[str, object]:
    """
    Computes the barycentric Brenier maps T_mu and T_nu from source rho to targets mu and nu,
    computes W_2(mu, nu), and asserts the OpenAI Result #374 1/3 stability certificate
    directly on the live call path.
    """
    rho_w = np.asarray(rho_weights, dtype=float) / np.sum(rho_weights)
    mu_w = np.asarray(mu_weights, dtype=float) / np.sum(mu_weights)
    nu_w = np.asarray(nu_weights, dtype=float) / np.sum(nu_weights)

    C_rho_mu = np.sum((source_pts[:, None, :] - target_mu_pts[None, :, :]) ** 2, axis=-1)
    C_rho_nu = np.sum((source_pts[:, None, :] - target_nu_pts[None, :, :]) ** 2, axis=-1)
    C_mu_nu = np.sum((target_mu_pts[:, None, :] - target_nu_pts[None, :, :]) ** 2, axis=-1)

    ot_mu = solve_multimarginal_kantorovich(C_rho_mu, [rho_w, mu_w], lift_to_continuum=False)
    ot_nu = solve_multimarginal_kantorovich(C_rho_nu, [rho_w, nu_w], lift_to_continuum=False)
    ot_w2 = solve_multimarginal_kantorovich(C_mu_nu, [mu_w, nu_w], lift_to_continuum=False)

    # Barycentric Brenier map projection: T_mu(x_i) = sum_j (gamma_ij / rho_i) * y_j
    T_mu = (ot_mu["gamma"] / np.maximum(rho_w[:, None], 1e-15)) @ target_mu_pts
    T_nu = (ot_nu["gamma"] / np.maximum(rho_w[:, None], 1e-15)) @ target_nu_pts
    w2_dist = float(np.sqrt(max(ot_w2["kantorovich_cost"], 0.0)))

    all_pts = np.vstack([source_pts, target_mu_pts, target_nu_pts])
    diameter = float(np.max(np.linalg.norm(all_pts - np.mean(all_pts, axis=0), axis=-1)) * 2.0)

    brenier_cert = assert_brenier_one_third_modulus(T_mu, T_nu, rho_w, w2_dist, diameter)
    return {
        "T_mu": T_mu,
        "T_nu": T_nu,
        "brenier_certificate": brenier_cert,
        "ot_mu_certificate": ot_mu["birkhoff_certificate"],
        "ot_nu_certificate": ot_nu["birkhoff_certificate"],
    }
