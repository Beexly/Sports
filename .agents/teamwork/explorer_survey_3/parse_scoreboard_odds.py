import json
from pathlib import Path

repo = Path(r"c:\Users\Garrett\Sports")
sb_path = repo / "docs" / "data-sources" / "research" / "2026-10-18" / "cognitive" / "_raw" / "scoreboard_week_cur.json"
data = json.loads(sb_path.read_text(encoding="utf-8"))

print("Week 6 Games from scoreboard_week_cur.json:")
for ev in data.get("events", []):
    gid = ev.get("id")
    name = ev.get("name")
    short = ev.get("shortName")
    date = ev.get("date")
    comps = ev.get("competitions", [{}])[0]
    odds = comps.get("odds", [{}])[0]
    total = odds.get("overUnder")
    details = odds.get("details")
    spread = odds.get("spread")
    ml = odds.get("moneyline", {})
    home_ml = ml.get("home", {}).get("close", {}).get("odds")
    away_ml = ml.get("away", {}).get("close", {}).get("odds")
    print(f"{gid} | {name} ({short}) | Date: {date} | Total: {total} | Details: {details} | ML: away {away_ml} / home {home_ml}")
