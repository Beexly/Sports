# PROVENANCE — gse-intelligence-build / coaching / dc_pressure.py
# Implements: buildable-systems.md M11 (DC pressure splits).
# Research basis: challenges.md — blitz rate is NOT in nflverse (DATA_GAPS.md);
#   honest outcome proxies only (sack+hit rate vs dropbacks, TFL rate vs runs),
#   every number labeled outcome-not-frequency. True blitz/man/zone rates stay
#   NaN until charting data arrives (charting-gapped, never zero-filled).
"""M11 — Defensive-coordinator pressure splits (outcome proxies, honestly labeled)."""
from __future__ import annotations

from typing import Any, Optional

from . import load as L


def get_pressure(season: int, team: str, down: int, dist_bin: str) -> Optional[dict[str, Any]]:
    """Pressure proxy = (sacks + QB hits) / dropbacks, by down and distance bin.

    proxy_label is always 'outcome-not-frequency': this is what the defense
    ACHIEVED, not how often it blitzed. blitz_rate itself is unavailable.
    """
    row = L.index_by("dc_pressure.csv", "season", "team", "down", "dist_bin").get(
        (season, team, down, dist_bin))
    return dict(row) if row is not None else None


def team_pressure_profile(season: int, team: str) -> list[dict[str, Any]]:
    rows = [dict(r) for r in L.load_table("dc_pressure.csv")
            if r["season"] == season and r["team"] == team]
    rows.sort(key=lambda r: (r["down"], r["dist_bin"]))
    return rows


def honest_gaps() -> dict[str, str]:
    """Charting-gapped fields: present in the contract as None, never zero."""
    return {
        "blitz_rate": "not in nflverse pbp — charting-gapped (DATA_GAPS.md)",
        "man_coverage_rate": "not in nflverse pbp — charting-gapped (DATA_GAPS.md)",
        "two_high_rate": "not in nflverse pbp — charting-gapped (DATA_GAPS.md)",
    }
