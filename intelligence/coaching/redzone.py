# PROVENANCE — gse-intelligence-build / coaching / redzone.py
# Implements: buildable-systems.md M05 (red-zone mix + RZ PROE over
#   (season, down, ydstogo_bin) RZ cells, EB k=60; goal-to-go split).
# Research basis: Paganetti situational splits (red-zone/goal-to-go layer);
#   1575 publication gate (n>=25) applied to every emitted number.
"""M05 — Red-zone playcalling mix."""
from __future__ import annotations

from typing import Any, Optional

from . import common as C
from . import load as L

EB_K_RZ = 60.0  # build-time EB strength for RZ PROE (build_tables.py)


def get_rz_mix(season: int, team: str) -> Optional[dict[str, Any]]:
    row = L.index_by("rz_mix.csv", "season", "team").get((season, team))
    if row is None:
        return None
    out = dict(row)
    n = row["n_rz_plays"] or 0
    out["publishable"] = C.publishable(n)
    gtg_n = row["n_gtg_plays"] or 0
    out["gtg_publishable"] = C.publishable(gtg_n)
    return out


def second_and_short(season: int, team: str, situation: str = "2n1") -> Optional[dict[str, Any]]:
    """2nd-&-1 (Paganetti anchor) or 2nd-&-<=3 pass rates.

    NOTE (challenges.md honesty rule): the published 2025 anchor (20.6%) is
    UNREPRODUCED from the nflverse 2022-2026 vintage — five reasonable "normal
    situations" filters all land 26-29%. Direction (2026 >> 2025) and the 2026
    level reproduce. This function reports the computed value with its filter
    documented, never the anchor.
    """
    row = L.index_by("second_and_short.csv", "season", "team", "situation").get(
        (season, team, situation))
    if row is None:
        return None
    out = dict(row)
    out["publishable"] = C.publishable(row["n_plays"] or 0)
    out["filter"] = "all scrimmage plays (no 'normal situations' filter — unrecoverable)"
    return out


def get_rz_td_pct(season: int, team: str) -> Optional[float]:
    """Sketch 2: Return team redzone_td_pct from master_weeks_1_to_7_pbp_tendencies_2026.json (or rz_mix fallback)."""
    import json
    from pathlib import Path

    root = Path(__file__).resolve().parents[2]
    master_path = root / "data" / "film_room_2026" / "master_weeks_1_to_7_pbp_tendencies_2026.json"
    if master_path.is_file() and int(season) == 2026:
        try:
            data = json.loads(master_path.read_text(encoding="utf-8"))
            teams = data.get("teams", data)
            t_node = teams.get(team.upper())
            if t_node and t_node.get("redzone_td_pct") is not None:
                return float(t_node["redzone_td_pct"])
        except Exception:
            pass
    row = get_rz_mix(season, team)
    if row and row.get("rz_td_rate") is not None:
        return float(row["rz_td_rate"])
    return None
