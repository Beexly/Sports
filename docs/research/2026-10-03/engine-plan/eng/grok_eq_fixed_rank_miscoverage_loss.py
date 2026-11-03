"""Fixed-rank empirical miscoverage loss from Byun et al. arXiv:2610.31163 eq (3).

Printed: Li(λ) := (1/Ti) sum_{u in Ii} I( Z̃_iu ∉ [b_iu^-(λ), b_iu^+(λ)] )
Fail-closed on empty/invalid inputs, non-finite values, or None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def fixed_rank_miscoverage_loss(
    observations: Sequence[float] | None,
    lower: Sequence[float] | None,
    upper: Sequence[float] | None,
) -> float | None:
    """Return average indicator of observations outside [lower, upper]; None if invalid."""
    try:
        if observations is None or lower is None or upper is None:
            return None
        n = len(observations)
        if n == 0 or len(lower) != n or len(upper) != n:
            return None
        outside = 0
        for z, lo, hi in zip(observations, lower, upper):
            zf = float(z)
            lof = float(lo)
            hif = float(hi)
            if not (math.isfinite(zf) and math.isfinite(lof) and math.isfinite(hif)):
                return None
            if lof > hif:
                return None
            if zf < lof or zf > hif:
                outside += 1
        return outside / float(n)
    except (TypeError, ValueError, OverflowError):
        return None
