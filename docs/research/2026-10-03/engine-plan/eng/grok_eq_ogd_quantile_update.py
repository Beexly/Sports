"""OGD quantile tracking update as printed in Chrétien et al., arXiv:2610.27740 eq (4).

theta_{t+1} = max(0, theta_t + eta * { (1-alpha) if R > theta, -alpha if R <= theta })
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations

import math


def ogd_quantile_update(theta: float | None, residual: float | None, alpha: float | None, eta: float | None) -> float | None:
    if theta is None or residual is None or alpha is None or eta is None:
        return None
    if not (0.0 < alpha < 1.0):
        return None
    if not math.isfinite(theta) or not math.isfinite(residual) or not math.isfinite(eta) or eta < 0:
        return None
    try:
        if residual > theta:
            delta = (1.0 - alpha)
        else:
            delta = -alpha
        new_theta = theta + eta * delta
        return max(0.0, new_theta)
    except (TypeError, ValueError, OverflowError):
        return None
