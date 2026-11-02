"""Latent-robust coverage lower bound from Doula & Mühlhäuser arXiv:2610.28937 Theorem 4.2.

P(Y in S_hat_Gamma(X)) >= 1 - alpha_stage1 - beta_stage2

Fail-closed on non-finite, negative, or invalid levels.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def latent_robust_coverage_bound(
    alpha_stage1: float | None,
    beta_stage2: float | None,
) -> float | None:
    """Return the lower bound 1 - alpha_stage1 - beta_stage2.

    Requires 0 <= alpha, beta < 1, finite, and sum < 1.
    """
    try:
        if alpha_stage1 is None or beta_stage2 is None:
            return None
        a = float(alpha_stage1)
        b = float(beta_stage2)
        if not (math.isfinite(a) and math.isfinite(b)):
            return None
        if a < 0 or b < 0 or a >= 1 or b >= 1:
            return None
        bound = 1.0 - a - b
        if not math.isfinite(bound) or bound <= 0:
            return None
        return bound
    except (TypeError, ValueError, OverflowError):
        return None
