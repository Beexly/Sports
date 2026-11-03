"""Quarantined Research Hypotheses Sandbox (`/research/hypotheses/`).

Contains advanced multi-week and continuum-mechanics hypotheses that MUST remain isolated from live
production card generation until they strictly beat the historical player-frequency baseline in
`tests/verify_out_of_sample_calibration.py` (`log_loss_delta > 0` and `brier_delta > 0`):
  1. `MultiGameGlycogenDepletionEngine` (GSSI SSE #127 Carbohydrate: The Football Fuel).
  2. `compute_pinn_navier_stokes_composite_loss` (Cai, Mao, Wang, Yin & Karniadakis 2021, arXiv:2105.09506v1 /
     Acta Mechanica Sinica DOI: 10.1007/s10409-021-01148-1 & SSRN 7197889: 4-term PINN loss
     L = w1*L_PDE + w2*L_data + w3*L_IC + w4*L_BC).
  3. `compute_mallat_scattering_intermittency_residual` (Bruna & Mallat 2013: multi-scale wavelet scattering
     intermittency ratio residualizing high-frequency burst against long-term baseline).
  4. `evaluate_acrisure_tahoma31_turf_shear_upgrade` (models Acrisure Stadium Tahoma 31 Bermudagrass via
     +4% shear yield tau_yield without mutating field coordinates x, y).
"""
from __future__ import annotations

import math
from typing import Any, Dict, Mapping, Sequence, Tuple

import numpy as np

RESEARCH_SANDBOX_QUARANTINED = True
CLASSIFICATION = "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST"


class MultiGameGlycogenDepletionEngine:
    """Tracks multi-week intracellular muscle glycogen concentration in mmol/kg wet muscle weight
    (G_0 in [130, 160] mmol/kg wet weight; elevated fatigue warning < 95 mmol/kg; critical soft-tissue
    threshold < 70 mmol/kg) to forecast cumulative short-week fatigue without conflating whole-body grams
    with localized mmol/kg concentration.
    """

    @staticmethod
    def _normalize_to_mmol_per_kg(val: float) -> float:
        v = float(val)
        # Convert legacy whole-body glycogen mass in grams (e.g. 420-450g) to mmol/kg wet muscle weight (~140-150 mmol/kg)
        return v / 3.0 if v > 220.0 else v

    def __init__(self, baseline_profiles: Mapping[str, Mapping[str, float]]):
        self.profiles = {}
        self.glycogen_state_db: Dict[str, float] = {}
        for pid, p in baseline_profiles.items():
            prof = dict(p)
            g0_mmol = self._normalize_to_mmol_per_kg(prof.get("initial_glycogen", 150.0))
            prof["initial_glycogen_mmol_kg"] = g0_mmol
            self.profiles[pid] = prof
            self.glycogen_state_db[pid] = g0_mmol

    def process_game_workload_discharge(self, player_id: str, accumulated_work_joules: float) -> float:
        current_glycogen = self.glycogen_state_db.get(player_id, 145.0)
        profile = self.profiles.get(player_id, {"mass_kg": 100.0})
        mass_kg = max(40.0, float(profile.get("mass_kg", 100.0)))
        work_scaled_index = max(0.0, float(accumulated_work_joules)) / (mass_kg * 1e5)
        # Calibrated in mmol/kg wet muscle weight: heavy NFL game workload drains ~55-75 mmol/kg
        glycogen_discharged = 12.5 * (work_scaled_index ** 1.35)
        updated_glycogen = max(25.0, current_glycogen - glycogen_discharged)
        self.glycogen_state_db[player_id] = updated_glycogen
        return round(updated_glycogen, 4)

    def simulate_weekly_regeneration_recharge(self, player_id: str, rest_days: float = 6.0) -> float:
        current_glycogen = self.glycogen_state_db.get(player_id, 145.0)
        profile = self.profiles.get(player_id, {"cho_intake_g_kg": 6.0, "initial_glycogen_mmol_kg": 150.0})
        # Net post-practice daily glycogen synthesis rate (1.35 mmol/kg per g/kg CHO per rest day)
        # so a 3-day short-week turnaround after heavy game drain leaves net cumulative depletion below G_0.
        net_daily_synthesis_rate = 1.35
        glycogen_gained = float(profile.get("cho_intake_g_kg", 6.0)) * net_daily_synthesis_rate * max(0.0, float(rest_days))
        g0 = float(profile.get("initial_glycogen_mmol_kg", self._normalize_to_mmol_per_kg(profile.get("initial_glycogen", 150.0))))
        max_capacity_ceiling = g0 * 1.05
        updated_glycogen = min(max_capacity_ceiling, current_glycogen + glycogen_gained)
        self.glycogen_state_db[player_id] = updated_glycogen
        return round(updated_glycogen, 4)

    def evaluate_soft_tissue_injury_risk(self, player_id: str) -> Tuple[str, float]:
        current_glycogen = self.glycogen_state_db.get(player_id, 145.0)
        if current_glycogen < 70.0:
            return "CRITICAL_SOFT_TISSUE_WARNING", 0.78
        if current_glycogen < 95.0:
            return "ELEVATED_FATIGUE_RISK", 0.92
        return "OPTIMAL_METABOLIC_HEALTH", 1.00


def compute_pinn_navier_stokes_composite_loss(
    pde_residuals: Sequence[float],
    data_errors: Sequence[float],
    ic_errors: Sequence[float],
    bc_errors: Sequence[float],
    weights: Tuple[float, float, float, float] = (1.0, 1.0, 1.0, 1.0),
) -> Dict[str, float]:
    """Compute Cai, Mao, Wang, Yin & Karniadakis (2021, arXiv:2105.09506v1) 4-term PINN composite loss:
    L = w_1 * L_PDE + w_2 * L_data + w_3 * L_IC + w_4 * L_BC.
    """
    def _mse(arr: Sequence[float]) -> float:
        if not arr:
            return 0.0
        return float(np.mean(np.square(np.asarray(arr, dtype=np.float64))))

    l_pde = _mse(pde_residuals)
    l_data = _mse(data_errors)
    l_ic = _mse(ic_errors)
    l_bc = _mse(bc_errors)
    w1, w2, w3, w4 = (float(w) for w in weights)
    total = w1 * l_pde + w2 * l_data + w3 * l_ic + w4 * l_bc
    return {
        "L_PDE": round(l_pde, 6),
        "L_data": round(l_data, 6),
        "L_IC": round(l_ic, 6),
        "L_BC": round(l_bc, 6),
        "total_composite_loss": round(total, 6),
    }


def compute_mallat_scattering_intermittency_residual(
    signal_series: Sequence[float],
) -> Dict[str, float]:
    """Compute Bruna & Mallat (2013) multi-scale wavelet scattering intermittency ratio.

    Separates first-order scale energy S_1 from second-order transient burst energy S_2
    to residualize explosive athletic bursts against stationary baseline variance.
    """
    x = np.asarray(signal_series, dtype=np.float64)
    if x.size < 4:
        return {"s1_energy": 0.0, "s2_burst_energy": 0.0, "intermittency_ratio": 0.0}
    diff1 = np.abs(np.diff(x))
    diff2 = np.abs(np.diff(diff1))
    s1 = float(np.mean(diff1)) + 1e-8
    s2 = float(np.mean(diff2 ** 2))
    ratio = s2 / (s1 ** 2)
    return {
        "s1_energy": round(s1, 5),
        "s2_burst_energy": round(s2, 5),
        "intermittency_ratio": round(ratio, 5),
    }


def evaluate_acrisure_tahoma31_turf_shear_upgrade(
    applied_horizontal_force_n: float,
    baseline_tau_yield_n: float = 1150.0,
    moisture_index: float = 0.20,
    grip_upgrade_factor: float = 1.04,
) -> Dict[str, float]:
    """Model Acrisure Stadium Tahoma 31 Bermudagrass upgrade by scaling shear yield (+4%)
    without mutating raw tracking field coordinates (x, y).
    """
    upgraded_yield = float(baseline_tau_yield_n) * float(grip_upgrade_factor) * (1.0 - 0.35 * float(moisture_index))
    ratio = float(applied_horizontal_force_n) / max(1.0, upgraded_yield)
    slip_prob = 1.0 / (1.0 + math.exp(-4.0 * (ratio - 1.0)))
    return {
        "upgraded_tau_yield_n": round(upgraded_yield, 2),
        "slip_probability": round(slip_prob, 4),
        "coordinates_mutated": False,
    }


def compute_alam_football_crosswind_drag(
    wind_speed_mph: float,
    ball_speed_mph: float = 52.0,
    crosswind_angle_deg: float = 90.0,
    is_ncaa: bool = False,
) -> Dict[str, float]:
    """Alam, Smith, Chowdhury & Moria (2012, Procedia Engineering 34:98-103,
    DOI: 10.1016/j.proeng.2012.04.018):
    Experimental wind-tunnel aerodynamic drag coefficient C_D(psi) of NFL (m=0.410kg,
    C_D0=0.19, C_D90=0.78) and NCAA (m=0.395kg, C_D0=0.20, C_D90=0.75) footballs
    under crosswind yaw angle psi in [-90, +90] degrees.
    """
    cd_0 = 0.20 if is_ncaa else 0.19
    cd_90 = 0.75 if is_ncaa else 0.78
    angle_rad = math.radians(float(crosswind_angle_deg))
    v_cross = float(wind_speed_mph) * math.sin(angle_rad)
    v_head = float(wind_speed_mph) * math.cos(angle_rad)
    v_axial = max(1.0, float(ball_speed_mph) + v_head)
    yaw_rad = math.atan2(abs(v_cross), v_axial)
    yaw_deg = math.degrees(yaw_rad)
    cd_yaw = cd_0 + (cd_90 - cd_0) * (math.sin(yaw_rad) ** 2)
    v_rel_mps = math.hypot(v_axial, v_cross) * 0.44704
    # Reference cross-sectional area from lateral circumference 0.530m -> r = 0.08435m -> A = 0.02235 m^2
    rho_air = 1.225
    area_ref = 0.02235
    drag_force_n = 0.5 * rho_air * area_ref * cd_yaw * (v_rel_mps ** 2)
    return {
        "yaw_angle_deg": round(yaw_deg, 3),
        "cd_0": cd_0,
        "cd_90": cd_90,
        "cd_effective": round(cd_yaw, 4),
        "drag_multiplier_vs_zero_yaw": round(cd_yaw / cd_0, 4),
        "drag_force_n": round(drag_force_n, 4),
    }


def compute_kent_cleat_surface_entrapment(
    is_artificial_turf: bool,
    vertical_load_kn: float = 2.8,
) -> Dict[str, float]:
    """Kent, Forman, Crandall & Lessley (2015, Sports Biomechanics 14(1):1-17,
    DOI: 10.1080/14763141.2015.1024277) + NFL Musculoskeletal Committee (2019):
    Quantifies natural grass divot-tearing force limit (3.2 kN horizontal, 145 Nm torque
    at 2.8 kN vertical load) vs. infill artificial turf foot entrapment (4.5 kN horizontal,
    197 Nm rotational torque) and Hershman et al. (2012) +22% lower-extremity sprain rate.
    """
    load_scale = max(0.1, float(vertical_load_kn) / 2.8)
    peak_horiz_kn = (4.5 if is_artificial_turf else 3.2) * load_scale
    peak_torque_nm = (197.0 if is_artificial_turf else 145.0) * load_scale
    drop_horiz_kn = (3.0 if is_artificial_turf else 2.4) * load_scale
    entrapment_index = (peak_torque_nm / 145.0) * (peak_horiz_kn / 3.2)
    sprain_hazard_multiplier = 1.22 if is_artificial_turf else 1.00
    return {
        "peak_horizontal_force_kn": round(peak_horiz_kn, 3),
        "peak_rotational_torque_nm": round(peak_torque_nm, 2),
        "drop_peak_horizontal_force_kn": round(drop_horiz_kn, 3),
        "entrapment_severity_index": round(entrapment_index, 4),
        "hershman_sprain_hazard_multiplier": sprain_hazard_multiplier,
        "divot_force_limiting_active": not is_artificial_turf,
    }


def evaluate_bezier_route_curve(
    control_points: Sequence[Sequence[float]],
    t_grid: Sequence[float],
) -> np.ndarray:
    """Chu, Reyers, Thomson & Wu (2019, arXiv:1908.02423v1):
    Bernstein polynomial basis representation of variable-duration NFL receiver trajectories:
      B(t; theta) = sum_{p=0}^P theta_p * comb(P, p) * t^p * (1 - t)^(P - p), t in [0, 1].
    """
    ctrl = np.asarray(control_points, dtype=np.float64)
    t_arr = np.clip(np.asarray(t_grid, dtype=np.float64), 0.0, 1.0)
    deg = ctrl.shape[0] - 1
    out = np.zeros((t_arr.size, ctrl.shape[1]), dtype=np.float64)
    for p in range(deg + 1):
        binom = math.comb(deg, p)
        basis = binom * (t_arr ** p) * ((1.0 - t_arr) ** (deg - p))
        out += np.outer(basis, ctrl[p])
    return out


def compute_chitturi_route_disturbance_score(
    base_route_score_norm: float,
    route_points_xy: Sequence[Sequence[float]],
    defender_points_xy: Sequence[Sequence[float]],
    route_weight: float = 0.60,
    clearance_cap_yds: float = 10.0,
) -> Dict[str, float]:
    """Chitturi (2024, University of Arkansas Honors Thesis, ScholarWorks@UARK 132):
    Computes average minimum defender clearance across equidistant route points
    and combines normalized clearance with PFF+ coverage-beater route score.
    """
    r_pts = np.asarray(route_points_xy, dtype=np.float64)
    d_pts = np.asarray(defender_points_xy, dtype=np.float64)
    if r_pts.size == 0 or d_pts.size == 0:
        return {
            "avg_min_defender_clearance_yds": 0.0,
            "normalized_clearance": 0.0,
            "combined_route_viability_score": round(float(base_route_score_norm), 4),
        }
    diffs = r_pts[:, None, :] - d_pts[None, :, :]
    dists = np.linalg.norm(diffs, axis=-1)
    min_dists = np.min(dists, axis=1)
    avg_min_dist = float(np.mean(min_dists))
    norm_clearance = min(1.0, max(0.0, avg_min_dist / max(1.0, float(clearance_cap_yds))))
    w = min(1.0, max(0.0, float(route_weight)))
    combined = w * float(base_route_score_norm) + (1.0 - w) * norm_clearance
    return {
        "avg_min_defender_clearance_yds": round(avg_min_dist, 4),
        "normalized_clearance": round(norm_clearance, 4),
        "combined_route_viability_score": round(combined, 4),
    }


def deconfound_cumulative_ryoe_r2(
    actual_yards: Sequence[float],
    expected_yards: Sequence[float],
    carries: Sequence[float],
) -> Dict[str, float]:
    """Congelio (2023, Introduction to NFL Analytics with R, DOI: 10.1201/9781003364320):
    De-confounds cumulative season/career rushing yards vs. expected rushing yards
    (where R^2 ~ 0.99 is inflated by total carries volume N_carries) into per-carry
    Yards Per Carry (YPC), Expected YPC, and Rushing Yards Over Expected per carry (RYOE/carry).
    """
    act = np.asarray(actual_yards, dtype=np.float64)
    exp = np.asarray(expected_yards, dtype=np.float64)
    att = np.maximum(1.0, np.asarray(carries, dtype=np.float64))
    cum_r = float(np.corrcoef(act, exp)[0, 1]) if act.size > 1 else 0.0
    cum_r2 = cum_r ** 2
    ypc_act = act / att
    ypc_exp = exp / att
    ryoe_per_carry = (act - exp) / att
    rate_r = float(np.corrcoef(ypc_act, ypc_exp)[0, 1]) if act.size > 1 else 0.0
    rate_r2 = rate_r ** 2
    return {
        "cumulative_volume_confounded_r2": round(cum_r2, 4),
        "per_carry_rate_r2": round(rate_r2, 4),
        "mean_ryoe_per_carry": round(float(np.mean(ryoe_per_carry)), 4),
        "volume_inflation_gap": round(cum_r2 - rate_r2, 4),
    }


def compute_ocular_quiet_eye_latency_multiplier(
    quiet_eye_duration_ms: float = 380.0,
    saccade_latency_ms: float = 210.0,
    vts_score: float = 1.65,
    elite_vts_ref: float = 1.50,
    pocket_window_sec: float = 2.45,
) -> Dict[str, float]:
    """Lochhead, Feng, Laby & Appelbaum (2024, JSEP Scoping Review N=667) +
    Erickson (2021, Optom. Vis. Sci. 98(7):670-680) + Kirschen & Laby (2011) Sports Vision Pyramid +
    Phillips (2021, Ole Miss ETD 2126/3125 NeuroTracker 3D-MOT Visual Tracking Speed):
    Computes the quarantined Ocular Latency / Quiet Eye Fixation structural multiplier
    under a finite pocket time-to-pressure window.
    Note: Explicitly preserves the Lochhead et al. (2024) finding that baseline visual
    assessments correlate with elite performance whereas short-term vision-training
    interventions lack proven causal 'far transfer' (far_transfer_training_weight = 0.0).
    """
    net_fixation_sec = max(0.0, (float(quiet_eye_duration_ms) - float(saccade_latency_ms)) / 1000.0)
    window_ratio = net_fixation_sec / max(0.5, float(pocket_window_sec))
    fixation_gate = 1.0 / (1.0 + math.exp(-6.0 * (window_ratio - 0.05)))
    vts_ratio = max(0.5, float(vts_score) / max(0.5, float(elite_vts_ref)))
    ocular_mult = fixation_gate * (vts_ratio ** 0.15)
    return {
        "net_quiet_eye_sec": round(net_fixation_sec, 4),
        "fixation_gate": round(fixation_gate, 4),
        "vts_ratio": round(vts_ratio, 4),
        "ocular_decision_multiplier": round(ocular_mult, 4),
        "far_transfer_training_weight": 0.0,
    }


def optimize_bayesian_asymmetric_loss_action(
    prior_mean: float,
    prior_std: float,
    observed_mean: float,
    sample_size: int,
    obs_std: float = 15.0,
    overprediction_penalty: float = 2.5,
    underprediction_penalty: float = 1.0,
) -> Dict[str, float]:
    """Davidson-Pilon (Probabilistic Programming and Bayesian Methods for Hackers,
    Ch. 4 Law of Large Numbers / Empirical Bayes Shrinkage & Ch. 5 Loss Functions):
    1. Shrinks small-sample observed mean toward prior mean via precision-weighted
       conjugate Normal-Normal posterior update (Ch. 4).
    2. Computes the Bayes-optimal point action a* minimizing asymmetric linear/linex
       expected posterior loss E_{theta|D}[L(theta, a)] where overpredicting a prop
       is penalized by `overprediction_penalty` > `underprediction_penalty` (Ch. 5).
    """
    n = max(0, int(sample_size))
    tau_0 = 1.0 / max(1e-6, float(prior_std) ** 2)
    tau_obs = float(n) / max(1e-6, float(obs_std) ** 2)
    post_prec = tau_0 + tau_obs
    post_var = 1.0 / post_prec
    post_std = math.sqrt(post_var)
    post_mean = post_var * (tau_0 * float(prior_mean) + tau_obs * float(observed_mean))
    shrinkage_factor = tau_0 / post_prec
    # Under asymmetric piece-wise linear (pinball/newsvendor) loss with c_over, c_under,
    # the Bayes action is the q = c_under / (c_over + c_under) posterior quantile:
    c_over = max(1e-6, float(overprediction_penalty))
    c_under = max(1e-6, float(underprediction_penalty))
    critical_fractile = c_under / (c_over + c_under)
    # Normal inverse CDF approximation via rational/erfinv relation:
    # For q < 0.5, action is shifted below posterior mean to guard against over-projection.
    z_grid = np.linspace(-3.5, 3.5, 701)
    cdf_grid = 0.5 * (1.0 + np. vectorize(math.erf)(z_grid / math.sqrt(2.0)))
    z_q = float(np.interp(critical_fractile, cdf_grid, z_grid))
    bayes_optimal_action = post_mean + z_q * post_std
    return {
        "posterior_mean": round(post_mean, 4),
        "posterior_std": round(post_std, 4),
        "empirical_bayes_shrinkage_weight_on_prior": round(shrinkage_factor, 4),
        "critical_fractile_q": round(critical_fractile, 4),
        "bayes_optimal_asymmetric_action": round(bayes_optimal_action, 4),
        "conservative_buffer_below_mean": round(post_mean - bayes_optimal_action, 4),
    }


def compute_elbo_and_ornstein_uhlenbeck_sgd_posterior_variance(
    expected_log_likelihood: float,
    mu_q: float,
    sigma_q: float,
    mu_0: float = 0.0,
    sigma_0: float = 1.0,
    learning_rate_eta: float = 0.01,
    minibatch_size_b: int = 32,
    hessian_curvature_h: float = 2.0,
    gradient_noise_cov_c: float = 1.5,
) -> Dict[str, float]:
    """Murphy (2023, Probabilistic Machine Learning: Advanced Topics, MIT Press) +
    Mandt, Hoffman & Blei (2017, JMLR / arXiv:1605.09674, SGD as Approximate Bayesian Inference) +
    Fujii (2025, Machine Learning in Sports, SpringerBriefs DOI: 10.1007/978-981-96-1445-5):
    Computes exact Gaussian KL divergence D_KL(q || p), Variational Evidence Lower Bound (ELBO),
    and the Ornstein-Uhlenbeck stationary posterior variance Sigma_OU = (eta / (2 * B * H)) * C.
    """
    sq = max(1e-6, float(sigma_q))
    s0 = max(1e-6, float(sigma_0))
    kl_qp = math.log(s0 / sq) + (sq ** 2 + (float(mu_q) - float(mu_0)) ** 2) / (2.0 * (s0 ** 2)) - 0.5
    elbo = float(expected_log_likelihood) - kl_qp
    ou_stationary_var = (float(learning_rate_eta) * float(gradient_noise_cov_c)) / (
        2.0 * max(1, int(minibatch_size_b)) * max(1e-6, float(hessian_curvature_h))
    )
    return {
        "kl_divergence_q_p": round(kl_qp, 6),
        "variational_elbo": round(elbo, 6),
        "ou_sgd_stationary_variance": round(ou_stationary_var, 6),
    }


def compute_eager_split_pass_epa_shrinkage_and_poisson_td(
    short_pass_epa_per_play: float,
    short_pass_attempts: int,
    deep_pass_epa_per_play: float,
    deep_pass_attempts: int,
    league_short_epa_mean: float = 0.04,
    league_deep_epa_mean: float = 0.12,
    expected_pass_tds_lambda: float = 1.65,
    prop_line_tds: float = 1.5,
) -> Dict[str, float]:
    """Eric A. Eager & Richard A. Erickson (2023, *Football Analytics with Python & R*, O'Reilly, 488 pp.):
    - Ch. 2: Short Passing (<20 air yds, r~0.43 stability, k_short=180) vs. Deep Passing (>=20 air yds,
      r~0.19 stability, k_deep=380) Marcel Empirical-Bayes regression-to-the-mean shrinkage.
    - Ch. 6: Poisson Regression for QB Passing Touchdowns P(Y > line) = 1 - sum_{m=0}^{floor(line)} e^-lambda * lambda^m / m!.
    """
    n_s = max(0, int(short_pass_attempts))
    n_d = max(0, int(deep_pass_attempts))
    k_short = 180.0
    k_deep = 380.0
    w_s = n_s / (n_s + k_short)
    w_d = n_d / (n_d + k_deep)
    reg_short = w_s * float(short_pass_epa_per_play) + (1.0 - w_s) * float(league_short_epa_mean)
    reg_deep = w_d * float(deep_pass_epa_per_play) + (1.0 - w_d) * float(league_deep_epa_mean)
    deep_share = n_d / max(1.0, float(n_s + n_d))
    composite_regressed_epa = (1.0 - deep_share) * reg_short + deep_share * reg_deep

    lam = max(1e-4, float(expected_pass_tds_lambda))
    k_max = int(math.floor(float(prop_line_tds)))
    cdf_under = sum(math.exp(-lam) * (lam ** m) / math.factorial(m) for m in range(k_max + 1))
    prob_over = max(0.0, min(1.0, 1.0 - cdf_under))
    return {
        "short_pass_reliability_weight": round(w_s, 4),
        "deep_pass_reliability_weight": round(w_d, 4),
        "regressed_short_epa_per_play": round(reg_short, 4),
        "regressed_deep_epa_per_play": round(reg_deep, 4),
        "composite_regressed_pass_epa": round(composite_regressed_epa, 4),
        "poisson_prob_over_td_line": round(prob_over, 6),
        "poisson_prob_under_td_line": round(cdf_under, 6),
    }


def compute_weak_link_oline_and_directional_rush_index(
    five_linemen_pass_block_grades: Sequence[float],
    actual_vertical_depth_35s: float,
    expected_vertical_depth_35s: float,
    rush_epa_to_lineman_side: float,
    rush_epa_away_from_side: float,
    cap_hit_millions: float,
) -> Dict[str, float]:
    """Synthesizes the 3 Offensive-Line Tracking & Valuation Papers in the Nov 2-3 Corpus:
    1. Alejandro Demetres Veroulis (UCLA Thesis 2023, `qt5qw5382d_noSplash_983c1629d166d6b046b4a2d65e75e816.pdf`):
       Weak-Link Theorem — O-Line pocket integrity is dominated by min_j(Q_j) rather than purely mean(Q_j).
    2. Eric Eager (MIT Sloan #193949, `68d6be744d7efccc22080814_193949 - Using Tracking Data to Build Offensive Line Development Tools.pdf`):
       Vertical pass-set depth residual at t = 3.5s (actual_depth - expected_depth).
    3. Nikhil Byanna & Diego Klabjan (Northwestern Univ., `1603.07593v2.pdf`):
       Directional rushing differential (rushes to lineman's gap/side vs. away) & performance-per-cap-dollar.
    """
    grades = [float(x) for x in five_linemen_pass_block_grades]
    if len(grades) != 5:
        raise ValueError("five_linemen_pass_block_grades must have exactly 5 linemen (LT, LG, C, RG, RT)")
    mean_grade = float(np.mean(grades))
    weak_link_grade = float(np.min(grades))
    effective_pocket_grade = 0.65 * weak_link_grade + 0.35 * mean_grade
    depth_residual_35s = float(actual_vertical_depth_35s) - float(expected_vertical_depth_35s)
    directional_rush_delta = float(rush_epa_to_lineman_side) - float(rush_epa_away_from_side)
    value_per_million = (effective_pocket_grade + 10.0 * directional_rush_delta) / max(0.5, float(cap_hit_millions))
    return {
        "mean_oline_grade": round(mean_grade, 3),
        "weak_link_min_grade": round(weak_link_grade, 3),
        "effective_weak_link_pocket_grade": round(effective_pocket_grade, 3),
        "eager_depth_residual_35s_yds": round(depth_residual_35s, 3),
        "byanna_klabjan_directional_rush_delta_epa": round(directional_rush_delta, 4),
        "surplus_value_per_cap_million": round(value_per_million, 4),
    }


def compute_fujii_obso_and_counterfactual_ite(
    pitch_control_probs: Sequence[float],
    transition_probs: Sequence[float],
    shot_or_completion_values: Sequence[float],
    factual_expected_epa: float,
    counterfactual_expected_epa: float,
) -> Dict[str, float]:
    """Keisuke Fujii (2025, *Machine Learning in Sports: Open Approach for Next-Generation Analytics*,
    SpringerBriefs in Computer Science, `978-981-96-1445-5.pdf`, Ch. 3.4.3 & Ch. 3.5.2):
    - Off-Ball Scoring Opportunity (OBSO): sum_{r in grid} P_control(r) * P_transition(r) * V_score(r).
    - Counterfactual Individual Treatment Effect (ITE): E[Y(1) - Y(0) | X_t] measuring the value of an
      alternative route/blocking/play-call intervention over the observed factual trajectory.
    """
    p_ctrl = np.asarray(pitch_control_probs, dtype=np.float64)
    p_trans = np.asarray(transition_probs, dtype=np.float64)
    v_val = np.asarray(shot_or_completion_values, dtype=np.float64)
    if not (p_ctrl.shape == p_trans.shape == v_val.shape) or p_ctrl.size == 0:
        raise ValueError("pitch_control_probs, transition_probs, and shot_or_completion_values must match in non-empty shape")
    p_trans_norm = p_trans / max(1e-9, float(np.sum(p_trans)))
    obso = float(np.sum(p_ctrl * p_trans_norm * v_val))
    ite_delta = float(counterfactual_expected_epa) - float(factual_expected_epa)
    return {
        "off_ball_scoring_opportunity_obso": round(obso, 5),
        "counterfactual_ite_epa_delta": round(ite_delta, 5),
        "optimal_switch_recommended": bool(ite_delta > 0.05),
    }


def evaluate_noyes_systematic_error_gate(
    effect_size_delta: float,
    statistical_std: float,
    sample_size_n: int,
    systematic_error_floor: float,
    adversarial_blind_control_passed: bool = True,
    uses_unverified_macroscopic_quantum_jargon: bool = False,
) -> Dict[str, Any]:
    """Synthesizes the Epistemic & Metrological Systematic-Error Gate (`9906014v1.pdf`, `p26.pdf`, BIPM GUM):
    1. H. Pierre Noyes (SLAC-PUB-8151, Stanford 1999, `9906014v1.pdf`):
       In large samples N, naive Z_stat = |delta| / (sigma_stat / sqrt(N)) explodes even when |delta| is tiny;
       true effective significance must include uncalibrated systematic error sigma_sys:
           Z_eff = |delta| / sqrt(sigma_stat^2 / N + sigma_sys^2).
    2. Steven N. Shore (Fall 1984, *Skeptical Inquirer*, `p26.pdf`):
       Rejects macroscopic pseudo-quantum vocabulary that lacks physical/empirical correspondence.
    3. Standard Metrological Blind-Control & Leakage Gate (BIPM / GUM):
       Any model/experiment that fails adversarial out-of-sample blind / leakage controls
       (`adversarial_blind_control_passed=False`) is quarantined as Clever-Hans / sycophancy leakage.
    """
    n = max(1, int(sample_size_n))
    s_stat = max(1e-9, float(statistical_std))
    s_sys = max(0.0, float(systematic_error_floor))
    delta = abs(float(effect_size_delta))

    naive_z_stat = delta / (s_stat / math.sqrt(n))
    total_uncertainty = math.sqrt((s_stat ** 2) / n + (s_sys ** 2))
    effective_z = delta / max(1e-9, total_uncertainty)

    passed = (
        bool(adversarial_blind_control_passed)
        and not bool(uses_unverified_macroscopic_quantum_jargon)
        and effective_z >= 1.96
    )
    return {
        "naive_statistical_z": round(naive_z_stat, 4),
        "effective_systematic_adjusted_z": round(effective_z, 4),
        "systematic_dominates_statistical": bool(s_sys > (s_stat / math.sqrt(n))),
        "adversarial_blind_control_passed": bool(adversarial_blind_control_passed),
        "shore_macroscopic_jargon_penalty": bool(uses_unverified_macroscopic_quantum_jargon),
        "signal_accepted": passed,
    }



