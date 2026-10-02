"""Fit the paper's rating equation on games before a week. Write the fact, not a pick."""
import json
import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from research.iwinrnfl_ratings import before, expected_margin, fit, paper_normal_approx

DATA = os.path.join(ROOT, "coaching", "data")
OUT = os.path.join(ROOT, "research", "data", "iwinrnfl_ratings_2026_w4.json")
YEARS = (2022, 2023, 2024, 2025, 2026)
COLS = ["game_id", "season", "week", "home_team", "away_team", "total_home_score", "total_away_score"]


def games() -> list[dict]:
    rows = []
    for year in YEARS:
        path = os.path.join(DATA, f"play_by_play_{year}.parquet")
        frame = pd.read_parquet(path, columns=COLS)
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
    return rows


def mae(solved: dict, held: list[dict]) -> float:
    err = 0.0
    n = 0
    for game in held:
        try:
            pred = expected_margin(solved, str(game["home"]), str(game["away"]))
        except Exception:
            continue
        err += abs(float(pred["expected_margin"]) - float(game["margin"]))
        n += 1
    if n == 0:
        raise SystemExit("held-out set produced no comparable games")
    return err / n


def main() -> None:
    book = games()
    visible = before(book, 2026, 4)
    solved = fit(visible)
    cards = []
    for home, away in (("CLE", "PIT"), ("BUF", "NE"), ("CHI", "NYJ")):
        margin = expected_margin(solved, home, away)
        approx = paper_normal_approx(float(margin["expected_margin"]))
        cards.append({"margin": margin, "paper_normal_approx": approx})
    train = before(book, 2024, 1)
    held = [g for g in book if int(g["season"]) in (2024, 2025)]
    held_mae = mae(fit(train), held)
    doc = {
        "paper": "1704.00197v3",
        "equation": "minimize sum (margin - (h + R_home - R_away))^2, sum R = 0",
        "as_of": "before 2026 week 4",
        "n_games": solved["n_games"],
        "home_edge": solved["home_edge"],
        "ratings": solved["ratings"],
        "gamma_blend": None,
        "gamma_blend_status": "withheld — pre-season win totals are not in this repo",
        "table_1_probability": None,
        "table_1_status": "refused — standardization constants were not printed",
        "held_out_mae_2024_2025": held_mae,
        "held_out_note": "Trained on games before 2024 week 1. MAE is points, not a win rate.",
        "cards": cards,
        "publishes_pick": False,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2)
    print(f"games_visible {solved['n_games']} home_edge {solved['home_edge']:.3f} held_out_mae {held_mae:.3f}")
    for card in cards:
        m = card["margin"]
        print(m["home"], m["away"], f"margin {m['expected_margin']:.2f}", "pick", m["publishes_pick"])


if __name__ == "__main__":
    main()
