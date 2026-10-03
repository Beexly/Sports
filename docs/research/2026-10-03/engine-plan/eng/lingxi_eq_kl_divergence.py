"""Printed non-sports identity: Kullback-Leibler divergence (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Source (printed in-repo):
docs/research/2026-10-03/engine-plan/GROK_BOT_NEXT.md
  "kl_divergence: KL(q||p) = sum q log(q/p). Kullback and Leibler 1951.
   Skip q=0. p below caller eps returns null."

Citation named there: Kullback, S. and Leibler, R. A. (1951),
"On Information and Sufficiency," Annals of Mathematical Statistics 22(1): 79-86.
Natural log only (nats). No extra constant. eps is caller-supplied.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def kl_divergence(
    q: Sequence[float] | None,
    p: Sequence[float] | None,
    eps: float | None,
) -> float | None:
    """KL(q||p) = sum_i q_i * log(q_i / p_i).

    q_i == 0 is skipped (0 log 0 convention).
    Any used p_i < caller eps, or any non-finite / negative mass, returns null.
    """
    if q is None or p is None or eps is None:
        return None
    ee = float(eps)
    if not math.isfinite(ee) or ee <= 0.0:
        return None
    if len(q) != len(p) or len(q) == 0:
        return None
    total = 0.0
    for q_raw, p_raw in zip(q, p):
        if q_raw is None or p_raw is None:
            return None
        qq = float(q_raw)
        pp = float(p_raw)
        if not math.isfinite(qq) or not math.isfinite(pp):
            return None
        if qq < 0.0 or pp < 0.0:
            return None
        if qq == 0.0:
            continue
        if pp < ee:
            return None
        total += qq * math.log(qq / pp)
    return total


COLUMN_BACKED_FUNCS: Sequence[str] = ("kl_divergence",)