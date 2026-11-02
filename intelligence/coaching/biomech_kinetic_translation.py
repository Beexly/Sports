# PROVENANCE — gse-intelligence-build / coaching / biomech_kinetic_translation.py
# Implements Batch 9 Spatiotemporal Biomechanical, Viscoelastic & Cellular Metabolic Physics Engine (2026-11-02):
#   - EQ-NOV02-079: Inertial Dissipation Ratio (I_dr) in canonical SI units
#   - EQ-NOV02-080: Wavefront Burst Threshold (W_burst) over initial 1.2s snap window
#   - EQ-NOV02-081: Elastic Separation Coefficient (E_sep) with temporal decay
#   - EQ-NOV02-082: Anisotropic Coverage Diffusion Tensor (D_ij) & Corrected Boundary Sink PDE Residual
#   - EQ-NOV02-083: 2D Delaunay Constant-Strain-Triangle (CST) Viscoelastic Lane Deformation (Maxwell Implicit Euler)
#   - EQ-NOV02-084: Pocket Hydrodynamic Navier-Stokes Momentum Residual
#   - EQ-NOV02-085: Biomechanical Joint Torque Caps & QB Kinetic Release Layer
#   - EQ-NOV02-086: Smolensky Tensor Product Representation (TPR) QB Cognitive Decision Probabilities
#   - EQ-NOV02-087: Cleat-Turf Viscoelastic Shear Slip (S_tau) with force-over-yield ratio
#   - EQ-NOV02-088: Photometric Ocular Latency (tau_oc) & Barometric Ballistic Aero Drag
#   - EQ-NOV02-089: 4-Muscle Group Lactic Acid Accumulation, Intracellular pH & Sigmoidal Torque Throttle
#   - EQ-NOV02-090: Metabolic Continuity Loss against observed tracking velocity retention
"""Batch 9 biomechanical, viscoelastic, hydrodynamic, environmental, and cellular metabolic physics kernels."""
from __future__ import annotations

import math
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np

try:
    from scipy.spatial import Delaunay as _ScipyDelaunay
except Exception:  # pragma: no cover
    _ScipyDelaunay = None

MUSCLE_GROUPS: Tuple[str, str, str, str] = ("Quads", "Hamstrings", "Glutes", "Pectorals")
LBS_TO_KG: float = 0.45359237


def _to_vec2(v: Sequence[float] | np.ndarray) -> Tuple[float, float]:
    arr = np.asarray(v, dtype=np.float64).reshape(-1)
    if arr.size < 2:
        raise ValueError("Expected at least a 2D vector (vx, vy)")
    return float(arr[0]), float(arr[1])


# ---------------------------------------------------------------------------
# 1. EQ-NOV02-079: Inertial Dissipation Ratio (I_dr)
# ---------------------------------------------------------------------------

def compute_inertial_dissipation_ratio(
    mass_kg: float,
    vert_m: float,
    shuttle_s: float,
    v_ol: Sequence[float] | np.ndarray,
    v_dl: Sequence[float] | np.ndarray,
) -> float:
    """Compute EQ-NOV02-079 Inertial Dissipation Ratio in canonical SI units (kg, m, s, m/s).

    I_dr = ((mass_kg * vert_m) / (shuttle_s ** 2)) * (1.0 - cos(theta_drift))
    where cos(theta_drift) = (v_ol . v_dl) / (||v_ol|| ||v_dl|| + 1e-8).
    """
    m = max(0.0, float(mass_kg))
    v_m = max(0.0, float(vert_m))
    sh = max(1e-4, float(shuttle_s))
    ox, oy = _to_vec2(v_ol)
    dx, dy = _to_vec2(v_dl)
    norm_ol = math.hypot(ox, oy)
    norm_dl = math.hypot(dx, dy)
    denom = norm_ol * norm_dl + 1e-8
    cos_theta = max(-1.0, min(1.0, (ox * dx + oy * dy) / denom))
    return float(((m * v_m) / (sh * sh)) * (1.0 - cos_theta))


# ---------------------------------------------------------------------------
# 2. EQ-NOV02-080: Wavefront Burst Threshold (W_burst)
# ---------------------------------------------------------------------------

def compute_wavefront_burst_threshold(
    broad_m: float,
    ten_split_s: float,
    mass_kg: float,
    accel_series: Sequence[Any] | np.ndarray,
    dt: float = 0.1,
    window_sec: float = 1.2,
) -> float:
    """Compute EQ-NOV02-080 Wavefront Burst Threshold integrated over t <= 1.2s.

    W_burst = int_0^{1.2s} (broad_m / ten_split_s) * mass_kg * ||a_DL(t)|| dt
    """
    if dt <= 0.0:
        raise ValueError("dt must be positive")
    b_m = max(0.0, float(broad_m))
    t10 = max(1e-4, float(ten_split_s))
    m_kg = max(0.0, float(mass_kg))
    arr = np.asarray(accel_series, dtype=np.float64)
    if arr.size == 0:
        return 0.0
    max_steps = max(1, int(round(window_sec / dt)))
    if arr.ndim == 1:
        mags = np.abs(arr[:max_steps])
    else:
        sliced = arr[:max_steps]
        mags = np.linalg.norm(sliced, axis=-1)
    impulse = float(np.sum(mags) * dt)
    return float((b_m / t10) * m_kg * impulse)


# ---------------------------------------------------------------------------
# 3. EQ-NOV02-081: Elastic Separation Coefficient (E_sep)
# ---------------------------------------------------------------------------

def compute_elastic_separation_coefficient(
    vert_m: float,
    broad_m: float,
    height_m: float,
    delta_t_sep_sec: float,
    lambda_decay: float = 0.35,
) -> float:
    """Compute EQ-NOV02-081 Elastic Separation Coefficient.

    E_sep = ((vert_m + broad_m) / height_m) * exp(-lambda_decay * delta_t_sep_sec)
    """
    h_m = max(1e-4, float(height_m))
    v_m = max(0.0, float(vert_m))
    b_m = max(0.0, float(broad_m))
    dt_sep = max(0.0, float(delta_t_sep_sec))
    lam = max(0.0, float(lambda_decay))
    return float(((v_m + b_m) / h_m) * math.exp(-lam * dt_sep))


# ---------------------------------------------------------------------------
# 4. EQ-NOV02-082: Anisotropic Coverage Diffusion Tensor & Boundary Sink PDE
# ---------------------------------------------------------------------------

def compute_anisotropic_coverage_diffusion_tensor(
    height_in: float,
    forty_s: float,
    vert_in: float,
    broad_in: float,
    shuttle_s: float,
    three_cone_s: float,
    vx: float,
    vy: float,
) -> np.ndarray:
    """Compute EQ-NOV02-082 2x2 Anisotropic Coverage Diffusion Tensor D_ij."""
    f40 = max(1e-4, float(forty_s))
    agility_s = max(1e-4, float(shuttle_s) + float(three_cone_s))
    speed = math.hypot(float(vx), float(vy))
    d_11 = (float(height_in) / f40) * (float(vert_in) / 36.0)
    d_22 = (float(broad_in) / agility_s) * (1.0 / (1.0 + speed))
    theta = math.atan2(float(vy), float(vx))
    d_12 = 0.5 * (d_11 - d_22) * math.sin(theta)
    return np.array([[d_11, d_12], [d_12, d_22]], dtype=np.float64)


def compute_secondary_coverage_pde_residual(
    psi: float | Sequence[float] | np.ndarray,
    dpsi_dt: float | Sequence[float] | np.ndarray,
    d2psi_dx2: float | Sequence[float] | np.ndarray,
    d2psi_dy2: float | Sequence[float] | np.ndarray,
    d_11: float | Sequence[float] | np.ndarray,
    d_22: float | Sequence[float] | np.ndarray,
    real_pass_completions: float | Sequence[float] | np.ndarray,
) -> float:
    """Compute EQ-NOV02-082 Anisotropic Diffusion PDE Residual with corrected boundary sink loss.

    Boundary sink loss:
        L_sink = y_comp * (psi ** 2) + (1 - y_comp) * ((1 - psi) ** 2)
    so completions (y_comp = 1) penalize nonzero coverage density and drive psi -> 0,
    while incompletions (y_comp = 0) drive psi -> 1.
    """
    psi_arr = np.clip(np.asarray(psi, dtype=np.float64), 0.0, 1.0)
    dpsi_dt_arr = np.asarray(dpsi_dt, dtype=np.float64)
    d2x_arr = np.asarray(d2psi_dx2, dtype=np.float64)
    d2y_arr = np.asarray(d2psi_dy2, dtype=np.float64)
    d11_arr = np.asarray(d_11, dtype=np.float64)
    d22_arr = np.asarray(d_22, dtype=np.float64)
    y_comp = np.clip(np.asarray(real_pass_completions, dtype=np.float64), 0.0, 1.0)

    r_pde = dpsi_dt_arr - (d11_arr * d2x_arr + d22_arr * d2y_arr)
    l_sink = y_comp * (psi_arr ** 2) + (1.0 - y_comp) * ((1.0 - psi_arr) ** 2)
    return float(np.mean(r_pde ** 2) + 10.0 * np.mean(l_sink))


# ---------------------------------------------------------------------------
# 5. EQ-NOV02-083: Viscoelastic Lane Deformation (Delaunay CST + Implicit Euler)
# ---------------------------------------------------------------------------

def _delaunay_simplices(coords: np.ndarray) -> List[Tuple[int, int, int]]:
    n = coords.shape[0]
    if n < 3:
        return []
    if n == 3:
        return [(0, 1, 2)]
    if _ScipyDelaunay is not None:
        try:
            tri = _ScipyDelaunay(coords)
            return [(int(s[0]), int(s[1]), int(s[2])) for s in tri.simplices]
        except Exception:
            pass
    # Deterministic fan triangulation fallback when SciPy is unavailable or points are degenerate
    order = sorted(range(n), key=lambda i: (float(coords[i, 0]), float(coords[i, 1])))
    return [(order[0], order[k], order[k + 1]) for k in range(1, n - 1)]


def calculate_viscoelastic_lane_deformation(
    frame_telemetry: np.ndarray | Sequence[Sequence[float]],
    player_combine_profiles: Sequence[Mapping[str, float]],
    dt: float = 0.1,
    prior_stresses: Optional[Sequence[float]] = None,
) -> List[Dict[str, Any]]:
    """Compute EQ-NOV02-083 2D Constant-Strain-Triangle (CST) Viscoelastic Lane Deformation.

    Uses coordinate-invariant 2D CST velocity divergence:
        tr(eps_dot) = ((vx0*(y1-y2) + vx1*(y2-y0) + vx2*(y0-y1))
                     + (vy0*(x2-x1) + vy1*(x0-x2) + vy2*(x1-x0))) / (2 * signed_area)
    and unconditionally stable Implicit Euler Maxwell stress update:
        sigma_{t+dt} = (tau_rel / (tau_rel + dt)) * sigma_t + (E_stiff * dt / (tau_rel + dt)) * tr(eps_dot)
    """
    if dt <= 0.0:
        raise ValueError("dt must be positive")
    arr = np.asarray(frame_telemetry, dtype=np.float64)
    if arr.ndim != 2 or arr.shape[0] < 3 or arr.shape[1] < 4:
        return []

    coords = arr[:, :2]
    vels = arr[:, 2:4]
    simplices = _delaunay_simplices(coords)
    results: List[Dict[str, Any]] = []

    for idx, (i0, i1, i2) in enumerate(simplices):
        x0, y0 = float(coords[i0, 0]), float(coords[i0, 1])
        x1, y1 = float(coords[i1, 0]), float(coords[i1, 1])
        x2, y2 = float(coords[i2, 0]), float(coords[i2, 1])

        vx0, vy0 = float(vels[i0, 0]), float(vels[i0, 1])
        vx1, vy1 = float(vels[i1, 0]), float(vels[i1, 1])
        vx2, vy2 = float(vels[i2, 0]), float(vels[i2, 1])

        two_signed_area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        area = 0.5 * abs(two_signed_area)
        if abs(two_signed_area) < 1e-8:
            tr_eps_dot = 0.0
        else:
            dux_dx = (vx0 * (y1 - y2) + vx1 * (y2 - y0) + vx2 * (y0 - y1)) / two_signed_area
            duy_dy = (vy0 * (x2 - x1) + vy1 * (x0 - x2) + vy2 * (x1 - x0)) / two_signed_area
            tr_eps_dot = dux_dx + duy_dy

        tri_profiles = [player_combine_profiles[i] for i in (i0, i1, i2)]
        mean_shuttle = sum(float(p.get("shuttle", 4.5)) for p in tri_profiles) / 3.0
        mean_broad = max(1.0, sum(float(p.get("broad", 108.0)) for p in tri_profiles) / 3.0)
        tau_rel = max(1e-4, mean_shuttle / (mean_broad / 36.0))
        stiffness = sum(float(p.get("weight", 300.0)) * float(p.get("vert", 30.0)) for p in tri_profiles) / 3.0

        sigma_prev = float(prior_stresses[idx]) if (prior_stresses is not None and idx < len(prior_stresses)) else 0.0
        decay = tau_rel / (tau_rel + dt)
        sigma_next = decay * sigma_prev + ((stiffness * dt) / (tau_rel + dt)) * tr_eps_dot
        lane_open_index = area * math.exp(max(-10.0, min(10.0, sigma_next / 10000.0)))

        results.append({
            "simplex": (i0, i1, i2),
            "area": float(area),
            "strain_rate_trace": float(tr_eps_dot),
            "tau_relaxation_s": float(tau_rel),
            "stiffness_modulus": float(stiffness),
            "viscoelastic_stress": float(sigma_next),
            "lane_open_index": float(lane_open_index),
        })

    return results


# ---------------------------------------------------------------------------
# 6. EQ-NOV02-084: Pocket Hydrodynamic Navier-Stokes Momentum Residual
# ---------------------------------------------------------------------------

def compute_pocket_hydrodynamic_navier_stokes_residual(
    u: float | Sequence[float] | np.ndarray,
    v: float | Sequence[float] | np.ndarray,
    du_dt: float | Sequence[float] | np.ndarray,
    dv_dt: float | Sequence[float] | np.ndarray,
    dp_dx: float | Sequence[float] | np.ndarray,
    dp_dy: float | Sequence[float] | np.ndarray,
    laplacian_u: float | Sequence[float] | np.ndarray,
    laplacian_v: float | Sequence[float] | np.ndarray,
    f_ol_x: float | Sequence[float] | np.ndarray,
    f_ol_y: float | Sequence[float] | np.ndarray,
    f_dl_x: float | Sequence[float] | np.ndarray,
    f_dl_y: float | Sequence[float] | np.ndarray,
    rho: float = 1.2,
    mu: float = 0.05,
) -> float:
    """Compute EQ-NOV02-084 2D Navier-Stokes Pocket Momentum Residual."""
    _ = np.asarray(u, dtype=np.float64)
    _ = np.asarray(v, dtype=np.float64)
    du_dt_a = np.asarray(du_dt, dtype=np.float64)
    dv_dt_a = np.asarray(dv_dt, dtype=np.float64)
    dp_dx_a = np.asarray(dp_dx, dtype=np.float64)
    dp_dy_a = np.asarray(dp_dy, dtype=np.float64)
    lap_u_a = np.asarray(laplacian_u, dtype=np.float64)
    lap_v_a = np.asarray(laplacian_v, dtype=np.float64)
    fol_x_a = np.asarray(f_ol_x, dtype=np.float64)
    fol_y_a = np.asarray(f_ol_y, dtype=np.float64)
    fdl_x_a = np.asarray(f_dl_x, dtype=np.float64)
    fdl_y_a = np.asarray(f_dl_y, dtype=np.float64)

    res_x = float(rho) * du_dt_a + dp_dx_a - float(mu) * lap_u_a - (fol_x_a - fdl_x_a)
    res_y = float(rho) * dv_dt_a + dp_dy_a - float(mu) * lap_v_a - (fol_y_a - fdl_y_a)
    return float(np.mean(res_x ** 2 + res_y ** 2))


# ---------------------------------------------------------------------------
# 7. EQ-NOV02-085: Biomechanical Joint Torque Caps & QB Kinetic Release Layer
# ---------------------------------------------------------------------------

def compute_biomechanical_joint_torque_caps(
    hip_deg: float,
    knee_deg: float,
    ankle_deg: float,
    vx: float,
    vy: float,
    mass_lbs: float,
) -> Dict[str, float]:
    """Compute EQ-NOV02-085 Tri-Joint Torque Caps & Maximum Feasible Acceleration."""
    mass_kg = max(1e-4, float(mass_lbs) * LBS_TO_KG)
    tau_hip = mass_kg * math.exp(-((float(hip_deg) - 125.0) ** 2) / (2.0 * (25.0 ** 2)))
    tau_knee = mass_kg * math.exp(-((float(knee_deg) - 115.0) ** 2) / (2.0 * (20.0 ** 2)))
    tau_ankle = mass_kg * math.exp(-((float(ankle_deg) - 85.0) ** 2) / (2.0 * (15.0 ** 2)))

    total_torque_cap = tau_hip + tau_knee + tau_ankle
    angle_mod = abs(math.cos(0.5 * math.atan2(float(vy), float(vx))))
    max_kinetic_accel = (total_torque_cap / mass_kg) * angle_mod

    return {
        "tau_hip_nm": float(tau_hip),
        "tau_knee_nm": float(tau_knee),
        "tau_ankle_nm": float(tau_ankle),
        "total_torque_cap_nm": float(total_torque_cap),
        "max_kinetic_accel_mps2": float(max_kinetic_accel),
    }


def compute_qb_kinetic_release_layer(
    qb_xy: Sequence[float] | np.ndarray,
    rusher_xy: Sequence[float] | np.ndarray,
    rusher_v: Sequence[float] | np.ndarray,
    pocket_pressure: float,
) -> Dict[str, float]:
    """Compute EQ-NOV02-085 QB Kinetic Release Time Modulation, Arm Slot & Platform Stability."""
    qx, qy = _to_vec2(qb_xy)
    rx, ry = _to_vec2(rusher_xy)
    rvx, rvy = _to_vec2(rusher_v)

    d_rush = max(0.25, math.hypot(qx - rx, qy - ry))
    v_rush = math.hypot(rvx, rvy)
    press = max(0.0, float(pocket_pressure))

    t_rel_mod = 0.40 * math.exp(-0.15 * (press / d_rush))
    arm_slot_deg = max(35.0, min(90.0, 75.0 - 12.0 * (v_rush / d_rush)))
    platform_stability = 1.0 / (1.0 + math.exp(max(-20.0, min(20.0, press - 3.5))))

    return {
        "release_time_s": float(t_rel_mod),
        "arm_slot_deg": float(arm_slot_deg),
        "platform_stability": float(platform_stability),
        "rusher_distance_m": float(d_rush),
    }


# ---------------------------------------------------------------------------
# 8. EQ-NOV02-086: Smolensky Tensor Product Representation (TPR) QB Cognition
# ---------------------------------------------------------------------------

def compute_qb_tensor_product_cognitive_probs(
    situational_vec: Sequence[float] | np.ndarray,
    spatial_vec: Sequence[float] | np.ndarray,
    W_role: Optional[np.ndarray] = None,
    W_filler: Optional[np.ndarray] = None,
    W_out: Optional[np.ndarray] = None,
) -> Dict[str, Any]:
    """Compute EQ-NOV02-086 Tensor Product Representation (TPR) QB Decision Probabilities.

    Binds situational roles r = tanh(W_role x_sit) with spatial fillers f = sigmoid(W_filler x_spat)
    via outer product T_cog = r (x) f, then projects to [Prob_Throw, Prob_Scramble, Prob_Checkdown].
    """
    s_vec = np.asarray(situational_vec, dtype=np.float64).reshape(-1)
    p_vec = np.asarray(spatial_vec, dtype=np.float64).reshape(-1)
    if s_vec.size == 0 or p_vec.size == 0:
        raise ValueError("situational_vec and spatial_vec must be non-empty")

    r_raw = s_vec if W_role is None else np.asarray(W_role, dtype=np.float64) @ s_vec
    f_raw = p_vec if W_filler is None else np.asarray(W_filler, dtype=np.float64) @ p_vec

    r = np.tanh(r_raw)
    f = 1.0 / (1.0 + np.exp(-np.clip(f_raw, -30.0, 30.0)))
    tpr_matrix = np.outer(r, f)
    flat = tpr_matrix.reshape(-1)

    if W_out is None:
        idx = np.arange(flat.size, dtype=np.float64)
        w0 = np.cos(0.37 * (idx + 1.0))
        w1 = np.sin(0.53 * (idx + 1.0))
        w2 = np.cos(0.71 * (idx + 1.0)) - np.sin(0.29 * (idx + 1.0))
        proj = np.vstack([w0, w1, w2]) / math.sqrt(max(1, flat.size))
    else:
        proj = np.asarray(W_out, dtype=np.float64)

    logits = proj @ flat
    shifted = logits - np.max(logits)
    exps = np.exp(shifted)
    probs = exps / np.sum(exps)

    return {
        "prob_throw": float(probs[0]),
        "prob_scramble": float(probs[1]),
        "prob_checkdown": float(probs[2]),
        "probs": np.asarray(probs, dtype=np.float64),
        "tpr_shape": tpr_matrix.shape,
    }


# ---------------------------------------------------------------------------
# 9. EQ-NOV02-087 & EQ-NOV02-088: Cleat-Turf Slip, Photometric Glare & Aero Drag
# ---------------------------------------------------------------------------

def compute_cleat_turf_viscoelastic_slip(
    lateral_force_n: float,
    sigma_yield_n: float,
    moisture_delta: float,
    alpha: float = 2.5,
) -> float:
    """Compute EQ-NOV02-087 Cleat-Turf Viscoelastic Slip Probability S_tau.

    Physically corrected force-over-yield ratio:
        S_tau = clip(1.0 - exp(-alpha * (|F_lat| / (sigma_yield + 1e-6)) * moisture_delta), 0.0, 0.95)
    Invariants:
        - F_lat == 0 or moisture_delta <= 0 -> S_tau == 0.0
        - Monotonically increases with |F_lat| and moisture_delta
        - Monotonically decreases with turf yield strength sigma_yield_n
    """
    f_lat = abs(float(lateral_force_n))
    s_yield = max(0.0, float(sigma_yield_n))
    moist = max(0.0, float(moisture_delta))
    a = max(0.0, float(alpha))
    if f_lat == 0.0 or moist == 0.0 or a == 0.0:
        return 0.0
    ratio = f_lat / (s_yield + 1e-6)
    slip = 1.0 - math.exp(-a * ratio * moist)
    return float(max(0.0, min(0.95, slip)))


def compute_photometric_ocular_latency_ms(
    lux: float,
    glare_rad: float,
    qb_exp_idx: float,
) -> float:
    """Compute EQ-NOV02-088 Photometric Ocular Reaction Latency Penalty (ms)."""
    l_val = max(1.0, float(lux))
    cos_g = max(0.0, math.cos(float(glare_rad)))
    exp_idx = max(0.0, float(qb_exp_idx))
    tau_oc = (35.0 * cos_g * math.log10(l_val / 1000.0 + 1.0)) / math.sqrt(exp_idx + 1.0)
    return float(max(0.0, tau_oc))


def compute_barometric_ballistic_aero_drag(
    ball_vel_mps: Sequence[float] | np.ndarray,
    wind_vel_mps: Sequence[float] | np.ndarray,
    air_density_kg_m3: float = 1.05,
    spin_rate_rad_s: float = 45.0,
    drag_coeff: float = 0.22,
    cross_area_m2: float = 0.015,
    ball_mass_kg: float = 0.415,
) -> Dict[str, Any]:
    """Compute EQ-NOV02-088 Barometric Ballistic Aerodynamic Drag & Gyroscopic Lift."""
    vb = np.asarray(ball_vel_mps, dtype=np.float64).reshape(-1)
    vw = np.asarray(wind_vel_mps, dtype=np.float64).reshape(-1)
    if vb.size != vw.size or vb.size < 2:
        raise ValueError("ball_vel_mps and wind_vel_mps must have matching dimension >= 2")

    v_rel = vb - vw
    v_rel_mag = float(np.linalg.norm(v_rel))
    rho = max(0.1, float(air_density_kg_m3))
    cd = max(0.01, float(drag_coeff))
    area = max(1e-4, float(cross_area_m2))
    spin = max(0.0, float(spin_rate_rad_s))

    # High spiral spin stabilizes the nose cone, slightly reducing effective drag
    spin_stabilization = 1.0 / (1.0 + 0.004 * spin)
    f_drag_vec = -0.5 * rho * (v_rel_mag ** 2) * area * (cd * spin_stabilization) * (v_rel / (v_rel_mag + 1e-6))
    magnus_lift_n = 0.5 * rho * v_rel_mag * area * (0.0012 * spin)
    decel_mps2 = float(np.linalg.norm(f_drag_vec)) / max(0.1, float(ball_mass_kg))

    return {
        "drag_force_vec_n": f_drag_vec,
        "drag_magnitude_n": float(np.linalg.norm(f_drag_vec)),
        "magnus_lift_n": float(magnus_lift_n),
        "net_deceleration_mps2": float(decel_mps2),
        "relative_airspeed_mps": v_rel_mag,
    }


# ---------------------------------------------------------------------------
# 10. EQ-NOV02-089 & EQ-NOV02-090: 4-Muscle Lactic Accumulation & Continuity Loss
# ---------------------------------------------------------------------------

def compute_muscle_group_lactic_accumulation_step(
    accel_xy_mps2: Sequence[float] | np.ndarray,
    mass_lbs: float,
    role_activation_weights: Sequence[float] | np.ndarray,
    prior_lactic_4vec: Sequence[float] | np.ndarray,
    clearing_rates_4vec: Sequence[float] | np.ndarray = (0.015, 0.014, 0.012, 0.018),
    anaerobic_threshold_n: float = 400.0,
    dt: float = 0.1,
    gamma_accum: float = 0.00025,
) -> Dict[str, Any]:
    """Compute EQ-NOV02-089 4-Muscle Group Lactic Accumulation, Intracellular pH & Torque Throttle.

    Tracks [Quads, Hamstrings, Glutes, Pectorals]:
      - L_{m, t+dt} = L_{m, t} * exp(-lambda_m * dt) + gamma_accum * max(0, F_{m, t} - F_crit) * dt
      - pH_{m, t} = 7.1 - 0.018 * L_{m, t}
      - throttle_m = sigmoid(10 * (pH_{m, t} - 6.5))
      - scalar_torque_throttle = sum_m w_m * throttle_m
    """
    if dt <= 0.0:
        raise ValueError("dt must be positive")
    ax, ay = _to_vec2(accel_xy_mps2)
    accel_mag = math.hypot(ax, ay)
    mass_kg = max(0.0, float(mass_lbs)) * LBS_TO_KG
    total_force_n = mass_kg * accel_mag

    w = np.asarray(role_activation_weights, dtype=np.float64).reshape(-1)
    l_prev = np.asarray(prior_lactic_4vec, dtype=np.float64).reshape(-1)
    lam = np.asarray(clearing_rates_4vec, dtype=np.float64).reshape(-1)
    if w.size != 4 or l_prev.size != 4 or lam.size != 4:
        raise ValueError("role_activation_weights, prior_lactic_4vec, and clearing_rates_4vec must have length 4")

    f_muscle = np.maximum(0.0, w) * total_force_n
    threshold_4vec = np.minimum(1.0, np.maximum(0.05, w)) * float(anaerobic_threshold_n)
    surplus_n = np.maximum(0.0, f_muscle - threshold_4vec)
    l_next = np.maximum(0.0, l_prev) * np.exp(-np.maximum(0.0, lam) * dt) + float(gamma_accum) * surplus_n * dt
    ph_vec = 7.1 - 0.018 * l_next
    throttle_vec = 1.0 / (1.0 + np.exp(-np.clip(10.0 * (ph_vec - 6.5), -30.0, 30.0)))

    w_pos = np.maximum(0.0, w)
    w_norm = w_pos / (float(np.sum(w_pos)) if float(np.sum(w_pos)) > 1e-8 else 1.0)
    scalar_throttle = float(np.sum(w_norm * throttle_vec))

    return {
        "muscle_groups": MUSCLE_GROUPS,
        "lactic_4vec": l_next,
        "ph_4vec": ph_vec,
        "muscle_throttle_4vec": throttle_vec,
        "scalar_torque_throttle": scalar_throttle,
        "muscle_forces_n": f_muscle,
    }


def compute_metabolic_continuity_loss(
    predicted_degradation: float | Sequence[float] | np.ndarray,
    v_initial: Sequence[float] | np.ndarray,
    v_current: Sequence[float] | np.ndarray,
) -> float:
    """Compute EQ-NOV02-090 Metabolic Continuity Loss against observed tracking velocity retention."""
    pred = np.asarray(predicted_degradation, dtype=np.float64)
    v_init_arr = np.asarray(v_initial, dtype=np.float64)
    v_curr_arr = np.asarray(v_current, dtype=np.float64)

    if v_init_arr.ndim == 1:
        norm_init = float(np.linalg.norm(v_init_arr))
        norm_curr = float(np.linalg.norm(v_curr_arr))
        actual_retention = norm_curr / (norm_init + 1e-5)
    else:
        norm_init = np.linalg.norm(v_init_arr, axis=-1)
        norm_curr = np.linalg.norm(v_curr_arr, axis=-1)
        actual_retention = norm_curr / (norm_init + 1e-5)

    return float(np.mean((pred - actual_retention) ** 2))
