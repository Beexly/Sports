"""Printed ROUGE-L LCS precision (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Chin-Yew Lin, ROUGE: A Package for Automatic Evaluation of
Summaries, Text Summarization Branches Out (ACL workshop),
2004, anthology W04-1013, equation (3), PDF page 2:

    P_lcs = LCS(X, Y) / n

n is the length of the candidate sequence Y. Not R_lcs (eq 2),
not F_lcs (eq 4), not ROUGE-N or ROUGE-S, not WER/TER/PMI/
GLEU/BERTScore*/smatch/SPICE*/CIDEr*/kappa/ECE/MCE/elastic.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def rouge_l_precision(
    lcs_length: float | None, candidate_length: float | None
) -> float | None:
    """Equation (3), Lin 2004 W04-1013 PDF page 2."""
    if lcs_length is None or candidate_length is None:
        return None
    matched = float(lcs_length)
    width = float(candidate_length)
    if not math.isfinite(matched) or not math.isfinite(width):
        return None
    if width <= 0.0 or matched < 0.0 or matched > width:
        return None
    return matched / width


COLUMN_BACKED_FUNCS = ("rouge_l_precision",)
