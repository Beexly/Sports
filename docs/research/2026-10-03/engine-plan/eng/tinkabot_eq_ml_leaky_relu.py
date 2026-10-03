"""Stated ML identity: Leaky ReLU (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Maas, Hannun & Ng, "Rectifier Nonlinearities Improve Neural Network
  Acoustic Models", ICML 2013 Workshop on Deep Learning for Audio, Speech
  and Language Processing. Printed form:
  f(x) = x if x > 0 else α x, with α, x caller-supplied (α≥0).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def leaky_relu(
    x: float | None,
    alpha: float | None,
) -> float | None:
    """f(x) = x if x > 0 else α x.

    Missing → null. Negative alpha → null.
    """
    if x is None or alpha is None:
        return None
    xx = float(x)
    aa = float(alpha)
    if aa < 0.0:
        return None
    if xx > 0.0:
        return xx
    return aa * xx


COLUMN_BACKED_FUNCS: Sequence[str] = ("leaky_relu",)
