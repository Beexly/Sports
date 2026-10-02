"""Week 5 margins from games that have actually ended. Unplayed week-4 games are absent, not zero."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from research.iwinrnfl_ratings import card_before

GAMES = os.path.join(ROOT, "research", "data", "game_results_2022_2026.json")
SLATE = os.path.join(ROOT, "research", "data", "week5_2026_slate.json")
OUT = os.path.join(ROOT, "research", "data", "iwinrnfl_week5_2026_margins.json")


def main() -> None:
    games = json.load(open(GAMES, encoding="utf-8"))["games"]
    slate = json.load(open(SLATE, encoding="utf-8"))
    finished_w4 = [g for g in games if g["season"] == 2026 and g["week"] == 4]
    cards = []
    for game in slate:
        card = card_before(games, 2026, 5, game["home"], game["away"])
        card["gameday"] = game["gameday"]
        cards.append(card)
    doc = {
        "paper": "1704.00197v3",
        "as_of": "before 2026 week 5",
        "slate_source": "nflverse schedules games.csv, REG week 5, retrieved 2026-10-02",
        "week4_finished_in_window": finished_w4,
        "week4_note": "Only games with END GAME are in the fit. The other week-4 games are not in the parquet. They are absent, not scored as zero.",
        "publishes_pick": False,
        "cards": cards,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2)
    for card in cards:
        print(f"{card['away']} at {card['home']} {card['expected_margin']:.2f}")


if __name__ == "__main__":
    main()
