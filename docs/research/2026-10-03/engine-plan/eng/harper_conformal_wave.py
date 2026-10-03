"""Conformal methods wired from printed pages. Not a pick. Does not write mind.jsonl.

Gamma_0.05 in Shafer and Vovk, JMLR 2008, journal page 372, is the region symbol.
The executable quantile rule is printed in Angelopoulos and Bates, arXiv:2107.07511v6:
  qhat = Quantile(s_1..s_n; ceil((n+1)(1-alpha))/n), method higher.
  Set: C(x) = {y : s(x,y) <= qhat}. Equation (2), PDF page 7.
Residual interval is Romano, Patterson, Candes, arXiv:1905.03222 equation (8), PDF page 4:
  C = [mu - Q, mu + Q], Q the (1-alpha)(1+1/n)-th empirical quantile of absolute residuals.
CQR interval is Angelopoulos equation (4), PDF page 8, matching Romano Algorithm 1, PDF page 6:
  C = [q_lo - qhat, q_hi + qhat].
Empty scores, alpha outside (0,1), non-finite scores, or a level above 1 return None.
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Optional


def _finite(x: object) -> bool:
    return (
        isinstance(x, (int, float))
        and not isinstance(x, bool)
        and math.isfinite(float(x))
    )


def split_conformal_quantile(scores: Sequence[float], alpha: float) -> Optional[float]:
    """Higher quantile at ceil((n+1)(1-alpha))/n. Level above 1 returns None."""
    if not _finite(alpha) or not (0.0 < float(alpha) < 1.0):
        return None
    if not scores:
        return None
    vals: list[float] = []
    for s in scores:
        if not _finite(s):
            return None
        vals.append(float(s))
    n = len(vals)
    level = math.ceil((n + 1) * (1.0 - float(alpha))) / n
    if level > 1.0:
        return None
    rank = math.ceil(level * n)
    rank = min(max(rank, 1), n)
    return sorted(vals)[rank - 1]


def split_conformal_interval(mu: float, qhat: float) -> Optional[tuple[float, float]]:
    """Romano eq (8): [mu - Q, mu + Q]. Negative threshold returns None."""
    if not _finite(mu) or not _finite(qhat) or float(qhat) < 0.0:
        return None
    return (float(mu) - float(qhat), float(mu) + float(qhat))


def cqr_interval(q_lo: float, q_hi: float, qhat: float) -> Optional[tuple[float, float]]:
    """Angelopoulos eq (4) / Romano Algorithm 1: [q_lo - qhat, q_hi + qhat]."""
    if not _finite(q_lo) or not _finite(q_hi) or not _finite(qhat):
        return None
    if float(q_hi) < float(q_lo):
        return None
    return (float(q_lo) - float(qhat), float(q_hi) + float(qhat))


def in_conformal_set(score: float, qhat: float) -> Optional[bool]:
    """Equation (2) membership: s(x, y) <= qhat."""
    if not _finite(score) or not _finite(qhat):
        return None
    return float(score) <= float(qhat)
