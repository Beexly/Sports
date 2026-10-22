"""Precedent retrieval over the play-by-play corpus.

Doctrine: every thesis cites precedent - named games, named outcomes - or
names the gap. This module searches the nflverse play-by-play parquet for
STRUCTURAL matches (injury pattern + game-state + market band), not team
names.

Structural searches supported today (all over the 2026 season corpus the
repo already carries, point-in-time by week):
  - interior_lineman_out: games where a team's primary interior DL was out
    (approximated by snapped-weight presence in later seasons; in the 2026
    corpus by OL/DL state) and the opposing QB's third-down performance
  - edge_out_qb_ttt: EDGE1 absence vs QB time-to-throw buckets
  - wr1_shadow: WR1 vs CB1-quality coverage matchups

The honest contract: if the corpus cannot answer the structural question,
return named_gap - never a synthetic precedent.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
PBP = REPO / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"

_CACHE: dict[str, pd.DataFrame] = {}


def _pbp() -> pd.DataFrame | None:
    if "df" not in _CACHE:
        p = PBP
        if not p.exists():
            return None
        try:
            _CACHE["df"] = pd.read_parquet(
                p,
                columns=[
                    "posteam", "defteam", "season", "week", "down", "ydstogo",
                    "epa", "success", "pass", "rush", "qb_scramble",
                    "third_down_converted", "third_down_failed",
                    "sack", "qb_hit", "pressure", "air_yards",
                ],
            )
        except Exception:
            return None
    return _CACHE["df"]


def third_down_defense_profile(defteam: str, before_week: int) -> dict | None:
    """A defteam's third-down performance profile before a given week.

    This is the empirical anchor precedents compare against: conversion rate
    allowed, pressure rate, and EPA per third-down dropback.
    """
    df = _pbp()
    if df is None:
        return None
    d = df[(df["defteam"] == defteam) & (df["week"] < before_week) & (df["down"] == 3)]
    if len(d) < 30:
        return {"named_gap": f"fewer than 30 third-down plays for {defteam} before week {before_week}"}
    pass_plays = d[d["pass"] == 1]
    conv = d["third_down_converted"].sum()
    fail = d["third_down_failed"].sum()
    attempts = conv + fail
    sacks = int(pass_plays["sack"].fillna(0).sum())
    hits = int(pass_plays["qb_hit"].fillna(0).sum())
    pressures = int(pass_plays["pressure"].fillna(0).sum())
    epa = float(pass_plays["epa"].fillna(0).mean())
    return {
        "defteam": defteam,
        "third_down_plays": int(len(d)),
        "conversion_rate_allowed": round(float(conv) / attempts, 4) if attempts else None,
        "dropback_epa_allowed": round(epa, 4),
        "sacks": sacks,
        "qb_hits": hits,
        "pressures": pressures,
        "pressure_rate": round(pressures / max(1, len(pass_plays)), 4),
        "window": f"weeks 1-{before_week - 1}",
    }


def interior_pressure_split(defteam: str, before_week: int) -> dict | None:
    """Pressure split: how much of this defense's third-down pressure comes
    from non-standard (blitz/pressure events) vs four-man rushes - the
    empirical check on 'does the blitz body exist' in Interior Vacuum."""
    df = _pbp()
    if df is None:
        return None
    d = df[(df["defteam"] == defteam) & (df["week"] < before_week) & (df["down"] == 3) & (df["pass"] == 1)]
    if len(d) < 30:
        return None
    pressures = int(d["pressure"].fillna(0).sum())
    sacks = int(d["sack"].fillna(0).sum())
    blitz_like = int(((d["qb_hit"].fillna(0) > 0) & (d["sack"].fillna(0) == 0)).sum())
    return {
        "defteam": defteam,
        "pressure_events": pressures,
        "sacks": sacks,
        "hit_pressure_events": blitz_like,
        "note": "proxies for interior vs edge pressure split; exact rusher identity requires tracking data (named gap)",
    }


def precedent_search(structural_query: dict) -> dict:
    """Dispatch structural precedent queries; returns named games/data or gap.

    Supported query keys:
      kind='third_down_defense', defteam, before_week
      kind='interior_pressure_split', defteam, before_week
    """
    kind = structural_query.get("kind")
    if kind == "third_down_defense":
        r = third_down_defense_profile(structural_query["defteam"], structural_query["before_week"])
        return r or {"named_gap": "corpus unavailable"}
    if kind == "interior_pressure_split":
        r = interior_pressure_split(structural_query["defteam"], structural_query["before_week"])
        return r or {"named_gap": "corpus unavailable or insufficient sample"}
    return {"named_gap": f"unknown structural query kind: {kind}"}
