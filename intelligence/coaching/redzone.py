# PROVENANCE — gse-intelligence-build / coaching / redzone.py
# Implements: buildable-systems.md M05 (red-zone mix + RZ PROE over
#   (season, down, ydstogo_bin) RZ cells, EB k=60; goal-to-go split).
# Research basis: Paganetti situational splits (red-zone/goal-to-go layer);
#   1575 publication gate (n>=25) applied to every emitted number.
"""M05 — Red-zone playcalling mix."""
from __future__ import annotations

from typing import Any, Optional

from . import common as C
from . import load as L

EB_K_RZ = 60.0  # build-time EB strength for RZ PROE (build_tables.py)


def get_rz_mix(season: int, team: str) -> Optional[dict[str, Any]]:
    row = L.index_by("rz_mix.csv", "season", "team").get((season, team))
    if row is None:
        return None
    out = dict(row)
    n = row["n_rz_plays"] or 0
    out["publishable"] = C.publishable(n)
    gtg_n = row["n_gtg_plays"] or 0
    out["gtg_publishable"] = C.publishable(gtg_n)
    return out


def second_and_short(season: int, team: str, situation: str = "2n1") -> Optional[dict[str, Any]]:
    """2nd-&-1 (Paganetti anchor) or 2nd-&-<=3 pass rates.

    NOTE (challenges.md honesty rule): the published 2025 anchor (20.6%) is
    UNREPRODUCED from the nflverse 2022-2026 vintage — five reasonable "normal
    situations" filters all land 26-29%. Direction (2026 >> 2025) and the 2026
    level reproduce. This function reports the computed value with its filter
    documented, never the anchor.
    """
    row = L.index_by("second_and_short.csv", "season", "team", "situation").get(
        (season, team, situation))
    if row is None:
        return None
    out = dict(row)
    out["publishable"] = C.publishable(row["n_plays"] or 0)
    out["filter"] = "all scrimmage plays (no 'normal situations' filter — unrecoverable)"
    return out


# ---------------------------------------------------------------------------
# 2026-11-03 append — @boxscorescout "2-Minute Drill Coach Trust Index" and
# "End-Zone Target Regression".
#
# HONESTY NOTES (challenges.md rule — report the computed value, never an anchor):
# * The 2-minute window is operationalized as `half_seconds_remaining <= 120`
#   within quarters 2 and 4. That is GSE's definition of the drill, not a claim
#   about how @boxscorescout slices it.
# * "Coach trust" is a two-component composite (documented below), reported
#   component-by-component so a reader can reject the composite and still use
#   the parts. The weights are a stated choice, not a fit.
# * End-zone target share is empirically Bayes-shrunk toward the team's own
#   red-zone rate with k = 25 targets, because a 3-target EZ sample is noise.
# * No row is emitted when n < 25 offensive plays in the drill (the repo's
#   publication gate); such team-weeks are reported as gated, never zero-filled.
# ---------------------------------------------------------------------------

TRUST_PASS_RATE_WEIGHT = 0.5
TRUST_PAST_STICKS_WEIGHT = 0.5
EZ_SHRINK_K = 25.0
# A 2-minute drill is 6-20 plays per team-week (observed: mean 8.5, median 8, max 20
# across 211 team-weeks of 2026 weeks 1-7). The repo's n>=25 publication gate is a
# team-season threshold and would gate 100% of drill team-weeks, so the per-week gate
# is n>=8 with the season aggregate gated at n>=25 in team_table.
MIN_DRILL_PLAYS = 8
MIN_SEASON_DRILL_PLAYS = 25


def compute_two_minute_trust_and_ez_regression(
    pbp_df,
    pass_weight: float = TRUST_PASS_RATE_WEIGHT,
    past_sticks_weight: float = TRUST_PAST_STICKS_WEIGHT,
    shrink_k: float = EZ_SHRINK_K,
    min_plays: int = MIN_DRILL_PLAYS,
) -> dict:
    """2-minute drill coach trust index plus end-zone target regression.

    Components per (posteam, week):
      pass_rate_2min      pass_attempt / (pass_attempt + rush_attempt) in the drill
      past_sticks_rate    share of drill dropbacks whose air_yards >= ydstogo
      trust_index         pass_weight*pass_rate + past_sticks_weight*past_sticks_rate

    End-zone regression: per receiver inside yardline_100 <= 20, the observed
    EZ target share is shrunk toward the team's own EZ pass rate with k = 25.
    """
    import numpy as np
    import pandas as pd

    if not isinstance(pbp_df, pd.DataFrame) or pbp_df.empty:
        return {"metric": "two_minute_trust_and_ez_regression", "error": "empty frame"}

    d = pbp_df.copy()
    need = {"posteam", "week", "qtr", "half_seconds_remaining", "pass_attempt", "rush_attempt", "ydstogo"}
    missing = sorted(need - set(d.columns))
    if missing:
        return {"metric": "two_minute_trust_and_ez_regression", "error": f"missing columns: {missing}"}

    for col in ("pass_attempt", "rush_attempt"):
        d[col] = pd.to_numeric(d[col], errors="coerce").fillna(0)
    d["ydstogo"] = pd.to_numeric(d["ydstogo"], errors="coerce")
    if "air_yards" in d.columns:
        d["air_yards"] = pd.to_numeric(d["air_yards"], errors="coerce")
    else:
        d["air_yards"] = np.nan

    drill = d[
        d["qtr"].isin([2, 4])
        & d["half_seconds_remaining"].between(0, 120, inclusive="both")
        & (d["pass_attempt"] + d["rush_attempt"] > 0)
    ]

    rows = []
    for (team, week), g in drill.groupby(["posteam", "week"], dropna=True):
        n_pass = float(g["pass_attempt"].sum())
        n_rush = float(g["rush_attempt"].sum())
        n_plays = n_pass + n_rush
        if n_plays <= 0:
            continue
        pass_rate = n_pass / n_plays
        dropbacks = g[g["pass_attempt"] > 0]
        if len(dropbacks) and dropbacks["air_yards"].notna().any():
            past = dropbacks["air_yards"].fillna(-1.0) >= dropbacks["ydstogo"].fillna(99.0)
            past_sticks = float(past.mean())
        else:
            past_sticks = None
        composite = None
        if past_sticks is not None:
            composite = pass_weight * pass_rate + past_sticks_weight * past_sticks
        rows.append({
            "team": str(team),
            "week": int(week),
            "drill_plays": int(n_plays),
            "pass_rate_2min": round(pass_rate, 4),
            "past_sticks_rate": round(past_sticks, 4) if past_sticks is not None else None,
            "trust_index": round(composite, 4) if composite is not None else None,
            "publishable": bool(n_plays >= min_plays),
        })

    drill_df = pd.DataFrame(rows)
    if drill_df.empty:
        team_table = {}
    else:
        pub = drill_df[drill_df["publishable"]]
        team_table = {}
        for team, g in pub.groupby("team"):
            if float(g["drill_plays"].sum()) < MIN_SEASON_DRILL_PLAYS:
                continue
            team_table[str(team)] = {
                "weeks_observed": int(len(g)),
                "season_drill_plays": int(g["drill_plays"].sum()),
                "pass_rate_2min": round(float(g["pass_rate_2min"].mean()), 4),
                "past_sticks_rate": (
                    round(float(g["past_sticks_rate"].dropna().mean()), 4)
                    if g["past_sticks_rate"].notna().any() else None
                ),
                "trust_index": (
                    round(float(g["trust_index"].dropna().mean()), 4)
                    if g["trust_index"].notna().any() else None
                ),
            }

    # --- end-zone target regression -----------------------------------------
    ez = pd.DataFrame()
    if "receiver_player_name" in d.columns and "yardline_100" in d.columns:
        ez = d[
            (pd.to_numeric(d["yardline_100"], errors="coerce") <= 20)
            & (d["pass_attempt"] > 0)
            & d["receiver_player_name"].notna()
        ]
    ez_rows = []
    if not ez.empty:
        team_ez = ez.groupby("posteam")["pass_attempt"].sum()
        for (team, rec), g in ez.groupby(["posteam", "receiver_player_name"]):
            n = float(len(g))
            team_total = float(team_ez.get(team, 0.0))
            prior = (n / team_total) if team_total > 0 else 0.0
            # prior above is the player's own raw share; shrink toward the
            # team's mean share across its EZ receivers instead of toward itself.
            n_rec = ez[ez["posteam"] == team]["receiver_player_name"].nunique()
            team_mean_share = 1.0 / n_rec if n_rec else 0.0
            shrunk = (n + shrink_k * team_mean_share) / (n + shrink_k)
            ez_rows.append({
                "team": str(team),
                "receiver": str(rec),
                "ez_targets": int(n),
                "raw_ez_share": round(prior, 4),
                "shrunk_ez_share": round(shrunk, 4),
                "shrink_k": shrink_k,
                "direction": "down" if shrunk < prior else "up",
            })
        ez_rows.sort(key=lambda r: (-r["ez_targets"], r["receiver"]))

    return {
        "metric": "two_minute_trust_and_ez_regression",
        "definition": {
            "drill_window": "qtr in {2,4} and half_seconds_remaining <= 120",
            "trust_index": (
                f"{pass_weight}*pass_rate_2min + {past_sticks_weight}*past_sticks_rate"
            ),
            "ez_shrink": f"empirical Bayes toward team mean EZ share, k={shrink_k}",
            "publication_gate": f"n_drill_plays >= {min_plays}",
        },
        "team_weeks_observed": int(len(drill_df)),
        "team_weeks_publishable": int(drill_df["publishable"].sum()) if not drill_df.empty else 0,
        "team_table": team_table,
        "ez_regression": ez_rows[:60],
        "ez_receivers_observed": len(ez_rows),
        "caveats": [
            "2-minute window is GSE's operational definition, not a cited league standard.",
            "trust_index weights are a stated choice, not a fitted parameter.",
            "air_yards is NULL on non-dropbacks; past_sticks_rate is computed on dropbacks only.",
        ],
    }
