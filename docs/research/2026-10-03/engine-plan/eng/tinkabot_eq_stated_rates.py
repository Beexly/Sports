"""Stated rate-identity helpers for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD-deleted
helpers. Distinct names from gse_eq_corpus / prior tinkabot modules.

Sources (corpus cites, not fit coefficients):
- docs/engine/research/2026-10-02/corpus-deep/deep/c03/buildable-systems.md
  M01: PROE_raw = actual − E; PROE = PROE_raw·n/(n+k); SE = √(p̂(1−p̂)/n)
  M04: low_sample when n_plays < 200 neutral early-down plays
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"

# Stated sample floor from c03 M04 (not a fit coefficient)
LOW_SAMPLE_N_PLAYS = 200


def _null(x: float | None) -> bool:
    return x is None


def rate_residual(actual: float | None, expected: float | None) -> float | None:
    """c03 M01: PROE_raw = actual − E. Missing either side stays null."""
    if _null(actual) or _null(expected):
        return None
    return float(actual) - float(expected)


def eb_shrink(raw: float | None, n: float | None, k: float | None) -> float | None:
    """c03 M01: PROE = PROE_raw·n/(n+k). Caller supplies k (no default invented)."""
    if _null(raw) or _null(n) or _null(k):
        return None
    nn = float(n)
    kk = float(k)
    denom = nn + kk
    if denom <= 0.0:
        return None
    return float(raw) * nn / denom


def rate_se(p_hat: float | None, n: float | None) -> float | None:
    """c03 M01: SE = √(p̂(1−p̂)/n). Out-of-range p̂ or non-positive n → null."""
    if _null(p_hat) or _null(n):
        return None
    p = float(p_hat)
    nn = float(n)
    if nn <= 0.0 or p < 0.0 or p > 1.0:
        return None
    return math.sqrt(p * (1.0 - p) / nn)


def low_sample_n(n_plays: float | None, floor: float = LOW_SAMPLE_N_PLAYS) -> float | None:
    """c03 M04: low_sample=1 when n_plays < 200. Missing n stays null."""
    if _null(n_plays):
        return None
    return 1.0 if float(n_plays) < floor else 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "rate_residual",
    "eb_shrink",
    "rate_se",
    "low_sample_n",
)
