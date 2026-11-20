"""
Stream 15Y: Causal FTN Box-Count, Blitz & Charting Engine
=========================================================

Strictly causal (`week < as_of_week` in 2026 + decayed 2025 FTN charting priors)
evaluation of box-adjusted rushing efficiency, catchable-ball execution, defensive
blitz/light-box structural tendencies, and honest null holds (`is_interception_worthy`
and defensive box-adjusted rush EPA allowed) built over cleared CC-BY-4.0 nflverse
datasets:
  - `data/nflverse/pbp_2026_w1_w10.parquet` (`season_type == 'REG'`)
  - `data/nflverse/ftn_charting_2026_w1_w10.parquet`
  - `intelligence/coaching/data/play_by_play_2025.parquet`
  - `data/nflverse/ftn_charting_2025.parquet`

Key Empirical Insights (`eval_weeks = 4..10`, `n = 202` Team-Games):
  1. **Outlier Charting Hygiene:** `n_blitzers` in raw FTN 2026 includes extreme typos
     (`52`, `63`); all counts are clipped strictly (`n_blitzers` in `[0, 7]`,
     `n_pass_rushers` in `[1, 10]`, `n_defense_box` in `[4, 11]`).
  2. **Promoted Signal 1 (`off_rush_box_res`, `b25=0.45, k=12`):** Designed rush EPA
     residualized by 2025 expectation over `(box_grp, redzone <=20, ydstogo <=2)`
     reduces OOS MSE (`0.028238 -> ~0.026033`, `oos_corr ~+0.27`). -> **PROMOTED** (`+0.35`).
  3. **Promoted Signal 2 (`off_catchable` + `def_catchable_allowed`, `b25=0.45, k=12`):**
     FTN `is_catchable_ball` beats baseline OOS (`0.009667 -> ~0.009066`, `corr ~+0.25`
     offense; `~0.009483`, `corr ~+0.14` defense). -> **PROMOTED** (`+0.25`).
  4. **Promoted Signal 3 (`def_blitz_rate` `k=3`, `def_light_box_rate` `k=6`):**
     Defensive blitz tendency is strongly persistent (`0.018051 -> ~0.012223`, `-32.3%`
     MSE, `oos_corr ~+0.57`) and light-box tendency beats baseline (`0.034581 -> ~0.032511`,
     `corr ~+0.24`). -> **PROMOTED** (`+0.25`).
  5. **Verified Null Holds (`production_weight = 0.0` strictly):**
     - `off_iwt` (`is_interception_worthy`): fails OOS baseline (`~0.000916 > 0.000908`,
       near-zero persistence & negative game-level Brier delta). -> **NULL HOLD (`0.0`)**.
     - `def_box_res` (defensive box-adjusted rush EPA allowed): fails OOS baseline
       (`~0.0295 > 0.0282`, negative correlation). -> **NULL HOLD (`0.0`)**.

Outputs:
  1. `compute_causal_15y_box_charting_profiles(as_of_week=None)`
  2. `evaluate_causal_15y_box_charting_matchup(away_team, home_team, context=None, as_of_week=None)`
  3. `evaluate_causal_15y_walkforward_oos(eval_weeks=range(4, 11))`
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
FTN_2026_PATH = REPO_ROOT / "data" / "nflverse" / "ftn_charting_2026_w1_w10.parquet"
PBP_2025_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2025.parquet"
FTN_2025_PATH = REPO_ROOT / "data" / "nflverse" / "ftn_charting_2025.parquet"

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


def _merge_pbp_ftn(pbp_path: Path, ftn_path: Path) -> Tuple[pd.DataFrame, int]:
    if not pbp_path.is_file() or not ftn_path.is_file():
        return pd.DataFrame(), 0

    pbp_cols = [
        "game_id",
        "play_id",
        "season_type",
        "week",
        "posteam",
        "defteam",
        "epa",
        "rush_attempt",
        "qb_scramble",
        "qb_dropback",
        "yardline_100",
        "ydstogo",
    ]
    ftn_cols = [
        "nflverse_game_id",
        "nflverse_play_id",
        "n_defense_box",
        "n_blitzers",
        "n_pass_rushers",
        "is_catchable_ball",
        "is_interception_worthy",
    ]
    pbp = pd.read_parquet(pbp_path, columns=pbp_cols)
    ftn = pd.read_parquet(ftn_path, columns=ftn_cols)

    pbp = pbp[pbp["season_type"] == "REG"].copy()
    pbp["play_id_int"] = pbp["play_id"].astype("int64")
    ftn = ftn.copy()
    ftn["play_id_int"] = ftn["nflverse_play_id"].astype("int64")

    merged = pbp.merge(
        ftn,
        left_on=["game_id", "play_id_int"],
        right_on=["nflverse_game_id", "play_id_int"],
        how="inner",
        suffixes=("", "_ftn"),
    )
    raw_blitz = merged["n_blitzers"].fillna(0)
    outlier_count = int((raw_blitz > 7).sum() + (raw_blitz < 0).sum())
    merged["n_blitzers_clean"] = raw_blitz.clip(0, 7)
    merged["n_pass_rushers_clean"] = merged["n_pass_rushers"].fillna(4).clip(1, 10)
    merged["box_clean"] = merged["n_defense_box"].clip(4, 11)
    merged["posteam"] = merged["posteam"].astype(str).map(normalize_nfl_team)
    merged["defteam"] = merged["defteam"].astype(str).map(normalize_nfl_team)
    return merged, outlier_count


def _build_team_week_table(
    merged: pd.DataFrame,
    box_exp_map: Mapping[Tuple[int, int, int], float],
    global_rush_exp: float,
) -> pd.DataFrame:
    if merged.empty:
        return pd.DataFrame()

    rush = merged[
        (merged["rush_attempt"] == 1)
        & (merged["qb_scramble"] == 0)
        & merged["epa"].notna()
        & merged["box_clean"].notna()
    ].copy()
    if not rush.empty:
        rush["bg"] = np.where(
            rush["box_clean"] <= 6, 0, np.where(rush["box_clean"] == 7, 1, 2)
        )
        rush["rz"] = (rush["yardline_100"].fillna(50) <= 20).astype(int)
        rush["sy"] = (rush["ydstogo"].fillna(10) <= 2).astype(int)
        exp_vals = [
            float(box_exp_map.get((int(bg), int(rz), int(sy)), global_rush_exp))
            for bg, rz, sy in zip(rush["bg"], rush["rz"], rush["sy"])
        ]
        rush["box_res_epa"] = rush["epa"].astype(float) - np.asarray(exp_vals, dtype=float)
        rush["is_light_box"] = (rush["box_clean"] <= 6).astype(float)

        ro = (
            rush.groupby(["week", "posteam"], as_index=False)
            .agg(off_rush_box_res=("box_res_epa", "mean"), off_rush_n=("epa", "size"))
            .rename(columns={"posteam": "team"})
        )
        rd = (
            rush.groupby(["week", "defteam"], as_index=False)
            .agg(
                def_box_res=("box_res_epa", "mean"),
                def_light_box_rate=("is_light_box", "mean"),
                def_rush_n=("epa", "size"),
            )
            .rename(columns={"defteam": "team"})
        )
    else:
        ro = pd.DataFrame(columns=["week", "team", "off_rush_box_res", "off_rush_n"])
        rd = pd.DataFrame(columns=["week", "team", "def_box_res", "def_light_box_rate", "def_rush_n"])

    db = merged[(merged["qb_dropback"] == 1) & merged["epa"].notna()].copy()
    if not db.empty:
        db["catchable"] = db["is_catchable_ball"].fillna(0).astype(float)
        db["blitzed"] = (db["n_blitzers_clean"] >= 1).astype(float)
        db["iwt"] = db["is_interception_worthy"].fillna(0).astype(float)

        do = (
            db.groupby(["week", "posteam"], as_index=False)
            .agg(
                off_catchable=("catchable", "mean"),
                off_iwt=("iwt", "mean"),
                off_db_n=("epa", "size"),
            )
            .rename(columns={"posteam": "team"})
        )
        dd = (
            db.groupby(["week", "defteam"], as_index=False)
            .agg(
                def_blitz_rate=("blitzed", "mean"),
                def_catchable_allowed=("catchable", "mean"),
                def_db_n=("epa", "size"),
            )
            .rename(columns={"defteam": "team"})
        )
    else:
        do = pd.DataFrame(columns=["week", "team", "off_catchable", "off_iwt", "off_db_n"])
        dd = pd.DataFrame(columns=["week", "team", "def_blitz_rate", "def_catchable_allowed", "def_db_n"])

    out = ro.merge(rd, on=["week", "team"], how="outer")
    out = out.merge(do, on=["week", "team"], how="outer")
    out = out.merge(dd, on=["week", "team"], how="outer")
    return out


def _load_frames() -> Dict[str, Any]:
    if "loaded" in _CACHE:
        return _CACHE

    m25, outliers25 = _merge_pbp_ftn(PBP_2025_PATH, FTN_2025_PATH)
    m26, outliers26 = _merge_pbp_ftn(PBP_2026_PATH, FTN_2026_PATH)

    box_exp_map: Dict[Tuple[int, int, int], float] = {}
    global_rush_exp = -0.065
    if not m25.empty:
        r25 = m25[
            (m25["rush_attempt"] == 1)
            & (m25["qb_scramble"] == 0)
            & m25["epa"].notna()
            & m25["box_clean"].notna()
        ].copy()
        if not r25.empty:
            r25["bg"] = np.where(
                r25["box_clean"] <= 6, 0, np.where(r25["box_clean"] == 7, 1, 2)
            )
            r25["rz"] = (r25["yardline_100"].fillna(50) <= 20).astype(int)
            r25["sy"] = (r25["ydstogo"].fillna(10) <= 2).astype(int)
            global_rush_exp = float(r25["epa"].mean())
            box_exp_map = {
                (int(k[0]), int(k[1]), int(k[2])): float(v)
                for k, v in r25.groupby(["bg", "rz", "sy"])["epa"].mean().items()
            }

    tw25 = _build_team_week_table(m25, box_exp_map, global_rush_exp)
    prior25 = (
        tw25.groupby("team").mean(numeric_only=True)
        if not tw25.empty
        else pd.DataFrame()
    )
    tw26 = _build_team_week_table(m26, box_exp_map, global_rush_exp)

    max_clean_blitz_26 = int(m26["n_blitzers_clean"].max()) if not m26.empty else 0
    _CACHE.update(
        {
            "loaded": True,
            "tw26": tw26,
            "prior25": prior25,
            "outliers25": outliers25,
            "outliers26": outliers26,
            "max_clean_blitz_26": max_clean_blitz_26,
            "joined_2026_rows": int(len(m26)),
        }
    )
    return _CACHE


def _causal_eb(
    hist: pd.DataFrame,
    prior25: pd.DataFrame,
    team: str,
    col: str,
    b25: float,
    k: float,
    default_mu: float,
) -> float:
    if hist.empty or col not in hist.columns:
        return default_mu
    lg_series = hist[col].dropna()
    lg = float(lg_series.mean()) if not lg_series.empty else default_mu
    p25 = lg
    if not prior25.empty and team in prior25.index and col in prior25.columns:
        v25 = prior25.loc[team, col]
        if pd.notna(v25):
            p25 = float(v25)
    mu0 = (1.0 - b25) * lg + b25 * p25
    th = hist[hist["team"] == team][col].dropna()
    n = len(th)
    return float((float(th.sum()) + k * mu0) / (n + k)) if (n + k) > 0.0 else mu0


def _fit_causal_tables(ref_week: int) -> Dict[str, Any]:
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    prior25: pd.DataFrame = frames["prior25"]

    hist = tw26[tw26["week"] < ref_week].copy() if not tw26.empty else pd.DataFrame()
    teams: set[str] = set()
    if not tw26.empty:
        teams.update(tw26["team"].dropna().astype(str).tolist())
    if not prior25.empty:
        teams.update(prior25.index.astype(str).tolist())

    def _lg(col: str, fallback: float) -> float:
        if hist.empty or col not in hist.columns or hist[col].dropna().empty:
            return fallback
        return float(hist[col].dropna().mean())

    mu_rush_res = _lg("off_rush_box_res", 0.0)
    mu_off_catch = _lg("off_catchable", 0.625)
    mu_def_catch = _lg("def_catchable_allowed", 0.625)
    mu_def_blitz = _lg("def_blitz_rate", 0.31)
    mu_def_light = _lg("def_light_box_rate", 0.46)
    mu_off_iwt = _lg("off_iwt", 0.028)

    profiles: Dict[str, Dict[str, Any]] = {}
    for tm in sorted(teams):
        if not tm:
            continue
        rush_res = _causal_eb(hist, prior25, tm, "off_rush_box_res", 0.45, 12.0, mu_rush_res)
        off_catch = _causal_eb(hist, prior25, tm, "off_catchable", 0.45, 12.0, mu_off_catch)
        def_catch = _causal_eb(hist, prior25, tm, "def_catchable_allowed", 0.45, 12.0, mu_def_catch)
        def_blitz = _causal_eb(hist, prior25, tm, "def_blitz_rate", 0.45, 3.0, mu_def_blitz)
        def_light = _causal_eb(hist, prior25, tm, "def_light_box_rate", 0.0, 6.0, mu_def_light)
        off_iwt = _causal_eb(hist, prior25, tm, "off_iwt", 0.0, 12.0, mu_off_iwt)

        th_len = int(len(hist[hist["team"] == tm])) if not hist.empty else 0
        profiles[tm] = {
            "off_rush_box_res_d": round(rush_res - mu_rush_res, 6),
            "off_catchable_d": round(off_catch - mu_off_catch, 6),
            "def_catchable_d": round(def_catch - mu_def_catch, 6),
            "def_light_box_d": round(def_light - mu_def_light, 6),
            "def_blitz_rate": round(_clamp(def_blitz, 0.05, 0.75), 6),
            "def_blitz_rate_d": round(def_blitz - mu_def_blitz, 6),
            "off_iwt_diag": round(off_iwt, 6),
            "n_causal_weeks": th_len,
        }

    return {
        "as_of_week": ref_week,
        "outliers26_clipped": frames["outliers26"],
        "max_clean_blitz_26": frames["max_clean_blitz_26"],
        "joined_2026_rows": frames["joined_2026_rows"],
        "teams": profiles,
    }


def compute_causal_15y_box_charting_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Compute strictly causal 32-team Stream 15Y FTN box/blitz/catchable profiles for week < as_of_week."""
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    max_wk = int(tw26["week"].max()) + 1 if not tw26.empty else 11
    ref_week = int(as_of_week) if as_of_week is not None else max_wk
    if ref_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[ref_week]

    fitted = _fit_causal_tables(ref_week)
    out = {
        "schema": "stream_15y_causal_box_shell_and_charting_v1",
        "as_of_week": ref_week,
        "teams_count": len(fitted["teams"]),
        "outliers26_clipped": fitted["outliers26_clipped"],
        "max_clean_blitz_26": fitted["max_clean_blitz_26"],
        "joined_2026_rows": fitted["joined_2026_rows"],
        "teams": fitted["teams"],
    }
    _PROFILE_CACHE[ref_week] = out
    return out


def evaluate_causal_15y_box_charting_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Evaluate strictly swap-symmetric Stream 15Y matchup edges with honest 0.0 IWT null holds."""
    _ = context
    aw = normalize_nfl_team(str(away_team or ""))
    hm = normalize_nfl_team(str(home_team or ""))
    prof = compute_causal_15y_box_charting_profiles(as_of_week=as_of_week)
    teams = prof.get("teams") or {}
    ap = teams.get(aw)
    hp = teams.get(hm)

    if ap is None or hp is None:
        return {
            "schema": "stream_15y_matchup_v1",
            "as_of_week": prof["as_of_week"],
            "stream_15y_away_rush_box_edge": 0.0,
            "stream_15y_home_rush_box_edge": 0.0,
            "stream_15y_away_catchable_edge": 0.0,
            "stream_15y_home_catchable_edge": 0.0,
            "stream_15y_away_def_blitz_rate": 0.31,
            "stream_15y_home_def_blitz_rate": 0.31,
            "stream_15y_away_iwt_null_edge": 0.0,
            "stream_15y_home_iwt_null_edge": 0.0,
            "stream_15y_net_box_charting_diff": 0.0,
        }

    # Promoted rushing edge: team's box-adjusted rush EPA + slight lift when facing light-box front
    aw_rush = _clamp(
        float(ap["off_rush_box_res_d"]) + 0.25 * float(hp["def_light_box_d"]),
        -0.18,
        0.18,
    )
    hm_rush = _clamp(
        float(hp["off_rush_box_res_d"]) + 0.25 * float(ap["def_light_box_d"]),
        -0.18,
        0.18,
    )

    # Promoted passing ball-placement quality: off catchable rate + opp catchable allowed residual
    aw_catch = _clamp(
        0.75 * float(ap["off_catchable_d"]) + 0.25 * float(hp["def_catchable_d"]),
        -0.15,
        0.15,
    )
    hm_catch = _clamp(
        0.75 * float(hp["off_catchable_d"]) + 0.25 * float(ap["def_catchable_d"]),
        -0.15,
        0.15,
    )

    aw_blitz = float(ap["def_blitz_rate"])
    hm_blitz = float(hp["def_blitz_rate"])

    # Weighted net composite aligned so positive favors AWAY (identical convention to 15P..15X)
    net_diff = 0.60 * (aw_rush - hm_rush) + 0.40 * (aw_catch - hm_catch)

    return {
        "schema": "stream_15y_matchup_v1",
        "as_of_week": prof["as_of_week"],
        "stream_15y_away_rush_box_edge": round(aw_rush, 6),
        "stream_15y_home_rush_box_edge": round(hm_rush, 6),
        "stream_15y_away_catchable_edge": round(aw_catch, 6),
        "stream_15y_home_catchable_edge": round(hm_catch, 6),
        "stream_15y_away_def_blitz_rate": round(aw_blitz, 6),
        "stream_15y_home_def_blitz_rate": round(hm_blitz, 6),
        "stream_15y_away_iwt_null_edge": 0.0,
        "stream_15y_home_iwt_null_edge": 0.0,
        "stream_15y_net_box_charting_diff": round(net_diff, 6),
    }


def evaluate_causal_15y_walkforward_oos(
    eval_weeks: Iterable[int] = range(4, 11),
) -> Dict[str, Any]:
    """Strict walk-forward OOS evaluation on 2026 Weeks 4..10 for promoted vs null Stream 15Y components."""
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    prior25: pd.DataFrame = frames["prior25"]
    if tw26.empty:
        return {
            "schema": "stream_15y_walkforward_oos_v1",
            "n_team_games": 0,
            "all_promoted_components_beat_baseline": False,
        }

    specs = (
        ("off_rush_box_res", 0.45, 12.0, True),
        ("off_catchable", 0.45, 12.0, True),
        ("def_catchable_allowed", 0.45, 12.0, True),
        ("def_blitz_rate", 0.45, 3.0, True),
        ("def_light_box_rate", 0.0, 6.0, True),
        ("off_iwt", 0.0, 12.0, False),
        ("def_box_res", 0.0, 12.0, False),
    )

    records: Dict[str, Dict[str, List[float]]] = {
        col: {"y": [], "base": [], "raw": [], "eb": []} for col, _, _, _ in specs
    }

    for w in eval_weeks:
        hist = tw26[tw26["week"] < w]
        cur = tw26[tw26["week"] == w]
        if hist.empty or cur.empty:
            continue
        for col, b25, k, _ in specs:
            lg = float(hist[col].dropna().mean())
            for _, row in cur.iterrows():
                y_val = row[col]
                if pd.isna(y_val):
                    continue
                tm = str(row["team"])
                th = hist[hist["team"] == tm][col].dropna()
                raw_val = float(th.mean()) if not th.empty else lg
                eb_val = _causal_eb(hist, prior25, tm, col, b25, k, lg)
                records[col]["y"].append(float(y_val))
                records[col]["base"].append(lg)
                records[col]["raw"].append(raw_val)
                records[col]["eb"].append(eb_val)

    components: Dict[str, Dict[str, Any]] = {}
    all_promoted_beat = True
    for col, b25, k, promoted in specs:
        rec = records[col]
        y_arr = rec["y"]
        base_mse = _mse(y_arr, rec["base"])
        raw_mse = _mse(y_arr, rec["raw"])
        eb_mse = _mse(y_arr, rec["eb"])
        beats_base = bool(eb_mse < base_mse)
        beats_raw = bool(eb_mse < raw_mse)
        if promoted and not beats_base:
            all_promoted_beat = False
        components[col] = {
            "n": len(y_arr),
            "promoted": promoted,
            "production_weight": 1.0 if (promoted and beats_base) else 0.0,
            "b25": b25,
            "k": k,
            "baseline_mse": round(base_mse, 6),
            "raw_mse": round(raw_mse, 6),
            "eb_mse": round(eb_mse, 6),
            "beats_baseline": beats_base,
            "beats_raw": beats_raw,
            "oos_corr": round(_corr(y_arr, rec["eb"]), 4),
        }

    return {
        "schema": "stream_15y_walkforward_oos_v1",
        "eval_weeks": list(eval_weeks),
        "n_team_games": int(len(records["off_rush_box_res"]["y"])),
        "outliers26_clipped": frames["outliers26"],
        "max_clean_blitz_26": frames["max_clean_blitz_26"],
        "components": components,
        "all_promoted_components_beat_baseline": all_promoted_beat,
    }
