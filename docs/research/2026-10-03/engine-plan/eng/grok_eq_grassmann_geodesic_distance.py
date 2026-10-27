"""Guarded Grassmann geodesic distance from Loukrezis et al. arXiv:2610.23508 eq (8a).

d_geo = ||theta||_2 = sqrt(sum theta_i^2)
where theta_i = arccos(sigma_i) are principal angles from singular values sigma of Y1^T Y2.
Fail-closed on invalid inputs: missing, non-finite, sigma outside [0,1], empty.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def grassmann_geodesic_distance(singular_values: list | None) -> float | None:
    if singular_values is None:
        return None
    try:
        if not isinstance(singular_values, (list, tuple)) or len(singular_values) == 0:
            return None
        thetas = []
        for s in singular_values:
            sf = float(s)
            if not math.isfinite(sf) or not (0.0 <= sf <= 1.0):
                return None
            thetas.append(math.acos(sf))
        return math.sqrt(sum(t * t for t in thetas))
    except (TypeError, ValueError, OverflowError):
        return None
