"""Stated weight / concentration identities for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. No HOLD restores.

Sources (corpus cites, not fit coefficients):
- docs/engine/research/2026-10-02/corpus-deep/deep/c05/buildable-systems.md
  decay.py: weight = magnitude * 0.5 ** (age_hours / half_life_hours)
  (half_life required — no default invented here)
- c06 / trust path: consensus_hhi = Σ share_s² (same math as target HHI)
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def _null(x: float | None) -> bool:
    return x is None


def half_life_decay(
    magnitude: float | None,
    age_hours: float | None,
    half_life_hours: float | None,
) -> float | None:
    """c05: weight = magnitude * 0.5 ** (age_hours / half_life_hours)."""
    if _null(magnitude) or _null(age_hours) or _null(half_life_hours):
        return None
    hl = float(half_life_hours)
    if hl <= 0.0:
        return None
    return float(magnitude) * (0.5 ** (float(age_hours) / hl))


def share_hhi(shares: Sequence[float] | None) -> float | None:
    """Σ share² over provided shares. Empty/missing → null. Negative share → null."""
    if shares is None:
        return None
    vals = list(shares)
    if not vals:
        return None
    total = 0.0
    for s in vals:
        if s is None or float(s) < 0.0:
            return None
        total += float(s) * float(s)
    return total


def normalize_shares(counts: Sequence[float] | None) -> list[float] | None:
    """counts → shares that sum to 1. Non-positive total or missing → null."""
    if counts is None:
        return None
    vals = [float(c) for c in counts]
    if not vals or any(v < 0.0 for v in vals):
        return None
    tot = sum(vals)
    if tot <= 0.0:
        return None
    return [v / tot for v in vals]


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "half_life_decay",
    "share_hhi",
    "normalize_shares",
)
