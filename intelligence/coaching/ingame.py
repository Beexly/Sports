# PROVENANCE — gse-intelligence-build / coaching / ingame.py
# Implements: buildable-systems.md M12 (in-game aggression: timeout management
#   descriptive; the challenge-inference question is NOT answerable from pbp —
#   challenge fields are absent, so nothing is emitted for it).
# Research basis: challenges.md (challenge fields not in nflverse pbp);
#   c04 owns 4th-down go-for decisions (τ) — this module never duplicates it.
"""M12 — In-game management (descriptive timeout layer only).

Deliberately narrow: 4th-down aggression belongs to c04's τ module; challenge
decisions are unmeasurable from pbp. What remains is timeout usage, which is
real, measured, and honestly scoped.
"""
from __future__ import annotations

from typing import Any, Optional

from . import load as L


def get_timeouts(season: int, team: str) -> Optional[dict[str, Any]]:
    row = L.index_by("timeouts.csv", "season", "team").get((season, team))
    return dict(row) if row is not None else None


def league_timeout_rank(season: int) -> list[tuple[str, float]]:
    """Teams by timeouts-per-game (most timeout-happy first). Descriptive."""
    rows = [r for r in L.load_table("timeouts.csv") if r["season"] == season]
    rows.sort(key=lambda r: r["timeouts_per_game"] or 0.0, reverse=True)
    return [(r["team"], r["timeouts_per_game"]) for r in rows]
