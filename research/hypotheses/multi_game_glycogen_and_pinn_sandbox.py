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
    """Tracks multi-week intracellular glycogen depletion fields to forecast fatigue and soft-tissue risk."""

    def __init__(self, baseline_profiles: Mapping[str, Mapping[str, float]]):
        self.profiles = {k: dict(v) for k, v in baseline_profiles.items()}
        self.glycogen_state_db: Dict[str, float] = {
            pid: float(p.get("initial_glycogen", 450.0)) for pid, p in self.profiles.items()
        }

    def process_game_workload_discharge(self, player_id: str, accumulated_work_joules: float) -> float:
        current_glycogen = self.glycogen_state_db.get(player_id, 400.0)
        profile = self.profiles.get(player_id, {"mass_kg": 100.0})
        mass_kg = max(40.0, float(profile.get("mass_kg", 100.0)))
        work_scaled_index = max(0.0, float(accumulated_work_joules)) / (mass_kg * 1e5)
        glycogen_discharged = 15.0 * (work_scaled_index ** 1.5)
        updated_glycogen = max(50.0, current_glycogen - glycogen_discharged)
        self.glycogen_state_db[player_id] = updated_glycogen
        return round(updated_glycogen, 4)

    def simulate_weekly_regeneration_recharge(self, player_id: str, rest_days: float = 6.0) -> float:
        current_glycogen = self.glycogen_state_db.get(player_id, 400.0)
        profile = self.profiles.get(player_id, {"cho_intake_g_kg": 6.0, "initial_glycogen": 450.0})
        recharge_efficiency = 8.5
        glycogen_gained = float(profile.get("cho_intake_g_kg", 6.0)) * recharge_efficiency * max(0.0, float(rest_days))
        max_capacity_ceiling = float(profile.get("initial_glycogen", 450.0)) * 1.15
        updated_glycogen = min(max_capacity_ceiling, current_glycogen + glycogen_gained)
        self.glycogen_state_db[player_id] = updated_glycogen
        return round(updated_glycogen, 4)

    def evaluate_soft_tissue_injury_risk(self, player_id: str) -> Tuple[str, float]:
        current_glycogen = self.glycogen_state_db.get(player_id, 400.0)
        if current_glycogen < 200.0:
            return "CRITICAL_SOFT_TISSUE_WARNING", 0.78
        if current_glycogen < 300.0:
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

