"""Distribution-to-distribution weighted coefficient nonconformity from arXiv:2611.06320.

Printed score after the definition in Section 4:
s = g( W^{1/2} (theta(f(X)) - theta(y)) ) with g = ||.||_2 and W diagonal.
Missing or invalid vectors/weights, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Trung-Khang Tran et al., Conformal Prediction for Distribution-to-Distribution Regression,
arXiv:2611.06320v1, https://arxiv.org/html/2611.06320v1
Opened 2026-11-06. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any, Sequence


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def d2d_weighted_coeff_score(
    theta_pred: Sequence[Any],
    theta_obs: Sequence[Any],
    weights: Sequence[Any] | None = None,
) -> float | None:
    """Apply printed s = || W^{1/2} (theta_pred - theta_obs) ||_2. Fail closed on invalid."""
    if not isinstance(theta_pred, (list, tuple)) or not isinstance(theta_obs, (list, tuple)):
        return None
    if len(theta_pred) != len(theta_obs) or len(theta_pred) == 0:
        return None
    w = weights
    if w is None:
        w = [1.0] * len(theta_pred)
    if not isinstance(w, (list, tuple)) or len(w) != len(theta_pred):
        return None
    acc = 0.0
    try:
        for a, b, ww in zip(theta_pred, theta_obs, w):
            fa = _finite(a)
            fb = _finite(b)
            fw = _finite(ww)
            if fa is None or fb is None or fw is None or fw < 0.0:
                return None
            diff = fa - fb
            acc += fw * diff * diff
        if acc < 0.0 or not math.isfinite(acc):
            return None
        res = math.sqrt(acc)
        if not math.isfinite(res) or res < 0.0:
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
