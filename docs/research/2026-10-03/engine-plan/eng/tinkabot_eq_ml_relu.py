"""Stated ML identity: rectified linear unit (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Nair, V. and Hinton, G. E. \"Rectified Linear Units Improve Restricted
  Boltzmann Machines,\" ICML 2010,
  https://www.cs.toronto.edu/~hinton/absps/reluICML.pdf
  printed p. 2: they use hard-sigmoid / rectifier units with activation
  max(0, x) (\"noise-rectified linear units\" / ReLU form).
  This module implements relu(x) = max(0, x) as printed there.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def relu(x: float | None) -> float | None:
    """relu(x) = max(0, x).

    Missing → null.
    """
    if x is None:
        return None
    xx = float(x)
    return xx if xx > 0.0 else 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = ("relu",)
