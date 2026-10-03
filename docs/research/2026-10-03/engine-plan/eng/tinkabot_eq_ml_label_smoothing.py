"""Stated ML identity: label-smoothing soft target (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite dropout_*, residual_*, IoU/LIoU/EIoU, FFN, PE, Attention,
AdaMax, Adam α_t, or grok_eq_adam.

Source:
- Szegedy, C., Vanhoucke, V., Ioffe, S., Shlens, J., & Wojna, Z.,
  "Rethinking the Inception Architecture for Computer Vision,"
  IEEE/CVF CVPR 2016 / arXiv:1512.00567.
  https://arxiv.org/pdf/1512.00567
  PDF §7 (printed): q′(k) = (1 − ε) δ_{k,y} + ε/K
  (uniform prior u(k)=1/K).
  Caller supplies δ∈[0,1], smoothing ε, and class count K.
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


def label_smoothing(
    delta: object,
    epsilon: object,
    num_classes: object,
) -> float | None:
    """q′ = (1 − ε)·δ + ε/K (Szegedy et al. 2016, §7).

    Missing → null. Non-finite → null.
    δ outside [0, 1], ε outside [0, 1], or K < 1 (non-integer) → null.
    """
    d = _as_finite(delta)
    eps = _as_finite(epsilon)
    k = _as_finite(num_classes)
    if d is None or eps is None or k is None:
        return None
    if d < 0.0 or d > 1.0:
        return None
    if eps < 0.0 or eps > 1.0:
        return None
    if k < 1.0 or abs(k - round(k)) > 1e-12:
        return None
    kk = float(round(k))
    return (1.0 - eps) * d + eps / kk


COLUMN_BACKED_FUNCS: Sequence[str] = ("label_smoothing",)
