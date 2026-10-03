"""Printed softmin (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not softmax, not silhouette, not Spearman, not TV, not batch-norm.
Does not edit grok_eq_adam.

Softmin is the softmax of negated logits (standard dual of the
softmax units in Goodfellow, Bengio & Courville, Deep Learning
(MIT Press, 2016), §6.2.2.3 Softmax Units for Multinoulli Output
Distributions, https://www.deeplearningbook.org/contents/mlp.html):

    softmin(z)_i = exp(−z_i) / Σ_j exp(−z_j)

which equals softmax(−z)_i. Returns a tuple of equal length.
Empty or non-finite → null. Numerically uses min-shift
(equiv. max-shift on −z).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def softmin(
    z: object,
) -> tuple[float, ...] | None:
    """softmin(z)_i = exp(−z_i) / Σ_j exp(−z_j) (softmax of −z).

    Missing / empty / non-finite component → null.
    """
    if z is None or not isinstance(z, (list, tuple)):
        return None
    vals: list[float] = []
    for v in z:
        if v is None or isinstance(v, (str, bytes, bool)):
            return None
        try:
            number = float(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None
        if not math.isfinite(number):
            return None
        vals.append(number)
    if len(vals) == 0:
        return None
    # max-shift on −z ≡ subtract min of z
    m = min(vals)
    exps = [math.exp(-(v - m)) for v in vals]
    s = sum(exps)
    if s == 0.0 or not math.isfinite(s):
        return None
    out = tuple(e / s for e in exps)
    if any(not math.isfinite(x) for x in out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("softmin",)