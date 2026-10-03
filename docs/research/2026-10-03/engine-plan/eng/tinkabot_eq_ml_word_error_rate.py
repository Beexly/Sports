"""Stated ML identity: CSR word error rate (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite BERTScore*, smatch, spice_*, GLEU, ECE, MCE, CIDEr*, BLEU,
ROUGE, METEOR, chrF, TER, cohen_kappa, matthews_corrcoef, equal-weight JS,
Herbrich, or grok elastic potential.

Source:
- Morris, A. C., Maier, V., & Green, P., "From WER and RIL to MER and WIL:
  improved evaluation measures for connected speech recognition,"
  Interspeech / ICSLP 2004.
  https://www.isca-speech.org/archive/interspeech_2004/morris04_interspeech.html
  PDF page 1, Eq. (2): WER(CSR) = (S+D+I) / N1 with N1 = H+S+D.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_nonneg_count(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number < 0:
        return None
    return number


def word_error_rate(
    substitutions: object,
    deletions: object,
    insertions: object,
    hits: object,
) -> float | None:
    """WER(CSR) = (S+D+I)/(H+S+D) (Morris et al. 2004, PDF p.1 Eq.2).

    Missing → null. Non-finite or negative count → null. Zero denominator → null.
    """
    s = _as_nonneg_count(substitutions)
    d = _as_nonneg_count(deletions)
    i = _as_nonneg_count(insertions)
    h = _as_nonneg_count(hits)
    if s is None or d is None or i is None or h is None:
        return None
    n1 = h + s + d
    if n1 == 0:
        return None
    return (s + d + i) / n1


COLUMN_BACKED_FUNCS: Sequence[str] = ("word_error_rate",)
