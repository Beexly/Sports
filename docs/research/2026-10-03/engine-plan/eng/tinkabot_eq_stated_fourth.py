"""Stated 4th-down / half-field identities for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. No HOLD restores. No τ fit.

Sources (corpus cites, not fit coefficients):
- docs/engine/research/2026-10-02/corpus-deep/deep/c04/buildable-systems.md
  4th-down plays (down==4); region own/opp half; inclusion (≥25 rule);
  WP gap = WP(a*) − WP(a_observed)
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"

# Stated inclusion floor from c04 (≥25 rule per CH-1)
TAU_N_INCLUSION_FLOOR = 25
# nflverse yardline_100: yards from opponent end zone; own half is > 50
OWN_HALF_YARDLINE = 50.0


def _null(x: float | None) -> bool:
    return x is None


def is_fourth(down: float | None) -> float | None:
    """c04: 4th-down plays are down==4. Missing down → null."""
    if _null(down):
        return None
    return 1.0 if float(down) == 4.0 else 0.0


def field_half(yardline_100: float | None) -> str | None:
    """c04 region own/opp half via yardline_100: >50 own, ≤50 opp. Missing → null."""
    if _null(yardline_100):
        return None
    y = float(yardline_100)
    return "own" if y > OWN_HALF_YARDLINE else "opp"


def tau_n_include(n_decisions: float | None, floor: float = TAU_N_INCLUSION_FLOOR) -> float | None:
    """c04 inclusion flag: n_decisions ≥ 25. Missing n → null."""
    if _null(n_decisions):
        return None
    return 1.0 if float(n_decisions) >= floor else 0.0


def wp_action_gap(wp_star: float | None, wp_observed: float | None) -> float | None:
    """c04: WP gap = WP(a*) − WP(a_observed). Missing either → null."""
    if _null(wp_star) or _null(wp_observed):
        return None
    return float(wp_star) - float(wp_observed)


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "is_fourth",
    "field_half",
    "tau_n_include",
    "wp_action_gap",
)
