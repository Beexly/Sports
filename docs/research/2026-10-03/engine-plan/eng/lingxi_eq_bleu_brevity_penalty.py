"""Printed BLEU brevity penalty (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Papineni, Roukos, Ward, Zhu, BLEU: a Method for Automatic Evaluation
of Machine Translation, ACL 2002, anthology P02-1040, section 2.3,
PDF page 5:

    BP = 1           if c > r
    BP = e^(1 - r/c) if c <= r

c = candidate length, r = effective reference length.
Not the full BLEU composite (BP · exp Σ w_n log p_n).
Not ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def bleu_brevity_penalty(
    candidate_len: float | None, reference_len: float | None
) -> float | None:
    """Section 2.3, Papineni et al. ACL 2002 P02-1040 PDF page 5."""
    if candidate_len is None or reference_len is None:
        return None
    c = float(candidate_len)
    r = float(reference_len)
    if not math.isfinite(c) or not math.isfinite(r):
        return None
    if c <= 0.0 or r <= 0.0:
        return None
    if c > r:
        return 1.0
    return math.exp(1.0 - r / c)


COLUMN_BACKED_FUNCS = ("bleu_brevity_penalty",)