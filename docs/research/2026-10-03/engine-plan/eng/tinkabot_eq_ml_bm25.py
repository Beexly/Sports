"""Stated IR identity: BM25 term weight (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite matthews_corrcoef, equal-weight JS, Herbrich margin ranking,
BLEU, or complete IoU.

Source:
- Robertson, S. and Zaragoza, H., "The Probabilistic Relevance Framework:
  BM25 and Beyond," Foundations and Trends in Information Retrieval
  3(4), 2009, 333-389. DOI: 10.1561/1500000019.
  Printed p. 360 (PDF page 30), Eq. (3.15):
  w_i^{BM25}(tf) = [tf / (k_1 ((1-b) + b dl/avdl) + tf)] w_i^{RSJ}.
  Caller supplies tf ≥ 0, k_1 > 0, document length dl ≥ 0, average document
  length avdl > 0, and the RSJ weight. b is the printed length-normalization
  parameter. No (k_1+1) factor: that factor is not in Eq. (3.15).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def bm25_term_weight(
    tf: float | None,
    k1: float | None,
    b: float | None,
    doc_len: float | None,
    avg_doc_len: float | None,
    rsj: float | None,
) -> float | None:
    """BM25 term weight, Robertson & Zaragoza 2009 Eq. (3.15), printed p. 360.

    Missing → null. tf < 0, k_1 ≤ 0, dl < 0, or avdl ≤ 0 → null.
    Non-positive printed denominator → null.
    """
    if (
        tf is None
        or k1 is None
        or b is None
        or doc_len is None
        or avg_doc_len is None
        or rsj is None
    ):
        return None
    try:
        t = float(tf)
        k = float(k1)
        bb = float(b)
        dl = float(doc_len)
        av = float(avg_doc_len)
        w = float(rsj)
    except (TypeError, ValueError):
        return None
    if not all(math.isfinite(x) for x in (t, k, bb, dl, av, w)):
        return None
    if t < 0.0 or k <= 0.0 or dl < 0.0 or av <= 0.0:
        return None
    denom = k * ((1.0 - bb) + bb * (dl / av)) + t
    if denom <= 0.0:
        return None
    return (t / denom) * w


COLUMN_BACKED_FUNCS: Sequence[str] = ("bm25_term_weight",)
