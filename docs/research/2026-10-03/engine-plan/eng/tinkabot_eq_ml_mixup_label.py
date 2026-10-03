"""Mixup label form ỹ = λ y_i + (1 − λ) y_j (Zhang et al. ICLR 2018).

Printed on arXiv:1710.09412 PDF p.2 (same block as x̃). Lingxi already landed
x̃; this is the paired target interpolation only.
"""
from __future__ import annotations

from typing import Optional, Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS = ("mixup_label",)


def mixup_label(
    y_i: Sequence[float] | None,
    y_j: Sequence[float] | None,
    lam: float | None,
) -> Optional[list[float]]:
    """ỹ = λ y_i + (1 − λ) y_j.

    Returns None on missing inputs, non-finite λ, λ outside [0, 1], length
    mismatch, or non-finite components.
    """
    if y_i is None or y_j is None or lam is None:
        return None
    try:
        l = float(lam)
    except (TypeError, ValueError):
        return None
    if l != l or l in (float("inf"), float("-inf")) or not (0.0 <= l <= 1.0):
        return None
    if len(y_i) != len(y_j) or len(y_i) == 0:
        return None
    out: list[float] = []
    for a, b in zip(y_i, y_j):
        try:
            fa = float(a)
            fb = float(b)
        except (TypeError, ValueError):
            return None
        if fa != fa or fb != fb or fa in (float("inf"), float("-inf")) or fb in (
            float("inf"),
            float("-inf"),
        ):
            return None
        out.append(l * fa + (1.0 - l) * fb)
    return out
