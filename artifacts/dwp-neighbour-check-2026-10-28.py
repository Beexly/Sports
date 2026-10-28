"""Adjacent-season check on the DWP filter and aggregation.

The bound DWP constants were fitted on pbp 2018-2021, which is NOT on disk. This
applies the recorded filter and aggregation verbatim to the seasons that ARE on disk
and reports the deltas, so the formula can be checked even though the source cannot
be re-read. Clearly a neighbour check, not a re-derivation.
"""
import pandas as pd

BASE = "C:/Users/Garrett/Sports/intelligence/coaching/data/"
BOUND = {"go": 0.1113, "field_goal": -0.0837, "punt": -0.2892}

for season in (2022, 2023, 2024, 2025):
    p = pd.read_parquet(f"{BASE}play_by_play_{season}.parquet")
    # recorded filter, verbatim: 4th and <=2, yardline_100 <= 45, 0.10 < wp < 0.90
    f = p[
        (p["down"] == 4)
        & (p["ydstogo"] <= 2)
        & (p["yardline_100"] <= 45)
        & (p["wp"] > 0.10)
        & (p["wp"] < 0.90)
        & p["wpa"].notna()
    ]
    go = f[f["play_type"] == "pass"]  # placeholder; refined below
    branch = pd.Series("other", index=f.index)
    branch[f["play_type"] == "punt"] = "punt"
    branch[f["play_type"] == "field_goal"] = "field_goal"
    branch[(f["play_type"].isin(["pass", "run"]))] = "go"
    f = f.assign(branch=branch)
    print(f"\n{season}  n={len(f)}")
    for b in ("go", "field_goal", "punt"):
        g = f[f["branch"] == b]["wpa"]
        if len(g) == 0:
            continue
        print(f"  {b:10s} n={len(g):>4}  mean wpa {g.mean():+.4f}  bound {BOUND[b]:+.4f}")
