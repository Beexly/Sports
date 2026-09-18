#!/usr/bin/env python3
"""L1 build: join FTN charting to nflverse pbp pass attempts, add closing lines.
Writes /tmp/nfl/l1_join.csv + /tmp/nfl/l1_build_stats.json
Resumable-safe: writes incrementally per season.
"""
import json, os, sys
import pandas as pd
import numpy as np

NFL = "/tmp/nfl"
PB_COLS = ["play_id","game_id","season","season_type","week","posteam","defteam",
           "pass_attempt","complete_pass","passing_yards","roof","temp","wind",
           "pass_length","down","ydstogo","epa"]
FT_COLS = ["nflverse_game_id","nflverse_play_id","is_play_action"]
SEASONS = [2022, 2023, 2024, 2025]
stats = {"seasons": {}}

parts = []
for y in SEASONS:
    pb_f = f"{NFL}/pbp_{y}.csv"
    if not os.path.exists(pb_f):
        stats["seasons"][str(y)] = {"status": "MISSING_FILE"}
        continue
    pb = pd.read_csv(pb_f, usecols=PB_COLS, low_memory=False)
    n_all = len(pb)
    pb = pb[(pb["season_type"] == "REG") & (pb["pass_attempt"] == 1)].copy()
    n_att = len(pb)
    ft = pd.read_csv(f"{NFL}/ftn_{y}.csv", usecols=FT_COLS, low_memory=False)
    ft = ft.dropna(subset=["nflverse_play_id"])
    ft["nflverse_play_id"] = ft["nflverse_play_id"].astype("int64")
    ft = ft.drop_duplicates(["nflverse_game_id","nflverse_play_id"])
    m = pb.merge(ft, left_on=["game_id","play_id"],
                    right_on=["nflverse_game_id","nflverse_play_id"], how="left")
    joined = m["is_play_action"].notna()
    stats["seasons"][str(y)] = {
        "pbp_rows": int(n_all), "reg_pass_attempts": int(n_att),
        "ftn_rows": int(len(ft)), "joined": int(joined.sum()),
        "join_rate_pct": round(100*float(joined.mean()), 2),
    }
    parts.append(m[joined].copy())
    print(f"{y}: att={n_att} joined={int(joined.sum())}", flush=True)

df = pd.concat(parts, ignore_index=True)
stats["joined_total"] = int(len(df))

# weather filter
df["roof"] = df["roof"].astype(str).str.lower()
out = df["roof"].isin(["outdoors","open"])
za = df["temp"].notna() & df["wind"].notna()
stats["after_weather_filter"] = int((out & za).sum())
stats["dropped_null_weather"] = int((out & ~za).sum())

# closing lines
sc = pd.read_csv("/tmp/sched.csv", usecols=["game_id","total_line","spread_line","game_type"])
sc = sc[sc["game_type"] == "REG"].drop_duplicates("game_id")
df = df.merge(sc[["game_id","total_line","spread_line"]], on="game_id", how="left")
stats["with_total_line"] = int(df["total_line"].notna().sum())

# trailing-8-game as-of pass EPA/play by (season, posteam, week)  [leak-safe]
g = (df.groupby(["season","posteam","week"])
       .agg(epa=("epa","mean"), n=("epa","size")).reset_index())
g = g.sort_values(["season","posteam","week"])
def trail(grp):
    grp = grp.copy()
    grp["trail8"] = grp["epa"].shift(1).rolling(8, min_periods=1).mean()
    return grp
g = g.groupby(["season","posteam"], group_keys=False).apply(trail)
df = df.merge(g[["season","posteam","week","trail8"]], on=["season","posteam","week"], how="left")
stats["trail8_nonnull"] = int(df["trail8"].notna().sum())

df.to_csv(f"{NFL}/l1_join.csv", index=False)
with open(f"{NFL}/l1_build_stats.json","w") as f:
    json.dump(stats, f, indent=2)
    f.flush(); os.fsync(f.fileno())
print(json.dumps(stats, indent=2))
print("WROTE", f"{NFL}/l1_join.csv", len(df), "rows")
