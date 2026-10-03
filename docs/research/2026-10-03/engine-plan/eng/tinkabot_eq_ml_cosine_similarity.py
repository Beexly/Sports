"""Stated ML/IR identity: 2-D cosine similarity (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Manning, C. D., Raghavan, P., and Schütze, H. Introduction to Information
  Retrieval, Cambridge University Press, 2008,
  https://nlp.stanford.edu/IR-book/pdf/06vect.pdf
  printed p. 121–122 (Chapter 6): cosine similarity
  sim(d₁, d₂) = (V(d₁) · V(d₂)) / (|V(d₁)| |V(d₂)|).
  This module implements that form for two 2-D vectors.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def cosine_similarity(
    x1: float | None,
    x2: float | None,
    y1: float | None,
    y2: float | None,
) -> float | None:
    """cos = (x1*y1 + x2*y2) / (||x|| ||y||) for 2-D vectors.

    Missing → null. Either Euclidean norm == 0 → null.
    """
    if x1 is None or x2 is None or y1 is None or y2 is None:
        return None
    a1 = float(x1)
    a2 = float(x2)
    b1 = float(y1)
    b2 = float(y2)
    nx = math.sqrt(a1 * a1 + a2 * a2)
    ny = math.sqrt(b1 * b1 + b2 * b2)
    if nx == 0.0 or ny == 0.0:
        return None
    return (a1 * b1 + a2 * b2) / (nx * ny)


COLUMN_BACKED_FUNCS: Sequence[str] = ("cosine_similarity",)
