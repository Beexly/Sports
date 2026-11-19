"""5-Regime 1-Factor R-Vine SGP Copula, Higham PSD Projection & Sub-Interval PIT (K13)."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from scipy.stats import norm  # type: ignore[import-untyped]
from scipy.stats import t as student_t

REGIME_NAMES_5: tuple[str, ...] = (
    "Shootout_OT",
    "Neutral",
    "HomeBlowout",
    "AwayBlowout",
    "DefensiveGrind",
)


@dataclass(frozen=True, slots=True)
class HighamPsdResult:
    """Result of Higham (2002) Dykstra-Corrected Nearest Correlation Matrix."""

    matrix: tuple[tuple[float, ...], ...]
    min_eigenvalue: float
    max_diag_error: float
    iterations: int


@dataclass(frozen=True, slots=True)
class RVineSgpResult:
    """5-Regime 1-Factor R-Vine joint probability inside d-leg Frechet-Hoeffding bounds."""

    joint_prob: float
    frechet_lower: float
    frechet_upper: float
    independent_prob: float
    shootout_upper_tail_lambda: float
    min_corr_eigenvalue: float


def higham_nearest_correlation(
    raw_corr: Sequence[Sequence[float]],
    *,
    eig_floor: float = 1e-5,
    max_iter: int = 80,
) -> HighamPsdResult:
    """Project an empirical Kendall-tau / Pearson matrix onto the PSD correlation elliptope."""
    a_mat = np.asarray(raw_corr, dtype=np.float64)
    if a_mat.ndim != 2 or a_mat.shape[0] != a_mat.shape[1] or a_mat.shape[0] < 2:
        raise ValueError("raw_corr must be a square matrix of dim >= 2.")
    y_mat = 0.5 * (a_mat + a_mat.T)
    delta_s = np.zeros_like(y_mat)
    x_mat = y_mat.copy()

    n_iters = 0
    for it in range(1, max_iter + 1):
        n_iters = it
        r_mat = y_mat - delta_s
        eigvals, eigvecs = np.linalg.eigh(0.5 * (r_mat + r_mat.T))
        eig_clipped = np.maximum(eig_floor, eigvals)
        x_mat = eigvecs @ np.diag(eig_clipped) @ eigvecs.T
        x_mat = 0.5 * (x_mat + x_mat.T)
        delta_s = x_mat - r_mat
        y_next = x_mat.copy()
        np.fill_diagonal(y_next, 1.0)
        converged = float(np.max(np.abs(y_next - y_mat))) < 1e-10
        if converged and float(np.min(eigvals)) >= eig_floor * 0.99:
            y_mat = y_next
            break
        y_mat = y_next

    # Final eigenvalue floor + unit diagonal symmetrization while preserving PSD
    diag_sq = np.sqrt(np.maximum(1e-9, np.diag(x_mat)))
    corr_out = x_mat / np.outer(diag_sq, diag_sq)
    corr_out = 0.5 * (corr_out + corr_out.T)
    np.fill_diagonal(corr_out, 1.0)
    ev_final, evec_final = np.linalg.eigh(corr_out)
    if float(np.min(ev_final)) < eig_floor:
        ev_final = np.maximum(eig_floor, ev_final)
        corr_out = evec_final @ np.diag(ev_final) @ evec_final.T
        d_sc = np.sqrt(np.maximum(1e-9, np.diag(corr_out)))
        corr_out = corr_out / np.outer(d_sc, d_sc)
        np.fill_diagonal(corr_out, 1.0)
        ev_final = np.linalg.eigvalsh(corr_out)

    return HighamPsdResult(
        matrix=tuple(tuple(float(v) for v in row) for row in corr_out),
        min_eigenvalue=float(np.min(ev_final)),
        max_diag_error=float(np.max(np.abs(np.diag(corr_out) - 1.0))),
        iterations=n_iters,
    )


def _gumbel_2_copula(u: float, v: float, theta: float) -> float:
    th = max(1.001, min(4.0, float(theta)))
    uc = max(1e-9, min(1.0 - 1e-9, float(u)))
    vc = max(1e-9, min(1.0 - 1e-9, float(v)))
    lu = (-math.log(uc)) ** th
    lv = (-math.log(vc)) ** th
    return math.exp(-((lu + lv) ** (1.0 / th)))


def _clayton_2_copula(u: float, v: float, theta: float) -> float:
    th = max(0.01, min(4.5, float(theta)))
    uc = max(1e-9, min(1.0 - 1e-9, float(u)))
    vc = max(1e-9, min(1.0 - 1e-9, float(v)))
    val = uc ** (-th) + vc ** (-th) - 1.0
    if val <= 0.0:
        return 0.0
    return float(val ** (-1.0 / th))


def evaluate_5regime_rvine_sgp(
    *,
    leg_exceedance_probs: Sequence[float],
    raw_corr_matrix: Sequence[Sequence[float]],
    regime_probs: Sequence[float] = (0.22, 0.44, 0.14, 0.12, 0.08),
    discrete_subintervals: Sequence[tuple[float, float]] | None = None,
    shootout_gumbel_theta: float = 1.45,
    grind_clayton_theta: float = 0.65,
    student_t_nu: float = 4.0,
) -> RVineSgpResult:
    """Price 2..6 leg SGP across 5 game regimes x 21-node Gauss-Legendre 1-Factor R-Vine (K13)."""
    p_legs = [max(0.0, min(1.0, float(p))) for p in leg_exceedance_probs]
    d = len(p_legs)
    if d < 2 or d > 6:
        raise ValueError(f"K13 supports 2..6 SGP legs, got {d}.")

    pi_r = [max(0.0, float(w)) for w in regime_probs]
    if len(pi_r) != 5 or sum(pi_r) <= 0.0:
        raise ValueError("regime_probs must have 5 positive-sum regime probabilities.")
    s_pi = sum(pi_r)
    pi_r = [w / s_pi for w in pi_r]

    psd = higham_nearest_correlation(raw_corr_matrix, eig_floor=1e-5)
    corr = np.asarray(psd.matrix, dtype=np.float64)
    # 1-factor common loading from top eigenvector of PSD correlation
    evals, evecs = np.linalg.eigh(corr)
    top_idx = int(np.argmax(evals))
    raw_load = evecs[:, top_idx] * math.sqrt(max(0.05, float(evals[top_idx]) / float(d)))
    loadings = np.clip(raw_load * 1.15, -0.88, 0.88)

    # Sub-interval [F(x-), F(x)] width modulation for discrete count legs (AP-11 guard)
    if discrete_subintervals is not None and len(discrete_subintervals) == d:
        mid_probs = [
            max(1e-6, min(1.0 - 1e-6, 0.5 * (float(lo) + float(hi))))
            for lo, hi in discrete_subintervals
        ]
        eff_legs = [max(0.0, min(1.0, 1.0 - mp)) for mp in mid_probs]
    else:
        eff_legs = list(p_legs)

    gl_nodes, gl_weights = np.polynomial.legendre.leggauss(21)
    v0_pts = 0.5 * (gl_nodes + 1.0)
    w_pts = 0.5 * gl_weights

    def _cond_exceedance(p_j: float, v0: float, loading: float, r_idx: int) -> float:
        if p_j <= 0.0:
            return 0.0
        if p_j >= 1.0:
            return 1.0
        u_nonexc = max(1e-7, min(1.0 - 1e-7, 1.0 - p_j))
        v_c = max(1e-7, min(1.0 - 1e-7, float(v0)))

        if r_idx == 0:  # Shootout/OT: Student-t_4 + Gumbel upper-tail survival clustering
            t_u = float(student_t.ppf(u_nonexc, df=student_t_nu))
            t_v = float(student_t.ppf(v_c, df=student_t_nu))
            rho_j = float(loading)
            denom = math.sqrt(max(1e-6, 1.0 - rho_j * rho_j))
            z_cond = (t_u - rho_j * t_v) / denom
            p_t_cond = 1.0 - float(norm.cdf(z_cond))
            c_gumb = _gumbel_2_copula(p_j, v_c, shootout_gumbel_theta)
            p_g_cond = max(0.0, min(1.0, 0.5 * p_t_cond + 0.5 * c_gumb))
            return p_g_cond
        if r_idx == 4:  # DefensiveGrind: Clayton lower-tail crash dependence
            c_clay = _clayton_2_copula(p_j, v_c, grind_clayton_theta)
            return max(0.0, min(1.0, c_clay / max(1e-6, 1.0) * 0.4 + p_j * 0.6))
        if r_idx in (2, 3):  # Blowouts: 90/270 rotated loading polarity on pass vs rush
            rot_load = float(loading) * (-0.75 if r_idx == 2 else 0.75)
            z_u = float(norm.ppf(u_nonexc))
            z_v = float(norm.ppf(v_c))
            z_cond = (z_u - rot_load * z_v) / math.sqrt(max(1e-6, 1.0 - rot_load * rot_load))
            return 1.0 - float(norm.cdf(z_cond))
        # Neutral 1-factor Gaussian base inside regime mixture
        z_u = float(norm.ppf(u_nonexc))
        z_v = float(norm.ppf(v_c))
        z_cond = (z_u - float(loading) * z_v) / math.sqrt(max(1e-6, 1.0 - float(loading) ** 2))
        return 1.0 - float(norm.cdf(z_cond))

    joint_est = 0.0
    for r_idx, weight_r in enumerate(pi_r):
        reg_val = 0.0
        for v0, w0 in zip(v0_pts, w_pts, strict=True):
            prod_j = 1.0
            for j in range(d):
                prod_j *= _cond_exceedance(eff_legs[j], float(v0), float(loadings[j]), r_idx)
            reg_val += float(w0) * prod_j
        joint_est += weight_r * reg_val

    frechet_lo = max(0.0, sum(p_legs) - float(d - 1))
    frechet_hi = min(p_legs)
    joint_bounded = max(frechet_lo, min(frechet_hi, joint_est))

    indep = 1.0
    for p in p_legs:
        indep *= p
    lam_u_shootout = max(0.05, 2.0 - 2.0 ** (1.0 / max(1.001, shootout_gumbel_theta)))

    return RVineSgpResult(
        joint_prob=round(joint_bounded, 8),
        frechet_lower=round(frechet_lo, 8),
        frechet_upper=round(frechet_hi, 8),
        independent_prob=round(indep, 8),
        shootout_upper_tail_lambda=round(lam_u_shootout, 6),
        min_corr_eigenvalue=round(psd.min_eigenvalue, 8),
    )
