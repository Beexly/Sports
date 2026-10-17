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
    df = pd.read_parquet(
        path,
        columns=[
            "posteam", "season", "week", "epa", "pass", "rush",
            "interception", "fumble_lost",
            # metric-universe extension (same play-by-play, no new data source):
            "success", "air_yards", "wpa", "cpoe", "xyac_mean_yardage",
            "complete_pass", "pass_attempt", "air_epa", "yac_epa",
        ],
    )
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
            # metric-universe extension (empty-row shape)
            "success_rate": None,
            "air_yards_per_att": None,
            "wpa": None,
            "cpoe_mean": None,
            "xyac_mean": None,
            "comp_air_epa": None,
            "comp_yac_epa": None,
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
        # metric-universe extension: the same play-by-play carries these; they
        # are the L1 facts the doctrine's floor names (SR / air yards / WPA /
        # CPOE / XYAC), point-in-time by the same before_week rule.
        "success_rate": round(float(sub["success"].fillna(0).mean()), 4),
        "air_yards_per_att": round(float(passed["air_yards"].dropna().mean()), 2) if len(passed) else None,
        "wpa": round(float(sub["wpa"].fillna(0).sum()), 3),
        "cpoe_mean": round(float(passed["cpoe"].dropna().mean()), 3) if len(passed) and passed["cpoe"].notna().any() else None,
        "xyac_mean": round(float(passed["xyac_mean_yardage"].dropna().mean()), 2) if len(passed) and passed["xyac_mean_yardage"].notna().any() else None,
        "comp_air_epa": round(float(sub["air_epa"].fillna(0).sum()), 3),
        "comp_yac_epa": round(float(sub["yac_epa"].fillna(0).sum()), 3),
        "source": "real",
        "license": "nflverse CC-BY-4.0",
        "point_in_time": True,
        "note": "Sum/mean of play-level facts on this team's offensive plays before the named week (EPA, SR, air yards, WPA, CPOE, XYAC). Not a win probability.",
    }
