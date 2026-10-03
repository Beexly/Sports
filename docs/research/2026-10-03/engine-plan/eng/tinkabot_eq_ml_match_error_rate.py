"""Stated ML identity: match error rate MER (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite word_error_rate, GLEU, BERTScore*, smatch, spice_*, PMI,
ECE, MCE, CIDEr*, BLEU, ROUGE, METEOR, chrF, TER, cohen_kappa,
matthews_corrcoef, equal-weight JS, Herbrich, or grok elastic potential.

Source:
- Morris, A. C., Maier, V., & Green, P., "From WER and RIL to MER and WIL:
  improved evaluation measures for connected speech recognition,"
  Interspeech / ICSLP 2004.
  PDF page with §4 Match error rate, Eq. (8):
  MER = (S+D+I) / N = 1 − H/N  with N = H+S+D+I.
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


def match_error_rate(
    substitutions: object,
    deletions: object,
    insertions: object,
    hits: object,
) -> float | None:
    """MER = (S+D+I)/(H+S+D+I) (Morris et al. 2004, Eq.8).

    Equivalent to 1 − H/N with N = H+S+D+I. Missing → null.
    Non-finite or negative count → null. Zero N → null.
    """
    s = _as_nonneg_count(substitutions)
    d = _as_nonneg_count(deletions)
    i = _as_nonneg_count(insertions)
    h = _as_nonneg_count(hits)
    if s is None or d is None or i is None or h is None:
        return None
    n = h + s + d + i
    if n == 0:
        return None
    return (s + d + i) / n


COLUMN_BACKED_FUNCS: Sequence[str] = ("match_error_rate",)
