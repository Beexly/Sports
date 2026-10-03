"""Printed BERTScore precision P_BERT (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Tianyi Zhang, Varsha Kishore, Felix Wu, Kilian Q. Weinberger,
and Yoav Artzi, BERTScore: Evaluating Text Generation with
BERT, ICLR 2020 / arXiv:1904.09675, Section 3, PDF page 4:

    P_BERT = (1 / |ˆx|) · Σ_{ˆx_j ∈ ˆx} max_{x_i ∈ x} x_i^⊤ ˆx_j

Inputs are the already-computed per-candidate-token maximum
cosine similarities (the inner max). This module averages them.

Not F_BERT, not SPICE precision/recall/F1, not CIDEr*, Cohen
kappa, ECE/MCE, METEOR*, chrF, TER, BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def bertscore_p(
    max_token_sims: Sequence[float] | None,
) -> float | None:
    """Section 3 P_BERT, Zhang et al. arXiv:1904.09675 PDF page 4."""
    if max_token_sims is None:
        return None
    if len(max_token_sims) == 0:
        return None
    vals: list[float] = []
    for s in max_token_sims:
        if s is None:
            return None
        v = float(s)
        if not math.isfinite(v):
            return None
        # cosine greedy-match scores are in [-1, 1]
        if v < -1.0 or v > 1.0:
            return None
        vals.append(v)
    return sum(vals) / float(len(vals))


COLUMN_BACKED_FUNCS = ("bertscore_p",)
