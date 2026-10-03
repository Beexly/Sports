"""Printed pointwise mutual information I(x,y) (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Kenneth Ward Church and Patrick Hanks, Word Association Norms,
Mutual Information, and Lexicography, Computational Linguistics
16(1), March 1990, ACL anthology J90-1003, Section 4,
PDF page 2 (journal page 23):

    I(x, y) = log₂ ( P(x,y) / (P(x) · P(y)) )

Not BERTScore idf/P/R/F/rescale, not smatch, SPICE*, CIDEr*,
Cohen kappa, ECE/MCE, elastic potential, METEOR*, chrF, TER,
BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def pointwise_mutual_info(
    p_xy: float | None, p_x: float | None, p_y: float | None
) -> float | None:
    """Section 4 I(x,y), Church & Hanks CL 16(1) 1990 PDF page 2."""
    if p_xy is None or p_x is None or p_y is None:
        return None
    j = float(p_xy)
    px = float(p_x)
    py = float(p_y)
    if not all(math.isfinite(v) for v in (j, px, py)):
        return None
    if j <= 0.0 or px <= 0.0 or py <= 0.0:
        return None
    if j > 1.0 or px > 1.0 or py > 1.0:
        return None
    # joint cannot exceed either margin
    if j > px or j > py:
        return None
    return math.log2(j / (px * py))


COLUMN_BACKED_FUNCS = ("pointwise_mutual_info",)
