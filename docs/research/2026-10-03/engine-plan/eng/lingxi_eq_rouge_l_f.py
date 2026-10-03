"""Printed ROUGE-L LCS F-measure (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Chin-Yew Lin, ROUGE: A Package for Automatic Evaluation of
Summaries, Text Summarization Branches Out (ACL workshop),
2004, anthology W04-1013, equation (4), PDF page 2:

    F_lcs = (1 + β²) · R_lcs · P_lcs / (R_lcs + β² · P_lcs)

Not R_lcs (eq 2), not P_lcs (eq 3) alone, not ROUGE-N/S,
not PMI, GLEU, BERTScore*, smatch, SPICE*, CIDEr*, kappa,
ECE/MCE, or elastic potential.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def rouge_l_f(
    r_lcs: float | None,
    p_lcs: float | None,
    beta: float | None = 1.0,
) -> float | None:
    """Equation (4), Lin 2004 W04-1013 PDF page 2."""
    if r_lcs is None or p_lcs is None or beta is None:
        return None
    r = float(r_lcs)
    p = float(p_lcs)
    b = float(beta)
    if not all(math.isfinite(v) for v in (r, p, b)):
        return None
    if r < 0.0 or p < 0.0 or r > 1.0 or p > 1.0:
        return None
    if b < 0.0:
        return None
    b2 = b * b
    denom = r + b2 * p
    if denom == 0.0:
        return None
    return ((1.0 + b2) * r * p) / denom


COLUMN_BACKED_FUNCS = ("rouge_l_f",)
