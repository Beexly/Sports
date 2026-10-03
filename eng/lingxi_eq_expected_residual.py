"""Stated residual from the Expected Metrics bible. No free coefficients.

residual = actual - expected
Source: docs/math/GSE_EXPECTED_METRICS.md
(section: residual (actual - expected) per play, before player rollup).
No score. No mint. Never main.
"""
from __future__ import annotations

from typing import Any


def _num(x: Any) -> float | None:
    if x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v


def residual_actual_minus_expected(actual: Any, expected: Any) -> float | None:
    """actual - expected. Null if either input is missing or non-numeric."""
    a = _num(actual)
    e = _num(expected)
    if a is None or e is None:
        return None
    return a - e


FUNCTIONS = {
    "residual_actual_minus_expected": residual_actual_minus_expected,
}