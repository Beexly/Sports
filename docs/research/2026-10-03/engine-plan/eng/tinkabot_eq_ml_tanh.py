"""Stated ML identity: hyperbolic tangent (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Goodfellow, I., Bengio, Y., and Courville, A. Deep Learning, MIT Press,
  2016, https://www.deeplearningbook.org/contents/mlp.html
  (HTML chapter \"Deep Feedforward Networks\"): prints
  tanh(x) = 2σ(2x) − 1 and the equivalent
  tanh(x) = (exp(x) − exp(−x)) / (exp(x) + exp(−x)).
  This module implements the latter printed form (via math.tanh).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def tanh(x: float | None) -> float | None:
    """tanh(x) = (exp(x) - exp(-x)) / (exp(x) + exp(-x)).

    Missing → null.
    """
    if x is None:
        return None
    return math.tanh(float(x))


COLUMN_BACKED_FUNCS: Sequence[str] = ("tanh",)
