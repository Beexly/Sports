"""Guarded CopRoute alpha-VOR objective as printed in arXiv:2610.13276 eq (1).

min_C E[|C(X)|] subject to P(C(X) cap G(X) = empty) <= alpha

Returns the empirical mean call count only if the empirical all-miss rate is <= alpha; otherwise None.
Missing, non-numeric, length mismatch, alpha not in (0,1), or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def coproute_vor_objective(
    call_counts: Sequence[float | None] | None,
    all_miss_flags: Sequence[bool | None] | None,
    alpha: float | None,
) -> float | None:
    if call_counts is None or all_miss_flags is None or alpha is None:
        return None
    try:
        if len(call_counts) == 0 or len(call_counts) != len(all_miss_flags):
            return None
        a = float(alpha)
        if not (0.0 < a < 1.0):
            return None
        total_calls = 0.0
        miss_count = 0
        n = 0
        for c, m in zip(call_counts, all_miss_flags):
            if c is None or m is None:
                return None
            cc = float(c)
            if not math.isfinite(cc) or cc < 0.0:
                return None
            if not isinstance(m, bool):
                return None
            total_calls += cc
            if m:
                miss_count += 1
            n += 1
        if n == 0:
            return None
        emp_miss = miss_count / n
        if emp_miss > a:
            return None
        return total_calls / n
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
