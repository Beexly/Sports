"""Nonconformity threshold from Shafer and Vovk, JMLR 9 (2008) 371-421.

Printed page 385 (PDF page 15 of the 51-page tutorial). The page does not
name an empirical quantile of a calibration set that excludes the candidate.
It prints the bag p-value and the inclusion rule:

    p_z = (number of i such that 1 <= i <= n and alpha_i >= alpha_n) / n
    Include z in gamma_epsilon if and only if p_z > epsilon.

The quantile below is the largest score in the supplied bag that still
satisfies that inequality when it is alpha_n. The prediction set does not
compare candidates to that quantile. For each candidate it rebuilds the bag
as the supplied scores plus that candidate and applies p_z > epsilon.
Empty scores, epsilon outside (0, 1), or any non-finite score returns None.
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Optional

IDENTITY = "shafer_vovk_2008"


def _finite_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def _as_scores(scores: Sequence[float] | None) -> Optional[list[float]]:
    if scores is None or len(scores) == 0:
        return None
    out: list[float] = []
    for raw in scores:
        if not _finite_number(raw):
            return None
        out.append(float(raw))
    return out


def _count_at_least(scores: Sequence[float], level: float) -> int:
    return sum(1 for score in scores if score >= level)


def _p_exceeds(count: int, n: int, epsilon: float) -> bool:
    """True iff count / n > epsilon, including the printed strict inequality."""
    return (count / n) > epsilon


def empirical_nonconformity_quantile(
    scores: Sequence[float] | None, epsilon: float
) -> Optional[float]:
    """Largest bag score alpha_(k) with p > epsilon on printed page 385.

    For a supplied bag of n scores and a value t in that bag,
    p = |{i : alpha_i >= t}| / n. Return the largest t with p > epsilon.
    With no ties this is the order statistic at 1-based index
    k = n - floor(n * epsilon). An index one step higher includes a score
    whose p-value is not strictly above epsilon.
    """
    if not _finite_number(epsilon) or not (0.0 < float(epsilon) < 1.0):
        return None
    bag = _as_scores(scores)
    if bag is None:
        return None
    n = len(bag)
    kept: Optional[float] = None
    for score in bag:
        count = _count_at_least(bag, score)
        if _p_exceeds(count, n, float(epsilon)):
            if kept is None or score > kept:
                kept = score
    return kept


def prediction_set(
    scores: Sequence[float] | None,
    candidates: Sequence[tuple[object, float]] | None,
    epsilon: float,
) -> Optional[list[object]]:
    """Labels whose provisional bag p-value is strictly above epsilon.

    Printed page 385, not a comparison with a quantile of the old scores
    alone. Provisionally set alpha_n to the candidate score, append it to
    the caller-supplied scores, and include the label iff p_z > epsilon.
    """
    if not _finite_number(epsilon) or not (0.0 < float(epsilon) < 1.0):
        return None
    bag = _as_scores(scores)
    if bag is None or candidates is None:
        return None
    kept: list[object] = []
    for item in candidates:
        if not isinstance(item, tuple) or len(item) != 2:
            return None
        label, raw = item
        if not _finite_number(raw):
            return None
        alpha_n = float(raw)
        enlarged = bag + [alpha_n]
        count = _count_at_least(enlarged, alpha_n)
        if _p_exceeds(count, len(enlarged), float(epsilon)):
            kept.append(label)
    return kept


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "empirical_nonconformity_quantile",
    "prediction_set",
)
