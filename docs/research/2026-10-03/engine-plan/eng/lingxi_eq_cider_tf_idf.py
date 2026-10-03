"""Printed CIDEr TF-IDF n-gram weight g_k (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Ramakrishna Vedantam, C. Lawrence Zitnick, and Devi Parikh,
CIDEr: Consensus-based Image Description Evaluation, CVPR /
arXiv:1411.5726v2, Section 4, equation (1), PDF page 4:

    g_k(s_ij) = (h_k(s_ij) / Σ_ωl h_l(s_ij))
                · log( |I| / Σ_{I_p ∈ I} min(1, Σ_q h_k(s_pq)) )

Not CIDEr / CIDEr_n, not Cohen kappa, ECE/MCE, METEOR*,
chrF, TER, BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def cider_tf_idf(
    ngram_count: float | None,
    sentence_ngram_total: float | None,
    num_images: float | None,
    images_with_ngram: float | None,
) -> float | None:
    """Equation (1), Vedantam et al. arXiv:1411.5726 PDF page 4."""
    if (
        ngram_count is None
        or sentence_ngram_total is None
        or num_images is None
        or images_with_ngram is None
    ):
        return None
    hk = float(ngram_count)
    total = float(sentence_ngram_total)
    n_img = float(num_images)
    df = float(images_with_ngram)
    if not all(math.isfinite(x) for x in (hk, total, n_img, df)):
        return None
    if hk < 0.0 or total <= 0.0 or hk > total:
        return None
    if n_img <= 0.0 or df <= 0.0 or df > n_img:
        return None
    tf = hk / total
    idf = math.log(n_img / df)
    return tf * idf


COLUMN_BACKED_FUNCS = ("cider_tf_idf",)