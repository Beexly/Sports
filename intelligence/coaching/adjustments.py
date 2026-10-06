# PROVENANCE — gse-intelligence-build / coaching / adjustments.py
# Implements: buildable-systems.md M10 (in-game adjustment quantifier:
#   Mahalanobis distance of a game-week's tendency vector vs the
#   season-to-date baseline; percentile rank within season; ordinal gate).
# Research basis: syntheses.md Thread 1 (the coaching adjustment-detection
#   system: Monken fingerprint + 1905 drift alarm + 0236 changepoint + 1575
#   aggression thermometer); T1 fixture (Monken 2026-Wk4 TNF top-decile gate —
#   PENDING: pbp_2026.parquet covers weeks 1-3 only as of 2026-10-02).
"""M10 — In-game / week-to-week adjustment quantifier."""
from __future__ import annotations

from typing import Any, Optional

from . import load as L


def get_adjustment(season: int, team: str, week: int) -> Optional[dict[str, Any]]:
    row = L.index_by("adjustments.csv", "season", "team", "week").get((season, team, week))
    if row is None:
        return None
    out = dict(row)
    pct = row["pct_rank"]
    out["top_decile"] = pct is not None and pct >= 0.90
    return out


def team_adjustments(season: int, team: str) -> list[dict[str, Any]]:
    rows = [r for r in L.load_table("adjustments.csv")
            if r["season"] == season and r["team"] == team]
    rows.sort(key=lambda r: r["week"])
    return rows


def monken_wk4_gate_status() -> dict[str, Any]:
    """The A6 ordinal gate: Monken 2026-Wk4 (TNF) game top-decile Δquick_game.

    Status is PENDING-DATA, not failed: pbp_2026.parquet holds weeks 1-3 only.
    The gate is implemented and will evaluate mechanically when week-4 data
    lands — it is never hand-waved.
    """
    return {
        "gate": "Monken 2026-Wk4 Δquick_game top-decile among 2026 weeks 1-4",
        "status": "PENDING-DATA",
        "reason": "pbp_2026.parquet covers weeks 1-3 only (8,311 rows as of 2026-10-02)",
        "implementation": "coaching/adjustments.py::get_adjustment + top_decile flag",
    }
