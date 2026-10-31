"""TTA conditional lower quantile as printed in Gutiérrez-Pérez Agudo, arXiv:2610.36183 eq (1).

τ(g) = Q_0.01 (Δt | g(k,x)). Target quantile level 0.01.
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations


def tta_conditional_lower_quantile(tau: float | None = 0.01) -> float | None:
    if tau is None:
        return None
    try:
        t = float(tau)
        if not (0.0 < t < 1.0):
            return None
        return t
    except (TypeError, ValueError):
        return None
