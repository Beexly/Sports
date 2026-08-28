#!/usr/bin/env python3
"""
Build market-lines harness from nflverse games.csv (with different schema) to JSONL.
"""
import csv, json, sys, os
from datetime import datetime

SRC = "C:/Users/Garrett/Sports/data/nflverse/games.csv"
if not os.path.exists(SRC):
    print(f"Downloading {SRC} from nflverse-data...")
    url = "https://raw.githubusercontent.com/nflverse/nflverse-data/master/data/games.csv"
    urllib.request.urlretrieve(url, SRC)

# We'll use the local copy
SRC = "C:/Users/Garrett/Sports/data/nflverse/games.csv"
DST = "C:/Users/Garrett/Sports/data/nflverse/games_harness_rows.jsonl"

def num_or_none(s):
    s = s.strip() if s else s
    if s == "" or s == "NA" or s == "NULL":
        return None
    try:
        f = float(s)
        return int(f) if f == int(f) else f
    except ValueError:
        try:
            return int(s)
        except ValueError:
            return None

def bool_or_false(s):
    return s.strip() == "1" if s else False

count_total = 0
count_reg = 0  # we treat all as regular season for now
count_scored = 0
count_spread = 0
count_total_line = 0

with open(SRC, newline="") as f:
    reader = csv.DictReader(f)
    out = open(DST, "w")
    for row in reader:
        count_total += 1
        # We don't have game_type; assume all are regular season
        count_reg += 1
        away_score_s = row.get("score_away", "").strip()
        home_score_s = row.get("score_home", "").strip()
        has_score = (away_score_s != "" and home_score_s != "")
        if has_score:
            count_scored += 1
        # Skip future games (no score) for output but still count
        if not has_score:
            continue

        # Compute spread for home team
        spread_favorite = num_or_none(row.get("spread_favorite"))
        team_favorite_id = row.get("team_favorite_id")
        home_id = row.get("home_id")
        away_id = row.get("away_id")
        spread_home = None
        if spread_favorite is not None and home_id and away_id and team_favorite_id:
            if team_favorite_id == home_id:
                spread_home = spread_favorite  # favorite is home, spread_favorite is negative (home gives points)
            elif team_favorite_id == away_id:
                spread_home = -spread_favorite  # favorite is away, spread_favorite negative, so home gets positive
            else:
                # favorite is neither? shouldn't happen
                spread_home = None

        total_line = num_or_none(row.get("over_under_line"))

        # Determine result: we have winning_team column (maybe "home" or "away" or "draw"?)
        winning_team = row.get("winning_team", "").strip().lower()
        result = None
        if winning_team == "home":
            result = 1
        elif winning_team == "away":
            result = -1
        elif winning_team == "draw":
            result = 0
        else:
            # fallback: compare scores
            if home_score_s != "" and away_score_s != "":
                hs = int(home_score_s)
                as_ = int(away_score_s)
                if hs > as_:
                    result = 1
                elif hs < as_:
                    result = -1
                else:
                    result = 0

        # Compute weekday from schedule_date
        gameday = row.get("schedule_date")
        weekday = None
        if gameday:
            try:
                dt = datetime.strptime(gameday, "%Y-%m-%d")
                weekday = dt.strftime("%A")  # Monday, Tuesday, etc.
            except ValueError:
                pass

        record = {
            "gameId": f"{row.get('schedule_season')}_{row.get('schedule_week')}_{row.get('team_home')}_{row.get('team_away')}",
            "season": int(row.get("schedule_season")) if row.get("schedule_season") else None,
            "week": int(row.get("schedule_week")) if row.get("schedule_week") else None,
            "gameday": gameday,
            "weekday": weekday,
            "homeTeam": row.get("team_home"),
            "awayTeam": row.get("team_away"),
            "homeScore": int(home_score_s) if home_score_s else None,
            "awayScore": int(away_score_s) if away_score_s else None,
            "result": result,
            "total": int(row.get("point_total")) if row.get("point_total") else None,
            "overtime": None,  # not available
            "spreadLineHome": spread_home,
            "awaySpreadOdds": None,  # not available
            "homeSpreadOdds": None,  # not available
            "totalLine": total_line,
            "awayMoneyline": None,
            "homeMoneyline": None,
            "underOdds": None,
            "overOdds": None,
            "divGame": None,  # not available
        }
        out.write(json.dumps(record, separators=(",", ":")) + "\n")
        if record["spreadLineHome"] is not None:
            count_spread += 1
        if record["totalLine"] is not None:
            count_total_line += 1
    out.close()

# Compute per-decade emission
from collections import Counter
decades = Counter()
if os.path.exists(DST):
    with open(DST) as f:
        for line in f:
            rec = json.loads(line)
            d = (rec["season"] // 10) * 10
            decades[d] += 1

print("=== Market-lines harness summary (adapted) ===")
print(f"Total CSV rows:        {count_total}")
print(f"Regular-season rows:     {count_reg}")
print(f"Scored REG games (emitted): {count_scored}")
print(f"With spread line:       {count_spread}")
print(f"With total line:         {count_total_line}")
print("Per-decade emission:")
for d in sorted(decades):
    print(f"  {d}s: {decades[d]}")
