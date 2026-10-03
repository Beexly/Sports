"""Printed 1-D Wasserstein-1 via CDF L1 (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Bhattacharyya, not Hellinger, not softmin/log-softmax,
not Neyman/Pearson χ². Does not edit grok_eq_adam.

On the real line, the p=1 Wasserstein distance equals the L1
distance between cumulative distribution functions
(Vallender, S. S., "Calculation of the Wasserstein distance between
probability distributions on the line," Theory Probab. Appl. 18
(1974) 784–786; standard form):

    W_1(μ, ν) = ∫ |F_μ(x) − F_ν(x)| dx

For two discrete distributions on the ordered integer support
{0, 1, …, n−1} with masses p, q (equal length, unit spacing),

    W_1(p, q) = Σ_{k=0}^{n−2} |F_p(k) − F_q(k)|

where F(k) = Σ_{i=0}^{k} mass_i. Caller supplies non-negative masses.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite_nonneg(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number < 0.0:
        return None
    return number


def wasserstein_1(p: object, q: object) -> float | None:
    """W_1 = Σ_{k=0}^{n−2} |F_p(k) − F_q(k)| (1-D CDF form, unit bins).

    Missing / non-finite / negative, length mismatch, or n < 2 → null.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(q, (list, tuple)):
        return None
    if len(p) < 2 or len(p) != len(q):
        return None
    total = 0.0
    cdf_p = 0.0
    cdf_q = 0.0
    n = len(p)
    for i in range(n):
        a = _as_finite_nonneg(p[i])
        b = _as_finite_nonneg(q[i])
        if a is None or b is None:
            return None
        cdf_p += a
        cdf_q += b
        if i < n - 1:
            total += abs(cdf_p - cdf_q)
    if not math.isfinite(total):
        return None
    return total


COLUMN_BACKED_FUNCS: Sequence[str] = ("wasserstein_1",)