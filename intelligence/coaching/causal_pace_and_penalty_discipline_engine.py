"""
Stream 15U: Causal Neutral-Script Pace, Play Volume & Penalty Discipline Engine
===============================================================================

Strictly causal (`week < as_of_week` in 2026 + decayed 2025 offensive/defensive play-volume
prior) Empirical-Bayes tempo & penalty auditor built over cleared CC-BY-4.0 nflverse data:
  - `data/nflverse/pbp_2026_w1_w10.parquet` (`week >= 1`)
  - `data/nflverse/stats_team_week_2025.parquet`

Measured Walk-Forward OOS Behavior (`eval_weeks = 4..10`):
  1. `neutral_pace`: Q1-Q3 neutral-script (`|score_diff| <= 7`, `half_sec > 120`) same-drive
     consecutive-snap elapsed time (`3s <= dt <= 45s`, `k_pace = 180` snaps) strictly reduces
     held-out team-game pace MSE vs both league mean and unshrunk raw -> **PROMOTED** (`+0.20`).
  2. `off_play_volume`: Offensive & defensive scrimmage play counts with 2025 Empirical-Bayes
     prior (`k_off = 8`, `25%` 2025 prior) strictly reduces held-out play-count MSE vs both
     league mean and raw unshrunk -> **PROMOTED** (`+0.25`).
  3. `team_penalty_rate`: Team penalties per scrimmage play (`k_pen = 10`) fails OOS MSE vs
     league mean -> **HONEST NULL HOLD** (`0.0` weight in simulator; logged in conditioners).

Outputs:
  1. `compute_causal_15u_pace_and_penalty_profiles(as_of_week=None)`
  2. `evaluate_causal_15u_pace_matchup(away_team, home_team, context=None, as_of_week=None)`
  3. `evaluate_causal_15u_walkforward_oos(eval_weeks=range(4, 11))`
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

import numpy as np
import pandas as pd

from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
PBP_2026_PATH = REPO_ROOT / "data" / "nflverse" / "pbp_2026_w1_w10.parquet"
STW_2025_PATH = REPO_ROOT / "data" / "nflverse" / "stats_team_week_2025.parquet"

_CACHE: Dict[str, Any] = {}
_PROFILE_CACHE: Dict[Optional[int], Dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _mse(y: Sequence[float], p: Sequence[float]) -> float:
    if not y:
        return 0.0
    ya = np.asarray(y, dtype=float)
    pa = np.asarray(p, dtype=float)
    return float(np.mean((ya - pa) ** 2))


def _corr(y: Sequence[float], p: Sequence[float]) -> float:
    if len(y) < 3:
        return 0.0
    ya = np.asarray(y, dtype=float)
    pa = np.asarray(p, dtype=float)
    if np.std(ya) < 1e-9 or np.std(pa) < 1e-9:
        return 0.0
    c = float(np.corrcoef(ya, pa)[0, 1])
    return c if math.isfinite(c) else 0.0


def _load_frames() -> Dict[str, Any]:
    if "loaded" in _CACHE:
        return _CACHE

    if PBP_2026_PATH.is_file():
        cols = [
            "game_id",
            "play_id",
            "drive",
            "week",
            "posteam",
            "defteam",
            "play_type",
            "qtr",
            "quarter_seconds_remaining",
            "half_seconds_remaining",
            "score_differential",
            "penalty",
            "penalty_team",
        ]
        pbp = pd.read_parquet(PBP_2026_PATH, columns=cols).copy()
        pbp["posteam"] = pbp["posteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        pbp["defteam"] = pbp["defteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        pbp["penalty_team"] = pbp["penalty_team"].map(lambda x: normalize_nfl_team(str(x or "")))
        pbp["week"] = pbp["week"].fillna(0).astype(int)
        pbp = pbp[pbp["week"] >= 1].sort_values(["game_id", "play_id"]).copy()
    else:
        pbp = pd.DataFrame()

    o25_plays: Dict[str, float] = {}
    d25_plays: Dict[str, float] = {}
    if STW_2025_PATH.is_file():
        stw25 = pd.read_parquet(
            STW_2025_PATH,
            columns=["team", "opponent_team", "attempts", "carries"],
        ).copy()
        stw25["team_norm"] = stw25["team"].map(lambda x: normalize_nfl_team(str(x or "")))
        stw25["opp_norm"] = stw25["opponent_team"].map(
            lambda x: normalize_nfl_team(str(x or ""))
        )
        stw25["plays"] = stw25["attempts"].fillna(0.0).astype(float) + stw25["carries"].fillna(
            0.0
        ).astype(float)
        o25_plays = {
            str(k): float(v)
            for k, v in stw25[stw25["team_norm"] != ""].groupby("team_norm")["plays"].mean().items()
        }
        d25_plays = {
            str(k): float(v)
            for k, v in stw25[stw25["opp_norm"] != ""].groupby("opp_norm")["plays"].mean().items()
        }

    if not pbp.empty:
        sc = pbp[pbp["play_type"].isin(["pass", "run"])].copy()
        sc["prev_gid"] = sc["game_id"].shift(1)
        sc["prev_drv"] = sc["drive"].shift(1)
        sc["prev_qtr"] = sc["qtr"].shift(1)
        sc["prev_pos"] = sc["posteam"].shift(1)
        sc["prev_sec"] = sc["quarter_seconds_remaining"].shift(1)
        sc["dt"] = sc["prev_sec"] - sc["quarter_seconds_remaining"]
        neut = sc[
            (sc["game_id"] == sc["prev_gid"])
            & (sc["drive"] == sc["prev_drv"])
            & (sc["qtr"] == sc["prev_qtr"])
            & (sc["posteam"] == sc["prev_pos"])
            & (sc["posteam"] != "")
            & (sc["qtr"].isin([1, 2, 3]))
            & (sc["score_differential"].abs() <= 7)
            & (sc["half_seconds_remaining"] > 120)
            & (sc["dt"] >= 3)
            & (sc["dt"] <= 45)
        ].copy()
        tg_pace = neut.groupby(["game_id", "week", "posteam"], as_index=False).agg(
            dt_mean=("dt", "mean"),
            n_neut=("dt", "count"),
            defteam=("defteam", "first"),
        )
        tg_plays = sc[sc["posteam"] != ""].groupby(["game_id", "week", "posteam"], as_index=False).agg(
            n_plays=("play_id", "count"),
            defteam=("defteam", "first"),
        )

        pbp["pen_flag"] = (pbp["penalty"].fillna(0) == 1).astype(int)
        pen_rows = pbp[(pbp["pen_flag"] == 1) & (pbp["penalty_team"] != "")].copy()
        pen_cnt = (
            pen_rows.groupby(["game_id", "week", "penalty_team"], as_index=False)
            .agg(pens=("pen_flag", "sum"))
            .rename(columns={"penalty_team": "posteam"})
        )
        tg_pen = tg_plays[["game_id", "week", "posteam", "n_plays"]].merge(
            pen_cnt, on=["game_id", "week", "posteam"], how="left"
        )
        tg_pen["pens"] = tg_pen["pens"].fillna(0.0).astype(float)
        tg_pen["pen_rate"] = tg_pen["pens"] / np.maximum(tg_pen["n_plays"], 1.0)
    else:
        tg_pace = pd.DataFrame()
        tg_plays = pd.DataFrame()
        tg_pen = pd.DataFrame()

    _CACHE["loaded"] = True
    _CACHE["tg_pace"] = tg_pace
    _CACHE["tg_plays"] = tg_plays
    _CACHE["tg_pen"] = tg_pen
    _CACHE["o25_plays"] = o25_plays
    _CACHE["d25_plays"] = d25_plays
    return _CACHE


def _fit_causal_tables(ref_week: int) -> Dict[str, Any]:
    frames = _load_frames()
    tg_pace: pd.DataFrame = frames["tg_pace"]
    tg_plays: pd.DataFrame = frames["tg_plays"]
    tg_pen: pd.DataFrame = frames["tg_pen"]
    o25_plays: Dict[str, float] = frames["o25_plays"]
    d25_plays: Dict[str, float] = frames["d25_plays"]

    tr_p = tg_pace[tg_pace["week"] < ref_week] if not tg_pace.empty else tg_pace
    tr_n = tg_plays[tg_plays["week"] < ref_week] if not tg_plays.empty else tg_plays
    tr_pn = tg_pen[tg_pen["week"] < ref_week] if not tg_pen.empty else tg_pen

    mu_pace = (
        float((tr_p["dt_mean"] * tr_p["n_neut"]).sum() / max(1.0, tr_p["n_neut"].sum()))
        if not tr_p.empty
        else 32.2
    )
    mu_plays = float(tr_n["n_plays"].mean()) if not tr_n.empty else 58.0
    mu_pen = float(tr_pn["pen_rate"].mean()) if not tr_pn.empty else 0.11

    if not tr_p.empty:
        tr_p = tr_p.copy()
        tr_p["dt_sum"] = tr_p["dt_mean"] * tr_p["n_neut"]
        gp_p = tr_p.groupby("posteam").agg(dt_sum=("dt_sum", "sum"), n=("n_neut", "sum"))
    else:
        gp_p = pd.DataFrame()

    o_n = tr_n.groupby("posteam")["n_plays"].agg(["mean", "count"]) if not tr_n.empty else pd.DataFrame()
    d_n = (
        tr_n[tr_n["defteam"] != ""].groupby("defteam")["n_plays"].agg(["mean", "count"])
        if not tr_n.empty
        else pd.DataFrame()
    )
    o_pn = tr_pn.groupby("posteam")["pen_rate"].agg(["mean", "count"]) if not tr_pn.empty else pd.DataFrame()

    teams = sorted(
        set(o25_plays.keys())
        | set(d25_plays.keys())
        | (set(o_n.index.astype(str)) if not o_n.empty else set())
        | (set(gp_p.index.astype(str)) if not gp_p.empty else set())
    )

    profiles: Dict[str, Dict[str, float]] = {}
    for tm in teams:
        s_p, n_p = gp_p.loc[tm] if (not gp_p.empty and tm in gp_p.index) else (0.0, 0.0)
        eb_dt = float((s_p + 180.0 * mu_pace) / (n_p + 180.0))
        raw_dt = float(s_p / n_p) if n_p > 0 else mu_pace
        pace_delta = float(mu_pace - eb_dt)

        om, oc = o_n.loc[tm] if (not o_n.empty and tm in o_n.index) else (mu_plays, 0.0)
        dm, dc = d_n.loc[tm] if (not d_n.empty and tm in d_n.index) else (mu_plays, 0.0)
        p_o25 = float(o25_plays.get(tm, mu_plays))
        p_d25 = float(d25_plays.get(tm, mu_plays))
        off_plays_eb = float((oc * om + 6.0 * mu_plays + 2.0 * p_o25) / (oc + 8.0))
        def_plays_eb = float((dc * dm + 6.0 * mu_plays + 2.0 * p_d25) / (dc + 8.0))

        pm, pc = o_pn.loc[tm] if (not o_pn.empty and tm in o_pn.index) else (mu_pen, 0.0)
        pen_eb = float((pc * pm + 10.0 * mu_pen) / (pc + 10.0))

        profiles[tm] = {
            "eb_neutral_dt": round(eb_dt, 6),
            "raw_neutral_dt": round(raw_dt, 6),
            "pace_speed_delta_sec": round(pace_delta, 6),
            "off_plays_eb": round(off_plays_eb, 6),
            "def_plays_allowed_eb": round(def_plays_eb, 6),
            "pen_rate_eb": round(pen_eb, 6),
            "n_neutral_snaps": int(n_p),
            "n_games": int(oc),
        }

    return {
        "as_of_week": ref_week,
        "mu_pace": mu_pace,
        "mu_plays": mu_plays,
        "mu_pen": mu_pen,
        "teams": profiles,
    }


def compute_causal_15u_pace_and_penalty_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Compute strictly causal 32-team Stream 15U pace & play-volume profiles."""
    frames = _load_frames()
    tg_plays: pd.DataFrame = frames["tg_plays"]
    max_wk = int(tg_plays["week"].max()) + 1 if not tg_plays.empty else 11
    ref_week = int(as_of_week) if as_of_week is not None else max_wk
    if ref_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[ref_week]

    fitted = _fit_causal_tables(ref_week)
    out = {
        "schema": "stream_15u_causal_pace_and_penalty_v1",
        "as_of_week": ref_week,
        "league_neutral_dt_sec": round(fitted["mu_pace"], 6),
        "league_off_plays_pg": round(fitted["mu_plays"], 6),
        "league_pen_rate": round(fitted["mu_pen"], 6),
        "teams_count": len(fitted["teams"]),
        "teams": fitted["teams"],
    }
    _PROFILE_CACHE[ref_week] = out
    return out


def evaluate_causal_15u_pace_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Evaluate swap-symmetric Stream 15U pace/play-volume conditioners and null penalty diagnostic."""
    _ = context
    aw = normalize_nfl_team(str(away_team or ""))
    hm = normalize_nfl_team(str(home_team or ""))
    prof = compute_causal_15u_pace_and_penalty_profiles(as_of_week=as_of_week)
    teams = prof.get("teams") or {}
    mu_plays = float(prof.get("league_off_plays_pg", 58.0))
    mu_pen = float(prof.get("league_pen_rate", 0.11))

    aw_p = teams.get(aw)
    hm_p = teams.get(hm)

    if aw_p is None or hm_p is None:
        return {
            "schema": "stream_15u_matchup_v1",
            "as_of_week": prof["as_of_week"],
            "stream_15u_away_neutral_pace_edge": 0.0,
            "stream_15u_home_neutral_pace_edge": 0.0,
            "stream_15u_away_play_volume_edge": 0.0,
            "stream_15u_home_play_volume_edge": 0.0,
            "stream_15u_away_penalty_null_edge": 0.0,
            "stream_15u_home_penalty_null_edge": 0.0,
            "stream_15u_net_tempo_volume_diff": 0.0,
            "stream_15u_game_expected_plays_delta": 0.0,
        }

    aw_pace = _clamp(aw_p["pace_speed_delta_sec"] / 15.0, -0.18, 0.18)
    hm_pace = _clamp(hm_p["pace_speed_delta_sec"] / 15.0, -0.18, 0.18)

    aw_vol_delta = 0.55 * ((aw_p["off_plays_eb"] - mu_plays) + (hm_p["def_plays_allowed_eb"] - mu_plays))
    hm_vol_delta = 0.55 * ((hm_p["off_plays_eb"] - mu_plays) + (aw_p["def_plays_allowed_eb"] - mu_plays))
    aw_vol = _clamp(aw_vol_delta / 25.0, -0.18, 0.18)
    hm_vol = _clamp(hm_vol_delta / 25.0, -0.18, 0.18)

    # Diagnostic only (held at 0.0 weight in simulator)
    aw_pen_null = _clamp((mu_pen - aw_p["pen_rate_eb"]) * 2.0, -0.12, 0.12)
    hm_pen_null = _clamp((mu_pen - hm_p["pen_rate_eb"]) * 2.0, -0.12, 0.12)

    net_diff = _clamp((aw_pace + aw_vol) - (hm_pace + hm_vol), -0.25, 0.25)
    game_plays_delta = round(aw_vol_delta + hm_vol_delta, 4)

    return {
        "schema": "stream_15u_matchup_v1",
        "as_of_week": prof["as_of_week"],
        "stream_15u_away_neutral_pace_edge": round(aw_pace, 6),
        "stream_15u_home_neutral_pace_edge": round(hm_pace, 6),
        "stream_15u_away_play_volume_edge": round(aw_vol, 6),
        "stream_15u_home_play_volume_edge": round(hm_vol, 6),
        "stream_15u_away_penalty_null_edge": round(aw_pen_null, 6),
        "stream_15u_home_penalty_null_edge": round(hm_pen_null, 6),
        "stream_15u_net_tempo_volume_diff": round(net_diff, 6),
        "stream_15u_game_expected_plays_delta": game_plays_delta,
    }


def evaluate_causal_15u_walkforward_oos(
    eval_weeks: Iterable[int] = range(4, 11),
) -> Dict[str, Any]:
    """Strict walk-forward OOS evaluation over 2026 Weeks 4-10."""
    frames = _load_frames()
    tg_pace: pd.DataFrame = frames["tg_pace"]
    tg_plays: pd.DataFrame = frames["tg_plays"]
    tg_pen: pd.DataFrame = frames["tg_pen"]

    y_p: List[float] = []
    pb_p: List[float] = []
    pr_p: List[float] = []
    pe_p: List[float] = []

    y_n: List[float] = []
    pb_n: List[float] = []
    pr_n: List[float] = []
    pe_n: List[float] = []

    y_pn: List[float] = []
    pb_pn: List[float] = []
    pe_pn: List[float] = []

    eval_list = [int(w) for w in eval_weeks]
    for wk in eval_list:
        fitted = _fit_causal_tables(wk)
        teams = fitted["teams"]
        mu_pace = fitted["mu_pace"]
        mu_plays = fitted["mu_plays"]
        mu_pen = fitted["mu_pen"]

        te_p = tg_pace[tg_pace["week"] == wk] if not tg_pace.empty else tg_pace
        for _, r in te_p.iterrows():
            tp = teams.get(r["posteam"])
            eb = float(tp["eb_neutral_dt"]) if tp else mu_pace
            raw = float(tp["raw_neutral_dt"]) if tp else mu_pace
            y_p.append(float(r["dt_mean"]))
            pb_p.append(mu_pace)
            pr_p.append(raw)
            pe_p.append(eb)

        # Also raw team mean lookup for offensive play count benchmark
        tr_n = tg_plays[tg_plays["week"] < wk] if not tg_plays.empty else tg_plays
        raw_on = tr_n.groupby("posteam")["n_plays"].mean().to_dict() if not tr_n.empty else {}
        raw_dn = tr_n[tr_n["defteam"] != ""].groupby("defteam")["n_plays"].mean().to_dict() if not tr_n.empty else {}

        te_n = tg_plays[tg_plays["week"] == wk] if not tg_plays.empty else tg_plays
        for _, r in te_n.iterrows():
            op = teams.get(r["posteam"])
            dp = teams.get(r["defteam"])
            off_eb = float(op["off_plays_eb"]) if op else mu_plays
            def_eb = float(dp["def_plays_allowed_eb"]) if dp else mu_plays
            pred_eb = mu_plays + 0.55 * ((off_eb - mu_plays) + (def_eb - mu_plays))
            pred_raw = 0.5 * (
                float(raw_on.get(r["posteam"], mu_plays))
                + float(raw_dn.get(r["defteam"], mu_plays))
            )
            y_n.append(float(r["n_plays"]))
            pb_n.append(mu_plays)
            pr_n.append(pred_raw)
            pe_n.append(pred_eb)

        te_pn = tg_pen[tg_pen["week"] == wk] if not tg_pen.empty else tg_pen
        for _, r in te_pn.iterrows():
            tp = teams.get(r["posteam"])
            eb_pn = float(tp["pen_rate_eb"]) if tp else mu_pen
            y_pn.append(float(r["pen_rate"]))
            pb_pn.append(mu_pen)
            pe_pn.append(eb_pn)

    pace_mse_base = _mse(y_p, pb_p)
    pace_mse_raw = _mse(y_p, pr_p)
    pace_mse_eb = _mse(y_p, pe_p)

    plays_mse_base = _mse(y_n, pb_n)
    plays_mse_raw = _mse(y_n, pr_n)
    plays_mse_eb = _mse(y_n, pe_n)

    pen_mse_base = _mse(y_pn, pb_pn)
    pen_mse_eb = _mse(y_pn, pe_pn)

    pace_beats = pace_mse_eb < pace_mse_base and pace_mse_eb < pace_mse_raw
    plays_beats = plays_mse_eb < plays_mse_base and plays_mse_eb < plays_mse_raw
    pen_beats = pen_mse_eb < pen_mse_base

    return {
        "schema": "stream_15u_walkforward_oos_v1",
        "eval_weeks": eval_list,
        "neutral_pace": {
            "n_team_games": len(y_p),
            "mse_league_baseline": round(pace_mse_base, 6),
            "mse_raw_team": round(pace_mse_raw, 6),
            "mse_stream_15u_eb": round(pace_mse_eb, 6),
            "oos_corr": round(_corr(y_p, pe_p), 6),
            "beats_baseline_and_raw": pace_beats,
        },
        "off_play_volume": {
            "n_team_games": len(y_n),
            "mse_league_baseline": round(plays_mse_base, 6),
            "mse_raw_team": round(plays_mse_raw, 6),
            "mse_stream_15u_eb": round(plays_mse_eb, 6),
            "oos_corr": round(_corr(y_n, pe_n), 6),
            "beats_baseline_and_raw": plays_beats,
        },
        "team_penalty_rate": {
            "n_team_games": len(y_pn),
            "mse_league_baseline": round(pen_mse_base, 6),
            "mse_stream_15u_eb": round(pen_mse_eb, 6),
            "oos_corr": round(_corr(y_pn, pe_pn), 6),
            "beats_baseline": pen_beats,
        },
        "all_promoted_components_beat_baseline": bool(pace_beats and plays_beats),
    }
