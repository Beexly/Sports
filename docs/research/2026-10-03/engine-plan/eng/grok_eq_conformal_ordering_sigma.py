"""Guarded conformal ordering sigma from arXiv:2610.40340 printed eq (1).

sigma_hat(j) = sum_k 1{ mu_hat(X_n+k) <= mu_hat(X_n+j) }

Fail-closed on invalid inputs. Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def conformal_ordering_sigma(
    mu_hats: Sequence[float] | None,
    j: int | None,
) -> int | None:
    if mu_hats is None or j is None:
        return None
    try:
        mus = [float(m) for m in mu_hats]
        if not all(math.isfinite(m) for m in mus):
            return None
        jj = int(j)
        if jj < 0 or jj >= len(mus):
            return None
        return sum(1 for m in mus if m <= mus[jj])
    except (TypeError, ValueError, OverflowError):
        return None
