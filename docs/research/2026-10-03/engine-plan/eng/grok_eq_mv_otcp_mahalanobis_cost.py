"""Guarded Mahalanobis ground cost from Zhang et al. arXiv:2610.14907 eq (2).

c_M(s, u) = (s - u)^T M (s - u), M = M^T > 0

Missing, non-numeric, non-square M, or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
from typing import Sequence


def mv_otcp_mahalanobis_cost(
    s: Sequence[float] | None,
    u: Sequence[float] | None,
    M: Sequence[Sequence[float]] | None,
) -> float | None:
    if s is None or u is None or M is None:
        return None
    try:
        sv = [float(x) for x in s]
        uv = [float(x) for x in u]
        if len(sv) != len(uv) or len(sv) == 0:
            return None
        dim = len(sv)
        mv = [[float(M[i][j]) for j in range(dim)] for i in range(dim)]
        if len(mv) != dim or any(len(row) != dim for row in mv):
            return None
        # basic symmetry check (fail closed if not approx symmetric)
        for i in range(dim):
            for j in range(i):
                if abs(mv[i][j] - mv[j][i]) > 1e-8:
                    return None
        diff = [sv[i] - uv[i] for i in range(dim)]
        # compute (diff)^T M diff
        mid = [sum(mv[i][j] * diff[j] for j in range(dim)) for i in range(dim)]
        cost = sum(diff[i] * mid[i] for i in range(dim))
        if cost < 0:  # should be >=0 for PSD, fail closed
            return None
        return float(cost)
    except (TypeError, ValueError, IndexError, OverflowError):
        return None
