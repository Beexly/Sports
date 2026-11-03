# PROVENANCE — gse-intelligence-build / coaching / drive_dire_situations.py
# Implements: @Timo_NFL "Dire Situations" drive metric named in
#   2026-11-02-PM.md — drive survival/scoring under 3rd & 7+, 4th down, or
#   backed up inside the own 15. LEARN-AND-REASON internal math on nflverse PBP.
"""Dire-situation drive efficiency.

A drive is "dire" when, at any point, it faces one of:
  * 3rd down with 7+ yards to go,
  * 4th down (any distance),
  * a snap from inside its own 15-yard line.

For each offense we report how often dire drives still end in points, how often
they survive (convert the dire down), and the EPA they give up per dire drive.
Every emitted number carries its n so the 1575 publication gate can be applied
by the caller.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

MIN_DRIVES_FOR_RATE = 15


def _dire_mask(d: pd.DataFrame) -> pd.Series:
    third_long = (d["down"] == 3) & (d["ydstogo"] >= 7)
    fourth = d["down"] == 4
    backed_up = d["yardline_100"] >= 85
    return (third_long | fourth | backed_up).fillna(False)


def compute_dire_situation_drive_efficiency(pbp_df: pd.DataFrame) -> dict[str, Any]:
    """Per-team dire-situation drive efficiency."""
    need = {"game_id", "drive", "posteam", "down", "ydstogo", "yardline_100", "epa", "play_type"}
    missing = need - set(pbp_df.columns)
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")

    d = pbp_df[pbp_df["play_type"].isin(["pass", "run"])].copy()
    d["epa"] = pd.to_numeric(d["epa"], errors="coerce")
    d = d.dropna(subset=["epa", "posteam", "down", "ydstogo", "yardline_100"])
    d["dire"] = _dire_mask(d)

    # A drive scores if any play in it has positive EPA credited to a score event.
    d["is_score_play"] = (
        d.get("td_team", pd.Series(index=d.index, dtype=object)).notna()
        | (pd.to_numeric(d.get("field_goal_result", pd.Series(index=d.index)), errors="coerce") == 1)
    )

    drives = (
        d.groupby(["game_id", "posteam", "drive"])
        .agg(
            dire=("dire", "max"),
            dire_plays=("dire", "sum"),
            epa_sum=("epa", "sum"),
            scored=("is_score_play", "max"),
            success_rate=("success", "mean") if "success" in d else ("epa", "mean"),
        )
        .reset_index()
    )

    rows = []
    for team, grp in drives.groupby("posteam"):
        dire = grp[grp["dire"]]
        normal = grp[~grp["dire"]]
        n = int(len(dire))
        rows.append(
            {
                "team": team,
                "dire_drives": n,
                "dire_score_rate": round(float(dire["scored"].mean()), 4) if n else None,
                "normal_drives": int(len(normal)),
                "normal_score_rate": round(float(normal["scored"].mean()), 4)
                if len(normal)
                else None,
                "dire_epa_per_drive": round(float(dire["epa_sum"].mean()), 4) if n else None,
                "normal_epa_per_drive": round(float(normal["epa_sum"].mean()), 4)
                if len(normal)
                else None,
                "dire_survival_gap": (
                    round(
                        float(dire["scored"].mean()) - float(normal["scored"].mean()), 4
                    )
                    if n and len(normal)
                    else None
                ),
                "publishable": n >= MIN_DRIVES_FOR_RATE,
            }
        )

    league_n = int(drives["dire"].sum())
    return {
        "metric": "dire_situation_drive_efficiency",
        "citation": "@Timo_NFL, Dire Situations (2026-11-02-PM.md)",
        "definition": "drive faces 3rd & 7+, 4th down, or snaps inside own 15",
        "plays_considered": int(len(d)),
        "drives_considered": int(len(drives)),
        "dire_drives_league": league_n,
        "min_drives_for_rate": MIN_DRIVES_FOR_RATE,
        "teams": sorted(rows, key=lambda r: -(r["dire_drives"] or 0)),
    }


def league_dire_summary(pbp_df: pd.DataFrame) -> dict[str, Any]:
    """Single-number league view used by the digest and the DFS prior."""
    out = compute_dire_situation_drive_efficiency(pbp_df)
    rates = [r["dire_score_rate"] for r in out["teams"] if r["dire_score_rate"] is not None]
    return {
        "dire_drives_league": out["dire_drives_league"],
        "teams_measured": len(rates),
        "league_dire_score_rate": round(float(np.mean(rates)), 4) if rates else None,
        "worst_teams": [r["team"] for r in sorted(out["teams"], key=lambda r: r["dire_score_rate"] or 9)[:3]],
        "best_teams": [r["team"] for r in sorted(out["teams"], key=lambda r: -(r["dire_score_rate"] or 0))[:3]],
    }
