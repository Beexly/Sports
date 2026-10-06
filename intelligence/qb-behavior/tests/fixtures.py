"""Synthetic nflverse-like pbp fixtures. Hermetic: no network, no real data."""
from __future__ import annotations

import polars as pl


def synthetic_pbp() -> pl.DataFrame:
    """20 dropbacks for QB '00-TEST', 2 games, with known properties:

    - 10 targets: WR1 x5, WR2 x3, WR3 x2  -> HHI = .25+.09+.04 = .38
    - 2 INTs on 10 attempts -> int_rate 20.0
    - 2 scrambles on 12 dropbacks -> scramble_rate 1/6
    - 1 sack, 3 qb_hits
    """
    rows = []
    # game 1: 6 dropbacks
    targets_g1 = ["WR1", "WR1", "WR2", "WR3", "WR1", None]
    for i, recv in enumerate(targets_g1):
        rows.append({
            "season": 2024, "week": 1, "game_id": "g1", "qtr": 2,
            "passer_player_id": "00-TEST", "rusher_player_id": "00-TEST",
            "receiver_player_id": recv,
            "qb_dropback": 1, "pass_attempt": 1 if recv else 0,
            "qb_scramble": 1 if recv is None else 0,
            "complete_pass": 1 if recv in ("WR1", "WR2") else 0,
            "interception": 1 if i in (1, 4) else 0,
            "sack": 0, "qb_hit": 1 if i == 2 else 0,
            "epa": 0.1 if recv else -0.2, "air_yards": 8.0 if recv else None,
            "down": 2, "yardline_100": 50, "score_differential": 0,
            "wp": 0.5, "qb_kneel": 0, "qb_spike": 0,
            "rush_attempt": 0,
        })
    # game 2: 6 dropbacks incl. 1 sack, 1 kneel (filtered), 1 garbage-time (filtered)
    for i in range(6):
        rows.append({
            "season": 2024, "week": 2, "game_id": "g2", "qtr": 4 if i == 5 else 3,
            "passer_player_id": "00-TEST", "rusher_player_id": "00-TEST",
            "receiver_player_id": "WR2" if i < 2 else ("WR1" if i < 4 else None),
            "qb_dropback": 1, "pass_attempt": 0 if i in (4, 5) else 1,
            "qb_scramble": 0,
            "complete_pass": 1 if i < 3 else 0,
            "interception": 0,
            "sack": 1 if i == 4 else 0, "qb_hit": 1 if i in (0, 4) else 0,
            "epa": -0.5 if i == 4 else 0.05, "air_yards": 12.0 if i < 4 else None,
            "down": 3 if i < 4 else 1, "yardline_100": 15 if i < 4 else 50,
            "score_differential": 0,
            "wp": 0.99 if i == 5 else 0.5,   # i==5 is garbage time
            "qb_kneel": 1 if i == 5 else 0,   # i==5 also a kneel
            "qb_spike": 0, "rush_attempt": 0,
        })
    return pl.DataFrame(rows)


def synthetic_rosters() -> list[dict]:
    return [
        {"gsis_id": "00-TEST", "full_name": "Test Quarterback"},
        {"gsis_id": "00-WR1", "full_name": "Wide Receiver One"},
        {"gsis_id": None, "full_name": "No Id"},
    ]
