"""Stated ML identity: Mish activation (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Misra, "Mish: A Self Regularized Non-Monotonic Activation Function",
  arXiv:1908.08681 (2019), Eq. 1: f(x) = x · tanh(softplus(x)) with
  softplus(x) = ln(1 + exp(x)).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def mish(x: float | None) -> float | None:
    """f(x) = x · tanh(softplus(x)), softplus(x) = ln(1 + exp(x)).

    Missing → null. Softplus uses a stable branch for large |x|.
    """
    if x is None:
        return None
    xx = float(x)
    if xx >= 0.0:
        softplus = xx + math.log1p(math.exp(-xx))
    else:
        softplus = math.log1p(math.exp(xx))
    return xx * math.tanh(softplus)


COLUMN_BACKED_FUNCS: Sequence[str] = ("mish",)
