"""
Stream 15T: Causal Red-Zone Compression & 4th-Down Efficiency Engine
===================================================================

Strictly causal (`week < as_of_week` in 2026 + decayed 2023-2025 structural priors)
Empirical-Bayes estimator over cleared CC-BY-4.0 nflverse datasets:
  - `data/nflverse/pbp_2026_w1_w10.parquet` (`4,205` red-zone plays `yardline_100 <= 20`,
    `2,155` classified 4th-down decisions)
  - `data/nflverse/hf_4th_downs_1999_2025_zone1.parquet` (2023-2025 situational priors)
  - `data/nflverse/stats_team_week_2025.parquet` (2025 full-play offensive/defensive EPA prior)

Key Empirical Insights:
  1. Unregularized RZ-only TD conversion (`rz_only_unregularized`) is heavily contaminated
     by 30-40-drive variance and fails OOS walk-forward Brier vs yardline-depth cell baselines
     -> explicitly tracked and held at `0.0` standalone simulator weight.
  2. Full-play offensive/defensive EPA prior (`k_full = 140` plays) + heavily shrunk RZ TD
     residual (`k_rz = 80` drives) (`rz_td_full_prior`) reduces OOS RZ drive TD Brier
     and Log-Loss across 2026 Weeks 4-10.
  3. Situational 4th-down go aggression (`(ydstogo, yardline, trailing)` prior, `k_go = 50`)
     and 4th-down conversion skill (`ydstogo` prior, `k_conv = 45`) both improve OOS Brier
     and Log-Loss across Weeks 4-10.

Outputs:
  1. `compute_causal_15t_redzone_and_4th_profiles(as_of_week=None)`
  2. `evaluate_causal_15t_redzone_4th_matchup(away_team, home_team, context=None, as_of_week=None)`
  3. `evaluate_causal_15t_walkforward_oos(eval_weeks=range(4, 11))`
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
PBP_2026_PATH = REPO_ROOT / "data" / "nflverse" / "pbp_2026_w1_w10.parquet"
HF4_PATH = REPO_ROOT / "data" / "nflverse" / "hf_4th_downs_1999_2025_zone1.parquet"
STW_2025_PATH = REPO_ROOT / "data" / "nflverse" / "stats_team_week_2025.parquet"

_CACHE: Dict[str, Any] = {}
_PROFILE_CACHE: Dict[Optional[int], Dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _brier(y: Sequence[float], p: Sequence[float]) -> float:
    if not y:
        return 0.0
    ya = np.asarray(y, dtype=float)
    pa = np.asarray(p, dtype=float)
    return float(np.mean((ya - pa) ** 2))


def _log_loss(y: Sequence[float], p: Sequence[float]) -> float:
    if not y:
        return 0.0
    ya = np.asarray(y, dtype=float)
    pa = np.clip(np.asarray(p, dtype=float), 1e-6, 1.0 - 1e-6)
    return float(-np.mean(ya * np.log(pa) + (1.0 - ya) * np.log(1.0 - pa)))


def _ytg_bin(ydstogo: pd.Series) -> pd.Series:
    return pd.Series(
        np.where(
            ydstogo <= 1,
            "1",
            np.where(ydstogo <= 3, "2_3", np.where(ydstogo <= 6, "4_6", "7p")),
        ),
        index=ydstogo.index,
    )


def _yl4_bin(yardline_100: pd.Series) -> pd.Series:
    return pd.Series(
        np.where(
            yardline_100 <= 20,
            "rz",
            np.where(yardline_100 <= 40, "fg", np.where(yardline_100 <= 60, "mid", "own")),
        ),
        index=yardline_100.index,
    )


def _rz_start_bin(start_yl: pd.Series) -> pd.Series:
    return pd.Series(
        np.where(
            start_yl <= 5,
            "gl",
            np.where(start_yl <= 10, "lo", np.where(start_yl <= 15, "mid", "hi")),
        ),
        index=start_yl.index,
    )


def _load_frames() -> Dict[str, Any]:
    if "loaded" in _CACHE:
        return _CACHE

    if PBP_2026_PATH.is_file():
        pbp_cols = [
            "game_id",
            "play_id",
            "drive",
            "week",
            "posteam",
            "defteam",
            "play_type",
            "down",
            "ydstogo",
            "yardline_100",
            "score_differential",
            "touchdown",
            "epa",
            "fourth_down_converted",
        ]
        pbp = pd.read_parquet(PBP_2026_PATH, columns=pbp_cols).copy()
        pbp["posteam"] = pbp["posteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        pbp["defteam"] = pbp["defteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        pbp["week"] = pbp["week"].fillna(0).astype(int)
        pbp = pbp[pbp["week"] >= 1].copy()
    else:
        pbp = pd.DataFrame()

    if HF4_PATH.is_file():
        hf4_cols = [
            "season",
            "posteam",
            "defteam",
            "play_type",
            "ydstogo",
            "yardline_100",
            "score_differential",
            "fourth_down_converted",
        ]
        hf4 = pd.read_parquet(HF4_PATH, columns=hf4_cols).copy()
        hf4 = hf4[
            (hf4["season"].astype(int) >= 2023)
            & (hf4["play_type"].isin(["pass", "run", "field_goal", "punt"]))
        ].copy()
        hf4["posteam"] = hf4["posteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        hf4["defteam"] = hf4["defteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        hf4["is_go"] = hf4["play_type"].isin(["pass", "run"]).astype(int)
        hf4["conv"] = hf4["fourth_down_converted"].fillna(0).astype(int)
        hf4["ytg_b"] = _ytg_bin(hf4["ydstogo"].fillna(5))
        hf4["yl_b"] = _yl4_bin(hf4["yardline_100"].fillna(50))
        hf4["trailing"] = (hf4["score_differential"].fillna(0) < 0).astype(int)
    else:
        hf4 = pd.DataFrame()

    off25_map: Dict[str, float] = {}
    def25_map: Dict[str, float] = {}
    if STW_2025_PATH.is_file():
        stw25 = pd.read_parquet(
            STW_2025_PATH,
            columns=[
                "team",
                "opponent_team",
                "passing_epa",
                "rushing_epa",
                "attempts",
                "carries",
            ],
        ).copy()
        stw25["team_norm"] = stw25["team"].map(lambda x: normalize_nfl_team(str(x or "")))
        stw25["opp_norm"] = stw25["opponent_team"].map(
            lambda x: normalize_nfl_team(str(x or ""))
        )
        o_grp = stw25[stw25["team_norm"] != ""].groupby("team_norm").agg(
            pe=("passing_epa", "sum"),
            re=("rushing_epa", "sum"),
            att=("attempts", "sum"),
            car=("carries", "sum"),
        )
        o_grp["epa_pp"] = (o_grp["pe"] + o_grp["re"]) / np.maximum(
            o_grp["att"] + o_grp["car"], 1.0
        )
        off25_map = {str(k): float(v) for k, v in o_grp["epa_pp"].to_dict().items()}

        d_grp = stw25[stw25["opp_norm"] != ""].groupby("opp_norm").agg(
            pe=("passing_epa", "sum"),
            re=("rushing_epa", "sum"),
            att=("attempts", "sum"),
            car=("carries", "sum"),
        )
        d_grp["epa_pp"] = (d_grp["pe"] + d_grp["re"]) / np.maximum(
            d_grp["att"] + d_grp["car"], 1.0
        )
        def25_map = {str(k): float(v) for k, v in d_grp["epa_pp"].to_dict().items()}

    # Precompute 2024-2025 go-for-it priors and 2023-2025 conversion priors
    go_cell: Dict[Tuple[str, str, int], float] = {}
    t_go25: Dict[str, Tuple[float, float]] = {}
    conv_cell: Dict[str, float] = {}
    t_cv25: Dict[str, Tuple[float, float]] = {}
    t_def_cv25: Dict[str, Tuple[float, float]] = {}

    if not hf4.empty:
        hf_go_prior = hf4[hf4["season"].astype(int) >= 2024].copy()
        go_cell_s = hf_go_prior.groupby(["ytg_b", "yl_b", "trailing"])["is_go"].mean()
        go_cell = {k: float(v) for k, v in go_cell_s.to_dict().items()}
        hf_go_prior["p0"] = [
            go_cell.get((a, b, t), 0.2)
            for a, b, t in zip(hf_go_prior["ytg_b"], hf_go_prior["yl_b"], hf_go_prior["trailing"])
        ]
        hf_go_prior["res"] = hf_go_prior["is_go"] - hf_go_prior["p0"]
        tg = hf_go_prior[hf_go_prior["posteam"] != ""].groupby("posteam")["res"].agg(["sum", "count"])
        t_go25 = {str(k): (float(r["sum"]), float(r["count"])) for k, r in tg.iterrows()}

        hf_cv = hf4[hf4["is_go"] == 1].copy()
        conv_cell_s = hf_cv.groupby("ytg_b")["conv"].mean()
        conv_cell = {str(k): float(v) for k, v in conv_cell_s.to_dict().items()}
        hf_cv["p0"] = hf_cv["ytg_b"].map(conv_cell).fillna(0.54)
        hf_cv["res"] = hf_cv["conv"] - hf_cv["p0"]
        tc = hf_cv[hf_cv["posteam"] != ""].groupby("posteam")["res"].agg(["sum", "count"])
        td = hf_cv[hf_cv["defteam"] != ""].groupby("defteam")["res"].agg(["sum", "count"])
        t_cv25 = {str(k): (float(r["sum"]), float(r["count"])) for k, r in tc.iterrows()}
        t_def_cv25 = {str(k): (float(r["sum"]), float(r["count"])) for k, r in td.iterrows()}

    # Precompute 2026 PBP derived slices cleanly
    if not pbp.empty:
        sc = pbp[pbp["play_type"].isin(["pass", "run"])].copy()
        sc["epa"] = sc["epa"].fillna(0.0).astype(float)
        sc["td"] = sc["touchdown"].fillna(0).astype(int)

        rz = sc[sc["yardline_100"].fillna(99.0) <= 20.0].copy()
        drv = (
            rz.sort_values(["game_id", "drive", "play_id"])
            .groupby(["game_id", "drive", "posteam"], as_index=False)
            .agg(
                week=("week", "first"),
                defteam=("defteam", "first"),
                td=("td", "max"),
                start_yl=("yardline_100", "first"),
            )
        )
        drv["yl_b"] = _rz_start_bin(drv["start_yl"])

        f26 = pbp[
            (pbp["down"] == 4) & (pbp["play_type"].isin(["pass", "run", "field_goal", "punt"]))
        ].copy()
        f26["is_go"] = f26["play_type"].isin(["pass", "run"]).astype(int)
        f26["conv"] = f26["fourth_down_converted"].fillna(0).astype(int)
        f26["ytg_b"] = _ytg_bin(f26["ydstogo"].fillna(5))
        f26["yl_b"] = _yl4_bin(f26["yardline_100"].fillna(50))
        f26["trailing"] = (f26["score_differential"].fillna(0) < 0).astype(int)
    else:
        sc = pd.DataFrame()
        drv = pd.DataFrame()
        f26 = pd.DataFrame()

    _CACHE["loaded"] = True
    _CACHE["sc"] = sc
    _CACHE["drv"] = drv
    _CACHE["f26"] = f26
    _CACHE["off25_map"] = off25_map
    _CACHE["def25_map"] = def25_map
    _CACHE["go_cell"] = go_cell
    _CACHE["t_go25"] = t_go25
    _CACHE["conv_cell"] = conv_cell
    _CACHE["t_cv25"] = t_cv25
    _CACHE["t_def_cv25"] = t_def_cv25
    return _CACHE


def _fit_causal_tables(ref_week: int) -> Dict[str, Any]:
    frames = _load_frames()
    sc: pd.DataFrame = frames["sc"]
    drv: pd.DataFrame = frames["drv"]
    f26: pd.DataFrame = frames["f26"]
    off25_map: Dict[str, float] = frames["off25_map"]
    def25_map: Dict[str, float] = frames["def25_map"]
    go_cell: Dict[Tuple[str, str, int], float] = frames["go_cell"]
    t_go25: Dict[str, Tuple[float, float]] = frames["t_go25"]
    conv_cell: Dict[str, float] = frames["conv_cell"]
    t_cv25: Dict[str, Tuple[float, float]] = frames["t_cv25"]
    t_def_cv25: Dict[str, Tuple[float, float]] = frames["t_def_cv25"]

    tr_sc = sc[sc["week"] < ref_week] if not sc.empty else sc
    tr_d = drv[drv["week"] < ref_week].copy() if not drv.empty else drv
    tr_f = f26[f26["week"] < ref_week].copy() if not f26.empty else f26

    # 1. Full-play EPA shrinkage (prior = 140 snaps of 2025 full-play EPA/play)
    o_sc = (
        tr_sc[tr_sc["posteam"] != ""].groupby("posteam")["epa"].agg(["mean", "count"])
        if not tr_sc.empty
        else pd.DataFrame()
    )
    d_sc = (
        tr_sc[tr_sc["defteam"] != ""].groupby("defteam")["epa"].agg(["mean", "count"])
        if not tr_sc.empty
        else pd.DataFrame()
    )

    # 2. Red-zone drive residual relative to yardline start depth
    if not tr_d.empty:
        yl_prior = tr_d.groupby("yl_b")["td"].mean().to_dict()
        mu_rz = float(tr_d["td"].mean())
        tr_d["p0"] = tr_d["yl_b"].map(yl_prior).fillna(mu_rz)
        tr_d["res"] = tr_d["td"] - tr_d["p0"]
        o_rz = tr_d[tr_d["posteam"] != ""].groupby("posteam")["res"].agg(["sum", "count"])
        d_rz = tr_d[tr_d["defteam"] != ""].groupby("defteam")["res"].agg(["sum", "count"])
    else:
        yl_prior = {}
        mu_rz = 0.585
        o_rz = pd.DataFrame()
        d_rz = pd.DataFrame()

    # 3. 4th-down go-for-it propensity & conversion residuals
    if not tr_f.empty:
        tr_f["p0_go"] = [
            go_cell.get((a, b, t), 0.2)
            for a, b, t in zip(tr_f["ytg_b"], tr_f["yl_b"], tr_f["trailing"])
        ]
        tr_f["res_go"] = tr_f["is_go"] - tr_f["p0_go"]
        g26 = tr_f[tr_f["posteam"] != ""].groupby("posteam")["res_go"].agg(["sum", "count"])

        tr_g = tr_f[tr_f["is_go"] == 1].copy()
        tr_g["p0_cv"] = tr_g["ytg_b"].map(conv_cell).fillna(0.54)
        tr_g["res_cv"] = tr_g["conv"] - tr_g["p0_cv"]
        cv26 = tr_g[tr_g["posteam"] != ""].groupby("posteam")["res_cv"].agg(["sum", "count"])
        cvd26 = tr_g[tr_g["defteam"] != ""].groupby("defteam")["res_cv"].agg(["sum", "count"])
    else:
        g26 = pd.DataFrame()
        cv26 = pd.DataFrame()
        cvd26 = pd.DataFrame()

    teams = sorted(
        set(off25_map.keys())
        | set(def25_map.keys())
        | set(t_go25.keys())
        | set(t_cv25.keys())
        | (set(o_sc.index.astype(str)) if not o_sc.empty else set())
    )

    profiles: Dict[str, Dict[str, float]] = {}
    for tm in teams:
        om, on2 = o_sc.loc[tm] if (not o_sc.empty and tm in o_sc.index) else (0.0, 0.0)
        dm, dn2 = d_sc.loc[tm] if (not d_sc.empty and tm in d_sc.index) else (0.0, 0.0)
        o25 = float(off25_map.get(tm, 0.0))
        d25 = float(def25_map.get(tm, 0.0))
        full_off_epa_eb = float((on2 * om + 140.0 * o25) / max(1.0, on2 + 140.0))
        full_def_epa_eb = float((dn2 * dm + 140.0 * d25) / max(1.0, dn2 + 140.0))

        os_rz, on_rz = o_rz.loc[tm] if (not o_rz.empty and tm in o_rz.index) else (0.0, 0.0)
        ds_rz, dn_rz = d_rz.loc[tm] if (not d_rz.empty and tm in d_rz.index) else (0.0, 0.0)
        off_rz_res_shrunk = float(os_rz / (on_rz + 80.0))
        def_rz_res_shrunk = float(ds_rz / (dn_rz + 80.0))
        off_rz_only_res = float(os_rz / (on_rz + 60.0))
        def_rz_only_res = float(ds_rz / (dn_rz + 60.0))

        s26_g, n26_g = g26.loc[tm] if (not g26.empty and tm in g26.index) else (0.0, 0.0)
        s25_g, n25_g = t_go25.get(tm, (0.0, 0.0))
        fourth_go_res = float((s26_g + 0.35 * s25_g) / (n26_g + 0.35 * n25_g + 50.0))

        s26_c, n26_c = cv26.loc[tm] if (not cv26.empty and tm in cv26.index) else (0.0, 0.0)
        s25_c, n25_c = t_cv25.get(tm, (0.0, 0.0))
        ds26_c, dn26_c = cvd26.loc[tm] if (not cvd26.empty and tm in cvd26.index) else (0.0, 0.0)
        ds25_c, dn25_c = t_def_cv25.get(tm, (0.0, 0.0))
        off_4th_conv_res = float((s26_c + 0.35 * s25_c) / (n26_c + 0.35 * n25_c + 45.0))
        def_4th_conv_res = float((ds26_c + 0.35 * ds25_c) / (dn26_c + 0.35 * dn25_c + 45.0))

        profiles[tm] = {
            "full_off_epa_eb": round(full_off_epa_eb, 6),
            "full_def_epa_eb": round(full_def_epa_eb, 6),
            "off_rz_res_shrunk": round(off_rz_res_shrunk, 6),
            "def_rz_res_shrunk": round(def_rz_res_shrunk, 6),
            "off_rz_only_res": round(off_rz_only_res, 6),
            "def_rz_only_res": round(def_rz_only_res, 6),
            "fourth_go_res": round(fourth_go_res, 6),
            "off_4th_conv_res": round(off_4th_conv_res, 6),
            "def_4th_conv_res": round(def_4th_conv_res, 6),
            "n_full_snaps": int(on2),
            "n_rz_drives": int(on_rz),
            "n_4th_decisions": int(n26_g),
        }

    return {
        "as_of_week": ref_week,
        "yl_prior": yl_prior,
        "mu_rz": mu_rz,
        "go_cell": go_cell,
        "conv_cell": conv_cell,
        "teams": profiles,
    }


def compute_causal_15t_redzone_and_4th_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Compute strictly causal 32-team Stream 15T profiles for weeks < as_of_week."""
    frames = _load_frames()
    max_wk = int(frames["sc"]["week"].max()) + 1 if not frames["sc"].empty else 11
    ref_week = int(as_of_week) if as_of_week is not None else max_wk
    if ref_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[ref_week]

    fitted = _fit_causal_tables(ref_week)
    out = {
        "schema": "stream_15t_causal_redzone_4th_v1",
        "as_of_week": ref_week,
        "teams_count": len(fitted["teams"]),
        "teams": fitted["teams"],
    }
    _PROFILE_CACHE[ref_week] = out
    return out


def evaluate_causal_15t_redzone_4th_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Evaluate strictly swap-symmetric Stream 15T matchup edges."""
    _ = context
    aw = normalize_nfl_team(str(away_team or ""))
    hm = normalize_nfl_team(str(home_team or ""))
    prof = compute_causal_15t_redzone_and_4th_profiles(as_of_week=as_of_week)
    teams = prof.get("teams") or {}

    aw_p = teams.get(aw)
    hm_p = teams.get(hm)

    if aw_p is None or hm_p is None:
        return {
            "schema": "stream_15t_matchup_v1",
            "as_of_week": prof["as_of_week"],
            "stream_15t_away_rz_td_edge": 0.0,
            "stream_15t_home_rz_td_edge": 0.0,
            "stream_15t_away_fourth_go_aggression": 0.0,
            "stream_15t_home_fourth_go_aggression": 0.0,
            "stream_15t_away_fourth_conv_edge": 0.0,
            "stream_15t_home_fourth_conv_edge": 0.0,
            "stream_15t_away_rz_only_null_edge": 0.0,
            "stream_15t_home_rz_only_null_edge": 0.0,
            "stream_15t_net_rz_4th_diff": 0.0,
        }

    aw_rz = _clamp(
        0.35 * (aw_p["full_off_epa_eb"] + hm_p["full_def_epa_eb"])
        + 0.50 * (aw_p["off_rz_res_shrunk"] + hm_p["def_rz_res_shrunk"]),
        -0.18,
        0.18,
    )
    hm_rz = _clamp(
        0.35 * (hm_p["full_off_epa_eb"] + aw_p["full_def_epa_eb"])
        + 0.50 * (hm_p["off_rz_res_shrunk"] + aw_p["def_rz_res_shrunk"]),
        -0.18,
        0.18,
    )

    aw_4go = _clamp(aw_p["fourth_go_res"], -0.18, 0.18)
    hm_4go = _clamp(hm_p["fourth_go_res"], -0.18, 0.18)

    aw_4conv = _clamp(aw_p["off_4th_conv_res"] + hm_p["def_4th_conv_res"], -0.18, 0.18)
    hm_4conv = _clamp(hm_p["off_4th_conv_res"] + aw_p["def_4th_conv_res"], -0.18, 0.18)

    # Null diagnostic only (weight 0.0 in simulator)
    aw_rz_only = _clamp(aw_p["off_rz_only_res"] + hm_p["def_rz_only_res"], -0.18, 0.18)
    hm_rz_only = _clamp(hm_p["off_rz_only_res"] + aw_p["def_rz_only_res"], -0.18, 0.18)

    net_diff = _clamp((aw_rz + 0.5 * aw_4conv) - (hm_rz + 0.5 * hm_4conv), -0.25, 0.25)

    return {
        "schema": "stream_15t_matchup_v1",
        "as_of_week": prof["as_of_week"],
        "stream_15t_away_rz_td_edge": round(aw_rz, 6),
        "stream_15t_home_rz_td_edge": round(hm_rz, 6),
        "stream_15t_away_fourth_go_aggression": round(aw_4go, 6),
        "stream_15t_home_fourth_go_aggression": round(hm_4go, 6),
        "stream_15t_away_fourth_conv_edge": round(aw_4conv, 6),
        "stream_15t_home_fourth_conv_edge": round(hm_4conv, 6),
        "stream_15t_away_rz_only_null_edge": round(aw_rz_only, 6),
        "stream_15t_home_rz_only_null_edge": round(hm_rz_only, 6),
        "stream_15t_net_rz_4th_diff": round(net_diff, 6),
    }


def evaluate_causal_15t_walkforward_oos(
    eval_weeks: Iterable[int] = range(4, 11),
) -> Dict[str, Any]:
    """Strict walk-forward OOS evaluation over 2026 Weeks 4-10."""
    frames = _load_frames()
    drv: pd.DataFrame = frames["drv"]
    f26: pd.DataFrame = frames["f26"]

    y_td: List[float] = []
    p_td_base: List[float] = []
    p_td_rz_only: List[float] = []
    p_td_full_prior: List[float] = []

    y_go: List[float] = []
    p_go_base: List[float] = []
    p_go_eb: List[float] = []

    y_cv: List[float] = []
    p_cv_base: List[float] = []
    p_cv_eb: List[float] = []

    eval_list = [int(w) for w in eval_weeks]
    for wk in eval_list:
        fitted = _fit_causal_tables(wk)
        teams = fitted["teams"]
        yl_prior = fitted["yl_prior"]
        mu_rz = fitted["mu_rz"]
        go_cell = fitted["go_cell"]
        conv_cell = fitted["conv_cell"]

        te_d = drv[drv["week"] == wk] if not drv.empty else drv
        for _, r in te_d.iterrows():
            p0 = float(yl_prior.get(r["yl_b"], mu_rz))
            ap = teams.get(r["posteam"])
            hp = teams.get(r["defteam"])
            if ap and hp:
                rz_only_p = _clamp(p0 + ap["off_rz_only_res"] + hp["def_rz_only_res"], 0.05, 0.95)
                full_p = _clamp(
                    p0
                    + 0.35 * (ap["full_off_epa_eb"] + hp["full_def_epa_eb"])
                    + 0.50 * (ap["off_rz_res_shrunk"] + hp["def_rz_res_shrunk"]),
                    0.05,
                    0.95,
                )
            else:
                rz_only_p = p0
                full_p = p0
            y_td.append(float(r["td"]))
            p_td_base.append(p0)
            p_td_rz_only.append(rz_only_p)
            p_td_full_prior.append(full_p)

        te_f = f26[f26["week"] == wk] if not f26.empty else f26
        for _, r in te_f.iterrows():
            p0_g = float(go_cell.get((r["ytg_b"], r["yl_b"], int(r["trailing"])), 0.2))
            ap = teams.get(r["posteam"])
            hp = teams.get(r["defteam"])
            go_p = _clamp(p0_g + (ap["fourth_go_res"] if ap else 0.0), 0.01, 0.99)
            y_go.append(float(r["is_go"]))
            p_go_base.append(p0_g)
            p_go_eb.append(go_p)

            if int(r["is_go"]) == 1:
                p0_c = float(conv_cell.get(r["ytg_b"], 0.54))
                c_p = _clamp(
                    p0_c + ((ap["off_4th_conv_res"] + hp["def_4th_conv_res"]) if (ap and hp) else 0.0),
                    0.05,
                    0.95,
                )
                y_cv.append(float(r["conv"]))
                p_cv_base.append(p0_c)
                p_cv_eb.append(c_p)

    rz_full_brier = _brier(y_td, p_td_full_prior)
    rz_base_brier = _brier(y_td, p_td_base)
    rz_only_brier = _brier(y_td, p_td_rz_only)
    rz_full_ll = _log_loss(y_td, p_td_full_prior)
    rz_base_ll = _log_loss(y_td, p_td_base)

    go_eb_brier = _brier(y_go, p_go_eb)
    go_base_brier = _brier(y_go, p_go_base)
    go_eb_ll = _log_loss(y_go, p_go_eb)
    go_base_ll = _log_loss(y_go, p_go_base)

    cv_eb_brier = _brier(y_cv, p_cv_eb)
    cv_base_brier = _brier(y_cv, p_cv_base)
    cv_eb_ll = _log_loss(y_cv, p_cv_eb)
    cv_base_ll = _log_loss(y_cv, p_cv_base)

    rz_full_beats = rz_full_brier < rz_base_brier and rz_full_ll < rz_base_ll
    rz_only_beats = rz_only_brier < rz_base_brier
    go_beats = go_eb_brier < go_base_brier and go_eb_ll < go_base_ll
    cv_beats = cv_eb_brier < cv_base_brier and cv_eb_ll < cv_base_ll

    return {
        "schema": "stream_15t_walkforward_oos_v1",
        "eval_weeks": eval_list,
        "redzone_td_full_prior": {
            "n_drives": len(y_td),
            "brier_cell_baseline": round(rz_base_brier, 6),
            "brier_rz_only_null": round(rz_only_brier, 6),
            "brier_full_prior": round(rz_full_brier, 6),
            "log_loss_cell_baseline": round(rz_base_ll, 6),
            "log_loss_full_prior": round(rz_full_ll, 6),
            "beats_baseline": rz_full_beats,
            "rz_only_beats_baseline": rz_only_beats,
        },
        "fourth_down_go_aggression": {
            "n_decisions": len(y_go),
            "brier_cell_baseline": round(go_base_brier, 6),
            "brier_stream_15t_eb": round(go_eb_brier, 6),
            "log_loss_cell_baseline": round(go_base_ll, 6),
            "log_loss_stream_15t_eb": round(go_eb_ll, 6),
            "beats_baseline": go_beats,
        },
        "fourth_down_conversion": {
            "n_go_plays": len(y_cv),
            "brier_cell_baseline": round(cv_base_brier, 6),
            "brier_stream_15t_eb": round(cv_eb_brier, 6),
            "log_loss_cell_baseline": round(cv_base_ll, 6),
            "log_loss_stream_15t_eb": round(cv_eb_ll, 6),
            "beats_baseline": cv_beats,
        },
        "all_promoted_components_beat_baseline": bool(rz_full_beats and go_beats and cv_beats),
    }
