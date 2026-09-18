"""
X-feed / Gridiron lab pass (2026-09-17).

Computes the nflverse-reachable metrics from the X-feed sweep:

  - under-center-or-pistol vs shotgun EPA/success (shotgun == 0)
  - EPA/rush by run_gap (Palazzolo caveat always written)
  - composite QB z-score of EPA/play + success + CPOE + air yards / reception

Same filters as compute_team_metrics.base_sample(): REG, pass/run, no
kneel/spike, finite EPA, garbage time excluded.

PBP is NOT vendored. Set NFLVERSE_PBP_DIR to a directory containing
pbp{season}.csv.gz. Missing files exit 2 (BLOCKED), never fabricate.

True pressure-to-sack, read-progression, time-to-pressure, and PFF
positive/negative play rates are not computed here — see the TypeScript
refuse paths in packages/prediction-engine/src/nfl-adv/.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
IN_DIR = Path(os.environ.get("NFLVERSE_PBP_DIR", ""))
OUT_DIR = Path(os.environ.get("GSE_LAB_OUT_DIR", str(HERE)))

USECOLS = [
    "season_type", "play_type", "qb_kneel", "qb_spike", "epa", "qtr", "wp",
    "pass_attempt", "rush_attempt", "qb_scramble", "yards_gained",
    "posteam", "shotgun", "run_gap", "passer_player_name", "air_yards",
    "complete_pass", "cpoe",
]

PALAZZOLO = (
    "NFL GSIS run_gap/run_location is assigned after the play from the hole "
    "the runner actually took, not the designed gap. Do not read this as "
    "scheme-gap EPA."
)


def load(season: int) -> pd.DataFrame:
    path = IN_DIR / f"pbp{season}.csv.gz"
    if not path.is_file():
        raise FileNotFoundError(str(path))
    return pd.read_csv(path, compression="gzip", low_memory=False, usecols=USECOLS)


def base_sample(df: pd.DataFrame) -> pd.DataFrame:
    d = df[
        (df["season_type"] == "REG")
        & (df["play_type"].isin(["pass", "run"]))
        & (df["qb_kneel"] == 0)
        & (df["qb_spike"] == 0)
        & (df["epa"].notna())
        & (~((df["qtr"] == 4) & ((df["wp"] > 0.95) | (df["wp"] < 0.05))))
    ].copy()
    d["is_dropback"] = ((d["pass_attempt"] == 1) | (d["qb_scramble"] == 1)).astype(int)
    d["is_rush"] = (
        (d["rush_attempt"] == 1) & (d["qb_scramble"] == 0) & (d["qb_kneel"] == 0)
    ).astype(int)
    d["under_center_or_pistol"] = (d["shotgun"] == 0).astype(int)
    return d


def formation_usage(d: pd.DataFrame, season: int) -> pd.DataFrame:
    rows = []
    for team in sorted(d["posteam"].dropna().unique()):
        o = d[d["posteam"] == team]
        for label, mask in (
            ("shotgun", o["shotgun"] == 1),
            ("under_center_or_pistol", o["shotgun"] == 0),
        ):
            sub = o[mask]
            n = len(sub)
            rows.append({
                "team": team,
                "season": season,
                "split": label,
                "plays": n,
                "epa_per_play": sub["epa"].mean() if n else np.nan,
                "success_rate": (sub["epa"] > 0).mean() if n else np.nan,
                "caveat": "shotgun_eq_0_is_under_center_or_pistol",
            })
    return pd.DataFrame(rows)


def epa_rush_gap(d: pd.DataFrame, season: int) -> pd.DataFrame:
    rush = d[d["is_rush"] == 1].copy()
    rush["run_gap"] = rush["run_gap"].fillna("unknown")
    rows = []
    for team in sorted(rush["posteam"].dropna().unique()):
        o = rush[rush["posteam"] == team]
        for gap, sub in o.groupby("run_gap"):
            n = len(sub)
            rows.append({
                "team": team,
                "season": season,
                "run_gap": gap,
                "rushes": n,
                "epa_per_rush": sub["epa"].mean() if n else np.nan,
                "caveat": PALAZZOLO,
            })
    return pd.DataFrame(rows)


def composite_qb(d: pd.DataFrame, season: int, min_attempts: int) -> pd.DataFrame:
    db = d[d["is_dropback"] == 1].copy()
    db = db[db["passer_player_name"].notna()]
    g = db.groupby("passer_player_name")
    rows = []
    for player, sub in g:
        attempts = int(sub["pass_attempt"].sum())
        if attempts < min_attempts:
            continue
        rec = sub[sub["complete_pass"] == 1]
        aypr = rec["air_yards"].mean() if len(rec) and rec["air_yards"].notna().any() else np.nan
        cpoe = sub["cpoe"].mean()
        epa = sub["epa"].mean()
        sr = (sub["epa"] > 0).mean()
        if not all(np.isfinite([epa, sr, cpoe, aypr])):
            continue
        rows.append({
            "player": player,
            "team": sub["posteam"].mode().iloc[0] if len(sub) else None,
            "season": season,
            "attempts": attempts,
            "epa_per_play": epa,
            "success_rate": sr,
            "cpoe": cpoe,
            "air_yards_per_reception": aypr,
        })
    out = pd.DataFrame(rows)
    if len(out) < 2:
        return out
    for col in ("epa_per_play", "success_rate", "cpoe", "air_yards_per_reception"):
        s = out[col]
        std = s.std(ddof=1)
        out[col + "_z"] = 0.0 if (not np.isfinite(std) or std <= 1e-12) else (s - s.mean()) / std
    out["composite"] = out[
        ["epa_per_play_z", "success_rate_z", "cpoe_z", "air_yards_per_reception_z"]
    ].mean(axis=1)
    out["method"] = "gse-composite-qb-z4-v1"
    return out.sort_values(["composite", "player"], ascending=[False, True])


def main(seasons: list[int]) -> int:
    if not IN_DIR.is_dir():
        print(
            f"BLOCKED: NFLVERSE_PBP_DIR={IN_DIR!s} is missing. "
            "PBP is not vendored; refuse rather than fabricate.",
            file=sys.stderr,
        )
        return 2
    for season in seasons:
        try:
            d = base_sample(load(season))
        except FileNotFoundError as exc:
            print(f"BLOCKED: {exc}", file=sys.stderr)
            return 2
        min_att = 100 if season == 2025 else 10
        formation_usage(d, season).to_csv(OUT_DIR / f"formation_usage_{season}.csv", index=False)
        epa_rush_gap(d, season).to_csv(OUT_DIR / f"epa_rush_gap_{season}.csv", index=False)
        composite_qb(d, season, min_att).to_csv(OUT_DIR / f"composite_qb_{season}.csv", index=False)
        print(f"wrote formation/gap/composite for {season} n_plays={len(d)}")
    return 0


if __name__ == "__main__":
    sys.exit(main([2025, 2026]))
