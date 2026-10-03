"""Printed ROUGE-L recall (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Chin-Yew Lin, ROUGE: A Package for Automatic Evaluation of
Summaries, Text Summarization Branches Out (ACL workshop),
2004, anthology W04-1013, equation (2), PDF page 2:

    R_lcs = LCS(X, Y) / m

m is the length of the reference sequence X. Not equation (4),
the LCS F-measure, and not Papineni BLEU.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def rouge_l_recall(lcs_length: float | None, reference_length: float | None) -> float | None:
    """Equation (2), Lin 2004 W04-1013 PDF page 2."""
    if lcs_length is None or reference_length is None:
        return None
    matched = float(lcs_length)
    width = float(reference_length)
    if not math.isfinite(matched) or not math.isfinite(width):
        return None
    if width <= 0.0 or matched < 0.0 or matched > width:
        return None
    return matched / width


COLUMN_BACKED_FUNCS = ("rouge_l_recall",)