"""Conformal nonconformity score for DOA tracking as printed in Veisman Barness et al., arXiv:2610.39566.

s(theta, R_t) = -log p_hat_t(theta | R_t)
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations

import math


def doa_conformal_nonconformity_score(p_hat: float | None) -> float | None:
    if p_hat is None:
        return None
    try:
        p = float(p_hat)
        if not math.isfinite(p):
            return None
        if not (0.0 < p <= 1.0):
            return None
        return -math.log(p)
    except (TypeError, ValueError, OverflowError):
        return None
