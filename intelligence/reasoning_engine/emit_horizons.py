"""Week-4 weather at T-6h, T-1h, and kickoff. Same keys at every horizon."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from reasoning_engine.slate import COORDS, fetch_horizons, weather_record

SRC = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "survey", "w4-scoreboard.json")
board = json.load(open(SRC, encoding="utf-8"))
games = []
for ev in board["events"]:
    comp = ev["competitions"][0]
    home = away = None
    for t in comp["competitors"]:
        if t.get("homeAway") == "home":
            home = t["team"]["abbreviation"]
        else:
            away = t["team"]["abbreviation"]
    venue = comp.get("venue") or {}
    indoor = bool(venue.get("indoor"))
    neutral = "Tottenham" in (venue.get("fullName") or "")
    kickoff = ev["date"]
    row = {"kickoff": kickoff, "away": away, "home": home, "venue": venue.get("fullName"), "indoor": indoor}
    if indoor:
        empty = weather_record(None, 0, kickoff[:13] + ":00", indoor=True, source="site-flag")
        row["weather"] = {name: {**empty, "offsetHours": hours} for hours, name in ((-6, "t_minus_6h"), (-1, "t_minus_1h"), (0, "kickoff"))}
    elif neutral or home not in COORDS:
        empty = weather_record(None, 0, "", indoor=False, source="unavailable")
        empty["reason"] = "no committed stadium coordinate"
        row["weather"] = {name: {**empty, "offsetHours": hours} for hours, name in ((-6, "t_minus_6h"), (-1, "t_minus_1h"), (0, "kickoff"))}
    else:
        lat, lon = COORDS[home]
        try:
            row["weather"] = fetch_horizons(lat, lon, kickoff)
        except Exception as exc:
            empty = weather_record(None, 0, "", indoor=False, source="unavailable")
            empty["reason"] = f"fetch failed: {type(exc).__name__}"
            row["weather"] = {name: {**empty, "offsetHours": hours} for hours, name in ((-6, "t_minus_6h"), (-1, "t_minus_1h"), (0, "kickoff"))}
    games.append(row)
    w6 = row["weather"]["t_minus_6h"]
    print(away, "at", home, "T-6", w6.get("windMph"), "T-1", row["weather"]["t_minus_1h"].get("windMph"),
          "KO", row["weather"]["kickoff"].get("windMph"), row["weather"]["kickoff"].get("applied"))

out = os.path.join(ROOT, "reasoning_engine", "traces", "week4-2026-weather-horizons.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump({
    "week": 4,
    "season": 2026,
    "horizons": ["t_minus_6h", "t_minus_1h", "kickoff"],
    "source_board": "espn scoreboard week=4 seasontype=2 dates=2026",
    "games": games,
    "note": "Each horizon has the same keys. A missing hour is null, not the neighboring hour's wind. Priors are not calibrated.",
}, open(out, "w", encoding="utf-8"), indent=2)
print("wrote", out, "games", len(games))
