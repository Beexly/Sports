"""Three traces from committed measurements. Not fixture scoreGame picks."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from reasoning_engine.facets import epa_facets

GAMES = (("CLE", "PIT"), ("BUF", "NE"), ("CHI", "NYJ"))
PBP = os.path.join(ROOT, "coaching", "data", "play_by_play_2026.parquet")
WEATHER = os.path.join(ROOT, "reasoning_engine", "traces", "week4-2026-weather-horizons.json")
OUT = os.path.join(ROOT, "reasoning_engine", "traces")


def main() -> None:
    weather = { (g["away"], g["home"]): g for g in json.load(open(WEATHER, encoding="utf-8"))["games"] }
    for home, away in GAMES:
        facts = []
        for team in (home, away):
            facet = epa_facets(team, 2026, 4, PBP)
            facts.append({
                "signal": f"{team}.epa_facets",
                "value": facet,
                "source": "real",
                "license": "nflverse CC-BY-4.0",
                "fired": facet["plays"] > 0,
                "weight": None,
                "weight_status": "not-fitted",
            })
        wx = weather.get((away, home))
        facts.append({
            "signal": "weather_horizons",
            "value": None if wx is None else wx.get("horizons"),
            "source": "real" if wx else "gap",
            "license": "CC-BY-4.0; hosted free tier is non-commercial",
            "fired": bool(wx and wx.get("horizons")),
            "weight": None,
            "weight_status": "prior-not-applied-unless-wind-over-15",
        })
        doc = {
            "game_id": f"{away}-at-{home}-2026-w4",
            "bet_type": None,
            "pick": None,
            "probability_before_calibration": None,
            "probability_after_calibration": None,
            "confidence": None,
            "facts": facts,
            "gaps": ["no published pick", "tau served table is a point fit, not used as a probability"],
            "fit_stamp": "point fit — not pre-kickoff. 2026 unit cells pool in-season weeks.",
        }
        path = os.path.join(OUT, f"{away.lower()}-at-{home.lower()}-w4.json")
        json.dump(doc, open(path, "w", encoding="utf-8"), indent=2)
        print("wrote", path)


if __name__ == "__main__":
    main()
