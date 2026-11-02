# PROVENANCE — gse-intelligence-build / coaching / trench_pocket_physics.py
# Implements Batch 7 Spatiotemporal Trench & Pocket Physics Suite (2026-11-02):
#   - EQ-B7-02: Ruscio & Brady (2021) Modified PFR Gaussian Win Probability (with OT scaling)
#   - EQ-B7-04: Discrete-Time HMM + Viterbi Decoding for Dynamic Pass-Blocking Assignments (Stunts/Twists)
#   - EQ-B7-05: Cox Proportional Hazards (Weibull Baseline) & Continuous Block Efficiency Integral
#   - EQ-B7-06: 2D Convex Hull Pocket Area (A_t) & Instantaneous Compression Derivative (dA/dt)
#   - EQ-B7-07: QB Escape Vector vs. Collapsing Wall Alignment Cosine & Pass-Rush STRAIN Rate
#   - EQ-B7-09: Pipping-Gamon et al. (2026) Opponent-Adjusted Logit Survival & 5-Man Unit Protection Score
#   - EQ-B7-10: Toni (2025) & Fast-Jensen p-Adic Ultrametric Coaching Tree Kernel
#
# Runtime dependencies: Python stdlib only (math, typing) + optional numpy/scipy fallback so
# it executes cleanly in every environment without external binary breakage.
"""Spatiotemporal trench protection, pocket collapse physics, and matchup-adjusted OL survival."""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple


# ---------------------------------------------------------------------------
# 1. EQ-B7-04: HMM + Viterbi Decoding for Dynamic Pass-Blocking Assignments
# ---------------------------------------------------------------------------

def _euclidean_2d(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def _leverage_angle_rad(
    ol_pos: Tuple[float, float],
    rusher_pos: Tuple[float, float],
    qb_pos: Tuple[float, float],
) -> float:
    """Angle (in radians, [0, pi]) between (OL -> Rusher) and (OL -> QB).

    Ideal pass protection keeps the blocker directly between the rusher and the QB,
    meaning vectors (Rusher - OL) and (QB - OL) point in opposite directions (angle ~ pi),
    so the deviation from ideal leverage is |pi - angle|.
    """
    vx1, vy1 = rusher_pos[0] - ol_pos[0], rusher_pos[1] - ol_pos[1]
    vx2, vy2 = qb_pos[0] - ol_pos[0], qb_pos[1] - ol_pos[1]
    n1 = math.hypot(vx1, vy1)
    n2 = math.hypot(vx2, vy2)
    if n1 < 1e-6 or n2 < 1e-6:
        return 0.0
    cos_ang = max(-1.0, min(1.0, (vx1 * vx2 + vy1 * vy2) / (n1 * n2)))
    ang = math.acos(cos_ang)
    return abs(math.pi - ang)


def hmm_viterbi_pass_block_assignments(
    ol_trajectory: Sequence[Tuple[float, float]],
    rusher_trajectories: Sequence[Sequence[Tuple[float, float]]],
    qb_trajectory: Sequence[Tuple[float, float]],
    gamma_0: float = 0.18,
    eta_decay: float = 0.35,
    beta_dist: float = 1.15,
    beta_angle: float = 0.85,
    dt: float = 0.1,
) -> Dict[str, Any]:
    """Decode the most likely rusher assignment sequence S* = (S_1, ..., S_T) via Viterbi.

    Handles defensive stunts/twists where two rushers cross paths and the offensive
    lineman switches assignment mid-play.

    Args:
        ol_trajectory: [(x_t, y_t)] for t=0..T-1 for one offensive lineman.
        rusher_trajectories: List of N rusher trajectories, each [(x_t, y_t)] for t=0..T-1.
        qb_trajectory: [(x_t, y_t)] for t=0..T-1 for the quarterback.
        gamma_0: Base frame-to-frame stunt switch probability at snap.
        eta_decay: Temporal decay rate of stunt switching as play progresses.
        beta_dist: Spatial proximity weight in emission kernel.
        beta_angle: Leverage angle weight in emission kernel.
        dt: Frame step in seconds (default 0.1s for 10Hz NGS tracking).

    Returns:
        Dict with optimal state sequence `assignments`, `stunt_switches` count,
        `switch_frames`, and `path_log_prob`.
    """
    T = len(ol_trajectory)
    N = len(rusher_trajectories)
    if T == 0 or N == 0:
        return {"assignments": [], "stunt_switches": 0, "switch_frames": [], "path_log_prob": 0.0}

    eps = 1e-12
    viterbi: List[List[float]] = [[0.0] * N for _ in range(T)]
    backptr: List[List[int]] = [[0] * N for _ in range(T)]

    # Frame t = 0 initialization
    scores_0 = []
    for k in range(N):
        d0 = _euclidean_2d(ol_trajectory[0], rusher_trajectories[k][0])
        th0 = _leverage_angle_rad(ol_trajectory[0], rusher_trajectories[k][0], qb_trajectory[0])
        scores_0.append(-beta_dist * d0 - beta_angle * th0)
    max_s0 = max(scores_0)
    log_z0 = max_s0 + math.log(sum(math.exp(s - max_s0) for s in scores_0))
    for k in range(N):
        viterbi[0][k] = scores_0[k] - log_z0

    # Recursion t = 1 .. T-1
    for t in range(1, T):
        time_sec = t * dt
        gamma_t = max(0.01, min(0.49, gamma_0 * math.exp(-eta_decay * time_sec)))
        stay_prob = 1.0 - gamma_t if N > 1 else 1.0
        switch_prob = gamma_t / (N - 1) if N > 1 else eps

        raw_emit = []
        for k in range(N):
            dk = _euclidean_2d(ol_trajectory[t], rusher_trajectories[k][t])
            thk = _leverage_angle_rad(ol_trajectory[t], rusher_trajectories[k][t], qb_trajectory[t])
            raw_emit.append(-beta_dist * dk - beta_angle * thk)
        max_st = max(raw_emit)
        log_zt = max_st + math.log(sum(math.exp(s - max_st) for s in raw_emit))

        for k in range(N):
            log_emit_k = raw_emit[k] - log_zt
            best_prev_val = -1e18
            best_prev_state = 0
            for prev_l in range(N):
                trans = stay_prob if prev_l == k else switch_prob
                cand = viterbi[t - 1][prev_l] + math.log(max(trans, eps)) + log_emit_k
                if cand > best_prev_val:
                    best_prev_val = cand
                    best_prev_state = prev_l
            viterbi[t][k] = best_prev_val
            backptr[t][k] = best_prev_state

    # Backtrack
    best_last_state = max(range(N), key=lambda k: viterbi[T - 1][k])
    best_log_prob = viterbi[T - 1][best_last_state]
    assignments = [0] * T
    assignments[T - 1] = best_last_state
    for t in range(T - 1, 0, -1):
        assignments[t - 1] = backptr[t][assignments[t]]

    switch_frames = [t for t in range(1, T) if assignments[t] != assignments[t - 1]]
    return {
        "assignments": assignments,
        "stunt_switches": len(switch_frames),
        "switch_frames": switch_frames,
        "path_log_prob": round(best_log_prob, 4),
    }


# ---------------------------------------------------------------------------
# 2. EQ-B7-05: Cox-Weibull Block-Shedding Survival & Block Efficiency Integral
# ---------------------------------------------------------------------------

def cox_weibull_block_survival(
    t_pass: float = 2.75,
    rel_velocity_yds_s: float = 0.0,
    leverage_rad: float = 0.25,
    rusher_threat_z: float = 0.0,
    stunt_active: bool = False,
    weibull_lambda: float = 2.85,
    weibull_k: float = 2.60,
    n_steps: int = 50,
) -> Dict[str, float]:
    """Compute Cox Proportional Hazards block survival curve & continuous Block Efficiency.

    Replaces binary 2.5s PBWR with a continuous survival integral:
        Block_Efficiency = int_0^{T_pass} S(t | x) dt
    """
    beta_vel = 0.38
    beta_lev = 0.65
    beta_rush = 0.42
    beta_stunt = 0.35

    lin_pred = (
        beta_vel * max(0.0, rel_velocity_yds_s)
        + beta_lev * max(0.0, leverage_rad)
        + beta_rush * rusher_threat_z
        + (beta_stunt if stunt_active else 0.0)
    )
    risk_mult = math.exp(max(-3.0, min(3.0, lin_pred)))

    def survival_at(t: float) -> float:
        if t <= 0.0:
            return 1.0
        cum_h0 = (t / weibull_lambda) ** weibull_k
        return math.exp(-cum_h0 * risk_mult)

    # Trapezoidal integration for int_0^{t_pass} S(t | x) dt
    dt = t_pass / max(1, n_steps)
    integral = 0.0
    for i in range(n_steps):
        t0 = i * dt
        t1 = (i + 1) * dt
        integral += 0.5 * (survival_at(t0) + survival_at(t1)) * dt

    s_25 = survival_at(2.5)
    s_tpass = survival_at(t_pass)
    norm_eff = integral / t_pass if t_pass > 0 else 1.0

    return {
        "t_pass_sec": round(t_pass, 3),
        "risk_multiplier": round(risk_mult, 4),
        "survival_at_2_5s": round(s_25, 4),
        "survival_at_throw": round(s_tpass, 4),
        "block_efficiency_integral_sec": round(integral, 4),
        "normalized_block_efficiency": round(norm_eff, 4),
    }


# ---------------------------------------------------------------------------
# 3. EQ-B7-06: 2D Convex Hull Pocket Area (A_t) & Instantaneous Compression dA/dt
# ---------------------------------------------------------------------------

def _convex_hull_2d(points: Sequence[Tuple[float, float]]) -> List[Tuple[float, float]]:
    """Monotone chain 2D convex hull in O(N log N) using pure Python."""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return list(pts)

    def cross(o: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: List[Tuple[float, float]] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper: List[Tuple[float, float]] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]


def polygon_area_shoelace(hull_vertices: Sequence[Tuple[float, float]]) -> float:
    """Compute 2D polygon area (yd^2) via the Shoelace formula."""
    m = len(hull_vertices)
    if m < 3:
        return 0.0
    area2 = 0.0
    for i in range(m):
        x1, y1 = hull_vertices[i]
        x2, y2 = hull_vertices[(i + 1) % m]
        area2 += x1 * y2 - x2 * y1
    return 0.5 * abs(area2)


def calculate_pocket_compression_series(
    ol_frames: Sequence[Sequence[Tuple[float, float]]],
    dt: float = 0.1,
    collapse_threshold_yd2_s: float = -15.0,
) -> Dict[str, Any]:
    """Compute frame-by-frame Convex Hull Pocket Area A_t and Compression Rate dA/dt.

    Flags critical structural collapse whenever dA/dt < collapse_threshold_yd2_s
    (default -15.0 yd^2/s per Batch 7 specification).
    """
    areas: List[float] = []
    for pts in ol_frames:
        hull = _convex_hull_2d(pts)
        areas.append(polygon_area_shoelace(hull))

    if not areas:
        return {
            "areas_yd2": [],
            "dA_dt_yd2_s": [],
            "min_dA_dt": 0.0,
            "critical_collapse_frames": [],
            "collapse_detected": False,
        }

    da_dt: List[float] = [0.0]
    for t in range(1, len(areas)):
        da_dt.append((areas[t] - areas[t - 1]) / dt)

    collapse_frames = [t for t, rate in enumerate(da_dt) if rate < collapse_threshold_yd2_s]
    return {
        "initial_area_yd2": round(areas[0], 3),
        "final_area_yd2": round(areas[-1], 3),
        "min_area_yd2": round(min(areas), 3),
        "areas_yd2": [round(a, 3) for a in areas],
        "dA_dt_yd2_s": [round(r, 3) for r in da_dt],
        "min_dA_dt": round(min(da_dt), 3),
        "critical_collapse_frames": collapse_frames,
        "collapse_detected": len(collapse_frames) > 0,
    }


# ---------------------------------------------------------------------------
# 4. EQ-B7-07: QB Escape Vector Alignment Cosine & Pass-Rush STRAIN Rate
# ---------------------------------------------------------------------------

def analyze_qb_escape_vectors(
    qb_trajectory: Sequence[Tuple[float, float]],
    breach_trajectory: Sequence[Tuple[float, float]],
) -> Dict[str, Any]:
    """Compute cosine alignment between QB velocity vector v_QB and pocket breach vector u_failure.

    cos(theta_t) -> +1.0 (> +0.40): QB steps directly INTO the collapsing wall (QB_FAULT).
    cos(theta_t) -> -1.0 (< -0.40): QB actively escapes AWAY from the collapsing wall (EVADING_PRESSURE).
    """
    T = min(len(qb_trajectory), len(breach_trajectory))
    if T < 2:
        return {"cosines": [], "mean_cosine": 0.0, "classification": "INSUFFICIENT_FRAMES"}

    cosines: List[float] = []
    for t in range(1, T):
        vx = qb_trajectory[t][0] - qb_trajectory[t - 1][0]
        vy = qb_trajectory[t][1] - qb_trajectory[t - 1][1]
        ux = breach_trajectory[t][0] - qb_trajectory[t][0]
        uy = breach_trajectory[t][1] - qb_trajectory[t][1]
        nv = math.hypot(vx, vy)
        nu = math.hypot(ux, uy)
        if nv < 1e-6 or nu < 1e-6:
            cosines.append(0.0)
        else:
            c = max(-1.0, min(1.0, (vx * ux + vy * uy) / (nv * nu)))
            cosines.append(c)

    mean_cos = sum(cosines) / len(cosines)
    if mean_cos >= 0.40:
        label = "QB_STEPS_INTO_PRESSURE"
    elif mean_cos <= -0.40:
        label = "QB_ACTIVE_EVASION"
    else:
        label = "NEUTRAL_POCKET_CLIMB"

    return {
        "cosines": [round(c, 4) for c in cosines],
        "mean_cosine": round(mean_cos, 4),
        "max_cosine": round(max(cosines), 4),
        "min_cosine": round(min(cosines), 4),
        "classification": label,
    }


def compute_strain_rate(
    rusher_trajectory: Sequence[Tuple[float, float]],
    qb_trajectory: Sequence[Tuple[float, float]],
    dt: float = 0.1,
) -> Dict[str, Any]:
    """Compute Nguyen, Yurko, & Matthews (2024) pass-rush STRAIN rate (s^-1).

    STRAIN_{i,t} = v_{close,i,t} / d_{i,t} = -(d_{i,t} - d_{i,t-1}) / (dt * d_{i,t}).
    """
    T = min(len(rusher_trajectory), len(qb_trajectory))
    if T < 2:
        return {"strain_series": [], "peak_strain": 0.0, "mean_strain": 0.0}

    dists = [_euclidean_2d(rusher_trajectory[t], qb_trajectory[t]) for t in range(T)]
    strains: List[float] = [0.0]
    for t in range(1, T):
        d_cur = max(0.25, dists[t])
        v_close = -(dists[t] - dists[t - 1]) / dt
        strains.append(v_close / d_cur)

    pos_strains = [max(0.0, s) for s in strains[1:]]
    return {
        "min_distance_yds": round(min(dists), 3),
        "strain_series": [round(s, 4) for s in strains],
        "peak_strain": round(max(pos_strains) if pos_strains else 0.0, 4),
        "mean_strain": round(sum(pos_strains) / len(pos_strains) if pos_strains else 0.0, 4),
    }


# ---------------------------------------------------------------------------
# 5. EQ-B7-09: Pipping-Gamon et al. (2026) Opponent-Adjusted Logit Survival & MILP Unit Score
# ---------------------------------------------------------------------------

def _logit(p: float) -> float:
    p_c = max(1e-4, min(1.0 - 1e-4, p))
    return math.log(p_c / (1.0 - p_c))


def _sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def compute_matchup_adjusted_ol_logit_survival(
    pbwr: float,
    double_team_rate: float,
    opp_rusher_alpha: float = 0.0,
    league_base_pbwr: float = 0.88,
    league_base_dt_rate: float = 0.40,
    gamma_dt_penalty: float = 0.85,
) -> Dict[str, float]:
    """Compute Pipping-Gamon et al. (2026) opponent-adjusted OL pass-block survival probability.

    logit(S_tilde_{i,w}) = mu + beta_i - alpha_{d(i)} - gamma * (delta_i - delta_base)
    where:
      - mu + beta_i = logit(pbwr)
      - alpha_{d(i)} is opposing pass-rusher lethality (e.g., Maxx Crosby / Nick Bosa / Myles Garrett ~ 0.95)
      - gamma * (delta_i - delta_base) penalizes linemen whose raw PBWR was inflated by heavy double-team help.
    """
    raw_logit = _logit(pbwr)
    mu = _logit(league_base_pbwr)
    beta_i = raw_logit - mu
    dt_centered = double_team_rate - league_base_dt_rate
    island_logit = mu + beta_i - gamma_dt_penalty * dt_centered
    matchup_logit = island_logit - opp_rusher_alpha

    return {
        "historical_base_pbwr": round(pbwr, 4),
        "double_team_rate": round(double_team_rate, 4),
        "island_true_survival": round(_sigmoid(island_logit), 4),
        "opp_rusher_alpha": round(opp_rusher_alpha, 4),
        "matchup_adjusted_survival": round(_sigmoid(matchup_logit), 4),
        "stability_drop": round(pbwr - _sigmoid(matchup_logit), 4),
    }


def solve_ol_unit_protection_score(
    ol_starters: Sequence[Dict[str, Any]],
    synergy_bonus: float = 0.03,
) -> Dict[str, Any]:
    """Evaluate 5-man OL unit protection score with positional weights and cohesion synergy.

    Each starter dict in `ol_starters` has keys:
        `pos` ('LT', 'LG', 'C', 'RG', 'RT'),
        `name`, `pbwr`, `double_team_rate`, `opp_rusher_alpha`, `shared_snaps_pct` (optional, 0..1).
    """
    pos_weights = {"LT": 0.26, "RT": 0.22, "LG": 0.18, "RG": 0.18, "C": 0.16}
    weighted_base = 0.0
    weighted_adj = 0.0
    total_w = 0.0
    breakdown: List[Dict[str, Any]] = []

    for p_info in ol_starters:
        pos = str(p_info.get("pos", "C")).upper()
        w = pos_weights.get(pos, 0.20)
        res = compute_matchup_adjusted_ol_logit_survival(
            pbwr=float(p_info.get("pbwr", 0.88)),
            double_team_rate=float(p_info.get("double_team_rate", 0.40)),
            opp_rusher_alpha=float(p_info.get("opp_rusher_alpha", 0.0)),
        )
        cohesion = float(p_info.get("shared_snaps_pct", 0.75)) * synergy_bonus
        adj_surv = min(0.99, res["matchup_adjusted_survival"] + cohesion)
        weighted_base += w * res["historical_base_pbwr"]
        weighted_adj += w * adj_surv
        total_w += w
        breakdown.append({
            "pos": pos,
            "name": p_info.get("name", pos),
            "historical_base": res["historical_base_pbwr"],
            "island_true_survival": res["island_true_survival"],
            "matchup_adjusted": round(adj_surv, 4),
        })

    norm_base = weighted_base / total_w if total_w > 0 else 0.88
    norm_adj = weighted_adj / total_w if total_w > 0 else 0.88
    # Convert unit survival into JEV Stage-2 `pressure_disruption` (noul) prior
    implied_pressure_disruption = max(0.08, min(0.65, 1.0 - norm_adj))

    return {
        "unit_historical_base": round(norm_base, 4),
        "unit_matchup_adjusted_survival": round(norm_adj, 4),
        "jev_pressure_disruption_prior": round(implied_pressure_disruption, 4),
        "linemen": breakdown,
    }


# ---------------------------------------------------------------------------
# 6. EQ-B7-02 & EQ-B7-10: Ruscio & Brady Modified PFR WP + p-Adic Coaching Kernel
# ---------------------------------------------------------------------------

def ruscio_brady_modified_pfr_wp(
    pts_off: float,
    pts_def: float,
    exp_pts_drive: float,
    vegas_line_off: float,
    sec_rem_reg: float,
    is_overtime: bool = False,
    sigma_0: float = 13.40022,
) -> float:
    """Compute Ruscio & Brady (2021) Modified PFR Win Probability (with stretched floor & OT)."""
    if is_overtime:
        tau = 0.25
        rem_frac = 0.0
    else:
        s_clamped = max(0.0, min(3600.0, sec_rem_reg))
        rem_frac = s_clamped / 3600.0
        stretched_sec = 450.0 + (3150.0 / 3600.0) * s_clamped
        steepen = 1.0 - (0.35 * ((120.0 - s_clamped) / 120.0) if s_clamped < 120.0 else 0.0)
        tau = (stretched_sec / 3600.0) * steepen

    mu_pfr = (pts_off - pts_def) + exp_pts_drive + vegas_line_off * rem_frac
    sd_pfr = max(1.0, sigma_0 * math.sqrt(max(0.01, tau)))

    def norm_cdf(x: float) -> float:
        return 0.5 * (1.0 + math.erf((x - mu_pfr) / (sd_pfr * math.sqrt(2.0))))

    p_win = 1.0 - norm_cdf(0.5)
    p_tie = norm_cdf(0.5) - norm_cdf(-0.5)
    return round(max(0.001, min(0.999, p_win + 0.5 * p_tie)), 4)


def p_adic_coaching_tree_similarity(
    lca_depth: int,
    prime_p: int = 2,
    same_coach: bool = False,
) -> Dict[str, float]:
    """Compute Bourama Toni (2025) & Fast-Jensen p-adic ultrametric distance and kernel similarity."""
    if same_coach:
        return {"p_adic_distance": 0.0, "ultrametric_similarity": 1.0}
    if lca_depth <= 0:
        return {"p_adic_distance": 1.0, "ultrametric_similarity": 0.0}
    dist = float(prime_p) ** (-lca_depth)
    return {
        "p_adic_distance": round(dist, 6),
        "ultrametric_similarity": round(1.0 - dist, 6),
    }


# ---------------------------------------------------------------------------
# 7. BATCH 8 FRONTIER SPATIOTEMPORAL & COGNITIVE GAME-TREE EXTENSIONS
#    (EQ-B8-01 through EQ-B8-09)
# ---------------------------------------------------------------------------

def riemannian_pocket_metric_tensor(
    dl_states: Sequence[Dict[str, float]],
    qb_pos: Tuple[float, float],
    collapse_eigen_threshold: float = 4.5,
) -> Dict[str, Any]:
    """Compute EQ-B8-01: Localized Riemannian Metric Tensor g_ij and Contraction Index R_ci.

    Each item in `dl_states` has keys: 'x', 'y', 'vx', 'vy'.
    g_ij = I_2 + sum_{dl} (v_dl (x) r) / ||r||^3, symmetrized for real spectral decomposition.
    """
    g00, g01, g10, g11 = 1.0, 0.0, 0.0, 1.0
    qx, qy = qb_pos
    for dl in dl_states:
        rx = float(dl["x"]) - qx
        ry = float(dl["y"]) - qy
        dist = math.hypot(rx, ry)
        if dist > 0.1:
            inv_d3 = 1.0 / (dist ** 3)
            vx = float(dl.get("vx", 0.0))
            vy = float(dl.get("vy", 0.0))
            g00 += (vx * rx) * inv_d3
            g01 += (vx * ry) * inv_d3
            g10 += (vy * rx) * inv_d3
            g11 += (vy * ry) * inv_d3

    # Symmetrize metric tensor g_sym = 0.5 * (g + g^T) for exact 2x2 eigenvalues
    s01 = 0.5 * (g01 + g10)
    trace = g00 + g11
    det = g00 * g11 - s01 * s01
    disc = max(0.0, 0.25 * trace * trace - det)
    sqrt_disc = math.sqrt(disc)
    eig1 = 0.5 * trace - sqrt_disc
    eig2 = 0.5 * trace + sqrt_disc
    max_eig = max(eig1, eig2)
    r_ci = math.log(max(1e-6, abs(det)))

    return {
        "g_sym": [[round(g00, 4), round(s01, 4)], [round(s01, 4), round(g11, 4)]],
        "eigenvalues": [round(eig1, 4), round(eig2, 4)],
        "max_spatial_contraction": round(max_eig, 4),
        "riemannian_contraction_index_R_ci": round(r_ci, 4),
        "structural_collapse_alert": max_eig > collapse_eigen_threshold,
    }


def eikonal_wavefront_attenuation_score(
    nodes: Sequence[Dict[str, Any]],
    qb_pos: Tuple[float, float],
    alpha_eikonal: float = 1.0,
    beta_dissipation: float = 2.5,
    gamma_boundary: float = 10.0,
) -> Dict[str, float]:
    """Compute EQ-B8-02: Eikonal PDE Wavefront Dissipation Loss & Attenuation Coefficient Lambda_wave.

    Each node dict in `nodes` has keys: 'x', 'y', 'phi' (0..1), 'grad_x', 'grad_y', 'role' ('OL'|'DL'|'OTHER').
    """
    if not nodes:
        return {"total_loss": 0.0, "eikonal_error": 0.0, "dissipation_loss": 0.0, "wavefront_attenuation_coeff": 1.0}

    eik_terms: List[float] = []
    diss_terms: List[float] = []
    bnd_terms: List[float] = []
    qx, qy = qb_pos

    for n in nodes:
        phi = float(n.get("phi", 0.5))
        gx = float(n.get("grad_x", 0.0))
        gy = float(n.get("grad_y", 0.0))
        role = str(n.get("role", "OTHER")).upper()
        is_ol = 1.0 if role == "OL" else 0.0
        is_dl = 1.0 if role == "DL" else 0.0

        grad_mag = math.sqrt(gx * gx + gy * gy + 1e-8)
        target_vel = 1.0 - 0.85 * is_ol
        eik_terms.append((grad_mag - (1.0 / (target_vel + 1e-5))) ** 2)

        dist_qb = math.sqrt((float(n["x"]) - qx) ** 2 + (float(n["y"]) - qy) ** 2 + 1e-8)
        leakage = phi * math.exp(-dist_qb) * (1.0 - is_ol)
        diss_terms.append(leakage)

        bnd_terms.append((phi * is_dl - 1.0) ** 2)

    eik_err = sum(eik_terms) / len(eik_terms)
    diss_loss = sum(diss_terms) / len(diss_terms)
    bnd_loss = sum(bnd_terms) / len(bnd_terms)
    total = alpha_eikonal * eik_err + beta_dissipation * diss_loss + gamma_boundary * bnd_loss
    lambda_wave = max(0.0, min(1.0, 1.0 - diss_loss))

    return {
        "total_structural_loss": round(total, 5),
        "eikonal_error": round(eik_err, 5),
        "dissipation_loss": round(diss_loss, 5),
        "boundary_loss": round(bnd_loss, 5),
        "wavefront_attenuation_coeff": round(lambda_wave, 4),
    }


def bi_directional_assignment_failure_prob(
    off_metrics: Sequence[float],
    def_metrics: Sequence[float],
    weights: Sequence[float],
    theta_scheme: float = 0.0,
) -> float:
    """Compute EQ-B8-04: P(Assignment Failure_{i,j}) = sigma(theta_Scheme + w^T (X_Off - X_Def))."""
    dot = sum(w * (xo - xd) for w, xo, xd in zip(weights, off_metrics, def_metrics))
    return round(_sigmoid(theta_scheme + dot), 4)


def kinetic_work_fatigue_degradation(
    velocities_yds_s: Sequence[Tuple[float, float]],
    weight_lbs: float,
    prior_cumulative_work_joules: float = 0.0,
    decay_w0: float = 0.05,
) -> Dict[str, Any]:
    """Compute EQ-B8-05: Anaerobic kinetic work accumulation & velocity degradation factor."""
    mass_kg = weight_lbs * 0.453592
    snap_work = sum(0.5 * mass_kg * (vx * vx + vy * vy) for vx, vy in velocities_yds_s)
    cum_work = prior_cumulative_work_joules + snap_work
    fatigue_index = cum_work / 50000.0
    degradation_factor = math.exp(-decay_w0 * fatigue_index)
    return {
        "snap_work_joules": round(snap_work, 2),
        "cumulative_work_joules": round(cum_work, 2),
        "fatigue_index": round(fatigue_index, 4),
        "velocity_degradation_factor": round(degradation_factor, 4),
        "substitution_alert": fatigue_index > 3.5,
    }


def qb_cognitive_counter_audible_ocacm(
    observed_blitz_probs: Sequence[float],
    film_study_priors: Sequence[float],
    dc_blitz_bias: float = 0.75,
    qb_iq_weight: float = 0.95,
) -> Dict[str, Any]:
    """Compute EQ-B8-07: Offensive Counter-Audible Cognitive Matrix (OCACM) & Deception Metrics.

    Decodes true latent blitz probabilities across 11 defenders, determines whether to flip the
    protection slide or Back-Lock the RB, injects hot-route coordinates, and computes:
      - Cognitive Deception Delta (Delta_decep)
      - Protection Absorption Index (P_abs)
    """
    n_def = min(len(observed_blitz_probs), len(film_study_priors))
    if n_def == 0:
        return {}

    true_blitz = [
        (qb_iq_weight * float(obs) + (1.0 - qb_iq_weight) * float(prior)) * dc_blitz_bias
        for obs, prior in zip(observed_blitz_probs, film_study_priors)
    ]

    # Deception Delta: L2 norm ||True_Blitz - Observed_Blitz||_2
    decep_delta = math.sqrt(sum((t - float(o)) ** 2 for t, o in zip(true_blitz, observed_blitz_probs)))

    left_threat = sum(true_blitz[:3])
    right_threat = sum(true_blitz[3:6]) if n_def >= 6 else 0.0
    slide_flipped = right_threat > (left_threat + 0.35)

    max_idx = max(range(n_def), key=lambda i: true_blitz[i])
    rb_back_lock = true_blitz[max_idx] > 0.75
    total_threat = sum(true_blitz)

    if total_threat >= 6.0:
        hot_route_action = "ZERO_BLITZ_HOT_SLANT_3YD"
        slot_route_vec = (3.0, -4.0)
    elif slide_flipped:
        hot_route_action = "SLIDE_OVERLOAD_FLAT_CHECKDOWN"
        slot_route_vec = (1.0, 6.0)
    else:
        hot_route_action = "STANDARD_PROGRESSION"
        slot_route_vec = (10.0, 0.0)

    # Protection Absorption Index: ratio of absorbed rush threat by 6 blockers (5 OL + RB)
    sorted_threats = sorted(true_blitz, reverse=True)
    absorbed = sum(sorted_threats[: (6 if rb_back_lock else 5)])
    p_abs = absorbed / max(1e-6, total_threat)

    return {
        "true_blitz_distribution": [round(p, 4) for p in true_blitz],
        "total_expected_rushers": round(total_threat, 3),
        "cognitive_deception_delta": round(decep_delta, 4),
        "slide_flipped": slide_flipped,
        "rb_back_lock_defender_idx": max_idx if rb_back_lock else None,
        "hot_route_action": hot_route_action,
        "injected_route_xy": slot_route_vec,
        "protection_absorption_index": round(min(1.0, p_abs), 4),
    }


def frechet_pass_set_similarity(
    curve_a: Sequence[Tuple[float, float]],
    curve_b: Sequence[Tuple[float, float]],
) -> Dict[str, float]:
    """Compute EQ-B8-08: Discrete Frechet Distance and Eager (2023) Inverted Curve Similarity."""
    p = len(curve_a)
    q = len(curve_b)
    if p == 0 or q == 0:
        return {"frechet_distance_yds": 0.0, "curve_similarity": 1.0}

    ca: List[List[float]] = [[-1.0] * q for _ in range(p)]

    for i in range(p):
        for j in range(q):
            d_ij = _euclidean_2d(curve_a[i], curve_b[j])
            if i == 0 and j == 0:
                ca[i][j] = d_ij
            elif i > 0 and j == 0:
                ca[i][j] = max(ca[i - 1][0], d_ij)
            elif i == 0 and j > 0:
                ca[i][j] = max(ca[0][j - 1], d_ij)
            else:
                ca[i][j] = max(min(ca[i - 1][j], ca[i - 1][j - 1], ca[i][j - 1]), d_ij)

    df_val = ca[p - 1][q - 1]
    sim = 1.0 / (1.0 + df_val)
    return {
        "frechet_distance_yds": round(df_val, 4),
        "curve_similarity": round(sim, 4),
    }


def compute_weak_link_ol_efficiency(linemen_grades: Sequence[float]) -> Dict[str, float]:
    """Eager / Bhatia-Kittaneh weak-link product. Arithmetic mean is the rejected baseline."""
    report = weak_link_am_gm_clean_pocket_prob(linemen_grades)
    report["efficiency"] = report["true_weak_link_product_prob"]
    return report


def compute_pipping_adjusted_ol_efficiency(
    linemen_grades: Sequence[float],
    opponent_pass_rush: float,
    chip_help: float = 0.0,
) -> Dict[str, float]:
    base = compute_weak_link_ol_efficiency(linemen_grades)
    adjusted = compute_matchup_adjusted_ol_logit_survival(
        pbwr=max(0.05, min(0.95, base["arithmetic_mean"])),
        double_team_rate=chip_help,
        opp_rusher_alpha=opponent_pass_rush,
    )
    return {
        "weak_link": base["efficiency"],
        "pipping_survival": adjusted["matchup_adjusted_survival"],
    }


def compute_cox_weibull_pocket_survival(t_route: float, trench: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    trench = trench or {}
    return cox_weibull_block_survival(
        t_pass=t_route,
        rel_velocity_yds_s=float(trench.get("rel_velocity", 0.0)),
        leverage_rad=float(trench.get("leverage", 0.25)),
        rusher_threat_z=float(trench.get("rusher_threat", 0.0)),
        stunt_active=bool(trench.get("stunt", False)),
    )


def compute_ruscio_pressure_win_probability(tpi: float, base_wp: float = 0.50) -> Dict[str, float]:
    wp = ruscio_brady_modified_pfr_wp(
        pts_off=0.0,
        pts_def=0.0,
        exp_pts_drive=-2.5 * float(tpi),
        vegas_line_off=0.0,
        sec_rem_reg=300.0,
    )
    return {"win_probability": wp, "tpi": float(tpi), "base_wp": base_wp}


def compute_fourth_down_uncertainty_gate(delta_wp_draws: Sequence[float]) -> Dict[str, float | bool]:
    """Suppress a 4th-down edge when the 90% bootstrap interval of delta WP straddles 0."""
    if len(delta_wp_draws) < 8:
        return {"suppress": True, "lo": 0.0, "hi": 0.0, "reason": "sample_too_thin"}
    ordered = sorted(float(x) for x in delta_wp_draws)
    lo = ordered[int(0.05 * (len(ordered) - 1))]
    hi = ordered[int(0.95 * (len(ordered) - 1))]
    return {"suppress": lo <= 0.0 <= hi, "lo": lo, "hi": hi, "reason": "interval_straddles_zero" if lo <= 0.0 <= hi else "interval_clear"}


def weak_link_am_gm_clean_pocket_prob(
    linemen_survival_probs: Sequence[float],
) -> Dict[str, float]:
    """Compute EQ-B8-09: Eager (2023) & Bhatia-Kittaneh Weak-Link AM-GM Clean Pocket Probability.

    Demonstrates why arithmetic-mean OL ratings overvalue lines with a single weak-link starter:
        prod_{i=1}^5 p_i <= ( (1/5) sum_{i=1}^5 p_i )^5.
    """
    if not linemen_survival_probs:
        return {"arithmetic_mean": 0.0, "naive_am_power_prob": 0.0, "true_weak_link_product_prob": 0.0, "am_gm_fragility_penalty": 0.0}

    k = len(linemen_survival_probs)
    arith_mean = sum(linemen_survival_probs) / k
    naive_prob = arith_mean ** k
    prod_prob = 1.0
    for p in linemen_survival_probs:
        prod_prob *= max(0.01, min(0.999, float(p)))

    return {
        "arithmetic_mean": round(arith_mean, 4),
        "min_starter_survival": round(min(linemen_survival_probs), 4),
        "naive_am_power_prob": round(naive_prob, 4),
        "true_weak_link_product_prob": round(prod_prob, 4),
        "am_gm_fragility_penalty": round(naive_prob - prod_prob, 4),
    }
