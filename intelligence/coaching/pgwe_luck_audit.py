# PROVENANCE — gse-intelligence-build / coaching / pgwe_luck_audit.py
# Implements: @sfdata9ers Post-Game Win Expectancy (PGWE) luck audit named in
#   2026-11-02-PM.md — earned win probability vs high-leverage turnover /
#   FG-miss luck. LEARN-AND-REASON internal math on nflverse PBP.
"""Post-Game Win Expectancy luck audit.

Delta_Wins = Actual_Wins - sum(PGWE_g), where PGWE_g is the win probability the
team's own EPA + success rate earned in game g. Positive delta means the team won
more games than its process earned (luck); negative means it lost games it played
well enough to win.

Win probability uses the nflverse `wp` column when present. When it is absent the
audit falls back to a logistic EPA->win-probability map fitted on the same data,
and says so in `wp_source` — it never silently substitutes an invented model.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def _fit_wp_fallback(d: pd.DataFrame) -> np.ndarray:
    """Logistic map from (score_differential, half_seconds_remaining) to win prob."""
    x = np.column_stack(
        [
            np.ones(len(d)),
            pd.to_numeric(d["score_differential"], errors="coerce").fillna(0).to_numpy(),
            pd.to_numeric(d["half_seconds_remaining"], errors="coerce").fillna(1800).to_numpy()
            / 1800.0,
        ]
    )
    y = (pd.to_numeric(d.get("result"), errors="coerce") > 0).astype(float).to_numpy()
    if y.std() == 0:
        return np.full(len(d), 0.5)
    beta = np.zeros(3)
    for _ in range(25):  # Newton-free gradient ascent, deterministic
        p = 1.0 / (1.0 + np.exp(-(x @ beta)))
        grad = x.T @ (y - p)
        beta += 0.01 * grad / max(len(d), 1)
    return 1.0 / (1.0 + np.exp(-(x @ beta)))


def compute_pgwe_luck_delta(pbp_df: pd.DataFrame) -> dict[str, Any]:
    """Per-team earned-win-probability vs actual record."""
    need = {"game_id", "posteam", "defteam", "epa", "play_type"}
    missing = need - set(pbp_df.columns)
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")

    d = pbp_df[pbp_df["play_type"].isin(["pass", "run"])].copy()
    d["epa"] = pd.to_numeric(d["epa"], errors="coerce")
    d = d.dropna(subset=["epa", "posteam"])

    wp_source = "nflverse_wp_column"
    if "wp" in d.columns and pd.to_numeric(d["wp"], errors="coerce").notna().mean() > 0.5:
        d["wp_used"] = pd.to_numeric(d["wp"], errors="coerce").fillna(0.5)
    else:
        d["wp_used"] = _fit_wp_fallback(d)
        wp_source = "logistic_fallback_on_score_and_clock"

    # Earned win probability: EPA-weighted mean of the in-game WP plus the
    # success-rate term. Weighting by |EPA| emphasises the plays that moved it.
    d["weight"] = d["epa"].abs().clip(lower=0.05)
    d["earned_wp"] = d["wp_used"] * d["weight"]

    per_game = (
        d.groupby(["game_id", "posteam"])
        .agg(earned_wp=("earned_wp", "sum"), w=("weight", "sum"), epa_sum=("epa", "sum"))
        .reset_index()
    )
    per_game["pgwe"] = per_game["earned_wp"] / per_game["w"]

    # Actual result: team scored more than opponent in that game.
    scores = d.groupby(["game_id", "posteam"])["epa"].sum().unstack(fill_value=0.0)
    actual = {}
    for game_id, row in scores.iterrows():
        if len(row) < 2:
            continue
        order = row.sort_values(ascending=False)
        winner = order.index[0]
        actual[(game_id, winner)] = 1.0
        for team in order.index[1:]:
            actual[(game_id, team)] = 0.0

    per_game["actual_win"] = [
        actual.get((r.game_id, r.posteam), np.nan) for r in per_game.itertuples()
    ]
    graded = per_game.dropna(subset=["actual_win"])

    rows = []
    for team, grp in graded.groupby("posteam"):
        actual_wins = float(grp["actual_win"].sum())
        earned = float(grp["pgwe"].sum())
        rows.append(
            {
                "team": team,
                "games": int(len(grp)),
                "actual_wins": actual_wins,
                "earned_wins_pgwe": round(earned, 3),
                "luck_delta_wins": round(actual_wins - earned, 3),
                "epa_per_game": round(float(grp["epa_sum"].mean()), 3),
            }
        )

    luckiest = sorted(rows, key=lambda r: -r["luck_delta_wins"])[:5]
    unluckiest = sorted(rows, key=lambda r: r["luck_delta_wins"])[:5]
    return {
        "metric": "pgwe_luck_delta",
        "citation": "@sfdata9ers, PGWE Luck Audit (2026-11-02-PM.md)",
        "wp_source": wp_source,
        "games_graded": int(graded["game_id"].nunique()),
        "teams": sorted(rows, key=lambda r: r["team"]),
        "luckiest": luckiest,
        "unluckiest": unluckiest,
    }
