"""OGD quantile tracking threshold update from Chrétien et al. arXiv:2610.27740 eq (4).

θ_{t+1} = max(0, θ_t + η * {(1-α) if R_t > θ_t else -α}).
Fail-closed on non-finite, non-numeric, or invalid α/η.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def online_ogd_quantile_threshold(
    theta_t: float | None,
    residual_t: float | None,
    alpha: float | None,
    eta: float | None,
) -> float | None:
    """Return next scalar conformal threshold via online subgradient on pinball.

    All inputs must be finite; α in (0,1), η > 0.
    """
    try:
        if theta_t is None or residual_t is None or alpha is None or eta is None:
            return None
        th = float(theta_t)
        r = float(residual_t)
        a = float(alpha)
        e = float(eta)
        if not (math.isfinite(th) and math.isfinite(r) and math.isfinite(a) and math.isfinite(e)):
            return None
        if not (0.0 < a < 1.0) or e <= 0.0:
            return None
        delta = (1.0 - a) if r > th else -a
        next_th = th + e * delta
        return max(0.0, next_th)
    except (TypeError, ValueError, OverflowError):
        return None
