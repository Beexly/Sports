"""Printed METEOR fragmentation penalty (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Satanjeev Banerjee and Alon Lavie, METEOR: An Automatic Metric for
MT Evaluation with Improved Correlation with Human Judgments,
Workshop on Intrinsic and Extrinsic Evaluation Measures for MT
and/or Summarization (ACL), 2005, anthology W05-0909, Section 2.2,
PDF page 4:

    Penalty = 0.5 * (#chunks / #unigrams_matched)^3

Not Fmean, not Score = Fmean*(1-Penalty). Not chrF, TER, BLEU/BP,
or ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def meteor_penalty(
    num_chunks: float | None, unigrams_matched: float | None
) -> float | None:
    """Section 2.2, Banerjee & Lavie W05-0909 PDF page 4."""
    if num_chunks is None or unigrams_matched is None:
        return None
    chunks = float(num_chunks)
    matched = float(unigrams_matched)
    if not math.isfinite(chunks) or not math.isfinite(matched):
        return None
    if chunks < 1.0 or matched <= 0.0 or chunks > matched:
        return None
    ratio = chunks / matched
    return 0.5 * (ratio ** 3)


COLUMN_BACKED_FUNCS = ("meteor_penalty",)