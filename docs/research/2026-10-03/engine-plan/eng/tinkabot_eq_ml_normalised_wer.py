"""Stated ML identity: normalised WER (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite WER, MER, WIL, GLEU, BERTScore*, smatch, spice_*, PMI,
ROUGE-L*, ECE, MCE, CIDEr*, BLEU, METEOR, chrF, TER, cohen_kappa,
matthews_corrcoef, equal-weight JS, Herbrich, or grok elastic potential.

Source:
- Morris, A. C., Maier, V., & Green, P., "From WER and RIL to MER and WIL:
  improved evaluation measures for connected speech recognition,"
  Interspeech / ICSLP 2004.
  PDF §4 intro, Eq. (7):
  normalised WER = (S+D+I) / max(N1, N2)
  with N1 = H+S+D and N2 = H+S+I.
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


def normalised_wer(
    substitutions: object,
    deletions: object,
    insertions: object,
    hits: object,
) -> float | None:
    """normalised WER = (S+D+I)/max(N1,N2) (Morris et al. 2004, Eq.7).

    N1 = H+S+D, N2 = H+S+I. Missing → null. Non-finite or negative → null.
    max(N1,N2)=0 → null.
    """
    s = _as_nonneg_count(substitutions)
    d = _as_nonneg_count(deletions)
    i = _as_nonneg_count(insertions)
    h = _as_nonneg_count(hits)
    if s is None or d is None or i is None or h is None:
        return None
    n1 = h + s + d
    n2 = h + s + i
    denom = max(n1, n2)
    if denom == 0:
        return None
    return (s + d + i) / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("normalised_wer",)
