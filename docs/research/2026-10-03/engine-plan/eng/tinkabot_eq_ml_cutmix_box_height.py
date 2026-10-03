"""CutMix box height r_h = H √(1 − λ) (Yun et al. ICCV 2019).

Printed on arXiv:1905.04899 PDF p.3 Eq. (2), paired with Lingxi's
cutmix_box_width r_w = W √(1 − λ). One function. No I/O.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("cutmix_box_height",)


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


def cutmix_box_height(image_height: object, lam: object) -> float | None:
    """r_h = H √(1 − λ) (Yun et al. ICCV 2019 Eq. 2, PDF page 3).

    Missing / non-finite → null. H ≤ 0 → null. λ outside [0, 1] → null.
    """
    h = _as_finite(image_height)
    lam_f = _as_finite(lam)
    if h is None or lam_f is None:
        return None
    if h <= 0.0:
        return None
    if lam_f < 0.0 or lam_f > 1.0:
        return None
    out = h * math.sqrt(1.0 - lam_f)
    if not math.isfinite(out):
        return None
    return out
