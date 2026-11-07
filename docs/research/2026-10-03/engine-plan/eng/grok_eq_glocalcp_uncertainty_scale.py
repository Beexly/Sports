"""Graph-localized CP uncertainty scale from arXiv:2611.04066.

Printed eq (9):
r_n = max{ gamma_r, sqrt( MI_n / log|Y| ) }, r_n in [gamma_r, 1].
Missing or invalid inputs, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Jinwen Xu et al., Graph-Localized Coverage for Conformal Prediction on Inductive Graphs,
arXiv:2611.04066v1, https://arxiv.org/html/2611.04066v1
Opened 2026-11-06. Picks settled stay 0.
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


def glocalcp_uncertainty_scale(
    mi: Any,
    log_y_size: Any,
    gamma_r: Any = 0.1,
) -> float | None:
    """Apply printed r_n = max(gamma_r, sqrt(MI / log|Y|)). Fail closed on invalid."""
    fmi = _finite(mi)
    flog = _finite(log_y_size)
    fg = _finite(gamma_r)
    if fmi is None or flog is None or fg is None:
        return None
    if fmi < 0.0 or flog <= 0.0 or fg <= 0.0 or fg > 1.0:
        return None
    try:
        ratio = fmi / flog
        if not math.isfinite(ratio) or ratio < 0.0:
            return None
        sq = math.sqrt(ratio)
        if not math.isfinite(sq):
            return None
        res = max(fg, sq)
        if not math.isfinite(res) or res < fg or res > 1.0:
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
