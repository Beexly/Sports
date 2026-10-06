# PROVENANCE — gse-intelligence-build / coaching / pressure_answer.py
# Implements: corpus-intelligence/deep/c01/buildable-systems.md #24
# (pressure-answer adaptation: answer_delta_w = quick_game_rate_w −
# mean(quick_game_rate over strictly-prior season weeks) for team-weeks
# following top-5 pass-rush opponents; the Monken template 2016–2025
# CLE→TB→BAL, where answer_delta_w > 0 exactly in BAL's 2023–2024 seasons).
#
# Data: coaching/data/schedule.csv + def_pressure_weekly.csv (built by
# coaching/build/build_pressure_answer.py from pbp parquet); weekly
# quick_game_rate from weekly_tendencies.csv. Runtime deps: stdlib only.
#
# Honesty notes:
# - The pass-rush rank uses the outcome-not-frequency proxy (sacks + QB hits
#   per dropback faced, trailing 4 weeks). Charted per-play pressure is NULL
#   in nflverse (verified-claims.md PRESS-7); this is the same proxy as
#   dc_pressure.csv, never labeled as charted pressure.
# - The baseline mean uses strictly-prior weeks (anti-leakage), not the full
#   season including week w.
# - Bye weeks and missing opponents are gaps (None), never zero-filled.
"""Pressure-answer adaptation: did the offense answer an elite rush with quick game?"""
from __future__ import annotations

from typing import Any, Optional

from . import load as L

TOP_N = 5          # "top-5 pass-rush opponents" (the spec's cut)
TRAIL_WEEKS = 4    # trailing window for the defensive proxy
MIN_BASELINE_WEEKS = 2  # need at least this many prior weeks for a baseline


def _sched_index() -> dict[tuple, str]:
    return {(r["season"], r["week"], r["team"]): r["opponent"]
            for r in L.load_table("schedule.csv")}


def _press_index() -> dict[tuple, dict[str, Any]]:
    return {(r["season"], r["week"], r["team"]): r
            for r in L.load_table("def_pressure_weekly.csv")}


def _qg_index() -> dict[tuple, float]:
    out = {}
    for r in L.load_table("weekly_tendencies.csv"):
        qg = r.get("quick_game_rate")
        if qg is not None:
            out[(r["season"], r["week"], r["team"])] = float(qg)
    return out


def opponent(season: int, week: int, team: str) -> Optional[str]:
    """The team's opponent in (season, week); None on a bye / missing."""
    return _sched_index().get((season, week, team))


def _top_rush_teams(season: int, week: int, n: int = TOP_N) -> list[str]:
    """Top-n pass-rush defenses by trailing proxy entering (season, week).

    Uses each defense's trail4_proxy from the most recent charted week
    strictly before `week` (anti-leakage: the rank a bettor could have
    known before week `week` kicked off).
    """
    idx = _press_index()
    best: dict[str, tuple[float, int]] = {}
    for (s, w, team), r in idx.items():
        if s != season or w >= week:
            continue
        p = r.get("trail4_proxy")
        if p is None:
            continue
        if team not in best or w > best[team][1]:
            best[team] = (float(p), w)
    ranked = sorted(best.items(), key=lambda kv: kv[1][0], reverse=True)
    return [t for t, _ in ranked[:n]]


def faced_top5_rush(season: int, week: int, team: str,
                    n: int = TOP_N) -> Optional[bool]:
    """Did `team` face a top-`n` pass rush in week `week`?

    None when the opponent or the proxy is unknown (bye / gap).
    """
    opp = opponent(season, week, team)
    if opp is None:
        return None
    top = _top_rush_teams(season, week, n)
    if not top:
        return None
    return opp in top


def answer_delta(season: int, week: int, team: str) -> Optional[float]:
    """quick_game_rate_w − mean(quick_game_rate over strictly-prior weeks).

    None when week w or fewer than MIN_BASELINE_WEEKS prior weeks are known.
    """
    qg = _qg_index()
    cur = qg.get((season, week, team))
    if cur is None:
        return None
    prior = [v for (s, w, t), v in qg.items()
             if s == season and t == team and w < week]
    if len(prior) < MIN_BASELINE_WEEKS:
        return None
    return cur - sum(prior) / len(prior)


def pressure_answer_profile(season: int, team: str,
                            n: int = TOP_N) -> dict[str, Any]:
    """The Monken-template summary for one team-season.

    For every week w (with a baseline) whose week w−1 opponent was a top-n
    pass rush, records answer_delta_w. Returns the hit rate (fraction of
    answer_deltas > 0), the mean delta, and the underlying weeks — the
    fingerprint is "answer_delta_w > 0 exactly" (BAL 2023–2024).
    """
    qg = _qg_index()
    weeks = sorted(w for (s, w, t) in qg if s == season and t == team)
    hits: list[dict[str, Any]] = []
    for w in weeks:
        if w < 2:
            continue
        faced = faced_top5_rush(season, w - 1, team, n)
        if faced is not True:
            continue
        d = answer_delta(season, w, team)
        if d is None:
            continue
        opp = opponent(season, w - 1, team)
        hits.append({"week": w, "vs_top5_rush": opp, "answer_delta": round(d, 4)})
    pos = sum(1 for h in hits if h["answer_delta"] > 0)
    return {
        "season": season, "team": team, "top_n": n,
        "n_post_rush_weeks": len(hits),
        "hit_rate": round(pos / len(hits), 3) if hits else None,
        "mean_answer_delta": (round(sum(h["answer_delta"] for h in hits) / len(hits), 4)
                              if hits else None),
        "weeks": hits,
    }
