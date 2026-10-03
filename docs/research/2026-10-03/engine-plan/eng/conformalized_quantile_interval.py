"""Conformalized quantile regression interval from Romano, Patterson, and Candes.

arXiv:1905.03222. Printed page 5, equations (10) and (11):

    C(X) = [q_lo(X) - Q, q_hi(X) + Q]
    Q = (1 - alpha)(1 + 1/|I_2|)-th empirical quantile of the conformity scores

Printed page 18, Appendix A, gives the empirical quantile as the order
statistic Qhat_n(beta) = Z_(ceil(beta * n)). With the inflated level
beta = (1 - alpha)(1 + 1/n) the index is ceil((1 - alpha)(n + 1)).
An index outside 1..n is not a printed order statistic and returns None.
Conformity scores may be negative, as equation (9) states. Empty scores,
a non-finite input, or alpha outside (0, 1) returns None.
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Optional

IDENTITY = "romano_cqr_2019"


def _finite_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def conformity_quantile(
    conformity_scores: Sequence[float] | None, alpha: float
) -> Optional[float]:
    """(1-alpha)(1+1/n)-th empirical quantile. Page 5 eq (11), page 18."""
    if not _finite_number(alpha) or not (0.0 < float(alpha) < 1.0):
        return None
    if conformity_scores is None or len(conformity_scores) == 0:
        return None
    scores: list[float] = []
    for raw in conformity_scores:
        if not _finite_number(raw):
            return None
        scores.append(float(raw))
    n = len(scores)
    index = math.ceil((1.0 - float(alpha)) * (n + 1))
    if index < 1 or index > n:
        return None
    return sorted(scores)[index - 1]


def conformalized_quantile_interval(
    q_lo: float,
    q_hi: float,
    alpha: float,
    conformity_scores: Sequence[float] | None = None,
    correction: float | None = None,
) -> Optional[tuple[float, float]]:
    """Page 5 eq (10): [q_lo - Q, q_hi + Q].

    Pass the calibration conformity scores, or the already computed
    correction Q. Do not pass both.
    """
    if not _finite_number(alpha) or not (0.0 < float(alpha) < 1.0):
        return None
    if not _finite_number(q_lo) or not _finite_number(q_hi):
        return None
    supplied_scores = conformity_scores is not None
    supplied_correction = correction is not None
    if supplied_scores == supplied_correction:
        return None
    if supplied_scores:
        q_hat = conformity_quantile(conformity_scores, alpha)
        if q_hat is None:
            return None
    else:
        if not _finite_number(correction):
            return None
        q_hat = float(correction)
    lower = float(q_lo) - q_hat
    upper = float(q_hi) + q_hat
    if not math.isfinite(lower) or not math.isfinite(upper):
        return None
    return (lower, upper)


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "conformity_quantile",
    "conformalized_quantile_interval",
)
