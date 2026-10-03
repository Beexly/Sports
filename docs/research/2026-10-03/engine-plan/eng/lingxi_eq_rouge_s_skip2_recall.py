"""Printed ROUGE-S skip-bigram recall (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Chin-Yew Lin, ROUGE: A Package for Automatic Evaluation of
Summaries, Text Summarization Branches Out (ACL workshop),
2004, anthology W04-1013, equation (16), PDF page 5:

    R_skip2 = SKIP2(X, Y) / C(m, 2)

SKIP2(X, Y) is the number of skip-bigram matches between
reference X (length m) and candidate Y. C(m, 2) = m(m-1)/2.
Not ROUGE-N (1), not ROUGE-L recall (2), not F_skip2 (18).
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def rouge_s_skip2_recall(
    skip2_matches: float | None, reference_length: float | None
) -> float | None:
    """Equation (16), Lin 2004 W04-1013 PDF page 5."""
    if skip2_matches is None or reference_length is None:
        return None
    matched = float(skip2_matches)
    width = float(reference_length)
    if not math.isfinite(matched) or not math.isfinite(width):
        return None
    if width < 2.0 or matched < 0.0:
        return None
    denom = width * (width - 1.0) / 2.0
    if matched > denom:
        return None
    return matched / denom


COLUMN_BACKED_FUNCS = ("rouge_s_skip2_recall",)