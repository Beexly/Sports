"""Stated ML identity: Cohen kappa / Carletta K (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite ECE, MCE, BLEU, ROUGE, METEOR, chrF, TER, matthews_corrcoef,
equal-weight JS, or Herbrich margin ranking.

Source:
- Carletta, J., "Assessing Agreement on Classification Tasks: The Kappa
  Statistic," Computational Linguistics, Volume 22, Number 2, 1996.
  ACL anthology J96-2004.
  https://aclanthology.org/J96-2004.pdf
  PDF page 4 (section 3), printed form:
  K = (P(A) − P(E)) / (1 − P(E)),
  where P(A) is the proportion of times the coders agree and P(E) is the
  proportion of times they would be expected to agree by chance.
  (Carletta presents Siegel and Castellan's K; same chance-corrected form
  as Cohen 1960.)
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


def cohen_kappa(p_a: object, p_e: object) -> float | None:
    """K = (P(A) − P(E)) / (1 − P(E)) (Carletta 1996 PDF p.4).

    Caller supplies observed agreement P(A) and chance agreement P(E).
    Missing → null. Non-finite → null. Denominator 1 − P(E) = 0 → null.
    """
    observed = _as_float(p_a)
    expected = _as_float(p_e)
    if observed is None or expected is None:
        return None
    denom = 1.0 - expected
    if denom == 0.0:
        return None
    return (observed - expected) / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("cohen_kappa",)
