"""Weighted BCP e-value as printed in Meghrazi & Li arXiv:2610.16048 Definition 2.

E^{(w)}(y) := W * S(X_{n+1}, y) / (sum_{i=1}^n w_i S_i + w_{n+1} S(X_{n+1}, y)).

Missing inputs, non-finite, non-positive weights/scores where invalid, or math failure -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def weighted_bcp_evalue(
    W: float | None,
    S: float | None,
    sum_cal: float | None,
    w_test: float | None,
) -> float | None:
    if any(x is None for x in (W, S, sum_cal, w_test)):
        return None
    try:
        WW = float(W)
        SS = float(S)
        SC = float(sum_cal)
        WT = float(w_test)
        if not all(math.isfinite(x) for x in (WW, SS, SC, WT)):
            return None
        if WW < 0 or SS < 0 or SC < 0 or WT < 0:
            return None
        denom = SC + WT * SS
        if denom <= 0:
            return None
        res = (WW * SS) / denom
        if not math.isfinite(res) or res < 0:
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError, TypeError):
        return None
