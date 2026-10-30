"""Sklar joint conditional CDF from So & Zhang arXiv:2610.36835 eq (1).

Printed: F(y1, y2 | θ) = C( F1(y1 | θ^(1)), F2(y2 | θ^(2)) | θ^(c) ).
Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Callable, Optional


def sklar_joint_conditional_cdf(
    f1: object,
    f2: object,
    copula: object,
) -> Optional[float]:
    """Guarded Sklar composition for joint conditional CDF.

    Printed eq (1): joint = C(marginal1, marginal2 | theta_c).
    Expects f1, f2 in [0, 1], copula callable (u, v) -> [0, 1].
    """
    try:
        u = float(f1)
        v = float(f2)
        if not (math.isfinite(u) and math.isfinite(v)):
            return None
        if not (0.0 <= u <= 1.0 and 0.0 <= v <= 1.0):
            return None
        if not callable(copula):
            return None
        joint = copula(u, v)
        j = float(joint)
        if not math.isfinite(j) or not (0.0 <= j <= 1.0):
            return None
        return j
    except (TypeError, ValueError):
        return None
