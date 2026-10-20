"""Guarded fleet-level aggregation sum from Moradi et al. arXiv:2602.02583 eq (12).

\tilde{x}^{(s)}_{0,t} = \sum_{i=1}^{N} \tilde{x}^{(s)}_{i,t}

Missing, non-numeric, or empty inputs fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def cocopula_aggregation_sum(samples: list[float] | None) -> float | None:
    if samples is None or not isinstance(samples, list) or len(samples) == 0:
        return None
    try:
        total = 0.0
        for s in samples:
            if s is None or not isinstance(s, (int, float)):
                return None
            total += float(s)
        return total
    except (TypeError, ValueError, OverflowError):
        return None
