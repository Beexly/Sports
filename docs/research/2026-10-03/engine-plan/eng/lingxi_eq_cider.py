"""Printed CIDEr combined n-gram score (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Ramakrishna Vedantam, C. Lawrence Zitnick, and Devi Parikh,
CIDEr: Consensus-based Image Description Evaluation, CVPR /
arXiv:1411.5726v2, Section 4, equation (3), PDF page 4:

    CIDEr(c_i, S_i) = Σ_{n=1}^{N} w_n · CIDEr_n(c_i, S_i)

with uniform weights w_n = 1/N (paper: N = 4 works best).

Not CIDEr_n alone, not ECE/MCE, METEOR Fmean/Penalty/Score,
chrF, TER, BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def cider(cider_n_scores: Sequence[float] | None) -> float | None:
    """Equation (3), Vedantam et al. arXiv:1411.5726 PDF page 4 (w_n=1/N)."""
    if cider_n_scores is None:
        return None
    scores = list(cider_n_scores)
    n = len(scores)
    if n == 0:
        return None
    total = 0.0
    for s in scores:
        if s is None:
            return None
        v = float(s)
        if not math.isfinite(v):
            return None
        if v < -1.0 or v > 1.0:
            # cosine-based CIDEr_n is in [-1, 1] for TF-IDF ≥ 0 typically [0,1]
            return None
        total += v
    return total / float(n)


COLUMN_BACKED_FUNCS = ("cider",)