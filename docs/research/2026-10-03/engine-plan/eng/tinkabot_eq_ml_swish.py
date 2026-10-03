"""Stated ML identity: Swish activation (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Ramachandran, Zoph & Le, "Searching for Activation Functions",
  arXiv:1710.05941 (2017), Eq. 1 / §2: f(x) = x · σ(β x) with σ the
  sigmoid. β=1 form used here (also called SiLU): f(x) = x / (1 + exp(−x)).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def swish(x: float | None) -> float | None:
    """f(x) = x · σ(x) = x / (1 + exp(−x)).

    Missing → null. Stable for large |x| via branching.
    """
    if x is None:
        return None
    xx = float(x)
    if xx >= 0.0:
        return xx / (1.0 + math.exp(-xx))
    # for x < 0: x * exp(x) / (1 + exp(x)) avoids overflow in exp(-x)
    ex = math.exp(xx)
    return xx * ex / (1.0 + ex)


COLUMN_BACKED_FUNCS: Sequence[str] = ("swish",)
