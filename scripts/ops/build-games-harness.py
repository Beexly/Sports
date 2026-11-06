#!/usr/bin/env python3
"""Build market-lines harness from nflverse games.csv to JSONL."""
import csv, json, sys
from collections import Counter

SRC = "C:/Users/Garrett/Sports/data/nflverse/games.csv"
DST = "C:/Users/Garrett/Sports/data/nflverse/games_harness_rows.jsonl"

fields = [
    "gameId", "season", "week", "gameday", "weekday",
    "homeTeam", "awayTeam", "homeScore", "awayScore",
    "result", "total", "overtime",
    "spreadLineHome", "awaySpreadOdds", "homeSpreadOdds", "totalLine",
    "awayMoneyline", "homeMoneyline",
    "underOdds", "overOdds", "divGame"
]

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
count_scored = 0
count_spread = 0
count_total_line = 0
count_reg = 0

with open(SRC, newline="") as f:
    reader = csv.DictReader(f)
    out = open(DST, "w")
    for row in reader:
        count_total += 1
        if row.get("game_type", "").strip() != "REG":
            continue
        count_reg += 1
        away_score_s = row.get("away_score", "").strip()
        home_score_s = row.get("home_score", "").strip()
        # Skip future games (empty scores) but keep countable
        has_score = (away_score_s != "" and home_score_s != "")
        if has_score:
            count_scored += 1
        # Only write regular-season rows (with or without score) to harness
        # Per instructions: skip empty-score rows from output but count them.
        if not has_score:
            continue
        # Only regular season (already filtered above); we keep future REG
        # games countable but do NOT emit them.
        record = {
            "gameId": row["game_id"],
            "season": int(row["season"]),
            "week": int(row["week"]) if row.get("week", "").strip() != "" else None,
            "gameday": row.get("gameday"),
            "weekday": row.get("weekday"),
            "homeTeam": row.get("home_team"),
            "awayTeam": row.get("away_team"),
            "homeScore": int(home_score_s) if home_score_s != "" else None,
            "awayScore": int(away_score_s) if away_score_s != "" else None,
            "result": int(row.get("result", "").strip()) if row.get("result", "").strip() != "" else None,
            "total": int(row.get("total", "").strip()) if row.get("total", "").strip() != "" else None,
            "overtime": bool_or_false(row.get("overtime", "")),
            "spreadLineHome": num_or_none(row.get("spread_line", "")),
            "awaySpreadOdds": num_or_none(row.get("away_spread_odds", "")),
            "homeSpreadOdds": num_or_none(row.get("home_spread_odds", "")),
            "totalLine": num_or_none(row.get("total_line", "")),
            "awayMoneyline": num_or_none(row.get("away_moneyline", "")),
            "homeMoneyline": num_or_none(row.get("home_moneyline", "")),
            "underOdds": num_or_none(row.get("under_odds", "")),
            "overOdds": num_or_none(row.get("over_odds", "")),
            "divGame": num_or_none(row.get("div_game", "")),
        }
        # Add any other price columns verbatim as numbers-or-null (already included)
        out.write(json.dumps(record, separators=(",", ":")) + "\n")
        if record["spreadLineHome"] is not None:
            count_spread += 1
        if record["totalLine"] is not None:
            count_total_line += 1
    out.close()

decades = Counter()
with open(DST) as f:
    for line in f:
        rec = json.loads(line)
        d = (rec["season"] // 10) * 10
        decades[d] += 1

print("=== Market-lines harness summary ===")
print(f"Total CSV rows:        {count_total}")
print(f"Regular-season rows:     {count_reg}")
print(f"Scored REG games (emitted): {count_scored}")
print(f"With spread line:       {count_spread}")
print(f"With total line:         {count_total_line}")
print("Per-decade emission:")
for d in sorted(decades):
    print(f"  {d}s: {decades[d]}")
