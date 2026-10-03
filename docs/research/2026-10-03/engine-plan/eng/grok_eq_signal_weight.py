"""Weighted sum of already-computed equation outputs. No score. No mint. Never main.

w = sum_i weight_i * value_i, only when every value is finite and weights sum to 1.
A missing value returns None. This does not settle a pick and does not write Neon.
"""
from __future__ import annotations

import math
from typing import Any


def weighted_signal(values: Any, weights: Any) -> float | None:
    if not isinstance(values, (list, tuple)) or not isinstance(weights, (list, tuple)):
        return None
    if len(values) == 0 or len(values) != len(weights):
        return None
    total_w = 0.0
    acc = 0.0
    for value, weight in zip(values, weights):
        try:
            v = float(value)
            w = float(weight)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(v) or not math.isfinite(w) or w < 0.0:
            return None
        total_w += w
        acc += w * v
    if not math.isfinite(total_w) or abs(total_w - 1.0) > 1e-9:
        return None
    return acc


FUNCTIONS = {"weighted_signal": weighted_signal}
