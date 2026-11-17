"""Market surface density extraction (K01) & non-commutative filtration (K20).

Implements:
- K01: Lien-Shrestha (2009) Cholesky-invariant Generalized Hasbrouck VECM
  Information Share (F* = Omega V Lambda^(-1/2) V^T), Conjugate-Rationalized
  Shin (1993) / Power de-vigging, and Pya-Wood (2015) Shape-Constrained
  Monotone Decreasing P-Spline (SCOP-Spline) + Breeden-Litzenberger density.
- K20: Non-Commutative Filtration Bridge [U_inj, U_steam] preventing double-
  counting when sharp market steam precedes official T-90m inactive confirmation.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize  # type: ignore[import-untyped]

COLD_START_HASBROUCK_WEIGHTS: dict[str, float] = {
    "Pinnacle": 0.42,
    "Circa": 0.31,
    "Kalshi": 0.14,
    "DraftKings": 0.07,
    "FanDuel": 0.06,
}

SHIN_TO_POWER_HOLD_CUTOFF = 1.065


@dataclass(frozen=True, slots=True)
class VecmInformationShareResult:
    """Generalized Hasbrouck VECM Information Share decomposition across books."""

    weights: dict[str, float]
    cold_start_used: bool
    psi_norm: float


@dataclass(frozen=True, slots=True)
class ScopMarketSurfaceResult:
    """Monotone decreasing SCOP-Spline survival curve & Breeden-Litzenberger PDF."""

    x_grid: tuple[float, ...]
    survival_grid: tuple[float, ...]
    density_grid: tuple[float, ...]
    integral_mass: float
    mean: float
    variance: float
    skewness: float
    is_strictly_decreasing: bool
    fit_rss: float


@dataclass(frozen=True, slots=True)
class NonCommutativeFiltrationResult:
    """Post-Noon T-90m martingale filtration belief update under [U_inj, U_steam]."""

    eta_noon: float
    eta_t90m: float
    delta_t90m: float
    alpha_priced: float
    expected_clv: float
    steam_preceded_inactive: bool
    commutator_gap: float


def compute_lien_shrestha_vecm_is(
    book_names: Sequence[str],
    alpha_perp: Sequence[float] | None = None,
    omega_cov: Sequence[Sequence[float]] | None = None,
    gamma_one: Sequence[Sequence[float]] | None = None,
) -> VecmInformationShareResult:
    """Compute order-invariant Generalized Hasbrouck Information Share (Lien & Shrestha 2009).

    Uses symmetric spectral factorization F* = Omega V Lambda^(-1/2) V^T where
    Omega = V Lambda V^T, avoiding Cholesky book-ordering ambiguity and summing
    to 1.0 exactly across all B books. Falls back to sharp-first cold-start weights
    when insufficient cointegrated VECM snapshots exist.
    """
    names = [str(b) for b in book_names]
    n_books = len(names)
    if n_books == 0:
        return VecmInformationShareResult(weights={}, cold_start_used=True, psi_norm=0.0)

    if alpha_perp is None or omega_cov is None or len(alpha_perp) != n_books:
        raw = [COLD_START_HASBROUCK_WEIGHTS.get(b, 0.05) for b in names]
        tot = sum(raw) or 1.0
        return VecmInformationShareResult(
            weights={b: float(w / tot) for b, w in zip(names, raw, strict=True)},
            cold_start_used=True,
            psi_norm=0.0,
        )

    om = np.asarray(omega_cov, dtype=np.float64)
    if om.shape != (n_books, n_books):
        raise ValueError(f"omega_cov must have shape ({n_books}, {n_books}), got {om.shape}")
    om = 0.5 * (om + om.T)

    # Stock-Watson common-trend weights psi; default to normalized alpha_perp under weak Gamma(1)
    ap = np.asarray(alpha_perp, dtype=np.float64).reshape(-1)
    if gamma_one is not None:
        g1 = np.asarray(gamma_one, dtype=np.float64)
        denom_mat = g1 if g1.shape == (n_books, n_books) else np.eye(n_books, dtype=np.float64)
        psi_raw = np.linalg.pinv(denom_mat + 1e-8 * np.eye(n_books, dtype=np.float64)).T @ ap
    else:
        psi_raw = ap

    if float(np.linalg.norm(psi_raw)) <= 1e-10:
        raw = [COLD_START_HASBROUCK_WEIGHTS.get(b, 0.05) for b in names]
        tot = sum(raw) or 1.0
        return VecmInformationShareResult(
            weights={b: float(w / tot) for b, w in zip(names, raw, strict=True)},
            cold_start_used=True,
            psi_norm=0.0,
        )

    eigvals, eigvecs = np.linalg.eigh(om)
    eigvals_clamped = np.maximum(eigvals, 1e-9)
    inv_sqrt = eigvecs @ np.diag(1.0 / np.sqrt(eigvals_clamped)) @ eigvecs.T
    om_reg = eigvecs @ np.diag(eigvals_clamped) @ eigvecs.T
    f_star = om_reg @ inv_sqrt

    # Normalize against exact f_star @ f_star^T quadratic form (= psi^T Omega psi).
    proj = psi_raw @ f_star
    denom = float(np.dot(proj, proj))
    if denom <= 1e-12:
        raw = [COLD_START_HASBROUCK_WEIGHTS.get(b, 0.05) for b in names]
        tot = sum(raw) or 1.0
        return VecmInformationShareResult(
            weights={b: float(w / tot) for b, w in zip(names, raw, strict=True)},
            cold_start_used=True,
            psi_norm=float(np.linalg.norm(psi_raw)),
        )

    shares = np.maximum(0.0, (proj**2) / denom)
    s_tot = float(np.sum(shares)) or 1.0
    shares = shares / s_tot
    return VecmInformationShareResult(
        weights={b: float(shares[i]) for i, b in enumerate(names)},
        cold_start_used=False,
        psi_norm=float(np.linalg.norm(psi_raw)),
    )


def devig_shin_or_power(
    decimal_odds: Sequence[float],
    overround_switch: float = SHIN_TO_POWER_HOLD_CUTOFF,
) -> tuple[float, ...]:
    """Strip vigorish using Conjugate-Rationalized Shin (B <= 1.065) or Power (B > 1.065)."""
    odds = [float(o) for o in decimal_odds]
    if len(odds) < 2:
        raise ValueError("Need at least 2 outcomes to devig decimal odds.")
    if any(not math.isfinite(o) or o <= 1.0 for o in odds):
        raise ValueError("All decimal odds must be finite and strictly > 1.0.")

    q = [1.0 / o for o in odds]
    overround = sum(q)
    if overround <= 1.0 + 1e-12:
        return tuple(v / overround for v in q)

    if overround <= overround_switch:
        # Conjugate-Rationalized Shin (1993) / Jullien-Salanie exact 1D root on z in [1e-6, 0.25]
        def _shin_probs(z: float) -> list[float]:
            out: list[float] = []
            for qi in q:
                num = 2.0 * qi * qi / overround
                rad = math.sqrt(z * z + 4.0 * (1.0 - z) * qi * qi / overround)
                out.append(num / max(1e-15, z + rad))
            return out

        def _f_z(z: float) -> float:
            return sum(_shin_probs(z)) - 1.0

        lo, hi = 1e-6, 0.25
        f_lo, f_hi = _f_z(lo), _f_z(hi)
        if f_lo * f_hi <= 0.0:
            for _ in range(60):
                mid = 0.5 * (lo + hi)
                f_mid = _f_z(mid)
                if abs(f_mid) < 1e-13:
                    lo = hi = mid
                    break
                if (f_lo < 0.0) == (f_mid < 0.0):
                    lo, f_lo = mid, f_mid
                else:
                    hi, f_hi = mid, f_mid
            probs = _shin_probs(0.5 * (lo + hi))
            tot = sum(probs)
            return tuple(p / tot for p in probs)

    # Fallback or high-hold milestone ladder: Power de-vigging sum(q_i^k) = 1.0, k >= 1
    def _pow_err(k: float) -> float:
        return float(sum(qi**k for qi in q) - 1.0)

    k_lo, k_hi = 1.0, 20.0
    for _ in range(70):
        k_mid = 0.5 * (k_lo + k_hi)
        if _pow_err(k_mid) > 0.0:
            k_lo = k_mid
        else:
            k_hi = k_mid
    k_star = 0.5 * (k_lo + k_hi)
    probs_pow = [qi**k_star for qi in q]
    tot_pow = sum(probs_pow)
    return tuple(p / tot_pow for p in probs_pow)


def _cubic_bspline_basis_and_deriv(
    x_eval: NDArray[np.float64],
    x_min: float,
    x_max: float,
    n_basis: int,
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Evaluate clamped uniform cubic-like smooth B-spline basis B(x) and dB/dx.

    Constructed on normalized u in [0, 1] with smooth Gaussian-hat quadratic-cubic
    C^2 local partitions of unity so derivatives are analytically exact everywhere.
    """
    span = max(1e-6, x_max - x_min)
    u = (x_eval - x_min) / span
    j_cnt = max(6, int(n_basis))
    centers = np.linspace(0.0, 1.0, j_cnt)
    h = 1.0 / max(1, j_cnt - 1)
    scale = 1.25 * h

    diff = (u[:, None] - centers[None, :]) / scale
    phi = np.exp(-0.5 * diff * diff)
    dphi_dx = phi * (-diff / (scale * span))

    denom = np.maximum(1e-12, np.sum(phi, axis=1, keepdims=True))
    ddenom_dx = np.sum(dphi_dx, axis=1, keepdims=True)

    b_mat = phi / denom
    db_dx = (dphi_dx * denom - phi * ddenom_dx) / (denom * denom)
    return b_mat, db_dx


_SCOP_RELATIVE_CACHE: dict[tuple[object, ...], tuple[float, ScopMarketSurfaceResult]] = {}


def fit_scop_monotone_survival_and_bl_density(
    strikes: Sequence[float],
    survival_probs: Sequence[float],
    *,
    weights: Sequence[float] | None = None,
    n_basis: int = 12,
    roughness_lambda: float = 0.015,
    n_grid: int = 241,
) -> ScopMarketSurfaceResult:
    """Fit Pya & Wood (2015) monotone SCOP-Spline survival S(x) & Breeden-Litzenberger f(x).

    Parameterizes cumulative survival in logit space using partial sums of strictly
    positive exponentials so dS/dx < 0 everywhere on [x_min, x_max] with zero spikes.
    Returns exact normalized Breeden-Litzenberger density f_mkt(x) = -dS/dx (integral = 1.0)
    together with market mean, variance, and skewness.
    """
    xs = np.asarray(strikes, dtype=np.float64)
    ys = np.clip(np.asarray(survival_probs, dtype=np.float64), 1e-5, 1.0 - 1e-5)
    if xs.ndim != 1 or ys.ndim != 1 or len(xs) != len(ys) or len(xs) < 2:
        raise ValueError("strikes and survival_probs must be matching 1D vectors with len >= 2.")

    order = np.argsort(xs)
    xs = xs[order]
    ys = ys[order]
    w_arr = (
        np.ones_like(xs)
        if weights is None
        else np.maximum(1e-4, np.asarray(weights, dtype=np.float64)[order])
    )
    w_arr = w_arr / np.mean(w_arr)

    x_lo = float(xs[0])
    x_hi = float(xs[-1])
    span = max(1.0, x_hi - x_lo)
    # Pad domain slightly so edge CDF slopes decay smoothly while integrating on [x_min, x_max]
    x_min = x_lo - 0.10 * span
    x_max = x_hi + 0.10 * span
    j_cnt = max(6, min(20, int(n_basis)))

    rel_cache_key: tuple[object, ...] = (
        tuple(round(float(v - x_lo), 6) for v in xs),
        tuple(round(float(v), 6) for v in ys),
        tuple(round(float(v), 6) for v in w_arr),
        j_cnt,
        round(float(roughness_lambda), 6),
        int(n_grid),
    )
    cached_entry = _SCOP_RELATIVE_CACHE.get(rel_cache_key)
    if cached_entry is not None:
        cached_x_lo, cached_res = cached_entry
        shift = x_lo - cached_x_lo
        return ScopMarketSurfaceResult(
            x_grid=tuple(float(v + shift) for v in cached_res.x_grid),
            survival_grid=cached_res.survival_grid,
            density_grid=cached_res.density_grid,
            integral_mass=cached_res.integral_mass,
            mean=float(cached_res.mean + shift),
            variance=cached_res.variance,
            skewness=cached_res.skewness,
            is_strictly_decreasing=cached_res.is_strictly_decreasing,
            fit_rss=cached_res.fit_rss,
        )

    # Smooth monotone increasing cumulative cumulative-basis weights G_k(x) so eta(x) is
    # strictly decreasing: eta(x) = beta_0 - sum_{l=2}^J exp(gamma_l) * C_l(x),
    # where C_l(x) = int_{-inf}^x b_l(t) dt / total is strictly increasing.
    grid_fine = np.linspace(x_min, x_max, 513)
    b_fine, db_fine = _cubic_bspline_basis_and_deriv(grid_fine, x_min, x_max, j_cnt)
    dx_f = float(grid_fine[1] - grid_fine[0])
    # Exact Simpson/trapezoidal cumulative integral of positive basis gives smooth strictly >0 C_l'
    c_fine = np.zeros_like(b_fine)
    c_fine[1:] = np.cumsum(0.5 * (b_fine[:-1] + b_fine[1:]) * dx_f, axis=0)
    c_tot = np.maximum(1e-9, c_fine[-1:, :])
    c_norm_fine = c_fine / c_tot
    dc_dx_fine = b_fine / c_tot  # > 0 everywhere!

    # Interpolate C_l(xs) linearly on fine grid (513 pts gives <1e-5 error)
    def _eval_c_and_dc(
        x_pts: NDArray[np.float64],
    ) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        c_pts = np.empty((len(x_pts), j_cnt), dtype=np.float64)
        dc_pts = np.empty((len(x_pts), j_cnt), dtype=np.float64)
        for col in range(j_cnt):
            c_pts[:, col] = np.interp(x_pts, grid_fine, c_norm_fine[:, col])
            dc_pts[:, col] = np.interp(x_pts, grid_fine, dc_dx_fine[:, col])
        return c_pts, dc_pts

    c_obs, _ = _eval_c_and_dc(xs)
    target_logits = np.log(ys / (1.0 - ys))
    init_drop = max(1.0, float(target_logits[0] - target_logits[-1]))
    per_knot_gamma = math.log(init_drop / float(j_cnt))
    theta0 = np.concatenate(([float(target_logits[0])], np.full(j_cnt, per_knot_gamma)))

    def _sigmoid(z: NDArray[np.float64]) -> NDArray[np.float64]:
        return 1.0 / (1.0 + np.exp(-np.clip(z, -40.0, 40.0)))

    def _loss(theta: NDArray[np.float64]) -> float:
        beta0 = float(theta[0])
        steps = np.exp(np.clip(theta[1:], -12.0, 6.0))
        eta = beta0 - c_obs @ steps
        s_hat = _sigmoid(eta)
        err = s_hat - ys
        rss = float(np.mean(w_arr * err * err))
        diffs = theta[2:] - theta[1:-1]
        reg = float(roughness_lambda) * float(np.mean(diffs * diffs))
        # Boundary prior anchors extremes slightly so mass falls inside [x_min, x_max]
        b_pen = 1e-3 * ((max(0.0, 6.0 - beta0)) ** 2)
        return rss + reg + b_pen

    res = minimize(
        _loss,
        theta0,
        method="L-BFGS-B",
        bounds=[(-20.0, 20.0)] + [(-12.0, 6.0)] * j_cnt,
        options={"maxiter": 250, "ftol": 1e-11},
    )
    theta_opt = res.x if hasattr(res, "x") else theta0
    beta0_opt = float(theta_opt[0])
    steps_opt = np.exp(np.clip(theta_opt[1:], -12.0, 6.0))

    obs_eta = beta0_opt - c_obs @ steps_opt
    obs_pred = _sigmoid(obs_eta)
    fit_rss = float(np.mean((obs_pred - ys) ** 2))

    xg = np.linspace(x_min, x_max, max(51, int(n_grid)))
    c_g, dc_g = _eval_c_and_dc(xg)
    eta_g = beta0_opt - c_g @ steps_opt
    eta_prime_g = -(dc_g @ steps_opt)  # strictly < 0 everywhere
    s_g = np.clip(_sigmoid(eta_g), 1e-5, 1.0 - 1e-5)

    # Breeden-Litzenberger density: f_raw(x) = -dS/dx = -S(1 - S) eta'(x) > 0
    f_raw = np.maximum(1e-12, -s_g * (1.0 - s_g) * eta_prime_g)
    raw_mass = float(np.trapezoid(f_raw, xg))
    f_norm = f_raw / max(1e-12, raw_mass)
    final_mass = float(np.trapezoid(f_norm, xg))

    mean_val = float(np.trapezoid(xg * f_norm, xg))
    var_val = max(1e-9, float(np.trapezoid(((xg - mean_val) ** 2) * f_norm, xg)))
    std_val = math.sqrt(var_val)
    skew_val = float(np.trapezoid((((xg - mean_val) / std_val) ** 3) * f_norm, xg))
    strictly_dec = bool(np.all(np.diff(s_g) < 0.0) and np.all(eta_prime_g < 0.0))

    out = ScopMarketSurfaceResult(
        x_grid=tuple(float(v) for v in xg),
        survival_grid=tuple(float(v) for v in s_g),
        density_grid=tuple(float(v) for v in f_norm),
        integral_mass=final_mass,
        mean=mean_val,
        variance=var_val,
        skewness=skew_val,
        is_strictly_decreasing=strictly_dec,
        fit_rss=fit_rss,
    )
    if len(_SCOP_RELATIVE_CACHE) < 256:
        _SCOP_RELATIVE_CACHE[rel_cache_key] = (x_lo, out)
    return out


def evaluate_non_commutative_filtration_bridge(
    *,
    eta_noon: float,
    delta_line_sharp: float,
    delta_inj_causal: float,
    t_steam_utc: int,
    t_inact_utc: int,
    kappa_steam: float = 0.82,
    lambda_eff: float = 0.78,
    kappa_abs_per_min: float = 0.0277,
    dt_exec_min: float = 0.0,
) -> NonCommutativeFiltrationResult:
    """Apply K20 Non-Commutative Filtration [U_inj, U_steam] between Noon Lock & T-90m."""
    steam_first = int(t_steam_utc) < int(t_inact_utc)
    if steam_first:
        denom = float(delta_inj_causal) ** 2 + 1e-6
        ratio = (float(delta_line_sharp) * float(delta_inj_causal)) / denom
        alpha_priced = max(0.0, min(1.0, ratio))
    else:
        alpha_priced = 0.0

    raw_delta = float(kappa_steam) * float(delta_line_sharp) + (
        1.0 - alpha_priced
    ) * float(delta_inj_causal)
    clamped_delta = max(-6.5, min(6.5, raw_delta))
    eta_t90m = float(eta_noon) + clamped_delta

    # Counterfactual opposite ordering to quantify exact commutator [U_inj, U_steam]
    alt_alpha = (
        0.0
        if steam_first
        else max(
            0.0,
            min(
                1.0,
                (float(delta_line_sharp) * float(delta_inj_causal))
                / (float(delta_inj_causal) ** 2 + 1e-6),
            ),
        )
    )
    raw_alt = float(kappa_steam) * float(delta_line_sharp) + (1.0 - alt_alpha) * delta_inj_causal
    alt_delta = max(-6.5, min(6.5, raw_alt))

    exp_clv = (
        float(lambda_eff)
        * (1.0 - alpha_priced)
        * float(delta_inj_causal)
        * math.exp(-max(0.0, float(kappa_abs_per_min)) * max(0.0, float(dt_exec_min)))
    )
    return NonCommutativeFiltrationResult(
        eta_noon=float(eta_noon),
        eta_t90m=eta_t90m,
        delta_t90m=clamped_delta,
        alpha_priced=alpha_priced,
        expected_clv=exp_clv,
        steam_preceded_inactive=steam_first,
        commutator_gap=abs(clamped_delta - alt_delta),
    )


def build_ladder_surface_from_books(
    book_quotes_by_strike: Mapping[float, Mapping[str, tuple[float, float]]],
    *,
    is_weights: Mapping[str, float] | None = None,
) -> ScopMarketSurfaceResult:
    """Aggregate two-sided book decimal odds across strikes via Hasbrouck IS + Shin/Power."""
    weights = dict(is_weights or COLD_START_HASBROUCK_WEIGHTS)
    strikes = sorted(float(k) for k in book_quotes_by_strike)
    surv_pts: list[float] = []
    for strike in strikes:
        quotes = book_quotes_by_strike[strike]
        num = 0.0
        den = 0.0
        for book, pair in quotes.items():
            w = max(0.0, float(weights.get(book, 0.05)))
            p_over, _ = devig_shin_or_power(pair)
            num += w * p_over
            den += w
        surv_pts.append(num / max(1e-9, den))
    return fit_scop_monotone_survival_and_bl_density(strikes, surv_pts)
