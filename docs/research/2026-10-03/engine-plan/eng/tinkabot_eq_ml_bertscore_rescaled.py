"""Stated ML identity: BERTScore baseline rescaling (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite BERTScore F/P/R, spice_*, ECE, MCE, CIDEr*, BLEU, ROUGE,
METEOR, chrF, TER, cohen_kappa, matthews_corrcoef, equal-weight JS,
Herbrich, or grok elastic potential.

Source:
- Zhang, T., Kishore, V., Wu, F., Weinberger, K. Q., and Artzi, Y.,
  "BERTScore: Evaluating Text Generation with BERT,"
  ICLR 2020. arXiv:1904.09675.
  https://arxiv.org/pdf/1904.09675
  arXiv PDF page 5, Section 3 printed form:
  R̂_BERT = (R_BERT − b) / (1 − b),
  with the same linear rescaling applied to P_BERT and F_BERT.
  Baseline b is the average BERTScore on typical unrelated sentence pairs.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_float(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def bertscore_rescaled(score: object, baseline: object) -> float | None:
    """ŝ = (s − b) / (1 − b) (Zhang et al. 2020, PDF p.5).

    Caller supplies a BERTScore component s and baseline b.
    Missing → null. Non-finite → null. Denominator 1 − b = 0 → null.
    """
    s = _as_float(score)
    b = _as_float(baseline)
    if s is None or b is None:
        return None
    denom = 1.0 - b
    if denom == 0.0:
        return None
    return (s - b) / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("bertscore_rescaled",)
