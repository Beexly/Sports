"""Stated ML identity: classical momentum velocity (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite Adagrad/Adam/AdaMax, dropout_*, label_smoothing, residual_*,
IoU family, mixup, or grok_eq_adam.

Source:
- Sutskever, I., Martens, J., Dahl, G., & Hinton, G., "On the importance of
  initialization and momentum in deep learning," Proceedings of the 30th
  International Conference on Machine Learning (ICML 2013), JMLR W&CP 28.
  https://www.cs.toronto.edu/~hinton/absps/momentum.pdf
  PDF §2 printed classical / “standard momentum” updates:
  v_t = μ_{t−1} v_{t−1} − ε_{t−1} ∇f(θ_{t−1}),
  θ_t = θ_{t−1} + v_t.
  This module states the velocity line (scalars).
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


def momentum_velocity(
    v_prev: object,
    mu: object,
    epsilon: object,
    g: object,
) -> float | None:
    """v' = μ·v − ε·g (Sutskever et al. ICML 2013, standard momentum).

    Missing → null. Non-finite → null.
    μ outside [0, 1] or ε ≤ 0 → null.
    """
    v = _as_finite(v_prev)
    m = _as_finite(mu)
    eps = _as_finite(epsilon)
    gv = _as_finite(g)
    if v is None or m is None or eps is None or gv is None:
        return None
    if m < 0.0 or m > 1.0:
        return None
    if eps <= 0.0:
        return None
    return m * v - eps * gv


COLUMN_BACKED_FUNCS: Sequence[str] = ("momentum_velocity",)
