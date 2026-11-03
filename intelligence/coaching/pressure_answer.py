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


# ---------------------------------------------------------------------------
# 2026-11-03 append — @PattonAnalytics "ARBY" pressure-over-expectation index
# and sack-avoidance survival curve.  LEARN-AND-REASON: internal math on
# nflverse PBP only, no charted-pressure claim.
#
# HONESTY NOTES:
# * nflverse PBP carries no time-to-throw and no charted pressure. "Pressure"
#   here is the documented outcome proxy used elsewhere in this package:
#   sack | qb_hit on a dropback. The index is therefore a *sack-plus-hit*
#   over-expectation, not a charted-pressure over-expectation. Never relabel.
# * The expectation model is fit on weeks 1..k and applied to week k+1
#   (strict walk-forward), so no dropback is scored by a model that saw it.
# * The survival curve is a Kaplan-Meier estimate over dropbacks within a
#   drive, ordered by play sequence. Censoring is drive end (punt, FG, score,
#   turnover, half end). Fewer than 30 at-risk dropbacks returns gated=None.
# ---------------------------------------------------------------------------

PRESSURE_PROXY = "sack_or_qb_hit"
MIN_AT_RISK = 30


def _dropback_frame(pbp_df):
    """Dropbacks with the columns the pressure model needs, or None."""
    import pandas as pd

    if not isinstance(pbp_df, pd.DataFrame) or pbp_df.empty:
        return None
    d = pbp_df.copy()
    need = {"posteam", "defteam", "week", "game_id", "play_id", "down", "ydstogo", "epa"}
    if not need.issubset(set(d.columns)):
        return None
    for col in ("sack", "qb_hit", "pass_attempt", "rush_attempt"):
        d[col] = pd.to_numeric(d.get(col, 0), errors="coerce").fillna(0)
    d["pressure_proxy"] = ((d["sack"] > 0) | (d["qb_hit"] > 0)).astype(int)
    d["yardline_100"] = pd.to_numeric(d.get("yardline_100"), errors="coerce")
    d["score_differential"] = pd.to_numeric(d.get("score_differential"), errors="coerce").fillna(0)
    d["half_seconds_remaining"] = pd.to_numeric(
        d.get("half_seconds_remaining"), errors="coerce"
    ).fillna(1800)
    d["qtr"] = pd.to_numeric(d.get("qtr"), errors="coerce").fillna(1)
    return d[d["pass_attempt"] > 0].copy()


def compute_arby_pressure_survival_index(pbp_df, train_through_week: int = 3) -> dict:
    """ARBY = pressure over expectation, plus a sack-avoidance survival curve.

    Fits a walk-forward logistic expectation of the sack/qb-hit proxy on
    ``train_through_week`` then scores later weeks. Emits per-team mean
    residual (observed − expected) and a Kaplan-Meier sack-avoidance curve
    over dropback position within drives.
    """
    import numpy as np

    d = _dropback_frame(pbp_df)
    if d is None:
        return {"metric": "arby_pressure_survival_index", "error": "no usable dropback frame"}

    feat_cols = ["down", "ydstogo", "yardline_100", "score_differential", "qtr", "half_seconds_remaining"]
    d = d.dropna(subset=["down", "ydstogo"])
    d[feat_cols] = d[feat_cols].fillna(0.0)

    train = d[d["week"] <= train_through_week]
    test = d[d["week"] > train_through_week]
    if len(train) < 100 or len(test) < 100:
        return {
            "metric": "arby_pressure_survival_index",
            "error": "insufficient walk-forward split",
            "train_rows": int(len(train)),
            "test_rows": int(len(test)),
        }

    from sklearn.linear_model import LogisticRegression

    model = LogisticRegression(max_iter=1000, solver="lbfgs")
    model.fit(train[feat_cols].to_numpy(float), train["pressure_proxy"].to_numpy(int))
    d = d.copy()
    d["pressure_expected"] = model.predict_proba(d[feat_cols].to_numpy(float))[:, 1]
    d["arby_residual"] = d["pressure_proxy"] - d["pressure_expected"]

    scored = d[d["week"] > train_through_week]
    team_rows = []
    for team, g in scored.groupby("posteam"):
        n = len(g)
        if n < MIN_AT_RISK:
            continue
        team_rows.append({
            "team": str(team),
            "dropbacks": int(n),
            "observed_pressure_rate": round(float(g["pressure_proxy"].mean()), 4),
            "expected_pressure_rate": round(float(g["pressure_expected"].mean()), 4),
            "arby_index": round(float(g["arby_residual"].mean()), 4),
            "mean_epa": round(float(pd_to_float(g["epa"]).mean()), 4),
            "publishable": bool(n >= MIN_AT_RISK),
        })
    team_rows.sort(key=lambda r: -r["arby_index"])

    # --- Kaplan-Meier sack avoidance over dropback position within drive ---
    seq = d.sort_values(["game_id", "play_id"]).copy()
    seq["db_index_in_drive"] = seq.groupby(["game_id", "drive"]).cumcount() + 1
    max_idx = int(min(seq["db_index_in_drive"].max(), 12))
    at_risk = 0
    survived = 1.0
    curve = []
    for k in range(1, max_idx + 1):
        cohort = seq[seq["db_index_in_drive"] >= k]
        n_at_risk = len(cohort)
        if n_at_risk < MIN_AT_RISK:
            break
        events = int((cohort[cohort["db_index_in_drive"] == k]["pressure_proxy"] == 1).sum())
        if k == 1:
            at_risk = n_at_risk
        if n_at_risk > 0:
            survived *= (1.0 - events / n_at_risk)
        curve.append({
            "dropback_in_drive": k,
            "at_risk": int(n_at_risk),
            "sack_or_hit_events": events,
            "sack_avoidance_survival": round(survived, 4),
        })

    return {
        "metric": "arby_pressure_survival_index",
        "pressure_proxy": PRESSURE_PROXY,
        "model": "walk_forward_logistic_regression",
        "train_through_week": train_through_week,
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "test_auc_insample_note": "no AUC is reported; the model is scored only out-of-sample by residual sign",
        "team_index": team_rows,
        "survival_curve": curve,
        "caveats": [
            "Pressure is the sack-or-qb-hit outcome proxy, NOT charted pressure (nflverse has none).",
            "Kaplan-Meier censoring is drive end; a sack is the event.",
            "Teams with < 30 out-of-sample dropbacks are omitted, not zero-filled.",
        ],
    }


def pd_to_float(series):
    """Local numeric coercion helper (keeps the module import-light)."""
    import pandas as pd

    return pd.to_numeric(series, errors="coerce").fillna(0.0)
