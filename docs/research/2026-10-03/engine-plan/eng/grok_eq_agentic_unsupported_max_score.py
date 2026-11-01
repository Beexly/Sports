"""Agentic all-claims-supported nonconformity from Rehman & Yeh arXiv:2610.34872 eq (10).

V = max { r_j : A_j = 0 }, with max of empty = -inf.
Fail-closed on non-finite, non-numeric, or mismatched lengths.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def agentic_unsupported_max_score(
    relevance_scores: Sequence[float] | None,
    support_indicators: Sequence[int] | None,
) -> float | None:
    """Return the largest relevance score among unsupported claims, or -inf if none.

    Inputs must be finite numeric; support indicators must be 0/1 of equal length.
    """
    try:
        if relevance_scores is None or support_indicators is None:
            return None
        if len(relevance_scores) != len(support_indicators):
            return None
        unsupported = []
        for r, a in zip(relevance_scores, support_indicators):
            rr = float(r)
            aa = int(a)
            if not math.isfinite(rr) or aa not in (0, 1):
                return None
            if aa == 0:
                unsupported.append(rr)
        if not unsupported:
            return float("-inf")
        return max(unsupported)
    except (TypeError, ValueError, OverflowError):
        return None
