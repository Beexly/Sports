"""Printed CIDEr_n average cosine similarity (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Ramakrishna Vedantam, C. Lawrence Zitnick, and Devi Parikh,
CIDEr: Consensus-based Image Description Evaluation, CVPR /
arXiv:1411.5726v2, Section 4, equation (2), PDF page 4:

    CIDEr_n(c_i, S_i) = (1/m) * Σ_j  (g^n(c_i) · g^n(s_ij))
                                      / (||g^n(c_i)|| ||g^n(s_ij)||)

g^n are TF-IDF n-gram weight vectors. Not METEOR Fmean/Penalty/Score,
not chrF, ECE/MCE, TER, BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _cosine(a: Sequence[float], b: Sequence[float]) -> float | None:
    if len(a) == 0 or len(a) != len(b):
        return None
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        xf = float(x)
        yf = float(y)
        if not math.isfinite(xf) or not math.isfinite(yf):
            return None
        dot += xf * yf
        na += xf * xf
        nb += yf * yf
    if na <= 0.0 or nb <= 0.0:
        return None
    return dot / (math.sqrt(na) * math.sqrt(nb))


def cider_n(
    candidate_g: Sequence[float] | None,
    reference_gs: Sequence[Sequence[float]] | None,
) -> float | None:
    """Equation (2), Vedantam et al. arXiv:1411.5726 PDF page 4."""
    if candidate_g is None or reference_gs is None:
        return None
    refs = list(reference_gs)
    if len(refs) == 0:
        return None
    total = 0.0
    for ref in refs:
        if ref is None:
            return None
        cos = _cosine(candidate_g, ref)
        if cos is None:
            return None
        total += cos
    return total / float(len(refs))


COLUMN_BACKED_FUNCS = ("cider_n",)