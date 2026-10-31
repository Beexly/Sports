"""Couplings with prescribed maxima inequality as printed in Ansari arXiv:2610.30642 eq (2).

G(t) - G(s) ≤ ∑_i (F_i(t) - F_i(s)) for all s < t.
Returns the slack ∑ΔF - ΔG, or None on invalid inputs.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def couplings_prescribed_maxima_slack(
    delta_g: float | None,
    delta_fs: Sequence[float] | None,
) -> float | None:
    """Return ∑ΔF_i - ΔG. None if missing, negative deltas, non-finite, or empty."""
    if delta_g is None or delta_fs is None:
        return None
    try:
        dg = float(delta_g)
        if not math.isfinite(dg) or dg < 0.0:
            return None
        if len(delta_fs) == 0:
            return None
        total = 0.0
        for df in delta_fs:
            if df is None:
                return None
            d = float(df)
            if not math.isfinite(d) or d < 0.0:
                return None
            total += d
        slack = total - dg
        if not math.isfinite(slack):
            return None
        return slack
    except (TypeError, ValueError, OverflowError):
        return None
