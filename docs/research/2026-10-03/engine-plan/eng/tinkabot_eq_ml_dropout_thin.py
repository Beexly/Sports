"""Stated ML identity: dropout thinning ỹ=r·y (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite dropout_weight_scale (W_test=pW), residual_*, IoU/LIoU/EIoU,
FFN, PE, Attention, AdaMax, Adam α_t, or grok_eq_adam.

Source:
- Srivastava, N., Hinton, G., Krizhevsky, A., Sutskever, I., & Salakhutdinov, R.,
  "Dropout: A Simple Way to Prevent Neural Networks from Overfitting,"
  JMLR 15 (2014) 1929–1958.
  https://jmlr.org/papers/volume15/srivastava14a/srivastava14a.pdf
  PDF §4 (printed): ỹ^(l) = r^(l) ∗ y^(l) with r_j ~ Bernoulli(p).
  Caller supplies output y and mask sample r (0 or 1, or keep fraction).
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


def dropout_thin(y: object, r: object) -> float | None:
    """ỹ = r · y (Srivastava et al. 2014, §4).

    Missing → null. Non-finite → null.
    Mask r outside [0, 1] → null.
    """
    yv = _as_finite(y)
    rv = _as_finite(r)
    if yv is None or rv is None:
        return None
    if rv < 0.0 or rv > 1.0:
        return None
    return rv * yv


COLUMN_BACKED_FUNCS: Sequence[str] = ("dropout_thin",)
