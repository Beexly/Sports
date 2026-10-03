"""Printed METEOR Fmean (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Satanjeev Banerjee and Alon Lavie, METEOR: An Automatic Metric for
MT Evaluation with Improved Correlation with Human Judgments,
Workshop on Intrinsic and Extrinsic Evaluation Measures for MT
and/or Summarization (ACL), 2005, anthology W05-0909, Section 2.2,
PDF page 4:

    Fmean = 10 P R / (R + 9 P)

Harmonic mean of unigram precision P and recall R that places most
weight on recall (harmonic mean of P and 9R). Not the full METEOR
Score = Fmean*(1-Penalty). Not TER, BLEU/BP, or ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def meteor_fmean(
    precision: float | None, recall: float | None
) -> float | None:
    """Section 2.2, Banerjee & Lavie W05-0909 PDF page 4."""
    if precision is None or recall is None:
        return None
    p = float(precision)
    r = float(recall)
    if not math.isfinite(p) or not math.isfinite(r):
        return None
    if p < 0.0 or r < 0.0 or p > 1.0 or r > 1.0:
        return None
    denom = r + 9.0 * p
    if denom == 0.0:
        return None
    return (10.0 * p * r) / denom


COLUMN_BACKED_FUNCS = ("meteor_fmean",)