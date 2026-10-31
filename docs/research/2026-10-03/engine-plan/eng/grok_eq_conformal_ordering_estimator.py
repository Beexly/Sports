"""Conformal ordering estimator from Lee Ren arXiv:2610.40340 eq (1).

Printed: \hat{\sigma}(j) = sum_k 1{\hat{\mu}(X_{n+k}) \le \hat{\mu}(X_{n+j})}.
Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

from typing import List, Optional, Sequence


def conformal_ordering_sigma(mus: Sequence[float]) -> Optional[List[int]]:
    """Guarded rank-from-predicted-means for conformal ordering.

    Returns sigma(j) for j=1..m (1-based ranks of the predicted means).
    """
    try:
        vals = [float(v) for v in mus]
        if not vals or any(not (v == v and abs(v) != float("inf")) for v in vals):  # NaN/Inf
            return None
        m = len(vals)
        sigma = []
        for j in range(m):
            rank = sum(1 for k in range(m) if vals[k] <= vals[j])
            sigma.append(rank)
        return sigma
    except (TypeError, ValueError):
        return None
