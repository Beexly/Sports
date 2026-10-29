#!/usr/bin/env python3
"""Write the week-8 board JSON. Does not invent sides, props, or CLV."""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SNAPSHOT = os.path.join(ROOT, "docs", "engine", "research", "2026-10-29", "espn-scoreboard-week8-2026-10-29.json")
OUTPUTS = [
    os.path.join(ROOT, "data", "writeups", "latest_slate_writeups.json"),
    os.path.join(ROOT, "data", "packages", "live-slate-writeups.json"),
]
PASS_REASON = (
    "PASS. Posted number is the scoreboard field, not a model side. "
    "No Weeks 1-7 kinematic bind was computed for this game in this round, "
    "so pace, shell, trench, separation, and load concentration are not recorded. "
    "expectedClv is not recorded."
)

def window_slot(date: str) -> str:
    if date.startswith("2026-10-30"):
        return "TNF"
    if date == "2026-11-02T01:20Z":
        return "SNF"
    if date == "2026-11-03T01:15Z":
        return "MNF"
    if "T21:" in date:
        return "SUN_LATE"
    return "SUN_EARLY"

def main() -> int:
    with open(SNAPSHOT, encoding="utf-8") as handle:
        snap = json.load(handle)
    games = []
    for event in snap["events"]:
        home = next(team for team in event["teams"] if team["homeAway"] == "home")
        away = next(team for team in event["teams"] if team["homeAway"] == "away")
        games.append({
            "id": f"board-2026-w8-{event['id']}",
            "espnEventId": event["id"],
            "matchup": f"{away['name']} @ {home['name']}",
            "awayTeam": away["name"],
            "homeTeam": home["name"],
            "awayAbbr": away["abbr"],
            "homeAbbr": home["abbr"],
            "kickoff": event["date"],
            "windowSlot": window_slot(event["date"]),
            "postedDetails": event["details"],
            "postedTotal": event["overUnder"],
            "scoreboardStatus": event["status"],
            "publication": "PASS",
            "passReason": PASS_REASON,
        })
    if len(games) != 14 or games[0]["espnEventId"] != "401873023":
        print("refusing to write: snapshot is not the 14-game week-8 board", file=sys.stderr)
        return 1
    payload = {
        "season": snap["season"],
        "week": snap["week"],
        "byes": snap["byes"],
        "fetched_utc": snap["fetched_utc"],
        "source": snap["source"],
        "publication": "PASS",
        "packagedPlayCount": 0,
        "note": PASS_REASON,
        "games": games,
    }
    for path in OUTPUTS:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
            handle.write("\n")
        print(f"wrote {len(games)} PASS cards to {path}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
