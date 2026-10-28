"""Guarded announced-break frequency gap from Li arXiv:2610.23917 printed eq for G_M^freq.

G_M^freq := | alpha_bar_M - alpha |, alpha_bar_M = (1/M) sum 1{Y_t notin C_t}

Fail-closed on invalid inputs: missing, non-finite, empty, alpha not in (0,1), non-binary errors.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def announced_break_frequency_gap(errors: list | None, alpha: float | None) -> float | None:
    if errors is None or alpha is None:
        return None
    try:
        if not isinstance(errors, (list, tuple)) or len(errors) == 0:
            return None
        a = float(alpha)
        if not math.isfinite(a) or not (0.0 < a < 1.0):
            return None
        m = len(errors)
        sum_err = 0
        for e in errors:
            if isinstance(e, bool):
                ei = 1 if e else 0
            elif isinstance(e, int) and not isinstance(e, bool):
                ei = e
            else:
                return None
            if ei not in (0, 1):
                return None
            sum_err += ei
        alpha_bar = sum_err / m
        return abs(alpha_bar - a)
    except (TypeError, ValueError, OverflowError):
        return None
