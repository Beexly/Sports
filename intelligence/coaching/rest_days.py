"""Days between a team's previous game and the named week.

Read from committed play-by-play. This is a rest fact. It is not an age,
and it is not a tilt. Week 1 has no previous game in this file; that is a
gap, not zero.
"""
from __future__ import annotations

import os
from typing import Any

import pandas as pd

PBP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "play_by_play_2026.parquet")


def _as_date(value: Any) -> str:
    text = str(value)[:10]
    if len(text) != 10 or text[4] != "-":
        raise ValueError(f"game_date is not a date: {value}")
    return text


def rest_before(team: str, season: int, week: int, path: str = PBP) -> dict[str, Any]:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    df = pd.read_parquet(path, columns=["posteam", "defteam", "season", "week", "game_date"])
    played = df[(df.season == season) & ((df.posteam == team) | (df.defteam == team))]
    if played.empty:
        return {
            "team": team,
            "season": season,
            "week": week,
            "rest_days": None,
            "gap": "team has no rows in this file",
            "source": "missing-rows",
        }
    weeks = sorted(int(w) for w in played.week.dropna().unique())
    prior = [w for w in weeks if w < week]
    if not prior:
        return {
            "team": team,
            "season": season,
            "week": week,
            "rest_days": None,
            "gap": "no prior game in this file",
            "source": "real",
            "license": "nflverse CC-BY-4.0",
        }
    prev = prior[-1]
    prev_dates = played.loc[played.week == prev, "game_date"].dropna().unique()
    this_dates = played.loc[played.week == week, "game_date"].dropna().unique()
    if len(prev_dates) != 1 or len(this_dates) != 1:
        return {
            "team": team,
            "season": season,
            "week": week,
            "previous_week": prev,
            "rest_days": None,
            "gap": "game date is not unique for the previous week or this week",
            "source": "real",
        }
    previous_date = _as_date(prev_dates[0])
    game_date = _as_date(this_dates[0])
    delta = (pd.Timestamp(game_date) - pd.Timestamp(previous_date)).days
    return {
        "team": team,
        "season": season,
        "week": week,
        "previous_week": prev,
        "previous_date": previous_date,
        "game_date": game_date,
        "rest_days": int(delta),
        "gap": None,
        "source": "real",
        "license": "nflverse CC-BY-4.0",
        "note": "Days between game dates. Not an age. Not a published tilt.",
    }
