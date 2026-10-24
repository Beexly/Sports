"""Inference-configuration conformal score as printed in arXiv:2610.28937.

V^{(c)} := A( \pi^{(c)}(X), Y )

Missing inputs or non-callable A -> None. Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

from typing import Callable, Any


def inference_config_score(
    pi: Any | None,
    y: Any | None,
    A: Callable[[Any, Any], float] | None,
) -> float | None:
    """Return A(pi, y) when all inputs are present and A is callable; else None."""
    if pi is None or y is None or A is None or not callable(A):
        return None
    try:
        v = A(pi, y)
        if v is None:
            return None
        fv = float(v)
        if not (fv == fv):  # NaN check
            return None
        return fv
    except (TypeError, ValueError, OverflowError):
        return None
