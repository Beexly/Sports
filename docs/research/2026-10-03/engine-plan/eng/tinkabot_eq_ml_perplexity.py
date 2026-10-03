"""Perplexity PP = exp(−(1/N) Σ_i log p_i) (Jelinek / language-model form).

Printed as the exponential of average negative log-likelihood of token
probabilities (standard LM evaluation; cf. Jelinek 1997 / Brown et al.).
One scalar over a sequence of probabilities in (0,1]. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("perplexity",)


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def perplexity(probs: object) -> float | None:
    """PP = exp(−(1/N) Σ log p_i) for N = len(probs).

    probs: non-empty sequence of finite values in (0, 1].
    Missing / empty / non-positive / >1 → null.
    """
    if not isinstance(probs, (list, tuple)) or len(probs) == 0:
        return None
    total = 0.0
    n = 0
    for item in probs:
        p = _as_finite(item)
        if p is None:
            return None
        if p <= 0.0 or p > 1.0:
            return None
        total += math.log(p)
        n += 1
    if n == 0:
        return None
    out = math.exp(-total / n)
    if not math.isfinite(out):
        return None
    return out
