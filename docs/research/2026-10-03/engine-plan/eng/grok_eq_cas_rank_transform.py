"""Componentwise rank transform (Gaussianize) as printed in arXiv:2609.36142 eq (2).

Z(x)_i := Phi^{-1}( F_i(x_i) )

Missing inputs, F not in (0,1), or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
try:
    from scipy.stats import norm
    _ppf = norm.ppf
except ImportError:
    _ppf = None


def cas_rank_transform(x: float | None, F: float | None) -> float | None:
    """Apply Phi^{-1} to the marginal CDF value F of observation x.
    
    x is unused for the transform itself (kept for signature clarity matching the printed form).
    """
    if x is None or F is None or _ppf is None:
        return None
    try:
        f = float(F)
        if not (0.0 < f < 1.0):
            return None
        z = _ppf(f)
        if not math.isfinite(z):
            return None
        return z
    except (ValueError, OverflowError):
        return None
