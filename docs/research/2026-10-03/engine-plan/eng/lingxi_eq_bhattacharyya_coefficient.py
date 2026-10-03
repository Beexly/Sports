"""Printed Bhattacharyya coefficient (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Hellinger H², not softmin/softmax, not Jeffreys/TV/Neyman χ²,
not silhouette. Does not edit grok_eq_adam.

Bhattacharyya, A., "On a measure of divergence between two statistical
populations defined by their probability distributions," Bulletin of
the Calcutta Mathematical Society 35 (1943) 99–109. Coefficient form
(affinity) used throughout modern ML (e.g. as 1 − H² for discrete
probabilities):

    BC(p, q) = Σ_i √(p_i q_i)

Caller supplies equal-length non-negative mass sequences.
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


def bhattacharyya_coefficient(p: object, q: object) -> float | None:
    """BC = Σ √(p_i q_i) (Bhattacharyya 1943 affinity).

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
        total += math.sqrt(a * b)
    if not math.isfinite(total):
        return None
    return total


COLUMN_BACKED_FUNCS: Sequence[str] = ("bhattacharyya_coefficient",)