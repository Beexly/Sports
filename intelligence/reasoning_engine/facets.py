"""EPA facet split. Kernel 02, from committed nflverse play-by-play.

A season EPA total mixes three different facts. This function keeps them
apart. Weeks at or after `before_week` are excluded, so a week-4 read does
not include week-4 plays.
"""
from __future__ import annotations

import os
from typing import Any

import pandas as pd

PBP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "coaching", "data", "play_by_play_2026.parquet")


def epa_facets(team: str, season: int, before_week: int, path: str = PBP) -> dict[str, Any]:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    df = pd.read_parquet(path, columns=["posteam", "season", "week", "epa", "pass", "rush", "interception", "fumble_lost"])
    sub = df[(df.posteam == team) & (df.season == season) & (df.week < before_week)]
    if sub.empty:
        return {
            "team": team,
            "season": season,
            "before_week": before_week,
            "plays": 0,
            "pass_epa": None,
            "rush_epa": None,
            "turnover_epa": None,
            "turnover_n": 0,
            "source": "missing-rows",
            "license": "nflverse CC-BY-4.0",
            "point_in_time": True,
        }
    passed = sub[sub["pass"] == 1]
    rushed = sub[sub["rush"] == 1]
    turnovers = sub[(sub.interception == 1) | (sub.fumble_lost == 1)]
    return {
        "team": team,
        "season": season,
        "before_week": before_week,
        "plays": int(len(sub)),
        "pass_epa": round(float(passed.epa.sum()), 3),
        "rush_epa": round(float(rushed.epa.sum()), 3),
        "turnover_epa": round(float(turnovers.epa.sum()), 3) if len(turnovers) else 0.0,
        "turnover_n": int(len(turnovers)),
        "source": "real",
        "license": "nflverse CC-BY-4.0",
        "point_in_time": True,
        "note": "Sum of play EPA on this team's offensive plays before the named week. Not a win probability.",
    }
