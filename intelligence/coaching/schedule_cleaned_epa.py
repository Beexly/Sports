# PROVENANCE — gse-intelligence-build / coaching / schedule_cleaned_epa.py
# Implements: @HaydenWinks Schedule-Cleaned EPA + paired pass-catcher aDOT drop
#   filter named in 2026-11-02-PM.md. LEARN-AND-REASON internal math on nflverse PBP.
"""Schedule-cleaned EPA and the paired-aDOT drop filter.

Schedule cleaning: an opponent's defensive strength is itself an EPA estimate, so
we ridge-regress observed offensive EPA on opponent identity (and home/away) and
keep the residual. That residual is the offence's EPA with schedule quality
stripped — the standard "schedule-adjusted" construction, done with a closed-form
ridge so it is deterministic and needs no solver.

Paired aDOT drop: when both the WR1 and WR2 on the same team lose air yards per
target in the same week, the usual cause is offensive-line pressure collapsing
the route depth. The filter flags those team-weeks so DFS builds can discount
deep-threat projections instead of trusting them.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def compute_schedule_adjusted_epa(pbp_df: pd.DataFrame, ridge_lambda: float = 15.0) -> dict[str, Any]:
    """Ridge-cleaned offensive EPA per team with opponent effects removed."""
    need = {"game_id", "posteam", "defteam", "epa", "play_type"}
    missing = need - set(pbp_df.columns)
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")

    d = pbp_df[pbp_df["play_type"].isin(["pass", "run"])].copy()
    d["epa"] = pd.to_numeric(d["epa"], errors="coerce")
    d = d.dropna(subset=["epa", "posteam", "defteam"])
    if d.empty:
        return {"metric": "schedule_adjusted_epa", "error": "no gradeable plays"}

    team_epa = d.groupby("posteam")["epa"].mean()
    def_epa = d.groupby("defteam")["epa"].mean()
    league = float(d["epa"].mean())

    teams = sorted(team_epa.index)
    opponents = sorted(def_epa.index)
    t_idx = {t: i for i, t in enumerate(teams)}
    o_idx = {o: i for i, o in enumerate(opponents)}

    # Design matrix: team one-hot + opponent one-hot + home flag.
    n = len(d)
    X = np.zeros((n, len(teams) + len(opponents) + 1))
    for row_i, (t, o) in enumerate(zip(d["posteam"], d["defteam"])):
        X[row_i, t_idx[t]] = 1.0
        X[row_i, len(teams) + o_idx[o]] = 1.0
        X[row_i, -1] = 1.0 if d.get("posteam_type", pd.Series(index=d.index)).iloc[row_i] == "home" else 0.0
    y = d["epa"].to_numpy(dtype=float)
    A = X.T @ X + ridge_lambda * np.eye(X.shape[1])
    beta = np.linalg.solve(A, X.T @ y)

    team_coef = {t: float(beta[t_idx[t]]) for t in teams}
    def_coef = {o: float(beta[len(teams) + o_idx[o]]) for o in opponents}

    rows = []
    for t in teams:
        raw = float(team_epa[t])
        opp_strength = float(
            np.mean([def_coef.get(o, 0.0) for o in d.loc[d["posteam"] == t, "defteam"].unique()])
        )
        rows.append(
            {
                "team": t,
                "plays": int((d["posteam"] == t).sum()),
                "raw_epa_per_play": round(raw, 4),
                "opponent_epa_allowance_faced": round(opp_strength, 4),
                "schedule_cleaned_epa_per_play": round(raw - opp_strength, 4),
                "delta_vs_league": round(raw - opp_strength - league, 4),
            }
        )
    return {
        "metric": "schedule_adjusted_epa",
        "citation": "@HaydenWinks, Schedule-Cleaned EPA (2026-11-02-PM.md)",
        "ridge_lambda": ridge_lambda,
        "league_epa_per_play": round(league, 4),
        "plays": int(n),
        "teams": sorted(rows, key=lambda r: -r["schedule_cleaned_epa_per_play"]),
    }


def detect_paired_adot_drop(pbp_df: pd.DataFrame, drop_threshold: float = 1.0) -> dict[str, Any]:
    """Flag team-weeks where both top-2 receivers lost aDOT simultaneously."""
    need = {"week", "posteam", "receiver_player_name", "air_yards"}
    missing = need - set(pbp_df.columns)
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")

    d = pbp_df[pbp_df["play_type"] == "pass"].copy()
    d["air_yards"] = pd.to_numeric(d["air_yards"], errors="coerce")
    d = d.dropna(subset=["air_yards", "receiver_player_name", "posteam", "week"])
    if d.empty:
        return {"metric": "paired_adot_drop", "flags": []}

    # Top-2 targets per team by volume over the whole sample.
    vol = d.groupby(["posteam", "receiver_player_name"]).size()
    top2 = (
        vol.reset_index(name="targets")
        .sort_values(["posteam", "targets"], ascending=[True, False])
        .groupby("posteam")
        .head(2)
    )
    pairs = top2.groupby("posteam")["receiver_player_name"].apply(list).to_dict()

    weekly = (
        d.groupby(["posteam", "week", "receiver_player_name"])["air_yards"].mean().reset_index()
    )
    flags = []
    for team, receivers in pairs.items():
        if len(receivers) < 2:
            continue
        for week in sorted(d.loc[d["posteam"] == team, "week"].unique()):
            if week <= min(d["week"]) :
                continue  # no prior week to compare against
            cur = weekly[(weekly["posteam"] == team) & (weekly["week"] == week)]
            prev = weekly[(weekly["posteam"] == team) & (weekly["week"] == week - 1)]
            if cur.empty or prev.empty:
                continue
            drops = []
            for r in receivers:
                c = cur.loc[cur["receiver_player_name"] == r, "air_yards"]
                p = prev.loc[prev["receiver_player_name"] == r, "air_yards"]
                if c.empty or p.empty:
                    continue
                drops.append(float(c.iloc[0]) - float(p.iloc[0]))
            if len(drops) == 2 and all(dd <= -drop_threshold for dd in drops):
                flags.append(
                    {
                        "team": team,
                        "week": int(week),
                        "receivers": receivers,
                        "adot_change_yds": [round(x, 2) for x in drops],
                        "reading": "both top-2 aDOT fell together — OL pressure signature",
                    }
                )
    return {
        "metric": "paired_adot_drop",
        "citation": "@HaydenWinks, Paired Pass-Catcher aDOT Drop Filter (2026-11-02-PM.md)",
        "drop_threshold_yds": drop_threshold,
        "team_weeks_scanned": int(weekly[["posteam", "week"]].drop_duplicates().shape[0]),
        "flags": flags,
    }
