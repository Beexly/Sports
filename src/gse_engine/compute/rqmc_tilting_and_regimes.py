"""RQMC Sobol (K03), Entropic Tilting (K02), Catalytic EP (K06), Hurdle-TPG (K09), K10 & K11."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize  # type: ignore[import-untyped]
from scipy.stats import norm, skewnorm  # type: ignore[import-untyped]

from gse_engine.fabric.philox import owen_scrambled_sobol_matrix

NFL_KEY_MARGINS: tuple[int, ...] = (3, 7, 6, 10, 14, 4, 17)
EMPIRICAL_2026_RETURN_RATE = 0.745


@dataclass(frozen=True, slots=True)
class EntropicTiltingResult:
    """Minimum-KL Entropic Tilting weights onto 13-moment NFL score lattice (K02)."""

    weights: tuple[float, ...]
    ess: float
    ess_ratio: float
    kl_nats: float
    max_moment_residual: float
    relaxed_tol_multiplier: float


@dataclass(frozen=True, slots=True)
class DynamicKickoffResult:
    """2026 Rule 6-1 Dynamic Kickoff landing zone & starting field position (K10)."""

    zone_probs: dict[str, float]
    zone_selected: str
    starting_yardline_own: int


@dataclass(frozen=True, slots=True)
class EndgameRule4Result:
    """NFL Rule 4 clock freeze, trailing checkdown, victory kneel & dual-OT verdict (K11)."""

    post_play_bleed_sec: float
    two_minute_warning_triggered: bool
    p_scramble_effective: float
    victory_kneel_count: int
    expected_kneel_yds_delta: float
    flag_kneeldown_hook_risk: bool
    dual_possession_ot_continues: bool


def generate_owen_scrambled_sobol_pca16(
    *,
    num_worlds: int,
    campaign_seed: int,
    task_id: str | int,
    macro_cov_matrix: Sequence[Sequence[float]] | None = None,
    dim: int = 16,
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Generate K03 Owen-Scrambled Sobol U in (0,1) & PCA-ordered Gaussian factors Z."""
    u_mat = owen_scrambled_sobol_matrix(
        num_paths=num_worlds,
        dim=dim,
        campaign_seed=campaign_seed,
        task_id=task_id,
    )
    u_arr = np.clip(np.asarray(u_mat, dtype=np.float64), 1e-7, 1.0 - 1e-7)
    z_indep = norm.ppf(u_arr)

    if macro_cov_matrix is None:
        return u_arr, z_indep

    cov = np.asarray(macro_cov_matrix, dtype=np.float64)
    if cov.shape != (dim, dim):
        raise ValueError(f"macro_cov_matrix must have shape ({dim}, {dim}), got {cov.shape}.")
    cov = 0.5 * (cov + cov.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    # Sort descending so low-discrepancy Sobol dims map to largest PCA variance factors
    order = np.argsort(eigvals)[::-1]
    eigvals_sorted = np.maximum(1e-9, eigvals[order])
    eigvecs_sorted = eigvecs[:, order]
    pca_factor = eigvecs_sorted @ np.diag(np.sqrt(eigvals_sorted))
    z_macro = z_indep @ pca_factor.T
    return u_arr, z_macro


def evaluate_market_control_variates_and_is(
    *,
    payoffs_j: Sequence[float],
    macro_sim_m: Sequence[Sequence[float]],
    market_benchmarks_mu: Sequence[float],
    z_factors: Sequence[Sequence[float]] | None = None,
    mu_is: Sequence[float] | None = None,
    ridge_penalty: float = 1e-6,
) -> dict[str, float]:
    """Compute ridge Market Control Variate + optional Exponential Tilted IS estimator."""
    j_arr = np.asarray(payoffs_j, dtype=np.float64).reshape(-1)
    m_arr = np.asarray(macro_sim_m, dtype=np.float64)
    mu_mkt = np.asarray(market_benchmarks_mu, dtype=np.float64).reshape(-1)
    n_paths = len(j_arr)
    if n_paths < 8 or m_arr.shape[0] != n_paths or m_arr.shape[1] != len(mu_mkt):
        raise ValueError("Invalid control variate dimensions for K03.")

    if z_factors is not None and mu_is is not None:
        z_arr = np.asarray(z_factors, dtype=np.float64)
        mu_i = np.asarray(mu_is, dtype=np.float64).reshape(-1)
        log_lr = -(z_arr @ mu_i) + 0.5 * float(np.dot(mu_i, mu_i))
        lr = np.clip(np.exp(np.clip(log_lr, -20.0, 20.0)), 0.01, 50.0)
    else:
        lr = np.ones(n_paths, dtype=np.float64)

    wj = lr * j_arr
    wm = lr[:, None] * m_arr

    # Center covariates and fit ridge beta_CV = inv(Cov(M) + ridge*I) * Cov(M, J)
    m_mean = np.mean(wm, axis=0)
    j_mean = float(np.mean(wj))
    dm = wm - m_mean[None, :]
    dj = wj - j_mean
    cov_m = (dm.T @ dm) / float(n_paths - 1) + float(ridge_penalty) * np.eye(m_arr.shape[1])
    cov_mj = (dm.T @ dj) / float(n_paths - 1)
    beta_cv = np.clip(np.linalg.solve(cov_m, cov_mj), -3.0, 3.0)

    cv_terms = wj - (wm - mu_mkt[None, :]) @ beta_cv
    j_hat = float(np.mean(cv_terms))
    var_raw = float(np.var(wj, ddof=1))
    var_cv = float(np.var(cv_terms, ddof=1))
    return {
        "j_hat": j_hat,
        "raw_mean": j_mean,
        "var_raw_mc": var_raw,
        "var_cv": var_cv,
        "variance_reduction_ratio": var_cv / max(1e-12, var_raw),
    }


def solve_standardized_entropic_tilting(
    *,
    sim_moment_matrix_g: Sequence[Sequence[float]],
    target_macro_vector_g_bar: Sequence[float],
    tol_vector: Sequence[float] | None = None,
    min_ess_ratio: float = 0.65,
) -> EntropicTiltingResult:
    """Solve K02 standardized Minimum-KL Entropic Tilting onto 13 NFL score-lattice moments."""
    g_raw = np.asarray(sim_moment_matrix_g, dtype=np.float64)
    g_bar = np.asarray(target_macro_vector_g_bar, dtype=np.float64).reshape(-1)
    if g_raw.ndim != 2 or g_raw.shape[1] != len(g_bar):
        raise ValueError("sim_moment_matrix_g columns must match target_macro_vector_g_bar length.")
    n_worlds, n_m = g_raw.shape

    sigma_g = np.maximum(1e-4, np.std(g_raw, axis=0))
    g_std = (g_raw - g_bar[None, :]) / sigma_g[None, :]
    if tol_vector is not None:
        base_gamma = np.maximum(1e-6, np.asarray(tol_vector, dtype=np.float64).reshape(-1))
    else:
        base_gamma = np.array([0.02] * min(6, n_m) + [0.005] * max(0, n_m - 6), dtype=np.float64)

    bounds = [(-5.0, 5.0)] * n_m
    best_weights = np.full(n_worlds, 1.0 / float(n_worlds), dtype=np.float64)
    best_ess = float(n_worlds)
    best_kl = 0.0
    best_res = float(np.max(np.abs(np.mean(g_raw, axis=0) - g_bar)))
    best_mult = 1.0

    for mult in (1.0, 4.0, 16.0, 64.0, 256.0, 2048.0):
        gamma_std = (base_gamma * mult) / (sigma_g * sigma_g)

        def _dual_and_grad(
            lam: NDArray[np.float64],
            g_mat: NDArray[np.float64] = g_std,
            g_reg: NDArray[np.float64] = gamma_std,
        ) -> tuple[float, NDArray[np.float64]]:
            u = g_mat @ lam
            u_max = float(np.max(u))
            exp_u = np.exp(u - u_max)
            sum_e = float(np.sum(exp_u))
            val = u_max + math.log(sum_e / float(n_worlds)) + 0.5 * float(np.sum(g_reg * lam * lam))
            w_tmp = exp_u / sum_e
            grad = (g_mat.T @ w_tmp) + g_reg * lam
            return val, grad

        res = minimize(
            _dual_and_grad,
            np.zeros(n_m, dtype=np.float64),
            jac=True,
            method="L-BFGS-B",
            bounds=bounds,
            options={"maxiter": 200, "ftol": 1e-12, "gtol": 1e-9},
        )
        lam_opt = res.x if hasattr(res, "x") else np.zeros(n_m, dtype=np.float64)
        u_opt = g_std @ lam_opt
        u_max = float(np.max(u_opt))
        exp_opt = np.exp(u_opt - u_max)
        w_star = exp_opt / float(np.sum(exp_opt))
        ess = 1.0 / float(np.sum(w_star * w_star))
        ess_ratio = ess / float(n_worlds)
        kl_nats = float(np.sum(w_star * np.log(np.maximum(1e-15, w_star * float(n_worlds)))))
        mom_res = float(
            np.max(np.abs((g_std.T @ w_star) + gamma_std * lam_opt))
        )
        best_weights, best_ess, best_kl, best_res, best_mult = (
            w_star,
            ess,
            kl_nats,
            mom_res,
            mult,
        )
        if ess_ratio >= min_ess_ratio and kl_nats <= 0.25:
            break

    return EntropicTiltingResult(
        weights=tuple(float(v) for v in best_weights),
        ess=best_ess,
        ess_ratio=best_ess / float(n_worlds),
        kl_nats=best_kl,
        max_moment_residual=best_res,
        relaxed_tol_multiplier=best_mult,
    )


def evaluate_catalytic_ep_wp(
    *,
    down: int,
    ydstogo: float,
    yardline_100: float,
    score_diff_off: float = 0.0,
    sec_rem: float = 1800.0,
    off_quality: float = 0.0,
    def_quality: float = 0.0,
    catalytic_tau: float = 0.15,
) -> dict[str, float]:
    """Compute K06 Catalytic-Prior monotonic 7-state EP_0 & zero-sum symmetric WP."""
    d_clamped = max(1, min(4, int(down)))
    yl = max(1.0, min(99.0, float(yardline_100)))
    ydg = max(1.0, min(35.0, float(ydstogo)))

    # Smooth monotonic potential V_pos decreasing in yardline_100 and worsening in down
    down_pen = (d_clamped - 1) * (0.48 + 0.03 * max(0.0, ydg - 5.0))
    qual_shift = (1.0 / (1.0 + catalytic_tau)) * (float(off_quality) - float(def_quality))
    ep_base = 5.45 * math.exp(-0.022 * (yl - 1.0)) - 1.35 - down_pen + 0.35 * qual_shift
    ep_0 = max(-6.50, min(6.95, ep_base))

    # Antisymmetric mirrored Win Probability: score_diff + EP(pos) vs mirror(score_diff)
    t_frac = max(0.05, min(1.0, float(sec_rem) / 3600.0))
    sigma_rem = 13.40 * math.sqrt(0.125 + 0.875 * t_frac)
    advantage = float(score_diff_off) + ep_0 * 0.45
    z_wp = advantage / max(1.0, sigma_rem)
    wp_off = max(0.0005, min(0.9995, float(norm.cdf(z_wp))))
    return {
        "ep_0": round(ep_0, 6),
        "wp_off": round(wp_off, 6),
        "wp_def": round(1.0 - wp_off, 6),
    }


def sample_hurdle_zinb_and_tpg_play(
    *,
    zero_hurdle_pi0: float,
    mean_opportunities_mu: float,
    nb_dispersion_r: float,
    i_scat: float,
    line_of_scrimmage_b: int,
    position: str = "WR",
    is_rush: bool = False,
    inv_kappa_vm: float = 0.5,
    opp_frac_tackle: float = 0.65,
    seed: int = 20261116,
    n_draws: int = 512,
) -> dict[str, object]:
    """Sample K09 Hurdle-ZINB usage (VMR >= 1.82) & Field-Bounded TPG yards <= 100 - b."""
    rng = np.random.default_rng(seed)
    los_b = max(1, min(99, int(line_of_scrimmage_b)))
    max_rem = float(100 - los_b)
    u0 = 12.0 if is_rush else 18.0
    m_b = max(0.1, max_rem - u0)

    r_clamped = max(0.8, min(12.0, float(nb_dispersion_r)))
    # Ensure empirical red-zone/opportunity overdispersion satisfies VMR >= 1.82 when mu is high
    if mean_opportunities_mu / r_clamped < 0.82:
        r_eff = max(0.5, float(mean_opportunities_mu) / 0.90)
    else:
        r_eff = r_clamped

    active_draws = rng.random(n_draws) < max(0.0, 1.0 - float(zero_hurdle_pi0))
    gamma_frailty = rng.gamma(shape=r_eff, scale=1.0 / r_eff, size=n_draws)
    usage_draws = np.where(
        active_draws,
        rng.poisson(np.maximum(0.0, float(mean_opportunities_mu) * gamma_frailty)),
        0,
    )

    logit_exp = (
        -2.2
        + 2.1 * max(0.05, min(0.85, float(i_scat)))
        + 0.35 * float(inv_kappa_vm)
        - 0.45 * float(opp_frac_tackle)
    )
    pi_exp = max(0.01, min(0.32, 1.0 / (1.0 + math.exp(-max(-15.0, min(15.0, logit_exp))))))
    xi_map = {"WR": 0.21, "RB": 0.16, "TE": 0.13}
    xi = xi_map.get(position.upper(), 0.18)
    beta_gpd = 6.5

    u_exp = rng.random(n_draws) < pi_exp
    u_gpd = rng.random(n_draws)
    denom_tpg = 1.0 - (1.0 + xi * m_b / beta_gpd) ** (-1.0 / xi)
    # Inverse CDF of Upper-Truncated Generalized Pareto bounded strictly on [0, M_b]
    p_scaled = np.clip(u_gpd * denom_tpg, 0.0, denom_tpg)
    z_tail = np.where(
        u_gpd >= 1.0 - (1.0 - denom_tpg),
        m_b,
        (beta_gpd / xi) * (np.power(np.maximum(1e-12, 1.0 - p_scaled), -xi) - 1.0),
    )
    z_tail = np.clip(z_tail, 0.0, m_b)
    y_body_raw = skewnorm.rvs(a=2.15, loc=1.6, scale=4.5, size=n_draws, random_state=rng)
    y_body = np.clip(np.asarray(y_body_raw, dtype=np.float64), -8.0, min(u0, max_rem))
    play_yds = np.where(u_exp, np.minimum(max_rem, u0 + z_tail), y_body)
    play_yds = np.clip(play_yds, -15.0, max_rem)

    mean_u = float(np.mean(usage_draws))
    var_u = float(np.var(usage_draws, ddof=1))
    return {
        "usage_draws": [int(x) for x in usage_draws],
        "play_yards": [float(round(float(y), 4)) for y in play_yds],
        "max_allowed_yards": max_rem,
        "all_bounded_le_remaining": bool(np.all(play_yds <= max_rem + 1e-12)),
        "usage_vmr": round(var_u / max(1e-9, mean_u), 4),
        "pi_exp": round(pi_exp, 6),
    }


def evaluate_2026_dynamic_kickoff_start(
    *,
    kick_line_yard: int = 35,
    zone_override: str | None = None,
    rk4_carry_delta_yds: float = 0.0,
    hang_skill_z: float = 0.0,
    dir_skill_z: float = 0.0,
    return_epa_rating: float = 0.0,
) -> DynamicKickoffResult:
    """Evaluate K10 2026 Rule 6-1 Dynamic Kickoff & Rule 6-1-5 50-yd Midfield Penalty."""
    is_50 = int(kick_line_yard) == 50
    logits = {
        "RETURN": 1.15 - 0.10 * (1.0 if is_50 else 0.0) + 0.15 * float(dir_skill_z),
        "FLY_EZ": (
            -0.35
            + 0.45 * (1.0 if is_50 else 0.0)
            + 0.08 * float(rk4_carry_delta_yds)
            + 0.12 * float(hang_skill_z)
        ),
        "BOUNCE_EZ": -1.45 + 0.25 * (1.0 if is_50 else 0.0),
        "SHORT_OR_OOB": -2.65 + 0.10 * (1.0 if is_50 else 0.0),
    }
    m_l = max(logits.values())
    exps = {k: math.exp(v - m_l) for k, v in logits.items()}
    s_l = sum(exps.values()) or 1.0
    probs = {k: v / s_l for k, v in exps.items()}

    zone = zone_override or "RETURN"
    if zone == "FLY_EZ":
        start_yd = 20 if is_50 else 35
    elif zone == "BOUNCE_EZ":
        start_yd = 20
    elif zone in {"SHORT_OR_OOB", "OOB"}:
        start_yd = 40
    else:
        raw_spot = 29 + round(float(return_epa_rating) * 4.0)
        start_yd = max(1, min(100, int(raw_spot)))

    return DynamicKickoffResult(
        zone_probs=probs,
        zone_selected=zone,
        starting_yardline_own=start_yd,
    )


def evaluate_rule4_endgame_and_ot_automaton(
    *,
    quarter: int,
    t_pre_sec: float,
    t_post_sec: float,
    raw_post_play_bleed_sec: float,
    score_diff_off: int,
    def_timeouts: int,
    down: int,
    p_scramble_base: float,
    qb_rush_prop_line: float | None = None,
    qb_pre_kneel_rush_yds: float = 20.0,
    is_regular_season_ot: bool = False,
    team2_possessions_taken: int = 0,
) -> EndgameRule4Result:
    """Evaluate K11 Two-Minute freeze, scramble checkdown, VICTORY_KNEEL & 10-min dual OT."""
    triggered_2m = (quarter in {2, 4}) and (float(t_pre_sec) > 120.0 >= float(t_post_sec))
    bleed = 0.0 if triggered_2m else max(0.0, float(raw_post_play_bleed_sec))

    trailing_2m = (
        (quarter == 4) and (-8 <= int(score_diff_off) <= -1) and (float(t_post_sec) <= 120.0)
    )
    p_scr = min(0.02, 0.18 * float(p_scramble_base)) if trailing_2m else float(p_scramble_base)

    can_kill = (
        quarter == 4
        and (1 <= int(score_diff_off) <= 16)
        and int(def_timeouts) == 0
        and float(t_post_sec) <= (41.8 * float(max(0, 4 - int(down))))
    )
    kneels = (
        min(max(0, 4 - int(down)), math.ceil(float(t_post_sec) / 41.0)) if can_kill else 0
    )
    kneels = max(0, min(3, kneels))
    exp_kneel_delta = -1.2 * float(kneels)

    hook_risk = False
    if qb_rush_prop_line is not None and kneels > 0:
        dist_before = float(qb_pre_kneel_rush_yds) - float(qb_rush_prop_line)
        if 0.0 <= dist_before <= 2.2:
            hook_risk = True

    dual_ot_cont = bool(
        is_regular_season_ot
        and quarter == 5
        and float(t_post_sec) > 0.0
        and int(team2_possessions_taken) == 0
    )
    return EndgameRule4Result(
        post_play_bleed_sec=round(bleed, 4),
        two_minute_warning_triggered=triggered_2m,
        p_scramble_effective=round(p_scr, 6),
        victory_kneel_count=kneels,
        expected_kneel_yds_delta=round(exp_kneel_delta, 4),
        flag_kneeldown_hook_risk=hook_risk,
        dual_possession_ot_continues=dual_ot_cont,
    )
