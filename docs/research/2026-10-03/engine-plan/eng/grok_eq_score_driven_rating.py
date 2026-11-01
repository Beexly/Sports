"""Score-driven rating update as printed in Holý Černý, arXiv:2604.09143 eq (6).

r_{t+1}^{(i)} = r_t^{(i)} + K * nabla_i(r_t; y_t)
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations
import math


def score_driven_rating_update(
    r: float | None,
    k: float | None,
    nabla: float | None,
) -> float | None:
    if r is None or k is None or nabla is None:
        return None
    try:
        rr = float(r)
        kk = float(k)
        nn = float(nabla)
        if not (math.isfinite(rr) and math.isfinite(kk) and math.isfinite(nn)):
            return None
        if kk <= 0:
            return None  # K > 0 required
        return rr + kk * nn
    except (TypeError, ValueError, OverflowError):
        return None
