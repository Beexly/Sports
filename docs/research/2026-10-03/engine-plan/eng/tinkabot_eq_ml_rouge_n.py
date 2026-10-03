"""Stated ML/IR identity: ROUGE-N (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite BLEU, matthews_corrcoef, equal-weight JS, or Herbrich margin ranking.

Source:
- Lin, C.-Y., "ROUGE: A Package for Automatic Evaluation of Summaries,"
  Text Summarization Branches Out, ACL Workshop, Barcelona, July 2004,
  pp. 74-81.
  https://aclanthology.org/W04-1013.pdf
  Anthology PDF page 1, Section 2, Equation (1):
  ROUGE-N =
    Σ_{S ∈ {ReferenceSummaries}} Σ_{gram_n ∈ S} Count_match(gram_n)
    / Σ_{S ∈ {ReferenceSummaries}} Σ_{gram_n ∈ S} Count(gram_n).
  n is the n-gram length. Count_match(gram_n) is the maximum number of
  n-grams co-occurring in a candidate summary and a set of reference
  summaries. The denominator is the total number of n-grams on the
  reference side, so the printed measure is recall.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def rouge_n(
    count_match: float | None,
    count_reference: float | None,
) -> float | None:
    """ROUGE-N = Σ Count_match(gram_n) / Σ Count(gram_n) (Lin 2004, Eq. 1).

    Anthology PDF page 1. Caller supplies the two printed sums.
    Missing → null. Non-finite or negative sums → null.
    Reference total ≤ 0 → null. Match above the reference total → null
    (the printed ratio is a recall).
    """
    if count_match is None or count_reference is None:
        return None
    if isinstance(count_match, (str, bytes)) or isinstance(count_reference, (str, bytes)):
        return None
    try:
        matched = float(count_match)
        reference = float(count_reference)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(matched) or not math.isfinite(reference):
        return None
    if matched < 0.0 or reference <= 0.0 or matched > reference:
        return None
    return matched / reference


COLUMN_BACKED_FUNCS: Sequence[str] = ("rouge_n",)
