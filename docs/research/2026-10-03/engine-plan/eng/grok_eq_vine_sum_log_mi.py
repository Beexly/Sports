"""VINE sum-log MI from arXiv:2611.07693.

Printed eq (SumLogMI):
I(X;Y) = E_f [ sum_{e in E_XY} log c_{j_e,k_e;D_e}(F_{j_e|D_e}(Z_{j_e}|Z_{D_e}), F_{k_e|D_e}(Z_{k_e}|Z_{D_e})) ]
Fail-closed numerical guard on finite log-copula contributions. Missing or invalid inputs, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Sigurd Holmsen et al., Non-Parametric Mutual Information Estimation with Vine Copulas,
arXiv:2611.07693v1, https://arxiv.org/html/2611.07693v1
Opened 2026-11-07. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def vine_sum_log_mi(
    log_pair_copulas: Any = None,
) -> float | None:
    """Sum of finite log pair-copula contributions from printed SumLogMI. Fail closed."""
    if not isinstance(log_pair_copulas, (list, tuple)):
        return None
    if len(log_pair_copulas) == 0:
        return None
    try:
        total = 0.0
        for item in log_pair_copulas:
            val = _finite(item)
            if val is None:
                return None
            total += val
        if not math.isfinite(total):
            return None
        return float(total)
    except (ValueError, OverflowError, ZeroDivisionError, TypeError):
        return None
