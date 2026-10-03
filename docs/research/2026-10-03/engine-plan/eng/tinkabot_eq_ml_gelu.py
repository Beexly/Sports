"""Stated ML identity: Gaussian Error Linear Unit (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Hendrycks & Gimpel, "Gaussian Error Linear Units (GELUs)", arXiv:1606.08415
  (2016), Eq. 1: GELU(x) = x · Φ(x), where Φ is the standard normal CDF.
  Φ(x) = (1/2)(1 + erf(x/√2)) via the error function (no tanh approximation).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def gelu(x: float | None) -> float | None:
    """GELU(x) = x * Φ(x), Φ(x) = 0.5 * (1 + erf(x / √2)).

    Missing → null.
    """
    if x is None:
        return None
    xx = float(x)
    phi = 0.5 * (1.0 + math.erf(xx / math.sqrt(2.0)))
    return xx * phi


COLUMN_BACKED_FUNCS: Sequence[str] = ("gelu",)
