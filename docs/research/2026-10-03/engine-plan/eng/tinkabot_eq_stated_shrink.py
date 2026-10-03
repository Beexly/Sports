"""Stated shrinkage / floor identities for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. No HOLD restores.

Sources (corpus cites, not fit coefficients):
- docs/engine/research/2026-10-02/corpus-deep/deep/c04/buildable-systems.md
  James–Stein-style blend p̃ = n/(n+n0)·p̂ + n0/(n+n0)·p̄ (n0 caller-supplied)
- c02 buildable-systems: no leaf served at n<30 (auto back-off)
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"

LEAF_N_FLOOR = 30


def _null(x: float | None) -> bool:
    return x is None


def js_blend(
    p_hat: float | None,
    p_bar: float | None,
    n: float | None,
    n0: float | None,
) -> float | None:
    """c04: p̃ = n/(n+n0)·p̂ + n0/(n+n0)·p̄. n0 required (no default)."""
    if _null(p_hat) or _null(p_bar) or _null(n) or _null(n0):
        return None
    nn = float(n)
    nn0 = float(n0)
    denom = nn + nn0
    if denom <= 0.0:
        return None
    return (nn / denom) * float(p_hat) + (nn0 / denom) * float(p_bar)


def leaf_n_ok(n: float | None, floor: float = LEAF_N_FLOOR) -> float | None:
    """c02: leaf served only when n ≥ 30. Missing n → null."""
    if _null(n):
        return None
    return 1.0 if float(n) >= floor else 0.0


def mean_with_floor(total: float | None, n: float | None, floor: float = LEAF_N_FLOOR) -> float | None:
    """Mean = total/n when n ≥ floor; else null. Missing inputs → null."""
    if _null(total) or _null(n):
        return None
    nn = float(n)
    if nn < floor or nn <= 0.0:
        return None
    return float(total) / nn


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "js_blend",
    "leaf_n_ok",
    "mean_with_floor",
)
