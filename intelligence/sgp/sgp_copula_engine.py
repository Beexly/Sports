"""
SGP Combinatorial Copula Engine
===============================

Prices multi-leg same-game parlays (SGPs) by simulating the JOINT distribution
of the legs under a copula, instead of multiplying marginals and calling it a
probability.

WHY THIS EXISTS
---------------
Books price SGPs with a correlation adjustment, and per AGENTS.md's reasoning
doctrine the SGP correlation mispricing is the biggest structural hole in the
market (books hold 15-30% on them). The naive independence product P(A)*P(B)
is wrong in BOTH directions:

  * positively correlated legs (QB passing yards + his WR's receiving yards)
    are UNDER-credited by the independent product — the true joint is higher;
  * negatively correlated legs (passing yards + opponent rushing) are
    OVER-credited — the true joint is lower.

So the engine's job is to produce an honest joint probability, compare it to
the book's implied price, and only call it edge when the gap survives the
model's own uncertainty. A gap is a hypothesis, not an edge.

WHAT IS IMPLEMENTED
-------------------
* Three copulas, each with its own tail behaviour:
    - Gaussian      : no tail dependence (the baseline / most conservative)
    - Student-t (nu): symmetric tail dependence — both tails fatter
    - Clayton       : ASYMMETRIC lower-tail dependence — the "everything
                      blows up together" leg, which is exactly the shape of a
                      correlated SGP collapse (QB under + WR under + team
                      under). Gaussian cannot represent this at any rho.
                      DISCLOSURE: the Clayton sampler here is a single shared
                      Gamma frailty (Marshall-Olkin). It is EQUI-CORRELATED
                      and driven by Kendall's tau ALONE — it does NOT consume
                      the correlation matrix. The matrix is used only to
                      validate the request, and a pair-specific (heterogeneous)
                      matrix raises ValueError rather than being silently
                      ignored. For matrix-driven pricing use Gaussian or
                      Student-t.
* Higham (1988) nearest positive semi-definite repair, so an empirical
  correlation matrix estimated from a finite, noisy sample never crashes the
  Cholesky factor. Empirical matrices are routinely indefinite.
* A joint probability calculator over arbitrary marginals (Poisson for
  counting legs like passing TDs, Log-Normal for yards-like legs), simulating
  N draws and evaluating any set of leg conditions on the same correlated
  uniforms.

DISCIPLINE / HONESTY NOTES (AGENTS.md Law 4 + Standing Doctrine)
---------------------------------------------------------------
* Nothing here invents data. Marginals come from the caller; correlations come
  from the caller. The engine only propagates them honestly.
* A simulated probability carries Monte Carlo error ~ sqrt(p(1-p)/N). At
  N=50,000 and p=0.5 that is ~0.0022 (0.22pp). Every edge this module reports
  is returned with its standard error and a z-score so a sub-noise "edge"
  cannot be read as fact.
* The book's SGP price is de-vigged before comparison when the caller supplies
  the two-sided price; a vigged price compared against a fair probability
  manufactures edge out of the margin.

REFERENCES
----------
Higham, N. J. (1988). "Computing a nearest symmetric positive semidefinite
matrix." Linear Algebra and its Applications 103:103-118.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np

__all__ = [
    "nearest_psd_higham",
    "is_psd",
    "correlation_from_covariance",
    "GaussianCopula",
    "StudentTCopula",
    "ClaytonCopula",
    "Marginal",
    "PoissonMarginal",
    "LogNormalMarginal",
    "NormalMarginal",
    "SGPResult",
    "price_sgp",
    "american_to_probability",
    "devig_two_way",
]


# ---------------------------------------------------------------------------
# 1. Higham (1988) nearest PSD repair
# ---------------------------------------------------------------------------

def is_psd(matrix: np.ndarray, tol: float = 1e-10) -> bool:
    """True when every eigenvalue of the symmetric part is >= -tol."""
    a = np.asarray(matrix, dtype=float)
    a = 0.5 * (a + a.T)
    return bool(np.min(np.linalg.eigvalsh(a)) >= -tol)


def nearest_psd_higham(
    matrix: np.ndarray,
    max_iter: int = 200,
    tol: float = 1e-12,
) -> np.ndarray:
    """
    Higham (1988) nearest symmetric positive semi-definite matrix, in the
    Frobenius norm, via the alternating-projection (Dykstra) iteration.

    This is the code path that keeps an EMPIRICAL covariance/correlation
    matrix — which is indefinite roughly as often as not when it is estimated
    from a finite sample — from blowing up ``np.linalg.cholesky``.

    The algorithm projects alternately onto the PSD cone (via the
    eigendecomposition) and onto the set of symmetric matrices, carrying a
    Dykstra correction so the iterates converge to the true nearest PSD matrix
    rather than to an arbitrary feasible point.

    Args:
        matrix: (n, n) array; need not be symmetric or PSD.
        max_iter: iteration cap (it converges in a handful for typical inputs).
        tol: Frobenius-norm convergence tolerance.

    Returns:
        The nearest PSD matrix in the Frobenius norm, symmetrized exactly
        (the symmetrization at the end is what makes the result PSD in
        floating point even when the last projection was slightly off).
    """
    a = np.asarray(matrix, dtype=float)
    if a.ndim != 2 or a.shape[0] != a.shape[1]:
        raise ValueError(f"nearest_psd_higham expects a square matrix, got shape {a.shape}")

    # Work with the symmetric part: the PSD cone contains only symmetric
    # matrices, so any asymmetric part is pure noise for this purpose.
    b = 0.5 * (a + a.T)
    if is_psd(b):
        return b

    # Dykstra correction accumulator.
    ds = np.zeros_like(b)
    y = b.copy()
    prev_norm = np.inf

    for _ in range(max_iter):
        # Project onto the PSD cone: clip negative eigenvalues to zero.
        r = y - ds
        w, v = np.linalg.eigh(0.5 * (r + r.T))
        w_clipped = np.clip(w, 0.0, None)
        x = (v * w_clipped) @ v.T

        ds = x - r
        # Project onto symmetric matrices (already symmetric by construction).
        y = 0.5 * (x + x.T)

        delta = float(np.linalg.norm(y - x, ord="fro"))
        if delta < tol:
            break
        norm_y = float(np.linalg.norm(y, ord="fro"))
        if abs(prev_norm - norm_y) < tol * max(1.0, norm_y):
            break
        prev_norm = norm_y

    # Final symmetrization + a second clip for floating-point safety.
    y = 0.5 * (y + y.T)
    w, v = np.linalg.eigh(y)
    if np.min(w) < 0.0:
        y = (v * np.clip(w, 0.0, None)) @ v.T
        y = 0.5 * (y + y.T)
    return y


def correlation_from_covariance(cov: np.ndarray) -> np.ndarray:
    """
    Convert a covariance matrix to a correlation matrix.

    Zero-variance columns are a real hazard for a pilot matrix (a leg that has
    never varied in the sample); they are returned as an identity row rather
    than dividing by zero.
    """
    cov = np.asarray(cov, dtype=float)
    d = np.sqrt(np.clip(np.diag(cov), 0.0, None))
    d_safe = np.where(d > 0.0, d, 1.0)
    corr = cov / np.outer(d_safe, d_safe)
    degenerate = d <= 0.0
    if np.any(degenerate):
        corr[degenerate, :] = 0.0
        corr[:, degenerate] = 0.0
        corr[degenerate, degenerate] = 1.0
    np.fill_diagonal(corr, 1.0)
    return corr


# ---------------------------------------------------------------------------
# 2. Copulas
# ---------------------------------------------------------------------------

#: Smallest eigenvalue a correlation matrix may keep and still be factored by
#: Cholesky. A PSD-but-SINGULAR matrix (which is what a short empirical sample
#: always produces, since rank <= n-1) is not positive DEFINITE, and
#: np.linalg.cholesky raises on it. The floor below is the ridge that makes it
#: factorable; it is ~1e-10, i.e. nine orders of magnitude below any correlation
#: a caller could meaningfully supply, so it does not distort the model.
_PD_FLOOR = 1e-10


def _make_positive_definite(corr: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    Return (matrix, floored) where matrix is symmetric positive definite and
    factorable by Cholesky.

    Ranks above the Higham repair: Higham maps an indefinite matrix to the PSD
    CONE (eigenvalues >= 0), but the boundary of that cone still fails Cholesky.
    A short empirical sample is the common case — n observations give a sample
    correlation of rank <= n-1, so its smallest eigenvalues are zero and the
    factor raises "Matrix is not positive definite". The ridge closes exactly
    that gap.
    """
    a = 0.5 * (corr + corr.T)
    w = np.linalg.eigvalsh(a)
    min_eig = float(np.min(w))
    if min_eig >= _PD_FLOOR:
        return a, False
    shift = _PD_FLOOR - min_eig
    a = a + shift * np.eye(a.shape[0])
    a = 0.5 * (a + a.T)
    # Restore the unit diagonal the shift disturbed (change is ~1e-10).
    d = np.sqrt(np.clip(np.diag(a), 1e-300, None))
    a = a / np.outer(d, d)
    np.fill_diagonal(a, 1.0)
    return a, True


class _Copula:
    """Shared machinery: repair the correlation matrix, factor it, draw uniforms."""

    def __init__(self, correlation: np.ndarray, repair: bool = True):
        self.correlation = np.asarray(correlation, dtype=float)
        if self.correlation.ndim != 2 or self.correlation.shape[0] != self.correlation.shape[1]:
            raise ValueError("correlation matrix must be square")
        self.repaired = False
        self.regularized = False
        corr = 0.5 * (self.correlation + self.correlation.T)
        if repair and not is_psd(corr):
            corr = nearest_psd_higham(corr)
            self.repaired = True
        # A correlation matrix must have unit diagonal; renormalize after repair
        # so the repair cannot quietly change the variances.
        d = np.sqrt(np.clip(np.diag(corr), 1e-12, None))
        corr = corr / np.outer(d, d)
        np.fill_diagonal(corr, 1.0)
        if repair:
            corr, self.regularized = _make_positive_definite(corr)
        self.correlation = corr
        self._L = np.linalg.cholesky(corr)

    @property
    def dim(self) -> int:
        return int(self.correlation.shape[0])

    def uniforms(self, n_draws: int, rng: np.random.Generator) -> np.ndarray:
        """Draw n_draws correlated uniforms in (0, 1)^dim. Subclass hook."""
        raise NotImplementedError

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        return f"{type(self).__name__}(dim={self.dim}, repaired={self.repaired})"


class GaussianCopula(_Copula):
    """
    Gaussian copula: X = Z L^T, U = Phi(X).

    No tail dependence. It is the baseline because it is the most conservative
    assumption about joint extremes — if a leg only shows edge under Gaussian,
    it is not a tail story, so discount any narrative about blow-ups.
    """

    def __init__(self, correlation: np.ndarray, repair: bool = True):
        super().__init__(correlation, repair=repair)

    def uniforms(self, n_draws: int, rng: np.random.Generator) -> np.ndarray:
        z = rng.standard_normal((n_draws, self.dim))
        x = z @ self._L.T
        return _standard_normal_cdf(x)


class StudentTCopula(_Copula):
    """
    Student-t copula with `nu` degrees of freedom (default 4).

    nu=4 is deliberately fat: the t-copula's tail dependence coefficient is
    2 * t_{nu+1}(-sqrt((nu+1)(1-rho)/(1+rho))), which at nu=4 is materially
    larger than the Gaussian's flat zero. This is the right model when the
    question is "how often do these legs fail TOGETHER", and the wrong model
    when the legs are known to be asymmetric (use Clayton there).

    Sampling: chi-square mixing of a Gaussian copula,
        X = Z L^T * sqrt(nu / W),  U = t_nu(X)
    which is the exact representation, not an approximation.
    """

    def __init__(self, correlation: np.ndarray, nu: float = 4.0, repair: bool = True):
        if nu <= 0:
            raise ValueError("nu must be positive")
        super().__init__(correlation, repair=repair)
        self.nu = float(nu)

    def uniforms(self, n_draws: int, rng: np.random.Generator) -> np.ndarray:
        z = rng.standard_normal((n_draws, self.dim))
        g = z @ self._L.T
        # Shared chi-square mixture: one mixing variable per joint draw, which
        # is what creates tail dependence between the components.
        w = rng.chisquare(self.nu, size=(n_draws, 1))
        t = g * np.sqrt(self.nu / w)
        return _student_t_cdf(t, self.nu)


class ClaytonCopula(_Copula):
    """
    Clayton copula, parameterized by Kendall's tau (more interpretable and
    estimable than theta), lower-tail dependent.

    Only positive dependence is representable (Clayton has no negative-dependence
    regime), so a matrix with negative entries raises rather than silently
    returning nonsense. For a negative pair, use Gaussian or the t-copula.

    EQUI-CORRELATED ONLY: the frailty sampler below draws ONE shared Gamma
    frailty per joint draw, so every pair gets the SAME dependence, set by
    tau alone. The correlation matrix is NOT consumed by the sampler. A
    pair-specific (heterogeneous) matrix therefore raises ValueError: pricing
    from it here would silently discard the pair structure the caller
    supplied. An equi-correlated matrix (all off-diagonal entries equal —
    including any 2x2 matrix) is accepted, and is still ignored in favour of
    tau; pass tau to say how much dependence you mean.

    Sampling (Marshall-Olkin / frailty):
        V ~ Gamma(1/theta, 1),  W_i ~ Exp(1),
        U_i = (1 + W_i / V)^(-1/theta)
    """

    def __init__(self, correlation: np.ndarray, tau: float = 0.3, repair: bool = True):
        super().__init__(correlation, repair=repair)
        if not (-1.0 < tau < 1.0):
            raise ValueError("tau must be in (-1, 1)")
        # Clayton supports only positive dependence; a negative target is a
        # specification error, not something to paper over.
        if tau < 0.0:
            raise ValueError(
                "Clayton copula cannot represent negative dependence (tau < 0); "
                "use GaussianCopula or StudentTCopula for that pair"
            )
        off = self.correlation[~np.eye(self.dim, dtype=bool)]
        if off.size and np.min(off) < 0.0:
            raise ValueError(
                "Clayton copula cannot represent a correlation matrix with "
                "negative entries; use GaussianCopula or StudentTCopula"
            )
        # The frailty sampler is equi-correlated: it cannot consume a matrix
        # whose pairs differ. Refuse pair-specific structure rather than
        # silently pricing as if every pair shared one dependence.
        if off.size and float(np.max(off) - np.min(off)) > 1e-9:
            raise ValueError(
                "Clayton copula here is a single-frailty sampler: it is "
                "equi-correlated and driven by Kendall's tau alone, so it "
                "cannot consume a correlation matrix with pair-specific "
                "entries (the matrix would be silently ignored). Use "
                "GaussianCopula or StudentTCopula for matrix-driven pricing, "
                "or pass an equi-correlated matrix if the tau-only model is "
                "intended"
            )
        if tau == 0.0:
            tau = 1e-6
        self.tau = float(tau)
        self.theta = 2.0 * self.tau / (1.0 - self.tau)

    def uniforms(self, n_draws: int, rng: np.random.Generator) -> np.ndarray:
        # Frailty V ~ Gamma(1/theta, scale=1); W ~ Exp(1); U = (1 + W/V)^(-1/theta)
        v = rng.gamma(shape=1.0 / self.theta, scale=1.0, size=(n_draws, 1))
        w = rng.exponential(scale=1.0, size=(n_draws, self.dim))
        return (1.0 + w / v) ** (-1.0 / self.theta)


# --- distribution helpers (kept private; no scipy dependency) ---------------

def _standard_normal_cdf(x: np.ndarray) -> np.ndarray:
    """Phi(x) via the error function (numpy only, no scipy)."""
    return 0.5 * (1.0 + _erf(x / np.sqrt(2.0)))


def _erf(x: np.ndarray) -> np.ndarray:
    """
    Vectorized erf using the Abramowitz & Stegun 7.1.26 rational approximation
    (|error| < 1.5e-7). Adequate for uniform generation: the resulting bias in
    P is orders of magnitude below the Monte Carlo error at N=50,000.
    """
    x = np.asarray(x, dtype=float)
    sign = np.sign(x)
    ax = np.abs(x)
    t = 1.0 / (1.0 + 0.3275911 * ax)
    y = 1.0 - (
        ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
        + 0.254829592
    ) * t * np.exp(-ax * ax)
    return sign * y


def _student_t_cdf(x: np.ndarray, nu: float) -> np.ndarray:
    """
    Student-t CDF via the regularized incomplete beta function, using the
    continued-fraction evaluation from Numerical Recipes (betacf), which is
    accurate to ~1e-10 across the range that matters here.

    t_cdf(x, nu) = 1 - 0.5 * I_{nu/(nu+x^2)}(nu/2, 1/2)   for x > 0
    """
    x = np.asarray(x, dtype=float)
    v = float(nu)
    xx = v / (v + x * x)
    ib = _betainc_reg(v / 2.0, 0.5, xx)
    cdf = np.where(x > 0, 1.0 - 0.5 * ib, 0.5 * ib)
    return np.clip(cdf, 1e-12, 1.0 - 1e-12)


def _betainc_reg(a: float, b: float, x: np.ndarray) -> np.ndarray:
    """Regularized incomplete beta I_x(a, b), vectorized over x."""
    x = np.asarray(x, dtype=float)
    out = np.empty_like(x)
    bt = np.exp(
        _gammaln(a + b) - _gammaln(a) - _gammaln(b) + a * np.log(np.clip(x, 1e-300, None))
        + b * np.log(np.clip(1.0 - x, 1e-300, None))
    )
    mask = x < (a + 1.0) / (a + b + 2.0)
    if np.any(mask):
        out[mask] = bt[mask] * _betacf(a, b, x[mask]) / a
    if np.any(~mask):
        xc = 1.0 - x[~mask]
        out[~mask] = 1.0 - bt[~mask] * _betacf(b, a, xc) / b
    return out


def _betacf(a: float, b: float, x: np.ndarray) -> np.ndarray:
    """Continued fraction for the incomplete beta (Lentz's method)."""
    tiny = 1e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = np.ones_like(x)
    d = 1.0 - qab * x / qap
    d = np.where(np.abs(d) < tiny, tiny, d)
    d = 1.0 / d
    h = d.copy()
    for m in range(1, 200):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        d = np.where(np.abs(d) < tiny, tiny, d)
        c = 1.0 + aa / c
        c = np.where(np.abs(c) < tiny, tiny, c)
        d = 1.0 / d
        h = h * d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        d = np.where(np.abs(d) < tiny, tiny, d)
        c = 1.0 + aa / c
        c = np.where(np.abs(c) < tiny, tiny, c)
        d = 1.0 / d
        delta = d * c
        h = h * delta
        if np.all(np.abs(delta - 1.0) < 1e-12):
            break
    return h


def _gammaln(x: float) -> float:
    """log Gamma(x) (Lanczos), scalar in / scalar out."""
    if x <= 0:
        raise ValueError("gammaln undefined for non-positive input")
    cof = [
        76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ]
    y = x
    tmp = x + 5.5
    tmp -= (x + 0.5) * np.log(tmp)
    ser = 1.000000000190015
    for c in cof:
        y += 1.0
        ser += c / y
    return -tmp + np.log(2.5066282746310005 * ser / x)


# ---------------------------------------------------------------------------
# 3. Marginals
# ---------------------------------------------------------------------------

class Marginal:
    """A leg's marginal distribution. Subclasses implement ``quantile(u)``."""

    name: str = "marginal"

    def quantile(self, u: np.ndarray) -> np.ndarray:
        """Inverse CDF (percent-point function), vectorized over u in (0,1)."""
        raise NotImplementedError

    def sample(self, n: int, rng: np.random.Generator) -> np.ndarray:
        """Uncorrelated draws — used for the independent-legs control."""
        return self.quantile(rng.uniform(1e-12, 1 - 1e-12, size=n))


class PoissonMarginal(Marginal):
    """
    Counting leg (e.g. passing TDs, receptions, sacks).

    The quantile is computed by inverting the CDF numerically over the support
    [0, k_max]: the pmf is built with the stable recurrence
    p(k) = p(k-1) * lambda / k, so no factorial overflow at realistic lambdas.
    """

    def __init__(self, lam: float, k_max: Optional[int] = None, name: str = "poisson"):
        if lam < 0:
            raise ValueError("lambda must be >= 0")
        self.lam = float(lam)
        self.name = name
        if k_max is None:
            k_max = int(self.lam + 10.0 * np.sqrt(max(self.lam, 1.0)) + 20)
        self.k_max = int(k_max)
        self._pmf = self._build_pmf()
        self._cdf = np.cumsum(self._pmf)

    def _build_pmf(self) -> np.ndarray:
        if self.lam == 0.0:
            pmf = np.zeros(self.k_max + 1)
            pmf[0] = 1.0
            return pmf
        pmf = np.empty(self.k_max + 1)
        pmf[0] = np.exp(-self.lam)
        for k in range(1, self.k_max + 1):
            pmf[k] = pmf[k - 1] * self.lam / k
        s = pmf.sum()
        return pmf / s if s > 0 else pmf

    def quantile(self, u: np.ndarray) -> np.ndarray:
        idx = np.searchsorted(self._cdf, np.clip(u, 0.0, 1.0), side="left")
        return np.clip(idx, 0, self.k_max).astype(float)

    @property
    def mean(self) -> float:
        return self.lam

    @property
    def var(self) -> float:
        return self.lam


class LogNormalMarginal(Marginal):
    """
    Positive, right-skewed leg (e.g. passing / receiving / rushing yards).

    Parameterized the way a sportsbook line is actually quoted: a median
    (or mean) and a standard deviation in the natural units, converted to the
    underlying normal's (mu, sigma):

        sigma^2 = ln(1 + sd^2 / mean^2)
        mu      = ln(mean) - sigma^2 / 2      (this makes E[X] = mean)
    """

    def __init__(self, mean: float, sd: float, name: str = "lognormal"):
        if mean <= 0 or sd <= 0:
            raise ValueError("lognormal requires mean > 0 and sd > 0")
        self.mean = float(mean)
        self.sd = float(sd)
        self.name = name
        var_over_mean2 = (self.sd / self.mean) ** 2
        self.sigma2 = float(np.log1p(var_over_mean2))
        self.sigma = float(np.sqrt(self.sigma2))
        self.mu = float(np.log(self.mean) - 0.5 * self.sigma2)

    def quantile(self, u: np.ndarray) -> np.ndarray:
        u = np.clip(np.asarray(u, dtype=float), 1e-12, 1 - 1e-12)
        return np.exp(self.mu + self.sigma * _standard_normal_ppf(u))

    @property
    def var(self) -> float:
        return (np.exp(self.sigma2) - 1.0) * np.exp(2.0 * self.mu + self.sigma2)


class NormalMarginal(Marginal):
    """Symmetric leg (e.g. a spread margin, a plus/minus quantity)."""

    def __init__(self, mean: float, sd: float, name: str = "normal"):
        if sd <= 0:
            raise ValueError("normal requires sd > 0")
        self.mean = float(mean)
        self.sd = float(sd)
        self.name = name

    def quantile(self, u: np.ndarray) -> np.ndarray:
        u = np.clip(np.asarray(u, dtype=float), 1e-12, 1 - 1e-12)
        return self.mean + self.sd * _standard_normal_ppf(u)

    @property
    def var(self) -> float:
        return self.sd ** 2


def _standard_normal_ppf(u: np.ndarray) -> np.ndarray:
    """
    Phi^{-1}(u) — Acklam's rational approximation, |error| < 1.15e-9, refined
    by one Halley step against the erf implementation above.
    """
    u = np.asarray(u, dtype=float)
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    plow, phigh = 0.02425, 1 - 0.02425

    out = np.empty_like(u)
    low = u < plow
    high = u > phigh
    mid = ~(low | high)

    if np.any(low):
        q = np.sqrt(-2.0 * np.log(u[low]))
        out[low] = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0
        )
    if np.any(high):
        q = np.sqrt(-2.0 * np.log(1.0 - u[high]))
        out[high] = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0
        )
    if np.any(mid):
        q = u[mid] - 0.5
        r = q * q
        out[mid] = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (
            ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0
        )
    # One Halley refinement against our own Phi keeps the pair consistent.
    e = _standard_normal_cdf(out) - u
    pdf = np.exp(-0.5 * out * out) / np.sqrt(2.0 * np.pi)
    out = out - e / np.maximum(pdf, 1e-300)
    return out


# ---------------------------------------------------------------------------
# 4. Joint probability calculation
# ---------------------------------------------------------------------------

@dataclass
class Leg:
    """
    One parlay leg.

    `condition` maps the simulated VALUE of this leg to a boolean hit mask.
    Keeping it explicit (rather than a hard-coded "over") means the same
    machinery prices unders, ranges, and "at least N" legs without change.
    """

    marginal: Marginal
    condition: Callable[[np.ndarray], np.ndarray]
    label: str = ""

    def hit_mask(self, values: np.ndarray) -> np.ndarray:
        return np.asarray(self.condition(values), dtype=bool)


def over(line: float) -> Callable[[np.ndarray], np.ndarray]:
    """Condition: value > line."""
    return lambda v: v > line


def under(line: float) -> Callable[[np.ndarray], np.ndarray]:
    """Condition: value < line."""
    return lambda v: v < line


@dataclass
class SGPResult:
    """Everything the caller needs to judge whether a parlay price is edge."""

    n_draws: int
    copula: str
    leg_probabilities: List[float]
    true_joint: float
    independent_joint: float
    correlation_lift: float
    joint_std_error: float
    z_score: float
    book_implied: Optional[float] = None
    alpha: Optional[float] = None
    edge_standard_error: Optional[float] = None
    edge_z_score: Optional[float] = None
    is_edge: bool = False
    repaired_correlation: bool = False
    notes: List[str] = field(default_factory=list)

    def summary(self) -> str:
        lines = [
            f"SGP price ({self.copula}, N={self.n_draws:,})",
            f"  legs:        {', '.join(f'{p:.4f}' for p in self.leg_probabilities)}",
            f"  independent: {self.independent_joint:.4f}",
            f"  true joint:  {self.true_joint:.4f}  (+/- {self.joint_std_error:.4f}, z={self.z_score:+.2f} vs independent)",
            f"  lift:        {self.correlation_lift:+.2%}",
        ]
        if self.book_implied is not None:
            lines += [
                f"  book price:  {self.book_implied:.4f}",
                f"  alpha:       {self.alpha:+.2%}",
            ]
            if self.edge_standard_error is not None:
                lines.append(f"  alpha SE:    {self.edge_standard_error:.4f} (z={self.edge_z_score:+.2f})")
            lines.append(f"  verdict:     {'EDGE (model)' if self.is_edge else 'no edge'}")
        for n in self.notes:
            lines.append(f"  note: {n}")
        return "\n".join(lines)


def price_sgp(
    legs: Sequence[Leg],
    correlation: np.ndarray,
    copula: str = "gaussian",
    n_draws: int = 50_000,
    seed: Optional[int] = None,
    book_price_american: Optional[float] = None,
    book_price_prob: Optional[float] = None,
    book_pair_american: Optional[Tuple[float, float]] = None,
    nu: float = 4.0,
    tau: float = 0.3,
    require_both_conditions_valid: bool = True,
) -> SGPResult:
    """
    Simulate the joint outcome of `legs` under `correlation` and price the parlay.

    Args:
        legs: the parlay legs, in the order matching `correlation`.
        correlation: (k, k) correlation matrix. Repaired to the nearest PSD
            matrix when it is not already PSD, so a sloppy empirical estimate
            cannot crash the Cholesky factor.
        copula: "gaussian", "student-t", or "clayton".
        n_draws: Monte Carlo draws (default 50,000).
        seed: optional RNG seed for reproducibility.
        book_price_american: the book's SGP price in American odds. Vigged;
            the alpha reported against it is therefore CONSERVATIVE (the true
            fair-price gap is larger). Prefer book_price_prob or
            book_pair_american when available.
        book_price_prob: the book's implied probability, already de-vigged.
        book_pair_american: the two surviving prices used to de-vig the book's
            SGP probability (see devig_two_way).
        nu: degrees of freedom for the t-copula.
        tau: Kendall's tau for the Clayton copula. Clayton is equi-correlated
            and tau-only: a pair-specific (heterogeneous) correlation matrix
            with copula="clayton" raises ValueError (see ClaytonCopula).

    Returns:
        SGPResult with the true joint, the independence control, the lift, and
        (when a book price was supplied) the alpha with its standard error.
    """
    legs = list(legs)
    if not legs:
        raise ValueError("at least one leg is required")
    corr = np.asarray(correlation, dtype=float)
    if corr.shape != (len(legs), len(legs)):
        raise ValueError(
            f"correlation must be {len(legs)}x{len(legs)} to match {len(legs)} legs, got {corr.shape}"
        )
    if n_draws < 1_000:
        raise ValueError("n_draws must be >= 1000 for a usable standard error")

    rng = np.random.default_rng(seed)

    key = copula.strip().lower()
    if key in ("gaussian", "normal", "gauss"):
        cop: _Copula = GaussianCopula(corr)
        copula_name = "gaussian"
    elif key in ("student-t", "studentt", "t"):
        cop = StudentTCopula(corr, nu=nu)
        copula_name = f"student-t(nu={nu:g})"
    elif key == "clayton":
        cop = ClaytonCopula(corr, tau=tau)
        copula_name = f"clayton(tau={tau:g})"
    else:
        raise ValueError(f"unknown copula '{copula}' (expected gaussian, student-t or clayton)")

    # One set of correlated uniforms drives every leg, which is the entire
    # point: the legs share a draw, so their joint is not the product.
    u = cop.uniforms(n_draws, rng)

    hit_masks = np.empty((len(legs), n_draws), dtype=bool)
    leg_probs: List[float] = []
    for i, leg in enumerate(legs):
        values = leg.marginal.quantile(u[:, i])
        mask = leg.hit_mask(values)
        hit_masks[i] = mask
        leg_probs.append(float(mask.mean()))

    joint_mask = np.all(hit_masks, axis=0)
    true_joint = float(joint_mask.mean())
    independent_joint = float(np.prod(leg_probs))

    # Monte Carlo standard error of the joint estimate.
    joint_se = float(np.sqrt(max(true_joint * (1.0 - true_joint), 0.0) / n_draws))
    z = (true_joint - independent_joint) / joint_se if joint_se > 0 else float("nan")
    lift = (true_joint - independent_joint) / independent_joint if independent_joint > 0 else float("nan")

    result = SGPResult(
        n_draws=n_draws,
        copula=copula_name,
        leg_probabilities=leg_probs,
        true_joint=true_joint,
        independent_joint=independent_joint,
        correlation_lift=lift,
        joint_std_error=joint_se,
        z_score=z,
        repaired_correlation=cop.repaired,
    )
    if cop.repaired:
        result.notes.append(
            "correlation matrix was not PSD; repaired to the nearest PSD matrix (Higham 1988)"
        )

    # Book comparison.
    book_prob = book_price_prob
    if book_prob is None and book_pair_american is not None:
        book_prob = devig_two_way(*book_pair_american)
        result.notes.append("book probability extracted from a two-way de-vig of the supplied pair")
    if book_prob is None and book_price_american is not None:
        book_prob = american_to_probability(book_price_american)
        result.notes.append(
            "book price was compared WITH vig (no de-vig input supplied), so the alpha below is conservative"
        )

    if book_prob is not None:
        result.book_implied = float(book_prob)
        result.alpha = float(true_joint - book_prob)
        # Uncertainty in alpha is the same sampling error as the joint (the book
        # price is treated as fixed).
        result.edge_standard_error = joint_se
        result.edge_z_score = (result.alpha / joint_se) if joint_se > 0 else float("nan")
        # An "edge" must clear both the 15% alpha bar AND its own Monte Carlo
        # noise. A 20% alpha with a 25pp standard error is not a finding.
        result.is_edge = bool(
            require_both_conditions_valid
            and result.alpha > 0.15
            and result.edge_z_score is not None
            and result.edge_z_score > 2.0
        )
        if result.alpha > 0.15 and not result.is_edge:
            result.notes.append(
                "alpha exceeded 15% but is within Monte Carlo noise (z <= 2) — not a confirmed edge"
            )

    return result


# ---------------------------------------------------------------------------
# 5. Odds helpers
# ---------------------------------------------------------------------------

def american_to_probability(price: float) -> float:
    """Implied probability of American odds, vig included."""
    p = float(price)
    if p == 0:
        raise ValueError("American odds of 0 are undefined")
    if p > 0:
        return 100.0 / (p + 100.0)
    return (-p) / (-p + 100.0)


def devig_two_way(price_a: float, price_b: float) -> float:
    """
    Multiplicative de-vig of a two-way market, returning the FAIR probability
    of side A.

    Comparing a model probability against a vigged price manufactures edge out
    of the book's margin, so this is the default path whenever both sides are
    available.
    """
    pa = american_to_probability(price_a)
    pb = american_to_probability(price_b)
    total = pa + pb
    if total <= 0:
        raise ValueError("de-vig requires two positive implied probabilities")
    return float(pa / total)


def correlation_matrix_from_pairs(dim: int, pairs: Dict[Tuple[int, int], float]) -> np.ndarray:
    """
    Build a symmetric correlation matrix from a sparse dict of pair
    correlations — the way a caller actually knows the numbers.

    Unspecified pairs default to 0.0 (independence), and the result is NOT
    guaranteed PSD; price_sgp repairs it.
    """
    if dim < 1:
        raise ValueError("dim must be >= 1")
    corr = np.eye(dim)
    for (i, j), rho in pairs.items():
        if not (0 <= i < dim and 0 <= j < dim):
            raise ValueError(f"pair index ({i},{j}) outside matrix of dim {dim}")
        if i == j:
            raise ValueError("a pair correlation cannot reference the diagonal")
        if not (-1.0 <= rho <= 1.0):
            raise ValueError(f"correlation {rho} out of [-1, 1]")
        corr[i, j] = rho
        corr[j, i] = rho
    return corr
