"""Split-conformal quantile index as printed in Doula & Mühlhäuser arXiv:2610.28937.

k_alpha(m) := ceil( (m + 1) * (1 - alpha) )
Returns the integer index; invalid inputs -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_split_k_alpha(alpha: float | None, m: int | None) -> int | None:
    if alpha is None or m is None:
        return None
    try:
        a = float(alpha)
        mm = int(m)
    except (TypeError, ValueError):
        return None
    if not (0.0 < a < 1.0) or not math.isfinite(a) or mm < 1:
        return None
    k = math.ceil((mm + 1) * (1.0 - a))
    if not isinstance(k, int) and not (isinstance(k, float) and k.is_integer()):
        return None
    ki = int(k)
    if ki < 1 or ki > mm + 1:
        return None
    return ki
