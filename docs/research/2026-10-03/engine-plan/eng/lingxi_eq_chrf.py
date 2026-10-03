"""Printed character n-gram F-score (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Maja Popović, chrF: character n-gram F-score for automatic MT
evaluation, Workshop on Statistical Machine Translation (WMT),
2015, anthology W15-3049, Section 2, equation (1), PDF page 1:

    chrF_β = (1 + β²) · CHR_P · CHR_R / (β² · CHR_P + CHR_R)

Not METEOR Fmean/Score, not TER, BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def chrf(
    chr_precision: float | None,
    chr_recall: float | None,
    beta: float | None,
) -> float | None:
    """Equation (1), Popović WMT 2015 W15-3049 PDF page 1."""
    if chr_precision is None or chr_recall is None or beta is None:
        return None
    p = float(chr_precision)
    r = float(chr_recall)
    b = float(beta)
    if not math.isfinite(p) or not math.isfinite(r) or not math.isfinite(b):
        return None
    if p < 0.0 or r < 0.0 or p > 1.0 or r > 1.0 or b < 0.0:
        return None
    b2 = b * b
    denom = b2 * p + r
    if denom == 0.0:
        return None
    return ((1.0 + b2) * p * r) / denom


COLUMN_BACKED_FUNCS = ("chrf",)