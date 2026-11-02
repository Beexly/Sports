"""Smoothed conformal p-value from Johnstone and Nettleton, arXiv:2208.08598.

Printed equation (11):

    π(y_c, τ) = 1/(n+1) * sum_{i=1}^{n+1} [ I{R_i(y_c) < R_{n+1}(y_c)} + τ I{R_i = R_{n+1}} ]

Guarded: returns None on empty scores, non-finite inputs, τ not in [0,1], or n=0.
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Optional

IDENTITY = "johnstone_nettleton_2022_conformal_win_p"


def _finite_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def conformal_win_p_value(
    calibration_scores: Sequence[float] | None,
    candidate_score: float,
    tau: float = 0.5,
) -> Optional[float]:
    """Smoothed conformal p-value π(y_c, τ) as printed in equation (11).

    The bag is the calibration scores plus the candidate as R_{n+1}.
    """
    if not _finite_number(candidate_score) or not _finite_number(tau):
        return None
    tau_f = float(tau)
    if not (0.0 <= tau_f <= 1.0):
        return None
    if calibration_scores is None or len(calibration_scores) == 0:
        return None
    bag: list[float] = []
    for raw in calibration_scores:
        if not _finite_number(raw):
            return None
        bag.append(float(raw))
    r_n1 = float(candidate_score)
    n = len(bag)
    count = 0.0
    for r in bag:
        if r < r_n1:
            count += 1.0
        elif r == r_n1:
            count += tau_f
    # Include the candidate itself in the sum (i = n+1)
    count += tau_f  # equal to itself
    return count / (n + 1)


COLUMN_BACKED_FUNCS: Sequence[str] = ("conformal_win_p_value",)
