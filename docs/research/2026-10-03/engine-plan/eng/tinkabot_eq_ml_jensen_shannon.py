"""Jensen–Shannon divergence (Nowozin et al. f-GAN / arXiv:1606.00709).

Printed Table 1 PDF p.3 (Jensen-Shannon Df):
  (1/2) Σ_i [ p_i log(2 p_i/(p_i+q_i)) + q_i log(2 q_i/(p_i+q_i)) ]
Discrete equal-length non-negative masses (caller-normalized).
Not Hellinger. Not KL. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("jensen_shannon",)


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


def _term(a: float, b: float) -> float | None:
    """a log(2a/(a+b)); 0 when a=0."""
    if a == 0.0:
        return 0.0
    s = a + b
    if s == 0.0:
        return None
    return a * math.log((2.0 * a) / s)


def jensen_shannon(p: object, q: object) -> float | None:
    """JS = (1/2) Σ [p log(2p/(p+q)) + q log(2q/(p+q))] (Nowozin Table 1).

    Missing / non-finite / negative, length mismatch, or empty → null.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(q, (list, tuple)):
        return None
    if len(p) == 0 or len(p) != len(q):
        return None
    total = 0.0
    for pi, qi in zip(p, q):
        a = _as_finite_nonneg(pi)
        b = _as_finite_nonneg(qi)
        if a is None or b is None:
            return None
        t1 = _term(a, b)
        t2 = _term(b, a)
        if t1 is None or t2 is None:
            return None
        total += t1 + t2
    out = 0.5 * total
    if not math.isfinite(out):
        return None
    return out
