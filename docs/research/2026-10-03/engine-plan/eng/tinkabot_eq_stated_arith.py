"""Stated arithmetic identities for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. No HOLD restores.

Sources (corpus cites, not fit coefficients):
- docs/engine/research/2026-10-02/corpus-deep/deep/c03/buildable-systems.md
  shared coaching/common.py: safe-div helper
- eng/learn_wide_coverage.json / gse trust path: share = part / whole with
  non-positive whole → null (same shape as air_yard_share without renaming it)
- c03 M07 stated complement form used for under_center: 1 − rate
  (generic complement_rate; does not restore under_center_diff)
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def _null(x: float | None) -> bool:
    return x is None


def safe_div(numer: float | None, denom: float | None) -> float | None:
    """c03 common.py safe-div: null if either side missing or denom == 0."""
    if _null(numer) or _null(denom):
        return None
    d = float(denom)
    if d == 0.0:
        return None
    return float(numer) / d


def part_share(part: float | None, whole: float | None) -> float | None:
    """Share = part / whole; non-positive or missing whole → null."""
    if _null(part) or _null(whole):
        return None
    w = float(whole)
    if w <= 0.0:
        return None
    return float(part) / w


def complement_rate(rate: float | None) -> float | None:
    """Generic 1 − rate (c03 M07 complement shape). Missing rate → null."""
    if _null(rate):
        return None
    return 1.0 - float(rate)


def clip01(x: float | None) -> float | None:
    """Bound a probability-like value into [0, 1]; missing stays null."""
    if _null(x):
        return None
    v = float(x)
    if v < 0.0:
        return 0.0
    if v > 1.0:
        return 1.0
    return v


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "safe_div",
    "part_share",
    "complement_rate",
    "clip01",
)
