"""Expected detection delay upper bound as printed in Liu, Prinster, Orabona, arXiv:2610.17343.

Corollary 4.2: E[(tau - t0)+ | D0] <= (20/Delta^2) ln(1/alpha) + (40/Delta^2) ln(40/Delta^2) + 192/Delta^2 + (20/Delta^2)(ln(t0+3) + 2 ln ln(t0+3)).
Missing inputs, alpha not in (0,1), Delta <= 0, t0 < 0, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def cctm_expected_delay_bound(alpha: float | None, delta: float | None, t0: float | None) -> float | None:
    if alpha is None or delta is None or t0 is None:
        return None
    try:
        a = float(alpha)
        dlt = float(delta)
        t = float(t0)
    except (TypeError, ValueError):
        return None
    if not (0.0 < a < 1.0) or dlt <= 0.0 or t < 0.0:
        return None
    try:
        inv_d2 = 20.0 / (dlt * dlt)
        term1 = inv_d2 * math.log(1.0 / a)
        term2 = (40.0 / (dlt * dlt)) * math.log(40.0 / (dlt * dlt))
        term3 = 192.0 / (dlt * dlt)
        ln_term = math.log(t + 3.0) + 2.0 * math.log(math.log(t + 3.0))
        term4 = inv_d2 * ln_term
        return term1 + term2 + term3 + term4
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
