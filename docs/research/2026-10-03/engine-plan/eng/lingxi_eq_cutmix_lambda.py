"""Printed CutMix combination ratio from crop box (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not r_w=W√(1−λ), not mixup x̃=λx_i+(1−λ)x_j, not AdaGrad,
not momentum_velocity, not Adam/AdaMax.

Yun, S., Han, D., Oh, S. J., Chun, S., Choe, J., & Yoo, Y.,
"CutMix: Regularization Strategy to Train Strong Classifiers with
Localizable Features," ICCV 2019 / arXiv:1905.04899,
§3.1 Algorithm, PDF page 3 (after Eq. 2):

    (r_w r_h) / (W H) = 1 − λ

hence

    λ = 1 − (r_w r_h) / (W H)

Caller supplies positive box sizes r_w, r_h and image sizes W, H
with r_w ≤ W and r_h ≤ H.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_positive(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number <= 0.0:
        return None
    return number


def cutmix_lambda(
    box_width: object,
    box_height: object,
    image_width: object,
    image_height: object,
) -> float | None:
    """λ = 1 − (r_w r_h)/(W H) (Yun et al. ICCV 2019, PDF page 3).

    Missing / non-positive → null. Box larger than image → null.
    """
    rw = _as_positive(box_width)
    rh = _as_positive(box_height)
    w = _as_positive(image_width)
    h = _as_positive(image_height)
    if rw is None or rh is None or w is None or h is None:
        return None
    if rw > w or rh > h:
        return None
    ratio = (rw * rh) / (w * h)
    out = 1.0 - ratio
    if not math.isfinite(out):
        return None
    # Printed identity keeps λ in [0, 1] when box ⊆ image.
    if out < 0.0 or out > 1.0:
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("cutmix_lambda",)
