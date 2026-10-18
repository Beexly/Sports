"""MV-OTCP Mahalanobis ground cost from Zhang et al. arXiv:2610.14907 eq (2).

Printed: c_M(s, u) = (s - u)^T M (s - u), M = M^T succ 0

Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Optional, Sequence


def mv_otcp_ground_cost(s: object, u: object, m: object) -> Optional[float]:
    """Guarded Mahalanobis quadratic cost. Printed c_M(s,u)=(s-u)^T M (s-u)."""
    try:
        if not (isinstance(s, (list, tuple)) and isinstance(u, (list, tuple)) and len(s) == len(u) and len(s) > 0):
            return None
        dim = len(s)
        if not (isinstance(m, (list, tuple)) and len(m) == dim and all(isinstance(row, (list, tuple)) and len(row) == dim for row in m)):
            return None
        # check symmetric positive definite-ish: diagonal positive, off-diag match
        for i in range(dim):
            for j in range(dim):
                if not math.isfinite(float(m[i][j])) or m[i][j] != m[j][i]:
                    return None
            if float(m[i][i]) <= 0.0:
                return None
        diff = [float(s[i]) - float(u[i]) for i in range(dim)]
        # quadratic form
        cost = 0.0
        for i in range(dim):
            for j in range(dim):
                cost += diff[i] * float(m[i][j]) * diff[j]
        if not math.isfinite(cost) or cost < 0.0:
            return None
        return cost
    except (TypeError, ValueError, IndexError):
        return None
