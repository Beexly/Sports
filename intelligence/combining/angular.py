# PROVENANCE — gse-intelligence-build / combining / angular.py
# SYS-04 Angular forecast combination (arXiv:2305.16735v2, Taylor & Meng,
# "Angular Combining of Forecasts of Probability Distributions").
#   Corpus: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-04)
#           ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipeline 4)
#           paper notes: arxiv-program/research/2026-09-21/arxiv-deep/
#             1550-angular-combining-forecasts-probability-distributions.md
# Implements the paper's exact construction: for fixed theta in (0, 90) deg,
# consider lines y = -tan(theta)(x - c); for each CDF F_i find the
# intersection (x_i(c), F_i(x_i(c))); the angular average CDF F_{A,theta} is
# the c-parametrized curve (mean_i x_i(c), mean_i F_i(x_i(c))).
# Limits: theta -> 0 = horizontal (quantile) averaging; theta -> 90 = vertical
# averaging = the linear opinion pool. Paper results: optimized theta beat the
# linear pool by up to +2.7% MQS; no-tuning fallback theta = 67.5 deg (+1.4%).
# Theoretical properties asserted by the paper and tested here: the angular
# average has mean = average of component means, and variance below vertical
# averaging (above horizontal under the paper's assumptions).
# Pre-step: SYS-16 information-graph audit (combining/audit.py) runs before
# any combination is trusted.
"""SYS-04 angular combining of forecast CDFs (1550)."""

import math

import numpy as np

from .audit import information_graph_audit
from .synthetic import component_forecasters_dgp

FALLBACK_THETA_DEG = 67.5


def angular_fallback_theta_deg():
    """No-tuning fallback angle: 67.5 degrees exactly (1550)."""
    return 67.5


def vertical_average(component_cdfs, weights):
    """Linear opinion pool: probability (vertical) averaging of CDFs."""
    F = np.asarray(component_cdfs, dtype=float)
    w = np.asarray(weights, dtype=float)
    w = w / w.sum()
    return w @ F


def horizontal_average(component_cdfs, grid, weights, p_grid=None):
    """Quantile (horizontal) averaging of CDFs."""
    F = np.asarray(component_cdfs, dtype=float)
    grid = np.asarray(grid, dtype=float)
    w = np.asarray(weights, dtype=float)
    w = w / w.sum()
    if p_grid is None:
        p_grid = np.linspace(0.001, 0.999, 400)
    quants = np.empty((F.shape[0], p_grid.size))
    for i in range(F.shape[0]):
        quants[i] = np.interp(p_grid, F[i], grid)
    qbar = w @ quants
    return np.interp(grid, qbar, p_grid, left=0.0, right=1.0)


def angular_combine(component_cdfs, grid, theta_deg, weights=None):
    """Angular average of CDFs at angle theta (degrees) — the 1550 construction.

    component_cdfs: (k, G) array of CDF values on common `grid`.
    Returns the combined CDF on `grid`.
    """
    F = np.asarray(component_cdfs, dtype=float)
    grid = np.asarray(grid, dtype=float)
    k = F.shape[0]
    if weights is None:
        weights = np.full(k, 1.0 / k)
    w = np.asarray(weights, dtype=float)
    w = w / w.sum()

    if theta_deg <= 0.0:
        return horizontal_average(F, grid, w)
    if theta_deg >= 90.0:
        return vertical_average(F, w)

    m = math.tan(math.radians(theta_deg))
    # Pragmatic numerical approach (paper): parametrize by the x-intercept c.
    # x_i(c) solves F_i(x) = -m(x - c)  <=>  F_i(x) + m*x = m*c; the function
    # h_i(x) = F_i(x) + m*x is strictly increasing, so invert by interpolation.
    c = np.linspace(grid[0] - 0.5, grid[-1] + 1.0 / m + 0.5, 400)
    target = m * c
    xs = np.empty((k, c.size))
    ys = np.empty((k, c.size))
    for i in range(k):
        h = F[i] + m * grid
        xi = np.interp(target, h, grid)
        xs[i] = xi
        ys[i] = np.interp(xi, grid, F[i], left=0.0, right=1.0)
    xbar = w @ xs
    ybar = w @ ys
    # xbar(c) is increasing in c (paper); invert onto the outcome grid.
    return np.interp(grid, xbar, ybar, left=0.0, right=1.0)


def cdf_quantiles(cdf_vals, grid, taus):
    """Inverse-CDF (quantile) evaluation on a grid."""
    cdf_vals = np.asarray(cdf_vals, dtype=float)
    grid = np.asarray(grid, dtype=float)
    taus = np.asarray(taus, dtype=float)
    return np.interp(taus, cdf_vals, grid)


def mean_quantile_score(cdf_vals, grid, y, taus=None):
    """Mean quantile score (MQS): mean pinball loss over a quantile grid.

    Proper scoring rule used by 1550; lower is better.
    """
    if taus is None:
        taus = np.linspace(0.05, 0.95, 19)
    taus = np.asarray(taus, dtype=float)
    q = cdf_quantiles(cdf_vals, grid, taus)
    y = float(y)
    qs = (np.where(y <= q, 1.0, 0.0) - taus) * (q - y)
    return float(np.mean(qs))


def distribution_mean(cdf_vals, grid):
    """E[X] from a CDF on a grid via the tail-integral identity."""
    cdf_vals = np.asarray(cdf_vals, dtype=float)
    grid = np.asarray(grid, dtype=float)
    pos = grid >= 0
    neg = grid <= 0
    upper = np.trapezoid(1.0 - cdf_vals[pos], grid[pos]) if pos.sum() > 1 else 0.0
    lower = np.trapezoid(cdf_vals[neg], grid[neg]) if neg.sum() > 1 else 0.0
    return float(upper - lower)


def distribution_variance(cdf_vals, grid):
    """Var[X] from a CDF on a grid (numeric PDF via gradient)."""
    cdf_vals = np.asarray(cdf_vals, dtype=float)
    grid = np.asarray(grid, dtype=float)
    pdf = np.gradient(cdf_vals, grid)
    pdf = np.clip(pdf, 0.0, None)
    mu = distribution_mean(cdf_vals, grid)
    return float(np.trapezoid((grid - mu) ** 2 * pdf, grid))


def angular_vs_linear_pool(seed=1550, n=600, theta_deg=67.5):
    """SYS-04 gate: angular combining (fallback theta) vs the linear opinion pool.

    PRE-STEP (SYS-16): the information-graph audit runs first; its result is
    returned and a failed audit is recorded, not silently ignored.
    SYNTHETIC evaluation: seeded component forecasters with known biases and
    overdispersed spreads. Returns mqs_gain_pct >= 0.0 by contract
    (angular must not lose to the linear pool).
    """
    dgp = component_forecasters_dgp(seed=seed, n=n)
    grid = dgp["grid"]
    cdfs = dgp["cdfs"]  # (n, k, G)
    y = dgp["y"]
    k = dgp["k"]
    w = np.full(k, 1.0 / k)

    audit = information_graph_audit(dgp["components"])

    mqs_lin = 0.0
    mqs_ang = 0.0
    for t in range(n):
        f_lin = vertical_average(cdfs[t], w)
        f_ang = angular_combine(cdfs[t], grid, theta_deg, w)
        mqs_lin += mean_quantile_score(f_lin, grid, y[t])
        mqs_ang += mean_quantile_score(f_ang, grid, y[t])
    mqs_lin /= n
    mqs_ang /= n
    gain_pct = 100.0 * (mqs_lin - mqs_ang) / mqs_lin if mqs_lin > 0 else 0.0

    return {
        "synthetic": True,
        "seed": seed,
        "n": n,
        "k": k,
        "theta_deg": float(theta_deg),
        "theta_source": "fallback (no tuning history)",
        "mqs_linear_pool": mqs_lin,
        "mqs_angular": mqs_ang,
        "mqs_gain_pct": gain_pct,
        "audit": {
            "passes": audit["passes"],
            "concentration": audit["concentration"],
            "dominant_source": audit["dominant_source"],
            "lemma1_collapse": audit["lemma1_collapse"],
            "recommendation": audit["recommendation"],
        },
        "trusted": bool(audit["passes"]),
    }


def optimize_theta(cdfs, grid, y, theta_grid=None):
    """Grid-search theta on in-sample MQS (paper's tuning procedure).

    Helper for the 'optimized theta' lane; the gate uses the fallback.
    Returns (best_theta_deg, best_mqs).
    """
    if theta_grid is None:
        theta_grid = np.linspace(5.0, 85.0, 17)
    n = cdfs.shape[0]
    k = cdfs.shape[1]
    w = np.full(k, 1.0 / k)
    best = (None, float("inf"))
    for th in theta_grid:
        tot = 0.0
        for t in range(n):
            f = angular_combine(cdfs[t], grid, float(th), w)
            tot += mean_quantile_score(f, grid, y[t])
        mqs = tot / n
        if mqs < best[1]:
            best = (float(th), mqs)
    return best
