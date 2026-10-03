"""Bhattacharyya distance D_B(P,Q) = −ln BC(P,Q) (Bhattacharyya 1943).

With BC = Σ √(p q) as in Lingxi bhattacharyya_coefficient.
Printed relation: distance is the negative log of the coefficient
(Bhattacharyya 1943 / standard information-geometry form).
One function. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("bhattacharyya_distance",)


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def bhattacharyya_distance(p: object, q: object) -> float | None:
    """D_B(P,Q) = −ln Σ_i √(p_i q_i) (Bhattacharyya 1943).

    p, q: equal-length sequences of non-negative finite masses.
    BC must be > 0. Missing / unequal / negative / non-finite → null.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(q, (list, tuple)):
        return None
    if len(p) != len(q) or len(p) == 0:
        return None
    bc = 0.0
    for pi, qi in zip(p, q):
        pv = _as_finite(pi)
        qv = _as_finite(qi)
        if pv is None or qv is None:
            return None
        if pv < 0.0 or qv < 0.0:
            return None
        bc += math.sqrt(pv * qv)
    if bc <= 0.0 or not math.isfinite(bc):
        return None
    out = -math.log(bc)
    if not math.isfinite(out):
        return None
    return out
