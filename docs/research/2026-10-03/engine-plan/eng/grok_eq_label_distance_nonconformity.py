"""Label distance nonconformity score as printed in arXiv:2605.24983 eq (10).

s_label(X_i, y_i) = d(f(X_i), y_i)

Here d is absolute difference. Missing or non-finite inputs -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def label_distance_nonconformity(pred: float | None, label: float | None) -> float | None:
    """Absolute distance between prediction and label."""
    if pred is None or label is None:
        return None
    try:
        p = float(pred)
        y = float(label)
        if not (math.isfinite(p) and math.isfinite(y)):
            return None
        return abs(p - y)
    except (ValueError, OverflowError):
        return None
