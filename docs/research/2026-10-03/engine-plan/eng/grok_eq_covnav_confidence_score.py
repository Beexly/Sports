"""CovNav confidence score from arXiv:2610.27677 printed eq.

c = exp(z_Yes / T) / (exp(z_Yes / T) + exp(z_No / T))

Missing, non-finite, non-positive T, or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def covnav_confidence_score(
    z_yes: float | None,
    z_no: float | None,
    temperature: float | None,
) -> float | None:
    if z_yes is None or z_no is None or temperature is None:
        return None
    try:
        zy = float(z_yes)
        zn = float(z_no)
        t = float(temperature)
        if not math.isfinite(zy) or not math.isfinite(zn) or not math.isfinite(t) or t <= 0.0:
            return None
        exp_yes = math.exp(zy / t)
        exp_no = math.exp(zn / t)
        denom = exp_yes + exp_no
        if denom <= 0.0 or not math.isfinite(denom):
            return None
        c = exp_yes / denom
        if not math.isfinite(c) or not (0.0 <= c <= 1.0):
            return None
        return float(c)
    except (TypeError, ValueError, OverflowError):
        return None
