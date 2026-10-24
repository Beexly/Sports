"""Clayton copula density as printed in Sun et al. arXiv:2610.25129 eq. (2.18).

c_0(u, v; alpha) = (1 + alpha) * (u * v)^{-1 - alpha} * (-1 + u^{-alpha} + v^{-alpha})^{-2 - 1/alpha}
alpha in [-1, inf) exclude 0. u, v in (0, 1].
Fail-closed on invalid inputs or math failure. No pick. Never main.
Source: Li-Hsien Sun et al., Vector Copula-Based Markov Models,
arXiv:2610.25129v1, eq. (2.18), https://arxiv.org/html/2610.25129v1
Opened 2026-10-24. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def clayton_copula_density(u: Any, v: Any, alpha: Any) -> float | None:
    """Apply printed eq. (2.18). Fail closed on invalid domain or non-finite result."""
    uu = _finite(u)
    vv = _finite(v)
    aa = _finite(alpha)
    if uu is None or vv is None or aa is None:
        return None
    if not (0.0 < uu <= 1.0 and 0.0 < vv <= 1.0):
        return None
    if aa <= -1.0 or aa == 0.0:
        return None
    try:
        term = -1.0 + uu ** (-aa) + vv ** (-aa)
        if term <= 0.0:
            return None
        dens = (1.0 + aa) * (uu * vv) ** (-1.0 - aa) * term ** (-2.0 - 1.0 / aa)
        if not math.isfinite(dens) or dens < 0.0:
            return None
        return dens
    except (ValueError, OverflowError, ZeroDivisionError):
        return None


FUNCTIONS = {"clayton_copula_density": clayton_copula_density}
PICKS_SETTLED = 0
