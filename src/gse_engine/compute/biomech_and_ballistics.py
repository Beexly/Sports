"""Biomechanical RTP (K14), Trench Survival (K08), Disguise (K15), Ballistics (K16) & Crew (K24)."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

import numpy as np

InjuryCohort = Literal["HighAnkle", "Hamstring_G12", "TurfToe", "RibAC", "Concussion"]
LOWER_EXTREMITY_COHORTS: frozenset[str] = frozenset({"HighAnkle", "Hamstring_G12", "TurfToe"})

COHORT_PRIORS: dict[str, tuple[float, float, float, float, float, float]] = {
    # (m_norm_wks, delta0_vel, delta0_yac, half_life_games, delta_h_reinj, eta_reinj)
    "HighAnkle": (4.5, 0.14, 0.22, 3.2, 0.0028, 0.35),
    "Hamstring_G12": (2.4, 0.16, 0.15, 2.1, 0.0042, 0.42),
    "TurfToe": (3.5, 0.12, 0.24, 4.0, 0.0031, 0.30),
    "RibAC": (2.0, 0.03, 0.11, 2.5, 0.0024, 0.38),
    "Concussion": (2.2, 0.05, 0.08, 2.0, 0.0015, 0.45),
}


@dataclass(frozen=True, slots=True)
class PocketSurvivalResult:
    """Closed-form Gamma-frailty Laplace clean-pocket survival & TTT pressure integral (K08)."""

    s_pocket_2_5s: float
    naive_arithmetic_power_prob: float
    am_gm_inequality_holds: bool
    pressure_prob: float
    sack_given_pressure_prob: float


@dataclass(frozen=True, slots=True)
class BiomechRtpResult:
    """Exponential return-to-play efficiency decay & geometric early-exit hazard (K14)."""

    cohort: str
    phi_eff: float
    h_exit: float
    tau_surf: float
    p_exit_dist: tuple[float, ...]
    p_complete_game: float
    early_exit_prob: float


@dataclass(frozen=True, slots=True)
class DisguisedCoverageResult:
    """6-shell pre/post-snap disguise D_KL & QB TTT/CPOE adjustments (K15)."""

    d_kl_nats: float
    delta_ttt_sec: float
    delta_cpoe: float


@dataclass(frozen=True, slots=True)
class HumidAerodynamicsResult:
    """Tropospheric humid air density, 3D RK4 ballistics & metabolic Q4 decay (K16)."""

    air_density_rho: float
    carry_yds: float
    carry_delta_vs_dome_yds: float
    lateral_drift_yds: float
    fumble_mult: float
    m_q4_def: float
    dome_override_active: bool


@dataclass(frozen=True, slots=True)
class RefereeCrewResult:
    """17-crew GLMM penalty & Rule 8-5 zero-stat DPI / Three-Strikes evaluation (K24)."""

    pi_off_hold: float
    pi_dpi: float
    pi_rtp: float
    p_clean_sack: float
    delta_ep_dpi: float
    stat_pass_yds_dpi: float
    stat_rec_yds_dpi: float
    team_drive_yardline_after_dpi: float
    three_strikes_count: int
    suspended_flag: bool


def evaluate_shared_frailty_pocket_survival(
    *,
    rusher_strain: Sequence[float],
    blocker_clipp_eps: Sequence[float],
    chip_indicators: Sequence[float],
    voronoi_areas: Sequence[float] = (0.0, 0.0, 0.0, 0.0, 0.0),
    mu_ttt_log: float = 0.96,
    sigma_ttt_log: float = 0.24,
    disguise_dkl: float = 0.0,
    qb_sack_propensity: float = 1.0,
    checkdown_valve_prob: float = 0.20,
    qb_escape_kappa_vm: float = 1.0,
    theta_frailty: float = 0.28,
    k_weibull: float = 2.35,
    lambda_weibull: float = 2.70,
    t0_lag: float = 1.15,
    chip_override: Sequence[float] | None = None,
) -> PocketSurvivalResult:
    """Compute K08 multiplicative Gamma-frailty clean-pocket survival integrated over TTT."""
    n_ol = 5
    if len(rusher_strain) != n_ol or len(blocker_clipp_eps) != n_ol or len(chip_indicators) != n_ol:
        raise ValueError("K08 expects exactly 5 offensive line blockers.")

    beta_str, beta_ol, beta_chip, beta_vor = 1.45, 1.30, 0.55, 0.25
    chips = chip_override if chip_override is not None else chip_indicators
    etas: list[float] = []
    for b in range(n_ol):
        vor = float(voronoi_areas[b]) if b < len(voronoi_areas) else 0.0
        eta_b = (
            beta_str * float(rusher_strain[b])
            - beta_ol * float(blocker_clipp_eps[b])
            - beta_chip * max(0.0, min(1.0, float(chips[b])))
            - beta_vor * vor
        )
        etas.append(max(-4.0, min(4.0, eta_b)))

    exp_etas = [math.exp(e) for e in etas]

    def _s_pocket(t: float, theta_f: float) -> float:
        tau = max(0.0, t - t0_lag) / lambda_weibull
        if tau <= 0.0:
            return 1.0
        h0 = float(tau**k_weibull)
        h_sum = float(sum(h0 * ee for ee in exp_etas))
        if theta_f <= 1e-9:
            return float(max(0.02, min(0.995, math.exp(-h_sum))))
        val = float((1.0 + theta_f * h_sum) ** (-1.0 / theta_f))
        return max(0.02, min(0.995, val))

    def _am_power(t: float) -> float:
        tau = max(0.0, t - t0_lag) / lambda_weibull
        if tau <= 0.0:
            return 1.0
        h0 = tau**k_weibull
        mean_surv = sum(math.exp(-h0 * ee) for ee in exp_etas) / float(n_ol)
        return mean_surv**n_ol

    # 16-point Gauss-Legendre integration over LogNormal TTT on [0.05, 6.0]
    nodes, weights = np.polynomial.legendre.leggauss(16)
    a_t, b_t = 0.05, 6.0
    t_pts = 0.5 * (b_t - a_t) * nodes + 0.5 * (b_t + a_t)
    w_pts = 0.5 * (b_t - a_t) * weights
    mu_eff = float(mu_ttt_log) + 0.18 * float(disguise_dkl)
    sig_eff = max(0.05, float(sigma_ttt_log))

    p_press_raw = 0.0
    mean_ttt_sec = math.exp(mu_eff + 0.5 * sig_eff * sig_eff)
    for t_val, w_val in zip(t_pts, w_pts, strict=True):
        tf = float(t_val)
        z = (math.log(tf) - mu_eff) / sig_eff
        pdf = math.exp(-0.5 * z * z) / (tf * sig_eff * math.sqrt(2.0 * math.pi))
        p_press_raw += float(w_val) * (1.0 - _s_pocket(tf, theta_frailty)) * pdf

    s_25 = _s_pocket(2.5, theta_frailty)
    s_25_indep = _s_pocket(2.5, 0.0)
    naive_25 = _am_power(2.5)
    p_press = max(0.10, min(0.68, p_press_raw))

    logit_sk = (
        -1.55
        + 1.10 * float(qb_sack_propensity) * max(0.0, mean_ttt_sec - 2.60)
        - 0.85 * float(checkdown_valve_prob)
        - 0.35 * float(qb_escape_kappa_vm)
    )
    p_sack_given_press = max(
        0.06, min(0.42, 1.0 / (1.0 + math.exp(-max(-15.0, min(15.0, logit_sk)))))
    )

    return PocketSurvivalResult(
        s_pocket_2_5s=round(s_25, 6),
        naive_arithmetic_power_prob=round(naive_25, 6),
        am_gm_inequality_holds=s_25_indep <= naive_25 + 1e-12,
        pressure_prob=round(p_press, 6),
        sack_given_pressure_prob=round(p_sack_given_press, 6),
    )


def compute_aipw_clipp_eps(
    rewards: Sequence[float],
    treatments: Sequence[int],
    mu0_hat: Sequence[float],
    mu1_hat: Sequence[float],
    propensity_pi: Sequence[float],
) -> float:
    """Compute doubly robust CLIPP blocker EPS with propensity clipping pi in [0.05, 0.95]."""
    n = len(rewards)
    if n == 0 or not (len(treatments) == len(mu0_hat) == len(mu1_hat) == len(propensity_pi) == n):
        raise ValueError("All CLIPP sequences must have matching non-zero length.")
    total = 0.0
    for y, t, m0, m1, pi in zip(rewards, treatments, mu0_hat, mu1_hat, propensity_pi, strict=True):
        pi_c = max(0.05, min(0.95, float(pi)))
        t_i = 1.0 if int(t) > 0 else 0.0
        term = (
            float(m0)
            - float(m1)
            + ((1.0 - t_i) * (float(y) - float(m0))) / max(0.05, 1.0 - pi_c)
            - (t_i * (float(y) - float(m1))) / max(0.05, pi_c)
        )
        total += term
    return total / float(n)


def evaluate_biomech_rtp_and_exit_hazard(
    *,
    injury_cohort: InjuryCohort,
    weeks_since_return: int,
    weeks_missed: float,
    is_synthetic_turf: bool,
    planned_snaps: int = 55,
    psi_pos: float = 1.0,
    h0_pos: float = 0.0012,
) -> BiomechRtpResult:
    """Compute K14 exponential RTP efficiency curve & normalized geometric exit hazard."""
    m_norm, _, delta_yac, half_life, delta_h, eta_reinj = COHORT_PRIORS[injury_cohort]
    w_idx = max(0, int(weeks_since_return) - 1)
    lam_rec = math.log(2.0) / max(0.5, half_life)

    phi_eff = max(
        0.50, min(1.00, 1.0 - delta_yac * float(psi_pos) * math.exp(-lam_rec * float(w_idx)))
    )
    tau_surf = 1.28 if (is_synthetic_turf and injury_cohort in LOWER_EXTREMITY_COHORTS) else 1.00
    rushed_mult = 1.0 + (0.35 if float(weeks_missed) < m_norm else 0.0)

    h_raw = float(h0_pos) + delta_h * math.exp(-eta_reinj * float(w_idx)) * rushed_mult * tau_surf
    h_exit = max(0.0005, min(0.0250, h_raw))

    n_snaps = max(1, min(85, int(planned_snaps)))
    exit_probs = tuple(((1.0 - h_exit) ** (k - 1)) * h_exit for k in range(1, n_snaps + 1))
    p_complete = (1.0 - h_exit) ** n_snaps
    early_exit = max(0.02, min(0.45, 1.0 - p_complete))

    return BiomechRtpResult(
        cohort=injury_cohort,
        phi_eff=round(phi_eff, 6),
        h_exit=round(h_exit, 6),
        tau_surf=round(tau_surf, 4),
        p_exit_dist=exit_probs,
        p_complete_game=p_complete,
        early_exit_prob=round(early_exit, 6),
    )


def evaluate_disguised_coverage_kl(
    *,
    pre_snap_shell_prob: Sequence[float],
    post_snap_shell_prob: Sequence[float],
    qb_processing_z: float = 0.0,
    gamma_ttt: float = 0.18,
    gamma_cpoe: float = -0.024,
) -> DisguisedCoverageResult:
    """Compute K15 6-shell pre/post disguise D_KL and TTT/CPOE impacts."""
    if len(pre_snap_shell_prob) != 6 or len(post_snap_shell_prob) != 6:
        raise ValueError("pre_snap_shell_prob and post_snap_shell_prob must have length 6.")
    p_pre = [max(0.0, float(v)) for v in pre_snap_shell_prob]
    p_post = [max(0.0, float(v)) for v in post_snap_shell_prob]
    s_pre = sum(p_pre) or 1.0
    s_post = sum(p_post) or 1.0
    p_pre = [v / s_pre for v in p_pre]
    p_post = [v / s_post for v in p_post]

    d_kl_raw = sum(
        pp * math.log(max(1e-12, pp) / max(1e-4, pr))
        for pp, pr in zip(p_post, p_pre, strict=True)
        if pp > 1e-12
    )
    d_kl = max(0.0, min(2.50, d_kl_raw))
    delta_ttt = max(
        0.0, min(0.55, float(gamma_ttt) * d_kl * math.exp(-0.25 * float(qb_processing_z)))
    )
    delta_cpoe = max(
        -0.085, min(0.0, float(gamma_cpoe) * d_kl * math.exp(-0.35 * float(qb_processing_z)))
    )
    return DisguisedCoverageResult(
        d_kl_nats=round(d_kl, 6),
        delta_ttt_sec=round(delta_ttt, 6),
        delta_cpoe=round(delta_cpoe, 6),
    )


def compute_humid_air_density(
    *,
    temp_celsius: float,
    rel_humidity: float,
    elevation_m: float,
    roof_closed: bool = False,
) -> float:
    """Compute tropospheric Buck-Dalton humid air density rho(T, RH, h) in [0.85, 1.42]."""
    if roof_closed:
        return 1.1923
    h = max(0.0, float(elevation_m))
    t_c = float(temp_celsius)
    rh = max(0.0, min(1.0, float(rel_humidity)))

    p_h = 101325.0 * ((1.0 - 0.0065 * h / 288.15) ** 5.25588)
    if t_c >= 0.0:
        e_sat = 611.21 * math.exp((18.678 - t_c / 234.5) * t_c / (257.14 + t_c))
    else:
        e_sat = 611.15 * math.exp((23.036 - t_c / 333.7) * t_c / (279.82 + t_c))

    t_k = t_c + 273.15
    rho = float((p_h - rh * e_sat) / (287.058 * t_k) + (rh * e_sat) / (461.495 * t_k))
    return max(0.85, min(1.42, rho))


def _integrate_rk4_ball_flight(
    *,
    rho: float,
    wind_vec: tuple[float, float, float],
    v0_ms: tuple[float, float, float] = (28.0, 0.0, 14.5),
    spin_vec: tuple[float, float, float] = (0.0, -5.0, 35.0),
    dt: float = 0.01,
) -> tuple[float, float]:
    """Integrate 3D prolate-spheroid flight with crosswind sin^2(psi) drag via RK4."""
    mass = 0.415
    area = 0.0233
    a_rad = 0.086
    c_d0, c_d90, c_l = 0.19, 0.76, 0.06
    g_vec = np.array([0.0, 0.0, -9.80665], dtype=np.float64)
    w_vec = np.asarray(wind_vec, dtype=np.float64)
    om_vec = np.asarray(spin_vec, dtype=np.float64)
    u_axis = np.asarray(v0_ms, dtype=np.float64)
    u_axis = u_axis / max(1e-9, float(np.linalg.norm(u_axis)))

    def _deriv(state: np.ndarray) -> np.ndarray:
        vel = state[3:6]
        v_rel = vel - w_vec
        spd = max(1e-6, float(np.linalg.norm(v_rel)))
        cos_psi = max(-1.0, min(1.0, float(np.dot(u_axis, v_rel) / spd)))
        sin2_psi = max(0.0, 1.0 - cos_psi * cos_psi)
        c_d = c_d0 + (c_d90 - c_d0) * sin2_psi
        drag = -(0.5 * rho * area * c_d / mass) * spd * v_rel
        magnus = (c_l * math.pi * rho * (a_rad**3) / mass) * np.cross(om_vec, v_rel)
        acc = g_vec + drag + magnus
        return np.concatenate((vel, acc))

    y = np.array([0.0, 0.0, 2.0, v0_ms[0], v0_ms[1], v0_ms[2]], dtype=np.float64)
    for _ in range(700):
        k1 = _deriv(y)
        k2 = _deriv(y + 0.5 * dt * k1)
        k3 = _deriv(y + 0.5 * dt * k2)
        k4 = _deriv(y + dt * k3)
        y_next = y + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
        if y_next[2] <= 0.0 and y[2] > 0.0:
            frac = float(y[2] / max(1e-9, y[2] - y_next[2]))
            y = y + frac * (y_next - y)
            break
        y = y_next

    yards_per_m = 1.0936133
    return float(y[0] * yards_per_m), float(y[1] * yards_per_m)


def evaluate_stadium_aerodynamics_and_fatigue(
    *,
    temp_celsius: float,
    rel_humidity: float,
    elevation_m: float,
    wind_vec_3d: tuple[float, float, float],
    roof_closed: bool = False,
    precip_mm_hr: float = 0.0,
    wbgt_celsius: float = 20.0,
    rest_days: float = 7.0,
    def_snaps_cum: int = 50,
    cpi_index: float = 0.0,
) -> HumidAerodynamicsResult:
    """Compute K16 humid air density, RK4 ballistics, wet/cold fumble & WBGT>27C Q4 decay."""
    rho = compute_humid_air_density(
        temp_celsius=temp_celsius,
        rel_humidity=rel_humidity,
        elevation_m=elevation_m,
        roof_closed=roof_closed,
    )
    eff_wind = (0.0, 0.0, 0.0) if roof_closed else wind_vec_3d
    carry_yds, lat_yds = _integrate_rk4_ball_flight(rho=rho, wind_vec=eff_wind)
    dome_carry, _ = _integrate_rk4_ball_flight(rho=1.1923, wind_vec=(0.0, 0.0, 0.0))

    carry_delta = max(-12.0, min(8.0, carry_yds - dome_carry))
    lat_clamped = max(-18.0, min(18.0, lat_yds))

    r_mm = max(0.0, float(precip_mm_hr))
    cold_pen = max(0.0, -float(temp_celsius))
    sleet_ind = 1.0 if (r_mm > 0.5 and float(temp_celsius) < 2.0) else 0.0
    fum_mult = max(
        1.0,
        min(
            2.35,
            math.exp(0.28 * math.log1p(r_mm) + 0.022 * cold_pen + 0.18 * sleet_ind),
        ),
    )

    excess_snaps = max(0, int(def_snaps_cum) - 50)
    wbgt_stress = 0.09 * max(0.0, float(wbgt_celsius) - 27.0)
    rest_def = 0.12 * max(0.0, 7.0 - float(rest_days))
    cpi_def = 0.15 * max(0.0, -float(cpi_index))
    m_q4 = max(
        0.72,
        min(
            1.00,
            math.exp(-0.011 * float(excess_snaps) * (1.0 + wbgt_stress + rest_def + cpi_def)),
        ),
    )

    return HumidAerodynamicsResult(
        air_density_rho=round(rho, 6),
        carry_yds=round(carry_yds, 4),
        carry_delta_vs_dome_yds=round(carry_delta, 4),
        lateral_drift_yds=round(lat_clamped, 4),
        fumble_mult=round(fum_mult, 4),
        m_q4_def=round(m_q4, 6),
        dome_override_active=bool(roof_closed),
    )


def evaluate_referee_crew_and_dpi(
    *,
    crew_random_effect_off_hold: float,
    crew_random_effect_dpi: float,
    crew_random_effect_rtp: float,
    crowd_db: float = 85.0,
    home_on_defense: bool = False,
    target_air_yards: float = 18.0,
    los_yardline_100: float = 35.0,
    p_edge_win: float = 0.25,
    ep_before: float = 1.60,
    ep_first_and_10_fn: float | None = None,
    prior_safety_strikes: int = 0,
    new_safety_foul: bool = False,
) -> RefereeCrewResult:
    """Compute K24 17-crew GLMM hazards, OffHold-sack partition & Rule 8-5 zero-stat DPI."""
    def _sig(z: float) -> float:
        return 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, z))))

    u_h = max(-0.45, min(0.45, float(crew_random_effect_off_hold)))
    u_d = max(-0.45, min(0.45, float(crew_random_effect_dpi)))
    u_r = max(-0.45, min(0.45, float(crew_random_effect_rtp)))
    crowd_term = 0.22 * (1.0 if home_on_defense else 0.0) * ((float(crowd_db) - 85.0) / 10.0)

    pi_hold = _sig(-3.2 + u_h + crowd_term)
    deep_boost = 0.9 if float(target_air_yards) >= 15.0 else -0.6
    pi_dpi = max(0.02, min(0.19, _sig(-2.8 + u_d + crowd_term + deep_boost)))
    pi_rtp = _sig(-4.0 + u_r + crowd_term)

    p_clean_sack = (1.0 - pi_hold) * max(0.0, min(1.0, float(p_edge_win)))

    spot_yd = min(99.0, float(los_yardline_100) + max(0.0, float(target_air_yards)))
    ep_new = (
        float(ep_first_and_10_fn)
        if ep_first_and_10_fn is not None
        else min(6.2, -1.2 + 0.072 * spot_yd)
    )
    delta_ep_dpi = (
        pi_dpi * (ep_new - float(ep_before)) if float(target_air_yards) >= 15.0 else 0.0
    )

    strikes = max(0, int(prior_safety_strikes)) + (1 if new_safety_foul else 0)
    return RefereeCrewResult(
        pi_off_hold=round(pi_hold, 6),
        pi_dpi=round(pi_dpi, 6),
        pi_rtp=round(pi_rtp, 6),
        p_clean_sack=round(p_clean_sack, 6),
        delta_ep_dpi=round(delta_ep_dpi, 6),
        stat_pass_yds_dpi=0.0,
        stat_rec_yds_dpi=0.0,
        team_drive_yardline_after_dpi=round(spot_yd, 3),
        three_strikes_count=strikes,
        suspended_flag=strikes >= 3,
    )
