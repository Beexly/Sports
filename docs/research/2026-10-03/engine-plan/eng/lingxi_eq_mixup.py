"""Printed mixup convex combination (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Focal-EIoU, not L_EIoU, not label_smoothing, not dropout
(W_test=p·W / ỹ=r·y), not Adagrad, not Attention/Adam/AdaMax.

Zhang, H., Cisse, M., Dauphin, Y. N., & Lopez-Paz, D.,
"mixup: Beyond Empirical Risk Minimization," ICLR 2018 /
arXiv:1710.09412, §1 Contribution / §2, PDF page 2:

    x̃ = λ x_i + (1 − λ) x_j

(and likewise for labels ỹ). λ ∈ [0, 1]. Caller supplies two scalar
values and λ; applies elementwise outside for vectors.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


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


def mixup(x_i: object, x_j: object, lam: object) -> float | None:
    """x̃ = λ x_i + (1 − λ) x_j (Zhang et al. ICLR 2018, PDF page 2).

    Missing / non-finite → null. λ outside [0, 1] → null.
    """
    a = _as_finite(x_i)
    b = _as_finite(x_j)
    w = _as_finite(lam)
    if a is None or b is None or w is None:
        return None
    if w < 0.0 or w > 1.0:
        return None
    out = w * a + (1.0 - w) * b
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("mixup",)
