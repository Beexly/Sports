"""Printed CutMix box width (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not mixup x̃=λx_i+(1−λ)x_j, not Focal-EIoU/EIoU, not AdaGrad,
not Adam/AdaMax, not dropout/label_smoothing.

Yun, S., Han, D., Oh, S. J., Chun, S., Choe, J., & Yoo, Y.,
"CutMix: Regularization Strategy to Train Strong Classifiers with
Localizable Features," ICCV 2019 / arXiv:1905.04899,
§3.1 Algorithm, PDF page 3, Eq. (2):

    r_w = W √(1 − λ)

(with r_h = H √(1 − λ) likewise). Caller supplies image width W > 0
and combination ratio λ ∈ [0, 1].
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


def cutmix_box_width(image_width: object, lam: object) -> float | None:
    """r_w = W √(1 − λ) (Yun et al. ICCV 2019 Eq. 2, PDF page 3).

    Missing / non-finite → null. W ≤ 0 → null. λ outside [0, 1] → null.
    """
    w = _as_finite(image_width)
    lam = _as_finite(lam)
    if w is None or lam is None:
        return None
    if w <= 0.0:
        return None
    if lam < 0.0 or lam > 1.0:
        return None
    out = w * math.sqrt(1.0 - lam)
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("cutmix_box_width",)
