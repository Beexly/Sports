"""Profiles from the committed coach seed. No invented teams."""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, "..", "data", "coach_offense.csv")
rows = list(csv.DictReader(open(src, encoding="utf-8")))
out = []
for row in rows:
    out.append({
        "coach": row["coach"],
        "team": row["team"],
        "season": int(row["season"]),
        "role": row["role"],
        "plays": int(row["plays"]),
        "quick_game_rate": float(row["quick_game_rate"]),
        "pass_rate_early": float(row["pass_rate_early"]),
        "source": "intelligence/coaching/data/coach_offense.csv",
        "note": row.get("note") or "",
    })
path = os.path.join(HERE, "from_seed.json")
json.dump(out, open(path, "w", encoding="utf-8"), indent=2)
print(len(out), "profiles")
