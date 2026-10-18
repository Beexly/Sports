"""Conformal set loss from Zhang & Bates arXiv:2610.08785 eq (5).

Printed: ell_lambda(Y, Gamma) = |Gamma| + (1/lambda) * 1(Y notin Gamma)

Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Optional


def conformal_set_loss(gamma_size: object, y_in_gamma: object, lambda_: object) -> Optional[float]:
    """Guarded conformal set loss. Printed ell_lambda = |Gamma| + 1/lambda * indicator(miss)."""
    try:
        size = float(gamma_size)
        if not (math.isfinite(size) and size >= 0.0 and size == int(size)):
            return None
        if not isinstance(y_in_gamma, bool):
            return None
        lam = float(lambda_)
        if not (math.isfinite(lam) and 0.0 < lam <= 1.0):
            return None
        miss = 0.0 if y_in_gamma else 1.0
        return size + (1.0 / lam) * miss
    except (TypeError, ValueError):
        return None
