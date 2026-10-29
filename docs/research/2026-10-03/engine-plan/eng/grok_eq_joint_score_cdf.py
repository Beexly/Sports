"""Guarded joint score CDF indicator from Park et al. arXiv:2411.02114 printed equation F(s) = P[S_1 <= s_1, ..., S_d <= s_d].

Returns 1.0 if every score is <= its threshold, else 0.0.
Fail-closed on missing, non-finite, or mismatched lengths.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def joint_score_cdf_indicator(
    scores: Sequence[float | None] | None,
    thresholds: Sequence[float | None] | None,
) -> float | None:
    if scores is None or thresholds is None:
        return None
    try:
        if len(scores) != len(thresholds) or len(scores) == 0:
            return None
        for s, t in zip(scores, thresholds):
            if s is None or t is None:
                return None
            sf = float(s)
            tf = float(t)
            if not (math.isfinite(sf) and math.isfinite(tf)):
                return None
            if sf > tf:
                return 0.0
        return 1.0
    except (TypeError, ValueError, OverflowError):
        return None
