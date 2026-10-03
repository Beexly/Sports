"""Printed BERTScore F1 (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Tianyi Zhang, Varsha Kishore, Felix Wu, Kilian Q. Weinberger,
and Yoav Artzi, BERTScore: Evaluating Text Generation with
BERT, ICLR 2020 / arXiv:1904.09675, Section 3, PDF page 4:

    F_BERT = 2 · P_BERT · R_BERT / (P_BERT + R_BERT)

Not SPICE F1, not CIDEr/CIDEr_n/TF-IDF, not Cohen kappa,
ECE/MCE, METEOR*, chrF, TER, BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def bertscore_f(
    p_bert: float | None, r_bert: float | None
) -> float | None:
    """Section 3 F_BERT, Zhang et al. arXiv:1904.09675 PDF page 4."""
    if p_bert is None or r_bert is None:
        return None
    p = float(p_bert)
    r = float(r_bert)
    if not math.isfinite(p) or not math.isfinite(r):
        return None
    # cosine greedy-match scores are in [-1, 1]; practice often [0, 1]
    if p < -1.0 or r < -1.0 or p > 1.0 or r > 1.0:
        return None
    denom = p + r
    if denom == 0.0:
        return None
    return (2.0 * p * r) / denom


COLUMN_BACKED_FUNCS = ("bertscore_f",)