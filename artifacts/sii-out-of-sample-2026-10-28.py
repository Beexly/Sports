"""Out-of-sample SII check on prior seasons.

The 2026 9+ box has 140 plays. If the motion-costs-you-at-a-stacked-box effect is
real it should show in 2024 and 2025 too, where the sample is a full season.
"""
import pandas as pd

S = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/"

for year in (2024, 2025):
    part = pd.read_parquet(f"{S}part_{year}.parquet")
    pbp = pd.read_parquet(f"{S}pbp_{year}.parquet")
    ftn = pd.read_parquet(f"{S}ftn_{year}.parquet").rename(
        columns={"nflverse_game_id": "nflverse_game_id", "nflverse_play_id": "play_id"})
    keys = ["nflverse_game_id", "play_id"]
    m = part[keys].merge(
        ftn[keys + ["is_motion", "n_defense_box"]], on=keys, how="inner").merge(
        pbp[["game_id", "play_id", "epa"]].rename(columns={"game_id": "nflverse_game_id"}),
        on=keys)
    m["defenders_in_box"] = m["n_defense_box"]
    m = m[m["epa"].notna()]
    m["box"] = pd.cut(m["defenders_in_box"], [0, 6, 7, 8, 20], labels=["<=6", "7", "8", "9+"])
    print(f"\n=== {year}  (rows {len(m)})")
    for box in ["7", "8", "9+"]:
        s = m[m["box"] == box]
        g = s.groupby("is_motion")["epa"].agg(["mean", "count"])
        d = {int(k): (round(v["mean"], 3), int(v["count"])) for k, v in g.iterrows()}
        if 1 in d and 0 in d:
            print(f"  box {box:3s} motion-gap {d[1][0]-d[0][0]:+.3f}  n={d[1][1]}/{d[0][1]}")
