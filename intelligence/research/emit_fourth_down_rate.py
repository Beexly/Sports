import json
import os

import pandas as pd

root = "coaching/data"
frames = []
for year in (2022, 2023, 2024, 2025, 2026):
    frame = pd.read_parquet(
        os.path.join(root, f"play_by_play_{year}.parquet"),
        columns=["season", "week", "down", "play_type", "fourth_down_converted"],
    )
    if year == 2026:
        frame = frame[frame["week"] < 4]
    frames.append(frame)
df = pd.concat(frames, ignore_index=True)
goes = df[(df["down"] == 4) & (df["play_type"].isin(["pass", "run"]))]
n = int(len(goes))
converted = int(goes["fourth_down_converted"].fillna(0).sum())
rate = (converted / n) if n else None
doc = {
    "paper": "1601.04302",
    "input": "s_4conv",
    "window": "2022-2025 plus 2026 weeks 1-3",
    "n_go_plays": n,
    "converted": converted,
    "conversion_rate": rate,
    "source": "measured on committed play-by-play. Not the paper's 0.779.",
    "definition": "down == 4 and play_type in (pass, run). Punts and field goals are not go plays.",
    "delta_pi_fg": None,
    "delta_pi_td": None,
    "net_status": "withheld",
    "publishes_pick": False,
}
path = "research/data/fourth_down_conversion_before_2026_w4.json"
with open(path, "w", encoding="utf-8") as fh:
    json.dump(doc, fh, indent=2)
print(f"n {n} converted {converted} rate {rate}")
