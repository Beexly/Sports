"""Stated ML identity: CIDEr combined n-gram score (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite CIDEr_n, ECE, MCE, METEOR/chrF/TER/BLEU/ROUGE,
matthews_corrcoef, equal-weight JS, or Herbrich margin ranking.

Source:
- Vedantam, R., Zitnick, C. L., and Parikh, D.,
  "CIDEr: Consensus-based Image Description Evaluation,"
  IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 2015.
  arXiv:1411.5726.
  https://arxiv.org/pdf/1411.5726
  arXiv PDF page 4, Equation (3):
  CIDEr(c_i, S_i) = Σ_{n=1}^{N} w_n CIDEr_n(c_i, S_i),
  with uniform weights w_n = 1/N (and N = 4 in the paper).
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


def _as_floats(values: object) -> list[float] | None:
    if values is None or isinstance(values, (str, bytes)):
        return None
    if not isinstance(values, Sequence):
        return None
    out: list[float] = []
    for value in values:
        number = _as_float(value)
        if number is None:
            return None
        out.append(number)
    return out


def cider_score(
    cider_n_scores: Sequence[float] | None,
) -> float | None:
    """CIDEr = Σ_n (1/N) CIDEr_n (Vedantam et al. 2015, Eq. 3).

    arXiv PDF page 4. Caller supplies the N per-order CIDEr_n scores;
    uniform w_n = 1/N is applied as printed. Missing → null. Non-finite
    inputs → null. Empty sequence → null.
    """
    scores = _as_floats(cider_n_scores)
    if scores is None or not scores:
        return None
    n = float(len(scores))
    return sum(scores) / n


COLUMN_BACKED_FUNCS: Sequence[str] = ("cider_score",)
