"""Stated next-score expectation. No free coefficients.

EP(state) = sum_k P(next-score = k) * value(k)
Source: docs/math/GSE_EXPECTED_POINTS.md (Expected Points gse-ep-v1 Math).
Probabilities and outcome values are caller-supplied; none are hard-coded.
No score. No mint. Never main. Does not edit equations.py or gse_eq_corpus.py.
"""
from __future__ import annotations

from collections.abc import Sequence
from typing import Any

IDENTITY = "lingxi"


def _num(x: Any) -> float | None:
    if x is None:
        return None
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def next_score_expectation(
    probs: Sequence[Any] | None, values: Sequence[Any] | None
) -> float | None:
    """EP = sum_k P(k) * value(k). Null on missing, length mismatch, or bad entry."""
    if probs is None or values is None:
        return None
    if len(probs) != len(values):
        return None
    if len(probs) == 0:
        return None
    total = 0.0
    for p_raw, v_raw in zip(probs, values):
        p = _num(p_raw)
        v = _num(v_raw)
        if p is None or v is None:
            return None
        total += p * v
    return total


COLUMN_BACKED_FUNCS: Sequence[str] = ("next_score_expectation",)