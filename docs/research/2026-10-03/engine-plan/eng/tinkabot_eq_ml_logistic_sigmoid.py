"""Stated ML identity: logistic sigmoid (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Bishop, C. M. Pattern Recognition and Machine Learning, Springer, 2006,
  https://www.microsoft.com/en-us/research/uploads/prod/2006/01/Bishop-Pattern-Recognition-and-Machine-Learning-2006.pdf
  printed p. 114, Equation (4.59): σ(a) = 1 / (1 + exp(−a)).
  This module implements that printed form.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def logistic_sigmoid(a: float | None) -> float | None:
    """σ(a) = 1 / (1 + exp(-a)).

    Missing → null. Stable for large |a|.
    """
    if a is None:
        return None
    aa = float(a)
    if aa >= 0.0:
        return 1.0 / (1.0 + math.exp(-aa))
    ea = math.exp(aa)
    return ea / (1.0 + ea)


COLUMN_BACKED_FUNCS: Sequence[str] = ("logistic_sigmoid",)
