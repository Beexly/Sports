#!/usr/bin/env python3
"""load_filter.py -- the frozen REG 2017 W1..2026 W5 filter. DIAGNOSTIC ONLY.

Margin is home_score - away_score. mu is spread_line. No imputation: a game
missing home_score, away_score, or spread_line is skipped and counted.
"""
import csv
import os

GAMES = os.environ.get(
    "GAMES_CSV",
    r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/nflverse_games.csv",
)


def _num(x, k):
    v = x.get(k)
    if v in ("", "NA", None):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def load_filter():
    rows, skipped = [], 0
    with open(GAMES, newline="", encoding="utf-8") as f:
        for x in csv.DictReader(f):
            if x.get("game_type") != "REG":
                continue
            try:
                s, w = int(x["season"]), int(x["week"])
            except (TypeError, ValueError, KeyError):
                skipped += 1
                continue
            if not (s >= 2017 and (s < 2026 or (s == 2026 and w <= 5))):
                continue
            hs, aws, sp = _num(x, "home_score"), _num(x, "away_score"), _num(x, "spread_line")
            if hs is None or aws is None or sp is None:
                skipped += 1
                continue
            rows.append({
                "game_id": x["game_id"], "season": s, "week": w,
                "home": x.get("home_team"), "away": x.get("away_team"),
                "spread": sp, "margin": hs - aws,
                "home_rest": _num(x, "home_rest"), "away_rest": _num(x, "away_rest"),
                "total_line": _num(x, "total_line"),
                "div_game": x.get("div_game"), "roof": x.get("roof"),
                "weekday": x.get("weekday"), "location": x.get("location"),
            })
    return rows, skipped


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..",
                                    "intelligence", "ratings"))
    import engine_math as em
    rows, skipped = load_filter()
    tot = sum(em.crps_gaussian(g["spread"], 13.45, g["margin"]) for g in rows)
    print("n", len(rows), "skipped", skipped, "crps", repr(tot / len(rows)))
    miss = sum(1 for g in rows if g["home_rest"] is None or g["away_rest"] is None)
    print("missing rest rows", miss)
