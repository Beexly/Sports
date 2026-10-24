"""Normal (Gaussian) copula log-density as printed in arXiv:2610.23119 Appendix A.2.

\ell(u1, u2; \theta) = -1/2 * log(1 - \theta**2) + [2*\theta*\Phi^{-1}(u1)*\Phi^{-1}(u2) - \theta**2*((\Phi^{-1}(u1))**2 + (\Phi^{-1}(u2))**2)] / [2*(1 - \theta**2)]
\theta \in (-1, 1), u \in (0, 1).
Missing inputs, out of range, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
try:
    from scipy.stats import norm
    _ppf = norm.ppf
except ImportError:
    _ppf = None


def normal_copula_logdensity(u1: float | None, u2: float | None, theta: float | None) -> float | None:
    if u1 is None or u2 is None or theta is None or _ppf is None:
        return None
    u = float(u1)
    v = float(u2)
    t = float(theta)
    if not (0.0 < u < 1.0 and 0.0 < v < 1.0):
        return None
    if not (-1.0 < t < 1.0):
        return None
    try:
        z1 = _ppf(u)
        z2 = _ppf(v)
        if not (math.isfinite(z1) and math.isfinite(z2)):
            return None
        one_m_t2 = 1.0 - t * t
        if one_m_t2 <= 0.0 or not math.isfinite(one_m_t2):
            return None
        term1 = -0.5 * math.log(one_m_t2)
        num = 2.0 * t * z1 * z2 - t * t * (z1 * z1 + z2 * z2)
        term2 = num / (2.0 * one_m_t2)
        res = term1 + term2
        if not math.isfinite(res):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
