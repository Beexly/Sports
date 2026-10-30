"""Guarded structured additive predictor from arXiv:2610.36835 printed eq (2).

eta_k^(nu)(x) = beta_0k^(nu) + sum_r s_rk^(nu)(x_r) = g_k^(nu)(theta_k^(nu)(x))

Fail-closed on invalid inputs. Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def structured_additive_predictor(
    beta0: float | None,
    smooth_terms: Sequence[float] | None,
) -> float | None:
    if beta0 is None or smooth_terms is None:
        return None
    try:
        b0 = float(beta0)
        if not math.isfinite(b0):
            return None
        total = b0
        for term in smooth_terms:
            t = float(term)
            if not math.isfinite(t):
                return None
            total += t
        return total
    except (TypeError, ValueError, OverflowError):
        return None
