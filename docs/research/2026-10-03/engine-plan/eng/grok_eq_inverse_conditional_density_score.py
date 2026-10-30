"""Inverse conditional-density score from Li arXiv:2610.37866.

Printed: score 1 / f(y | x). Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Optional


def inverse_conditional_density_score(f_yx: object) -> Optional[float]:
    """Guarded inverse conditional density nonconformity score.

    Printed score = 1 / f(y|x).
    """
    try:
        f = float(f_yx)
        if not math.isfinite(f) or f <= 0.0:
            return None
        return 1.0 / f
    except (TypeError, ValueError):
        return None
