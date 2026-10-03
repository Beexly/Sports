"""Printed BERTScore token idf (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Tianyi Zhang, Varsha Kishore, Felix Wu, Kilian Q. Weinberger,
and Yoav Artzi, BERTScore: Evaluating Text Generation with
BERT, ICLR 2020 / arXiv:1904.09675, Section 3, PDF page 4:

    idf(w) = − log( (1/M) · Σ_{i=1}^{M} I[w ∈ x^{(i)}] )

Equivalent to −log(df/M) when df counts reference sentences
containing token w and M is the number of references.

Not P_BERT / R_BERT / F_BERT / rescaled, not SPICE*, CIDEr*,
Cohen kappa, ECE/MCE, elastic potential, METEOR*, chrF, TER,
BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def bertscore_idf(
    docs_with_token: float | None, num_refs: float | None
) -> float | None:
    """Section 3 idf(w), Zhang et al. arXiv:1904.09675 PDF page 4."""
    if docs_with_token is None or num_refs is None:
        return None
    df = float(docs_with_token)
    m = float(num_refs)
    if not math.isfinite(df) or not math.isfinite(m):
        return None
    if m <= 0.0 or df <= 0.0 or df > m:
        return None
    # printed: -log( (1/M) * sum I ) = -log(df/M)
    return -math.log(df / m)


COLUMN_BACKED_FUNCS = ("bertscore_idf",)
