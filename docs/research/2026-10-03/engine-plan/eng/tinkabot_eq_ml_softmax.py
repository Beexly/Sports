"""Stated ML identity: softmax (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Goodfellow, Bengio & Courville, Deep Learning (MIT Press, 2016), §6.2.2.3
  Softmax Units for Multinoulli Output Distributions,
  https://www.deeplearningbook.org/contents/mlp.html
  prints softmax(z)_i = exp(z_i) / Σ_j exp(z_j). Returns a tuple of
  equal length; empty or non-finite → null. Numerically uses max-shift.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def softmax(
    z: Sequence[float] | None,
) -> tuple[float, ...] | None:
    """softmax(z)_i = exp(z_i) / Σ_j exp(z_j).

    Missing → null. Empty → null. Non-finite component → null.
    """
    if z is None:
        return None
    vals = [float(v) for v in z]
    if len(vals) == 0:
        return None
    if any(not math.isfinite(v) for v in vals):
        return None
    m = max(vals)
    exps = [math.exp(v - m) for v in vals]
    s = sum(exps)
    if s == 0.0 or not math.isfinite(s):
        return None
    return tuple(e / s for e in exps)


COLUMN_BACKED_FUNCS: Sequence[str] = ("softmax",)
