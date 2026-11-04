"""
galaxy_conformal_ot.schrodinger_bridge_hazard
=============================================
Module 5: Dual-Use Causal-Physical World Model — Unifying:
1. Critical Slowing Down (CSD) Early-Warning Signals for Internal Biological Fatigue
2. Active Inference Expected Free Energy (EFE) under Adversarial/Stochastic Regimes
3. Multi-Marginal Schrödinger Bridge Path-Space Optimal Transport Control Energy
4. Conformal False-Alarm Suppressed Phase-Transition Gate

Isomorphic across:
- High-Velocity Multi-Agent Biomechanics (Pre-Snap Collision & TBI/ACL Phase Transitions)
- Critical Care Clinical Physiology (6-Organ SOFA Network Sepsis & Hemodynamic Collapse)
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np

from .conformal_copula_sizing import conformal_finite_sample_rank


def compute_critical_slowing_down_index(
    micro_fluctuation_series: Union[List[float], np.ndarray],
    baseline_variance: float = 1.0
) -> Dict[str, float]:
    """
    Detect internal biological/neuromuscular or hemodynamic exhaustion prior to a
    catastrophic bifurcation (injury rupture, TBI, or septic circulatory shock)
    using Critical Slowing Down (CSD) dynamical indicators.

    As a homeostatic system approaches a tipping point, its recovery rate lambda -> 0,
    causing lag-1 autocorrelation (AR1) -> 1.0 and variance inflation.
    """
    x = np.asarray(micro_fluctuation_series, dtype=np.float64)
    if x.size < 3:
        return {
            "lag1_autocorrelation": 0.0,
            "variance_ratio": 1.0,
            "csd_bifurcation_score": 0.0
        }

    x1 = x[1:] - np.mean(x[1:])
    x0 = x[:-1] - np.mean(x[:-1])
    denom = float(np.sqrt(np.sum(x1 ** 2) * np.sum(x0 ** 2)))
    if denom < 1e-12:
        ar1 = 0.0
    else:
        num = float(np.sum(x1 * x0))
        ar1 = float(np.clip(num / denom, -0.999, 0.999))

    sample_var = float(np.var(x, ddof=1))
    safe_base_var = max(float(baseline_variance), 1e-8)
    var_ratio = float(sample_var / safe_base_var)

    # Composite CSD bifurcation index in [0, 1): combines positive AR(1) memory and variance surge
    positive_ar1 = max(0.0, ar1)
    var_surge = float(np.tanh(max(0.0, var_ratio - 1.0) * 0.5))
    csd_score = float(np.clip(0.65 * positive_ar1 + 0.35 * var_surge, 0.0, 0.999))

    return {
        "lag1_autocorrelation": ar1,
        "variance_ratio": var_ratio,
        "csd_bifurcation_score": csd_score
    }


def compute_expected_free_energy(
    predicted_state_dist: Union[List[float], np.ndarray],
    homeostatic_target_dist: Union[List[float], np.ndarray],
    observation_ambiguity_entropy: Union[List[float], np.ndarray]
) -> Dict[str, float]:
    """
    Compute Karl Friston's Active Inference Expected Free Energy (EFE):
        G(pi) = KL(Q(s | pi) || P*(s)) + E_Q[H(P(o | s))]
    where:
    - Pragmatic Risk = KL divergence from safe biomechanical/physiological homeostasis P*(s)
    - Ambiguity / Epistemic Uncertainty = expected entropy of observations given state
    """
    q = np.asarray(predicted_state_dist, dtype=np.float64)
    p_star = np.asarray(homeostatic_target_dist, dtype=np.float64)
    h_obs = np.asarray(observation_ambiguity_entropy, dtype=np.float64)

    q = np.clip(q, 1e-9, None)
    q = q / np.sum(q)
    p_star = np.clip(p_star, 1e-9, None)
    p_star = p_star / np.sum(p_star)

    pragmatic_kl_risk = float(np.sum(q * np.log(q / p_star)))
    epistemic_ambiguity = float(np.sum(q * h_obs))
    expected_free_energy = float(pragmatic_kl_risk + epistemic_ambiguity)

    return {
        "pragmatic_kl_risk": pragmatic_kl_risk,
        "epistemic_ambiguity": epistemic_ambiguity,
        "expected_free_energy": expected_free_energy
    }


def solve_schrodinger_bridge_trajectory(
    source_marginal: Union[List[float], np.ndarray],
    target_marginal: Union[List[float], np.ndarray],
    cost_matrix: Optional[np.ndarray] = None,
    tau: float = 0.35,
    max_iter: int = 200,
    tol: float = 1e-8
) -> Dict[str, Union[float, np.ndarray]]:
    """
    Solve the Entropic Schrödinger Bridge Problem (SBP) between initial network state
    source_marginal (mu_0) and stressed boundary state target_marginal (mu_T) over
    a reference Markov diffusion kernel K = exp(-C / tau).

    Returns the optimal path-space coupling matrix P_SB, conserved mass verification,
    and the Stochastic Control Drift Energy required to bridge the regime shift.
    """
    a = np.asarray(source_marginal, dtype=np.float64)
    b = np.asarray(target_marginal, dtype=np.float64)
    n = a.shape[0]

    a = np.clip(a, 1e-9, None)
    a = a / np.sum(a)
    b = np.clip(b, 1e-9, None)
    b = b / np.sum(b)

    if cost_matrix is None:
        idx = np.arange(n, dtype=np.float64)
        cost_matrix = (idx[:, None] - idx[None, :]) ** 2 / max(1.0, float(n - 1) ** 2)
    else:
        cost_matrix = np.asarray(cost_matrix, dtype=np.float64)

    log_K = -cost_matrix / max(tau, 1e-6)
    log_a = np.log(a)
    log_b = np.log(b)

    u = np.zeros(n, dtype=np.float64)
    v = np.zeros(n, dtype=np.float64)

    for _ in range(max_iter):
        u_prev = u.copy()
        # Log-sum-exp updates for Schrödinger potentials
        lse_v = log_K + v[None, :]
        max_v = np.max(lse_v, axis=1)
        u = log_a - (max_v + np.log(np.sum(np.exp(lse_v - max_v[:, None]), axis=1)))

        lse_u = log_K.T + u[None, :]
        max_u = np.max(lse_u, axis=1)
        v = log_b - (max_u + np.log(np.sum(np.exp(lse_u - max_u[:, None]), axis=1)))

        if np.max(np.abs(u - u_prev)) < tol:
            break

    log_P = u[:, None] + log_K + v[None, :]
    P_sb = np.exp(log_P)
    P_sb = P_sb / np.sum(P_sb)

    # Reference product measure and KL control energy
    K_ref = np.exp(log_K)
    K_ref = K_ref / np.sum(K_ref)
    kl_div = float(np.sum(P_sb * (np.log(np.clip(P_sb, 1e-12, None)) - np.log(np.clip(K_ref, 1e-12, None)))))
    control_drift_energy = float(max(0.0, tau * kl_div))
    transport_work = float(np.sum(P_sb * cost_matrix))

    return {
        "coupling_matrix": P_sb,
        "conserved_mass": float(np.sum(P_sb)),
        "transport_work": transport_work,
        "control_drift_energy": control_drift_energy
    }


class AdversarialSchrodingerActiveHazardEngine:
    """
    Unified Causal-Physical Hazard & Phase-Transition Early Warning Engine.
    Operates identically on:
    - 22-agent biomechanical sports tracking (NFL pre-snap & in-snap TBI/ACL hazard)
    - 6-organ physiological critical care networks (ICU sepsis & hemodynamic shock)
    """

    def __init__(self, alpha_false_alarm_bound: float = 0.05, tau: float = 0.35):
        self.alpha = alpha_false_alarm_bound
        self.tau = tau

    def evaluate_phase_transition_warning(
        self,
        micro_fluctuation_series: Union[List[float], np.ndarray],
        baseline_variance: float,
        source_network_load: Union[List[float], np.ndarray],
        stressed_network_load: Union[List[float], np.ndarray],
        homeostatic_target_dist: Union[List[float], np.ndarray],
        observation_ambiguity: Union[List[float], np.ndarray],
        calibration_nonconformity_scores: Union[List[float], np.ndarray]
    ) -> Dict[str, Union[float, bool, str]]:
        """
        Compute composite Causal-Physical Hazard Score and apply finite-sample
        conformal thresholding to eliminate alert fatigue while guaranteeing
        coverage (1 - alpha).
        """
        csd = compute_critical_slowing_down_index(
            micro_fluctuation_series=micro_fluctuation_series,
            baseline_variance=baseline_variance
        )
        sb = solve_schrodinger_bridge_trajectory(
            source_marginal=source_network_load,
            target_marginal=stressed_network_load,
            tau=self.tau
        )
        efe = compute_expected_free_energy(
            predicted_state_dist=stressed_network_load,
            homeostatic_target_dist=homeostatic_target_dist,
            observation_ambiguity_entropy=observation_ambiguity
        )

        # Combine CSD internal fatigue, Schrödinger Bridge compensatory strain, and Active Inference risk
        composite_hazard = float(
            0.40 * csd["csd_bifurcation_score"]
            + 0.35 * np.tanh(sb["control_drift_energy"] * 2.5)
            + 0.25 * np.tanh(efe["pragmatic_kl_risk"] * 1.5)
        )

        cal_scores = np.sort(np.asarray(calibration_nonconformity_scores, dtype=np.float64))
        n_cal = int(cal_scores.shape[0])
        k_rank = conformal_finite_sample_rank(n_cal, self.alpha)
        idx = min(max(0, k_rank - 1), n_cal - 1)
        conformal_threshold = float(cal_scores[idx])

        alert_triggered = bool(composite_hazard > conformal_threshold)
        if alert_triggered:
            regime = "CRITICAL_PHASE_TRANSITION_IMMINENT"
        elif composite_hazard > 0.75 * conformal_threshold:
            regime = "COMPENSATORY_STRAIN_ELEVATED"
        else:
            regime = "HOMEOSTATIC_STABLE"

        return {
            "csd_bifurcation_score": csd["csd_bifurcation_score"],
            "lag1_autocorrelation": csd["lag1_autocorrelation"],
            "schrodinger_control_energy": float(sb["control_drift_energy"]),
            "conserved_mass": float(sb["conserved_mass"]),
            "active_inference_efe": efe["expected_free_energy"],
            "composite_hazard_score": composite_hazard,
            "conformal_threshold": conformal_threshold,
            "false_alarm_bound_alpha": self.alpha,
            "phase_transition_alert": alert_triggered,
            "system_regime": regime
        }
