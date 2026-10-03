"""Stated ML identity: Adam effective stepsize α_t (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite m̂, v̂, adam_moments, adam_step, AdaMax u/θ, FFN, PE,
Attention, WIP/WIL, or grok_eq_adam.py.

Source:
- Kingma, D. P., & Ba, J., "Adam: A Method for Stochastic Optimization,"
  ICLR 2015 / arXiv:1412.6980.
  https://arxiv.org/pdf/1412.6980
  PDF p.2 (note under Alg.1): α_t = α · √(1 − β₂ᵗ) / (1 − β₁ᵗ)
  (equivalent rewrite of the bias-corrected step).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


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


def adam_effective_stepsize(
    alpha: object,
    beta1: object,
    beta2: object,
    t: object,
) -> float | None:
    """α_t = α · √(1 − β₂ᵗ) / (1 − β₁ᵗ) (Kingma & Ba 2015, PDF p.2).

    Missing → null. Non-finite → null.
    Requires α > 0, 0 ≤ β₁ < 1, 0 ≤ β₂ < 1, t ≥ 1 integer-valued.
    """
    a = _as_finite(alpha)
    b1 = _as_finite(beta1)
    b2 = _as_finite(beta2)
    tf = _as_finite(t)
    if a is None or b1 is None or b2 is None or tf is None:
        return None
    if a <= 0.0:
        return None
    if not (0.0 <= b1 < 1.0 and 0.0 <= b2 < 1.0):
        return None
    if tf < 1.0 or abs(tf - round(tf)) > 1e-12:
        return None
    ti = int(round(tf))
    denom = 1.0 - (b1**ti)
    if denom <= 0.0:
        return None
    numer = math.sqrt(1.0 - (b2**ti))
    return a * numer / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("adam_effective_stepsize",)
