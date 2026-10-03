"""Stated ML identity: dropout test-time weight scale (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite residual_add/projection, IoU/LIoU, FFN, PE, Attention,
AdaMax, Adam α_t, or grok_eq_adam.

Source:
- Srivastava, N., Hinton, G., Krizhevsky, A., Sutskever, I., & Salakhutdinov, R.,
  "Dropout: A Simple Way to Prevent Neural Networks from Overfitting,"
  JMLR 15 (2014) 1929–1958.
  https://jmlr.org/papers/volume15/srivastava14a/srivastava14a.pdf
  PDF §4 (printed): at test time, W_test = p W^(l)
  (scale trained weights by keep probability p).
  Caller supplies weight W and keep probability p.
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


def dropout_weight_scale(weight: object, keep_prob: object) -> float | None:
    """W_test = p · W (Srivastava et al. 2014, §4).

    Missing → null. Non-finite → null.
    keep_prob p outside [0, 1] → null.
    """
    w = _as_finite(weight)
    p = _as_finite(keep_prob)
    if w is None or p is None:
        return None
    if p < 0.0 or p > 1.0:
        return None
    return p * w


COLUMN_BACKED_FUNCS: Sequence[str] = ("dropout_weight_scale",)
