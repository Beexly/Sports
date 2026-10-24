"""
Equations 16-17: Student-t Copula Joint SGP Pricing (nu = 4).
"""

from __future__ import annotations

import numpy as np
from scipy.stats import t as student_t


def student_t_copula_cdf(
    u: float,
    v: float,
    rho: float,
    nu: int = 4,
    n_sim: int = 100000,
    seed: int = 42,
) -> float:
    """
    Equation 16: Monte Carlo approximation of the bivariate Student-t copula C(u, v; rho, nu)
    for SGP leg pricing (P(U > 1 - u, V > 1 - v) = P(U < u, V < v) by radial symmetry).
    """
    rng = np.random.default_rng(seed)
    cov = np.array([[1.0, rho], [rho, 1.0]])
    z = rng.multivariate_normal([0.0, 0.0], cov, size=n_sim)
    chi2 = rng.chisquare(df=nu, size=(n_sim, 1))
    t_draws = z / np.sqrt(chi2 / nu)
    u_draws = student_t.cdf(t_draws[:, 0], df=nu)
    v_draws = student_t.cdf(t_draws[:, 1], df=nu)
    joint = np.mean((u_draws < u) & (v_draws < v))
    return float(joint)
