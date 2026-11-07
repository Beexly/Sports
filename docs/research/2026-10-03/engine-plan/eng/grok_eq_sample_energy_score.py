"""Sample energy score as printed in arXiv:2610.24591v2.

ES(F_K, y) = (1/K) sum_k ||f_k - y|| - (1/(2 K^2)) sum_k sum_ell ||f_k - f_ell||
for ensemble members f and observation y. Invalid inputs, empty, non-finite, or math failure -> null.
Does not score live picks, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def sample_energy_score(ensemble: Sequence[Sequence[float]] | None, observation: Sequence[float] | None) -> float | None:
    if ensemble is None or observation is None:
        return None
    try:
        members = [tuple(float(x) for x in m) for m in ensemble]
        y = tuple(float(x) for x in observation)
    except (TypeError, ValueError):
        return None
    K = len(members)
    if K < 1 or len(y) == 0 or any(len(m) != len(y) for m in members):
        return None
    if not all(math.isfinite(v) for m in members for v in m) or not all(math.isfinite(v) for v in y):
        return None
    try:
        def euclid(a, b):
            return math.sqrt(sum((ai - bi) ** 2 for ai, bi in zip(a, b)))
        term1 = sum(euclid(m, y) for m in members) / K
        term2 = 0.0
        for k in range(K):
            for ell in range(K):
                term2 += euclid(members[k], members[ell])
        term2 /= (2.0 * K * K)
        res = term1 - term2
        if not math.isfinite(res):
            return None
        return res
    except (OverflowError, ZeroDivisionError):
        return None
