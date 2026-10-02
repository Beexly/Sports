"""Fourth-down conversion rate by yards to go and field position.

The league rate is not a substitute for a thin cell. Punts and field goals
are not go plays. Window matches the other fourth-down measurements:
2022-2025 plus 2026 weeks 1-3.
"""
import json
import os

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "coaching", "data")
OUT = os.path.join(ROOT, "research", "data", "fourth_down_conversion_cells.json")
MIN_N = 40
YEARS = (2022, 2023, 2024, 2025, 2026)


def ytg_bucket(yards: int) -> str:
    y = int(yards)
    if y <= 0:
        return "withheld"
    if y <= 3:
        return str(y)
    if y <= 6:
        return "4-6"
    if y <= 10:
        return "7-10"
    return "11+"


def field_bin(yards_to_goal: int) -> str:
    lo = (int(yards_to_goal) // 10) * 10
    return f"{lo}-{lo + 9}"


def load() -> pd.DataFrame:
    frames = []
    for year in YEARS:
        frame = pd.read_parquet(
            os.path.join(DATA, f"play_by_play_{year}.parquet"),
            columns=["season", "week", "down", "ydstogo", "yardline_100", "play_type", "fourth_down_converted"],
        )
        if year == 2026:
            frame = frame[frame["week"] < 4]
        frames.append(frame)
    df = pd.concat(frames, ignore_index=True)
    goes = df[(df["down"] == 4) & (df["play_type"].isin(["pass", "run"]))].copy()
    goes = goes.dropna(subset=["ydstogo", "yardline_100"])
    goes["converted"] = goes["fourth_down_converted"].fillna(0).astype(int)
    goes["ytg_bucket"] = goes["ydstogo"].astype(int).map(ytg_bucket)
    goes["field_bin"] = goes["yardline_100"].astype(int).map(field_bin)
    return goes[goes["ytg_bucket"] != "withheld"]


def rows_for(frame: pd.DataFrame, keys: list[str]) -> list[dict]:
    out = []
    for key, group in frame.groupby(keys):
        if not isinstance(key, tuple):
            key = (key,)
        n = int(len(group))
        converted = int(group["converted"].sum())
        row = {name: value for name, value in zip(keys, key)}
        row["n"] = n
        row["converted"] = converted
        row["conversion_rate"] = None if n < MIN_N else converted / n
        row["status"] = "withheld" if n < MIN_N else "measured"
        out.append(row)
    return out


def main() -> None:
    goes = load()
    by_ytg = rows_for(goes, ["ytg_bucket"])
    crossed = rows_for(goes, ["ytg_bucket", "field_bin"])
    doc = {
        "paper": "1601.04302",
        "input": "s_4conv",
        "window": "2022-2025 plus 2026 weeks 1-3",
        "min_n": MIN_N,
        "definition": "down == 4 and play_type in (pass, run). A thin cell is withheld. The league rate is not filled in.",
        "n_go_plays": int(len(goes)),
        "by_yards_to_go": by_ytg,
        "by_yards_and_field": crossed,
        "publishes_pick": False,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2)
    print(f"go plays {len(goes)}")
    print(f"ytg measured {sum(r['status']=='measured' for r in by_ytg)} of {len(by_ytg)}")
    print(f"crossed measured {sum(r['status']=='measured' for r in crossed)} of {len(crossed)}")
    for row in by_ytg:
        rate = "withheld" if row["conversion_rate"] is None else f"{row['conversion_rate']:.3f}"
        print(row["ytg_bucket"], row["n"], rate)


if __name__ == "__main__":
    main()
