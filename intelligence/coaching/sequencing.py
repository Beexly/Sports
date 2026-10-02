# PROVENANCE — gse-intelligence-build / coaching / sequencing.py
# Implements: buildable-systems.md M08 (first-order sequencing contrast).
# Research basis: deep/c03/buildable-systems.md §M08 — "p(pass | prev run was a
#   success) vs p(pass | prev run failed), same game+drive, success = epa > 0".
#   Kept deliberately simple: no k-th order Markov (overfit), no EPA-magnitude
#   weighting (confounded). Two-sample contrast with SEs; publishable at n>=25.
"""M08 — First-order run-success sequencing contrast."""
from __future__ import annotations

import math
from typing import Any, Optional

from . import common as C
from . import load as L


def get_sequencing(season: int, team: str, down: int) -> Optional[dict[str, Any]]:
    row = L.index_by("sequencing.csv", "season", "team", "down").get((season, team, down))
    if row is None:
        return None
    out = dict(row)
    n = row["n_pairs"] or 0
    out["publishable"] = C.publishable(n)
    c, se = row["contrast"], row["contrast_se"]
    if c is not None and se is not None:
        out["contrast_ci95"] = (round(c - 1.96 * se, 4), round(c + 1.96 * se, 4))
    else:
        out["contrast_ci95"] = (None, None)
    return out


def league_contrast_rank(season: int, down: int) -> list[tuple[str, float]]:
    """Teams ranked by sequencing contrast (most success-reactive first)."""
    rows = [r for r in L.load_table("sequencing.csv")
            if r["season"] == season and r["down"] == down
            and r["contrast"] is not None and C.publishable(r["n_pairs"] or 0)]
    rows.sort(key=lambda r: r["contrast"], reverse=True)
    return [(r["team"], r["contrast"]) for r in rows]
