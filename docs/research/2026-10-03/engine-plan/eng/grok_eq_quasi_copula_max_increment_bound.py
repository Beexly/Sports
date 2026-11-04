"""Quasi-copula max increment bound as printed in Ansari arXiv:2610.30642 eq (2).

G(t) - G(s) <= sum_{i=1}^d (F_i(t) - F_i(s)) for all s < t.
The RHS is the printed upper bound on the increment of the maximum distribution.
Missing inputs, non-numeric, length mismatch, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def quasi_copula_max_increment_bound(
    f_s: list[float] | None,
    f_t: list[float] | None,
) -> float | None:
    if f_s is None or f_t is None:
        return None
    if not isinstance(f_s, list) or not isinstance(f_t, list):
        return None
    if len(f_s) != len(f_t) or len(f_s) == 0:
        return None
    try:
        total = 0.0
        for a, b in zip(f_s, f_t):
            if a is None or b is None:
                return None
            total += float(b) - float(a)
        return total
    except (TypeError, ValueError):
        return None
