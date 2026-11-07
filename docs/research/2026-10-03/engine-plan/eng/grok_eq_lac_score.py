"""Least ambiguous classification (LAC) score as printed in Bi et al., arXiv:2611.05812.

Score for a label is one minus its predicted probability: 1 - p_k.
Missing, out-of-range, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def lac_score(p_k: float | None) -> float | None:
    if p_k is None:
        return None
    try:
        p = float(p_k)
    except (TypeError, ValueError):
        return None
    if not (0.0 <= p <= 1.0):
        return None
    try:
        return 1.0 - p
    except (OverflowError, ValueError):
        return None
