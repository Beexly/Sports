"""Build modeling datasets from nflverse play-by-play parquet.
Target A: play-level EPA from PRE-SNAP features only (no leakage).
Target B: drive scoring (TD or FG) from drive-start state.
Splits: train = seasons 2020-2023, test = 2024-2025 (holdout).
"""
import pandas as pd
import numpy as np

SEASONS_TRAIN = [2020, 2021, 2022, 2023]
SEASONS_TEST = [2024, 2025]

def load_all():
    frames = []
    for y in SEASONS_TRAIN + SEASONS_TEST:
        df = pd.read_parquet(f"data/pbp_{y}.parquet")
        frames.append(df)
    return pd.concat(frames, ignore_index=True)

def target_a(df):
    cols = ["season", "down", "ydstogo", "yardline_100", "game_seconds_remaining",
            "qtr", "score_differential", "shotgun", "no_huddle", "epa"]
    d = df[cols].copy()
    d = d[d["down"].isin([1, 2, 3, 4])]
    d = d[(d["ydstogo"] >= 1) & d["epa"].notna()]
    for c in ["yardline_100", "game_seconds_remaining", "score_differential"]:
        d = d[d[c].notna()]
    d[["shotgun", "no_huddle"]] = d[["shotgun", "no_huddle"]].fillna(0).astype(int)
    d["qtr"] = d["qtr"].clip(upper=5)
    return d.reset_index(drop=True)

def target_b(df):
    # drive-start state -> did the drive end in a score (TD or FG)?
    d = df[df["fixed_drive"].notna()].copy()
    d = d.sort_values(["game_id", "fixed_drive", "play_id"])
    first = d.groupby(["game_id", "fixed_drive"], as_index=False).first()
    # exclude time-censored drives
    first = first[~first["fixed_drive_result"].isin(["End of half"])]
    first = first[first["down"].isin([1, 2, 3, 4])]
    first["scored"] = first["fixed_drive_result"].isin(["Touchdown", "Field goal"]).astype(int)
    cols = ["season", "yardline_100", "game_seconds_remaining", "qtr",
            "score_differential", "down", "ydstogo", "scored"]
    out = first[cols].copy()
    out = out.dropna()
    out["qtr"] = out["qtr"].clip(upper=5)
    return out.reset_index(drop=True)

def main():
    df = load_all()
    print("total plays:", len(df))
    a = target_a(df)
    print("target A rows:", len(a), "| train:", (a.season <= 2023).sum(), "| test:", (a.season >= 2024).sum())
    b = target_b(df)
    print("target B rows:", len(b), "| train:", (b.season <= 2023).sum(), "| test:", (b.season >= 2024).sum(),
          "| score rate:", round(b.scored.mean(), 4))
    a.to_parquet("data/target_a.parquet", index=False)
    b.to_parquet("data/target_b.parquet", index=False)
    print("saved.")

if __name__ == "__main__":
    main()
