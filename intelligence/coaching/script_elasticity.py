# PROVENANCE — gse-intelligence-build / coaching / script_elasticity.py
# Implements: buildable-systems.md M06 (script elasticity: OLS slope of
#   early-down pass rate on WP bin, plays-weighted, >=4 non-empty bins).
# Research basis: 1638 (demoted to ADAPT-with-a-causal-gate per challenges.md —
#   the number never enters the NFL model; elasticity is the honest NFL analog
#   of initial-vs-final-scheme measurement, computed descriptively).
"""M06 — Script elasticity: how much a team's early-down pass rate moves with
win probability. Negative slope = normal (run more when ahead); ~0 = game-state
independent; positive = unusual (pass MORE when ahead)."""
from __future__ import annotations

from typing import Any, Optional

from . import load as L


def get_elasticity(season: int, team: str) -> Optional[dict[str, Any]]:
    row = L.index_by("script_elasticity.csv", "season", "team").get((season, team))
    if row is None:
        return None
    out = dict(row)
    b = row["beta_script"]
    if b is None:
        out["interpretation"] = "insufficient data (<4 non-empty WP bins)"
    elif b < -0.3:
        out["interpretation"] = "strongly game-state responsive (runs away with leads)"
    elif b < -0.1:
        out["interpretation"] = "moderately game-state responsive"
    elif b <= 0.1:
        out["interpretation"] = "game-state independent scripting"
    else:
        out["interpretation"] = "unusual: passes more when ahead — flag for scheme review"
    return out
