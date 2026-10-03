"""Stated bin / mask identities for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD-deleted
helpers from tinkabot_eq_column.py. Does not restate funcs already in
tinkabot_eq_stated_gates.py.

Sources (corpus cites, not fit coefficients):
- docs/engine/research/2026-10-02/corpus-deep/deep/c03/buildable-systems.md
  M01: early downs 1–2; ydstogo_bin ∈ {≤3, 4–7, ≥8}
  M05: goal-to-go (yardline_100 ≤ 10)
- docs/engine/research/2026-10-02/corpus-deep/deep/c02/buildable-systems.md
  System 1: pressured_floor = qb_hit == 1 OR sack == 1
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"

GOAL_TO_GO_YARDLINE = 10


def _null(x: float | None) -> bool:
    return x is None


def early_down(down: float | None) -> float | None:
    """c03 M01: early-down plays are downs 1–2. Missing down stays null."""
    if _null(down):
        return None
    d = float(down)
    return 1.0 if d in (1.0, 2.0) else 0.0


def ydstogo_bin(ydstogo: float | None) -> str | None:
    """c03 M01: ydstogo_bin ∈ {≤3, 4–7, ≥8}. Labels: le3 | mid4_7 | ge8."""
    if _null(ydstogo):
        return None
    y = float(ydstogo)
    if y <= 3.0:
        return "le3"
    if y <= 7.0:
        return "mid4_7"
    return "ge8"


def goal_to_go(yardline_100: float | None) -> float | None:
    """c03 M05: goal-to-go split is yardline_100 ≤ 10. Missing line stays null."""
    if _null(yardline_100):
        return None
    return 1.0 if float(yardline_100) <= GOAL_TO_GO_YARDLINE else 0.0


def pressured_floor(qb_hit: float | None, sack: float | None) -> float | None:
    """c02 System 1: pressured_floor = qb_hit == 1 OR sack == 1. Both missing → null."""
    if _null(qb_hit) and _null(sack):
        return None
    hit = 0.0 if _null(qb_hit) else float(qb_hit)
    sk = 0.0 if _null(sack) else float(sack)
    return 1.0 if hit == 1.0 or sk == 1.0 else 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "early_down",
    "ydstogo_bin",
    "goal_to_go",
    "pressured_floor",
)
