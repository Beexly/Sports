"""Measure the inputs Footballonomics left in figures.

Touchback baseline: kickoff drives whose first play starts at the modal
kickoff yard line for that season. Failed fourth down: drives that start
on DOWNS. delta_pi is the difference in drive scoring rate. A bin with
fewer than MIN_N drives is withheld. This is not a go-for-it chart.
"""
import json
import os

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "coaching", "data")
OUT = os.path.join(ROOT, "research", "data", "fourth_down_delta_pi.json")
YEARS = (2022, 2023, 2024, 2025, 2026)
MIN_N = 40
COLS = [
    "game_id", "season", "week", "fixed_drive", "play_id",
    "drive_start_transition", "drive_start_yard_line", "fixed_drive_result", "yardline_100",
    "play_type", "field_goal_result", "kick_distance", "down", "fourth_down_converted",
]


def load() -> pd.DataFrame:
    frames = []
    for year in YEARS:
        frame = pd.read_parquet(os.path.join(DATA, f"play_by_play_{year}.parquet"), columns=COLS)
        if year == 2026:
            frame = frame[frame["week"] < 4]
        frames.append(frame)
    return pd.concat(frames, ignore_index=True)


def own_yard(label: object) -> int | None:
    text = str(label).strip()
    if not text or text == "nan":
        return None
    token = text.split()[-1]
    if not token.isdigit():
        return None
    yard = int(token)
    if yard < 0 or yard > 100:
        return None
    return yard


def drives(df: pd.DataFrame) -> pd.DataFrame:
    ordered = df.sort_values(["game_id", "fixed_drive", "play_id"])
    first = ordered.groupby(["game_id", "fixed_drive"], as_index=False).first()
    first = first.dropna(subset=["drive_start_yard_line", "fixed_drive_result"])
    first["own_yard"] = first["drive_start_yard_line"].map(own_yard)
    first = first.dropna(subset=["own_yard"])
    first["own_yard"] = first["own_yard"].astype(int)
    # The kickoff play itself sits on the 35. The drive start is the labeled yard line.
    first["start_ytg"] = 100 - first["own_yard"]
    first["td"] = (first["fixed_drive_result"] == "Touchdown").astype(int)
    first["fg"] = (first["fixed_drive_result"] == "Field goal").astype(int)
    return first


def bin_start(ytg: int) -> str:
    lo = (int(ytg) // 10) * 10
    return f"{lo}-{lo + 9}"


def touchback_yard(season: int) -> int:
    """NFL touchback spot. 2024 moved it from the 25 to the 30. Not the modal return."""
    return 25 if int(season) <= 2023 else 30


def main() -> None:
    df = load()
    drv = drives(df)
    kick = drv[drv["drive_start_transition"] == "KICKOFF"].copy()
    kick["touch_yard"] = kick["season"].map(touchback_yard)
    modes = {str(int(season)): int(group["own_yard"].mode().iloc[0]) for season, group in kick.groupby("season")}
    touch = kick[kick["own_yard"] == kick["touch_yard"]]
    if len(touch) < MIN_N:
        raise SystemExit(f"touchback baseline n={len(touch)} is below {MIN_N}")
    base_td = float(touch["td"].mean())
    base_fg = float(touch["fg"].mean())
    downs = drv[drv["drive_start_transition"] == "DOWNS"].copy()
    downs["bin"] = downs["start_ytg"].map(bin_start)
    bins = []
    for name, group in downs.groupby("bin"):
        n = int(len(group))
        row = {
            "bin_yards_to_goal": name,
            "n": n,
            "td_rate": None if n < MIN_N else float(group["td"].mean()),
            "fg_rate": None if n < MIN_N else float(group["fg"].mean()),
            "delta_pi_td": None,
            "delta_pi_fg": None,
            "status": "withheld" if n < MIN_N else "measured",
        }
        if n >= MIN_N:
            row["delta_pi_td"] = float(group["td"].mean()) - base_td
            row["delta_pi_fg"] = float(group["fg"].mean()) - base_fg
        bins.append(row)
    bins.sort(key=lambda r: r["bin_yards_to_goal"])
    fg = df[(df["play_type"] == "field_goal") & df["field_goal_result"].isin(["made", "missed", "blocked"])]
    fg = fg.dropna(subset=["kick_distance"])
    fg_bins = []
    fg = fg.copy()
    fg["bin"] = fg["kick_distance"].astype(int).map(lambda d: f"{(d // 5) * 5}-{(d // 5) * 5 + 4}")
    for name, group in fg.groupby("bin"):
        n = int(len(group))
        made = int((group["field_goal_result"] == "made").sum())
        fg_bins.append({
            "kick_distance": name,
            "n": n,
            "made": made,
            "make_rate": None if n < MIN_N else made / n,
            "status": "withheld" if n < MIN_N else "measured",
        })
    fg_bins.sort(key=lambda r: r["kick_distance"])
    goes = df[(df["down"] == 4) & (df["play_type"].isin(["pass", "run"]))]
    doc = {
        "paper": "1601.04302",
        "window": "2022-2025 plus 2026 weeks 1-3",
        "min_n": MIN_N,
        "touchback": {
            "definition": "KICKOFF drives starting on the rule touchback spot: own 25 through 2023, own 30 from 2024. The modal return is recorded and not used.",
            "touchback_own_yard": {"through_2023": 25, "from_2024": 30},
            "modal_own_yard_by_season": modes,
            "n": int(len(touch)),
            "td_rate": base_td,
            "fg_rate": base_fg,
        },
        "downs_bins": bins,
        "field_goal_bins": fg_bins,
        "go_plays": int(len(goes)),
        "note": "delta_pi is measured minus the touchback rate. It is not copied from the paper's figures. Net benefit is not a recommendation.",
        "publishes_pick": False,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2)
    measured = sum(1 for b in bins if b["status"] == "measured")
    print(f"touchback modes {modes} n {len(touch)} td {base_td:.4f} fg {base_fg:.4f}")
    print(f"downs bins measured {measured} of {len(bins)}")
    print(f"fg bins measured {sum(1 for b in fg_bins if b['status']=='measured')} of {len(fg_bins)}")


if __name__ == "__main__":
    main()
