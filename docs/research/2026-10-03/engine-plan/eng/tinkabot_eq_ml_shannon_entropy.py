"""Stated information-theory identity: Shannon entropy (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD deletes.

Source:
- Shannon, C. E. \"A Mathematical Theory of Communication,\" Bell System
  Technical Journal, 1948. Printed p. 11 form H = −K Σ p_i log p_i
  (https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf).
  K is a positive constant supplied by the caller (choice of units / log base);
  not hard-coded here. Natural log is used so K absorbs the base conversion.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def shannon_entropy(probs: Sequence[float] | None, k: float | None) -> float | None:
    """H = -K * sum(p_i * log(p_i)).

    Missing or non-positive K → null.
    Any p outside (0, 1] → null (whole result).
    p_i == 0 is skipped (continuous extension of p log p → 0).
    """
    if probs is None or k is None:
        return None
    kk = float(k)
    if kk <= 0.0:
        return None
    total = 0.0
    for raw in probs:
        if raw is None:
            return None
        p = float(raw)
        if p == 0.0:
            continue
        if p < 0.0 or p > 1.0:
            return None
        total += p * math.log(p)
    return -kk * total


COLUMN_BACKED_FUNCS: Sequence[str] = ("shannon_entropy",)
