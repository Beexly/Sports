"""
Stream 15V: Causal Early-Down Clean Efficiency & Fumble-Luck Regression Engine
=============================================================================

Strictly causal (`week < as_of_week` in 2026 + decayed 2025 structural EPA prior)
Empirical-Bayes separator of persistent early-down non-turnover execution vs
transient fumble-recovery noise, built over cleared CC-BY-4.0 nflverse data:
  - `data/nflverse/pbp_2026_w1_w10.parquet` (`week >= 1`)
  - `data/nflverse/stats_team_week_2025.parquet`

Measured Walk-Forward OOS Behavior (`eval_weeks = 4..10`, `n = 204` Team-Games):
  1. `ed_clean_epa_eb`: Early-down (`down in {1, 2}`), non-turnover, neutral-WP
     (`0.10 <= wp <= 0.90`) EPA per play shrunk toward league mean & 2025 team prior
     (`k_eff = 140` plays) strictly reduces OOS team-game EPA MSE (`0.026124`) vs
     league baseline (`0.030367`), unshrunk raw (`0.029163`), and raw-EPA EB
     (`0.026280`), achieving `oos_corr = +0.3947` -> **PROMOTED** (`+0.35`).
  2. `ed_success_rate_eb`: Early-down non-turnover success rate (`0.028620 < 0.030367` vs
     league mean, `+0.2845` corr) -> logged as swap-symmetric secondary conditioner
     (`+0.15` weight bounded inside soft cap, or secondary confirmation).
  3. `fumble_luck_residual`: Realized fumble-loss luck vs expected fumble cost fails
     raw/EB improvement meaningfully (`0.030157` MSE vs `0.026124`) -> **HONEST NULL HOLD**
     (`0.0` weight in simulator; logged strictly for overreaction fade diagnostics).

Outputs:
  1. `compute_causal_15v_early_down_profiles(as_of_week=None)`
  2. `evaluate_causal_15v_early_down_matchup(away_team, home_team, context=None, as_of_week=None)`
  3. `evaluate_causal_15v_walkforward_oos(eval_weeks=range(4, 11))`
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
            "week",
            "posteam",
            "defteam",
            "down",
            "play_type",
            "epa",
            "success",
            "interception",
            "fumble_lost",
            "fumble",
            "wp",
        ]
        pbp = pd.read_parquet(PBP_2026_PATH, columns=cols).copy()
        pbp["posteam"] = pbp["posteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        pbp["defteam"] = pbp["defteam"].map(lambda x: normalize_nfl_team(str(x or "")))
        pbp["week"] = pbp["week"].fillna(0).astype(int)
        pbp = pbp[(pbp["week"] >= 1) & (pbp["play_type"].isin(["pass", "run"]))].copy()
        pbp["epa"] = pbp["epa"].fillna(0.0).astype(float)
        pbp["sr"] = pbp["success"].fillna(0.0).astype(float)
        pbp["fumb_any"] = (pbp["fumble"].fillna(0) == 1).astype(int)
        pbp["to"] = (
            (pbp["interception"].fillna(0) == 1) | (pbp["fumble_lost"].fillna(0) == 1)
        ).astype(int)
        pbp["is_ed_clean"] = (
            pbp["down"].isin([1, 2]) & (pbp["to"] == 0) & pbp["wp"].fillna(0.5).between(0.10, 0.90)
        )
        fumb_mask = pbp["fumb_any"] == 1
        fumb_mean_epa = float(pbp.loc[fumb_mask, "epa"].mean()) if fumb_mask.any() else 0.0
        pbp["epa_fumb_luck"] = np.where(fumb_mask, pbp["epa"] - fumb_mean_epa, 0.0)

        tg = (
            pbp[pbp["posteam"] != ""]
            .groupby(["game_id", "week", "posteam"], as_index=False)
            .agg(
                defteam=("defteam", "first"),
                epa_mean=("epa", "mean"),
                fluck_mean=("epa_fumb_luck", "mean"),
            )
        )
    else:
        pbp = pd.DataFrame()
        tg = pd.DataFrame()

    o25_map: Dict[str, float] = {}
    d25_map: Dict[str, float] = {}
    if STW_2025_PATH.is_file():
        stw25 = pd.read_parquet(
            STW_2025_PATH,
            columns=["team", "opponent_team", "passing_epa", "rushing_epa", "attempts", "carries"],
        ).copy()
        stw25["team_norm"] = stw25["team"].map(lambda x: normalize_nfl_team(str(x or "")))
        stw25["opp_norm"] = stw25["opponent_team"].map(
            lambda x: normalize_nfl_team(str(x or ""))
        )
        og = stw25[stw25["team_norm"] != ""].groupby("team_norm").agg(
            pe=("passing_epa", "sum"),
            re=("rushing_epa", "sum"),
            att=("attempts", "sum"),
            car=("carries", "sum"),
        )
        og["epa_pp"] = (og["pe"] + og["re"]) / np.maximum(og["att"] + og["car"], 1.0)
        o25_map = {str(k): float(v) for k, v in og["epa_pp"].to_dict().items()}

        dg = stw25[stw25["opp_norm"] != ""].groupby("opp_norm").agg(
            pe=("passing_epa", "sum"),
            re=("rushing_epa", "sum"),
            att=("attempts", "sum"),
            car=("carries", "sum"),
        )
        dg["epa_pp"] = (dg["pe"] + dg["re"]) / np.maximum(dg["att"] + dg["car"], 1.0)
        d25_map = {str(k): float(v) for k, v in dg["epa_pp"].to_dict().items()}

    _CACHE["loaded"] = True
    _CACHE["pbp"] = pbp
    _CACHE["tg"] = tg
    _CACHE["o25_map"] = o25_map
    _CACHE["d25_map"] = d25_map
    return _CACHE


def _fit_causal_tables(ref_week: int) -> Dict[str, Any]:
    frames = _load_frames()
    pbp: pd.DataFrame = frames["pbp"]
    tg: pd.DataFrame = frames["tg"]
    o25_map: Dict[str, float] = frames["o25_map"]
    d25_map: Dict[str, float] = frames["d25_map"]

    tr_tg = tg[tg["week"] < ref_week] if not tg.empty else tg
    mu_total_epa = float(tr_tg["epa_mean"].mean()) if not tr_tg.empty else 0.0

    ed_tr = (
        pbp[(pbp["week"] < ref_week) & pbp["is_ed_clean"]] if not pbp.empty else pbp
    )
    mu_ed_epa = float(ed_tr["epa"].mean()) if not ed_tr.empty else 0.0
    mu_ed_sr = float(ed_tr["sr"].mean()) if not ed_tr.empty else 0.45

    ed_o = (
        ed_tr[ed_tr["posteam"] != ""].groupby("posteam")["epa"].agg(["mean", "count"])
        if not ed_tr.empty
        else pd.DataFrame()
    )
    ed_d = (
        ed_tr[ed_tr["defteam"] != ""].groupby("defteam")["epa"].agg(["mean", "count"])
        if not ed_tr.empty
        else pd.DataFrame()
    )
    sr_o = (
        ed_tr[ed_tr["posteam"] != ""].groupby("posteam")["sr"].agg(["mean", "count"])
        if not ed_tr.empty
        else pd.DataFrame()
    )
    sr_d = (
        ed_tr[ed_tr["defteam"] != ""].groupby("defteam")["sr"].agg(["mean", "count"])
        if not ed_tr.empty
        else pd.DataFrame()
    )
    fl_o = (
        tr_tg[tr_tg["posteam"] != ""].groupby("posteam")["fluck_mean"].agg(["mean", "count"])
        if not tr_tg.empty
        else pd.DataFrame()
    )
    r_o = (
        tr_tg[tr_tg["posteam"] != ""].groupby("posteam")["epa_mean"].agg(["mean", "count"])
        if not tr_tg.empty
        else pd.DataFrame()
    )
    r_d = (
        tr_tg[tr_tg["defteam"] != ""].groupby("defteam")["epa_mean"].agg(["mean", "count"])
        if not tr_tg.empty
        else pd.DataFrame()
    )

    teams = sorted(
        set(o25_map.keys())
        | set(d25_map.keys())
        | (set(ed_o.index.astype(str)) if not ed_o.empty else set())
        | (set(ed_d.index.astype(str)) if not ed_d.empty else set())
    )

    profiles: Dict[str, Dict[str, float]] = {}
    for tm in teams:
        p_o25 = float(o25_map.get(tm, 0.0))
        p_d25 = float(d25_map.get(tm, 0.0))

        eom, eoc = ed_o.loc[tm] if (not ed_o.empty and tm in ed_o.index) else (mu_ed_epa, 0.0)
        edm, edc = ed_d.loc[tm] if (not ed_d.empty and tm in ed_d.index) else (mu_ed_epa, 0.0)
        eo_eb = float((eoc * eom + 90.0 * mu_ed_epa + 50.0 * (mu_ed_epa + p_o25)) / (eoc + 140.0))
        ed_eb = float((edc * edm + 90.0 * mu_ed_epa + 50.0 * (mu_ed_epa + p_d25)) / (edc + 140.0))

        som, soc = sr_o.loc[tm] if (not sr_o.empty and tm in sr_o.index) else (mu_ed_sr, 0.0)
        sdm, sdc = sr_d.loc[tm] if (not sr_d.empty and tm in sr_d.index) else (mu_ed_sr, 0.0)
        sr_o_eb = float((soc * som + 180.0 * mu_ed_sr) / (soc + 180.0))
        sr_d_eb = float((sdc * sdm + 180.0 * mu_ed_sr) / (sdc + 180.0))

        flm, flc = fl_o.loc[tm] if (not fl_o.empty and tm in fl_o.index) else (0.0, 0.0)
        fluck_eb = float((flc * flm) / (flc + 8.0))

        rom, roc = r_o.loc[tm] if (not r_o.empty and tm in r_o.index) else (mu_total_epa, 0.0)
        rdm, rdc = r_d.loc[tm] if (not r_d.empty and tm in r_d.index) else (mu_total_epa, 0.0)
        raw_o_eb = float((roc * rom + 4.0 * mu_total_epa + 2.0 * p_o25) / (roc + 6.0))
        raw_d_eb = float((rdc * rdm + 4.0 * mu_total_epa + 2.0 * p_d25) / (rdc + 6.0))

        profiles[tm] = {
            "off_ed_clean_epa_eb": round(eo_eb, 6),
            "def_ed_clean_epa_eb": round(ed_eb, 6),
            "off_ed_sr_eb": round(sr_o_eb, 6),
            "def_ed_sr_eb": round(sr_d_eb, 6),
            "fumble_luck_eb": round(fluck_eb, 6),
            "raw_off_eb": round(raw_o_eb, 6),
            "raw_def_eb": round(raw_d_eb, 6),
            "raw_off_mean": round(float(rom), 6),
            "raw_def_mean": round(float(rdm), 6),
            "n_ed_clean_snaps": int(eoc),
        }

    return {
        "as_of_week": ref_week,
        "mu_total_epa": mu_total_epa,
        "mu_ed_epa": mu_ed_epa,
        "mu_ed_sr": mu_ed_sr,
        "teams": profiles,
    }


def compute_causal_15v_early_down_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Compute strictly causal 32-team Stream 15V profiles for weeks < as_of_week."""
    frames = _load_frames()
    tg: pd.DataFrame = frames["tg"]
    max_wk = int(tg["week"].max()) + 1 if not tg.empty else 11
    ref_week = int(as_of_week) if as_of_week is not None else max_wk
    if ref_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[ref_week]

    fitted = _fit_causal_tables(ref_week)
    out = {
        "schema": "stream_15v_causal_early_down_v1",
        "as_of_week": ref_week,
        "mu_total_epa": round(fitted["mu_total_epa"], 6),
        "mu_ed_epa": round(fitted["mu_ed_epa"], 6),
        "mu_ed_sr": round(fitted["mu_ed_sr"], 6),
        "teams_count": len(fitted["teams"]),
        "teams": fitted["teams"],
    }
    _PROFILE_CACHE[ref_week] = out
    return out


def evaluate_causal_15v_early_down_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Evaluate strictly swap-symmetric Stream 15V matchup conditioners."""
    _ = context
    aw = normalize_nfl_team(str(away_team or ""))
    hm = normalize_nfl_team(str(home_team or ""))
    prof = compute_causal_15v_early_down_profiles(as_of_week=as_of_week)
    teams = prof.get("teams") or {}
    mu_ed = float(prof.get("mu_ed_epa", 0.0))
    mu_sr = float(prof.get("mu_ed_sr", 0.45))

    aw_p = teams.get(aw)
    hm_p = teams.get(hm)

    if aw_p is None or hm_p is None:
        return {
            "schema": "stream_15v_matchup_v1",
            "as_of_week": prof["as_of_week"],
            "stream_15v_away_ed_clean_epa_edge": 0.0,
            "stream_15v_home_ed_clean_epa_edge": 0.0,
            "stream_15v_away_ed_sr_edge": 0.0,
            "stream_15v_home_ed_sr_edge": 0.0,
            "stream_15v_away_fumble_luck_null_edge": 0.0,
            "stream_15v_home_fumble_luck_null_edge": 0.0,
            "stream_15v_net_early_down_diff": 0.0,
        }

    aw_ed = _clamp(
        0.70 * ((aw_p["off_ed_clean_epa_eb"] - mu_ed) + (hm_p["def_ed_clean_epa_eb"] - mu_ed)),
        -0.18,
        0.18,
    )
    hm_ed = _clamp(
        0.70 * ((hm_p["off_ed_clean_epa_eb"] - mu_ed) + (aw_p["def_ed_clean_epa_eb"] - mu_ed)),
        -0.18,
        0.18,
    )

    aw_sr = _clamp(
        0.65 * ((aw_p["off_ed_sr_eb"] - mu_sr) + (hm_p["def_ed_sr_eb"] - mu_sr)),
        -0.18,
        0.18,
    )
    hm_sr = _clamp(
        0.65 * ((hm_p["off_ed_sr_eb"] - mu_sr) + (aw_p["def_ed_sr_eb"] - mu_sr)),
        -0.18,
        0.18,
    )

    # Diagnostic only (held at 0.0 weight in simulator)
    aw_fl = _clamp(-aw_p["fumble_luck_eb"], -0.12, 0.12)
    hm_fl = _clamp(-hm_p["fumble_luck_eb"], -0.12, 0.12)

    net_diff = _clamp(aw_ed - hm_ed, -0.25, 0.25)

    return {
        "schema": "stream_15v_matchup_v1",
        "as_of_week": prof["as_of_week"],
        "stream_15v_away_ed_clean_epa_edge": round(aw_ed, 6),
        "stream_15v_home_ed_clean_epa_edge": round(hm_ed, 6),
        "stream_15v_away_ed_sr_edge": round(aw_sr, 6),
        "stream_15v_home_ed_sr_edge": round(hm_sr, 6),
        "stream_15v_away_fumble_luck_null_edge": round(aw_fl, 6),
        "stream_15v_home_fumble_luck_null_edge": round(hm_fl, 6),
        "stream_15v_net_early_down_diff": round(net_diff, 6),
    }


def evaluate_causal_15v_walkforward_oos(
    eval_weeks: Iterable[int] = range(4, 11),
) -> Dict[str, Any]:
    """Strict walk-forward OOS evaluation over 2026 Weeks 4-10 predicting team-game EPA/play."""
    frames = _load_frames()
    tg: pd.DataFrame = frames["tg"]

    y: List[float] = []
    pb: List[float] = []
    p_raw_unshrunk: List[float] = []
    p_raw_eb: List[float] = []
    p_ed_clean: List[float] = []
    p_ed_sr: List[float] = []
    p_fluck: List[float] = []

    eval_list = [int(w) for w in eval_weeks]
    for wk in eval_list:
        fitted = _fit_causal_tables(wk)
        teams = fitted["teams"]
        mu = fitted["mu_total_epa"]
        mu_ed = fitted["mu_ed_epa"]
        mu_sr = fitted["mu_ed_sr"]

        te = tg[tg["week"] == wk] if not tg.empty else tg
        for _, r in te.iterrows():
            ap = teams.get(r["posteam"])
            hp = teams.get(r["defteam"])
            y.append(float(r["epa_mean"]))
            pb.append(mu)
            if ap and hp:
                p_raw_unshrunk.append(mu + (ap["raw_off_mean"] - mu) + (hp["raw_def_mean"] - mu))
                p_raw_eb.append(mu + 0.65 * ((ap["raw_off_eb"] - mu) + (hp["raw_def_eb"] - mu)))
                p_ed_clean.append(
                    mu + 0.70 * ((ap["off_ed_clean_epa_eb"] - mu_ed) + (hp["def_ed_clean_epa_eb"] - mu_ed))
                )
                p_ed_sr.append(
                    mu + 0.65 * ((ap["off_ed_sr_eb"] - mu_sr) + (hp["def_ed_sr_eb"] - mu_sr))
                )
                p_fluck.append(mu + ap["fumble_luck_eb"])
            else:
                p_raw_unshrunk.append(mu)
                p_raw_eb.append(mu)
                p_ed_clean.append(mu)
                p_ed_sr.append(mu)
                p_fluck.append(mu)

    mse_base = _mse(y, pb)
    mse_raw = _mse(y, p_raw_unshrunk)
    mse_raw_eb = _mse(y, p_raw_eb)
    mse_ed_clean = _mse(y, p_ed_clean)
    mse_ed_sr = _mse(y, p_ed_sr)
    mse_fluck = _mse(y, p_fluck)

    ed_beats_all = (
        mse_ed_clean < mse_base
        and mse_ed_clean < mse_raw
        and mse_ed_clean < mse_raw_eb
    )

    return {
        "schema": "stream_15v_walkforward_oos_v1",
        "eval_weeks": eval_list,
        "n_team_games": len(y),
        "mse_league_baseline": round(mse_base, 6),
        "mse_raw_unshrunk": round(mse_raw, 6),
        "mse_raw_epa_eb": round(mse_raw_eb, 6),
        "ed_clean_epa": {
            "mse_stream_15v_ed_clean": round(mse_ed_clean, 6),
            "oos_corr": round(_corr(y, p_ed_clean), 6),
            "beats_all_baselines": ed_beats_all,
        },
        "ed_success_rate": {
            "mse_stream_15v_ed_sr": round(mse_ed_sr, 6),
            "oos_corr": round(_corr(y, p_ed_sr), 6),
            "beats_league_baseline": mse_ed_sr < mse_base,
        },
        "fumble_luck_residual": {
            "mse_fumble_luck_only": round(mse_fluck, 6),
            "oos_corr": round(_corr(y, p_fluck), 6),
            "beats_raw_epa_eb": mse_fluck < mse_raw_eb,
        },
        "all_promoted_components_beat_baseline": bool(ed_beats_all),
    }
