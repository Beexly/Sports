"""Printed token negative log-likelihood from arxiv-deep note 1605.

One function. No I/O. Does not score or mint.

Note:
docs/arxiv-program/research/2026-09-21/arxiv-deep/1605-timesoccer-end-to-end-multimodal-llm-soccer-commentary.md
Paper:
You, L., Huang, W., Xie, X., Wei, X., Li, B., Lin, S., Li, Y., and Wang, C.
(2025). TimeSoccer: An End-to-End Multimodal Large Language Model for
Soccer Commentary Generation. arXiv:2504.17365.
Token NLL: L = -sum_i log P_i, where P_i is the probability of the
observed token. Natural log. No length average and no extra constant.
Any P_i <= 0 returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def token_nll(probs: Sequence[float] | None) -> float | None:
    """L = -sum_i log(P_i)."""
    if probs is None or len(probs) == 0:
        return None
    total = 0.0
    for raw in probs:
        if raw is None:
            return None
        p = float(raw)
        if not math.isfinite(p) or p <= 0.0:
            return None
        total += math.log(p)
    return -total


COLUMN_BACKED_FUNCS: Sequence[str] = ("token_nll",)