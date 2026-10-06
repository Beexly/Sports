"""Last game date per team from the committed 2026 play-by-play.

This is a fact for REST_DAYS. It is not an age. The live tilt still
abstains until roster age, quarterback age, and line age exist.
"""
import json
import os

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
PBP = os.path.join(HERE, "data", "play_by_play_2026.parquet")
OUT = os.path.join(HERE, "data", "team_last_game_2026.json")

df = pd.read_parquet(PBP, columns=["game_id", "home_team", "away_team", "week", "game_date"])
games = df.drop_duplicates("game_id")
rows = []
for _, g in games.iterrows():
    for team in (g.home_team, g.away_team):
        if isinstance(team, str) and team:
            rows.append({"team": team, "week": int(g.week), "game_date": str(g.game_date)})
played = pd.DataFrame(rows)
last = played.sort_values(["team", "game_date"]).groupby("team").tail(1)
payload = {
    "source": "intelligence/coaching/data/play_by_play_2026.parquet",
    "as_of_week": int(games.week.max()),
    "teams": {
        r.team: {"last_game_date": r.game_date, "last_week": int(r.week)}
        for r in last.itertuples(index=False)
    },
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)
    f.write("\n")
print(f"teams {len(payload['teams'])} as_of_week {payload['as_of_week']}")
