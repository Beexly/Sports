"""Game margins from the committed play-by-play, so the rating equation can load for any week."""
import json
import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
DATA = os.path.join(ROOT, "coaching", "data")
OUT = os.path.join(ROOT, "research", "data", "game_results_2022_2026.json")
YEARS = (2022, 2023, 2024, 2025, 2026)
COLS = ["game_id", "season", "week", "home_team", "away_team", "total_home_score", "total_away_score", "desc"]


def main() -> None:
    rows = []
    for year in YEARS:
        frame = pd.read_parquet(os.path.join(DATA, f"play_by_play_{year}.parquet"), columns=COLS)
        finished = frame.groupby("game_id")["desc"].apply(lambda s: s.astype(str).str.contains("END GAME").any())
        frame = frame[frame["game_id"].isin(finished[finished].index)]
        grouped = frame.groupby("game_id", as_index=False).agg(
            season=("season", "first"),
            week=("week", "first"),
            home=("home_team", "first"),
            away=("away_team", "first"),
            home_score=("total_home_score", "max"),
            away_score=("total_away_score", "max"),
        )
        for rec in grouped.itertuples(index=False):
            if pd.isna(rec.home_score) or pd.isna(rec.away_score):
                continue
            rows.append({
                "season": int(rec.season),
                "week": int(rec.week),
                "home": str(rec.home),
                "away": str(rec.away),
                "margin": float(rec.home_score) - float(rec.away_score),
            })
    rows.sort(key=lambda r: (r["season"], r["week"], r["home"], r["away"]))
    last = max((r["season"], r["week"]) for r in rows)
    doc = {
        "source": "committed play_by_play parquet. A game is included only if a play description contains END GAME. A partial file is not a final score.",
        "n": len(rows),
        "last_finished": {"season": last[0], "week": last[1]},
        "games": rows,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh)
    print(f"games {len(rows)} weeks {sorted({(r['season'], r['week']) for r in rows if r['season']==2026})}")


if __name__ == "__main__":
    main()
