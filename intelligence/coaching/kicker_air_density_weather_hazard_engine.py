"""
Stream 15R: Causal Kicker Air-Density, Wind/Elevation & Empirical-Bayes Hazard Engine
====================================================================================

Grounded in Johnson (MIT Sloan) multivariate logistic field-goal model & ISA barometric
air-density physics over cleared CC-BY-4.0 2026 nflverse PBP (`627` FG attempts):
  rho_ratio(T_F, h_ft) = exp(-h_ft / 27800.0) * (288.15 / ((5/9)*(T_F - 32) + 273.15))

Strictly causal (`week < as_of_week`):
  - Fits Ridge logistic IRLS over distance, non-linear tail distance (>47y), air-density
    assist, outdoor wind drag penalty, and causal Empirical-Bayes kicker residual (K0=14).
  - Benchmarks walk-forward OOS (Weeks 4-10) against a pure distance-only logistic baseline
    and reports whether multi-factor weather/kicker features clear Brier & Log-Loss gates.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from evaluation.frozen.score_walkforward_calibration_v1 import (
    expected_calibration_error,
    paired_brier_empirical_bernstein_lcb,
)
from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
PBP_2026_PATH = REPO_ROOT / "data" / "nflverse" / "pbp_2026_w1_w10.parquet"
SCHED_2026_PATH = REPO_ROOT / "data" / "nflverse" / "schedules_games_through_2026_w10.parquet"

# Verified NFL home stadium elevations (feet above sea level)
STADIUM_ELEVATION_FT: Dict[str, float] = {
    "ARI": 1090.0,
    "ATL": 1050.0,
    "BAL": 30.0,
    "BUF": 600.0,
    "CAR": 750.0,
    "CHI": 595.0,
    "CIN": 490.0,
    "CLE": 650.0,
    "DAL": 600.0,
    "DEN": 5280.0,
    "DET": 600.0,
    "GB": 640.0,
    "HOU": 50.0,
    "IND": 715.0,
    "JAX": 20.0,
    "KC": 910.0,
    "LA": 130.0,
    "LAC": 130.0,
    "LV": 2001.0,
    "MIA": 10.0,
    "MIN": 830.0,
    "NE": 260.0,
    "NO": 10.0,
    "NYG": 10.0,
    "NYJ": 10.0,
    "PHI": 20.0,
    "PIT": 730.0,
    "SEA": 20.0,
    "SF": 40.0,
    "TB": 45.0,
    "TEN": 490.0,
    "WAS": 220.0,
}

K0_KICKER_ATTEMPTS = 14.0
_FG_DF_CACHE: Optional[pd.DataFrame] = None
_FG_FIT_CACHE: Dict[Optional[int], Dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def compute_isa_air_density_ratio(temp_f: float, elevation_ft: float) -> float:
    """Relative atmospheric air density rho / rho_0 (sea level, 59 F / 15 C = 1.0)."""
    temp_k = max(230.0, min(330.0, (5.0 / 9.0) * (float(temp_f) - 32.0) + 273.15))
    elev = max(0.0, min(8000.0, float(elevation_ft)))
    return float(math.exp(-elev / 27800.0) * (288.15 / temp_k))


def _load_fg_frame() -> pd.DataFrame:
    global _FG_DF_CACHE
    if _FG_DF_CACHE is not None:
        return _FG_DF_CACHE
    if not PBP_2026_PATH.is_file():
        _FG_DF_CACHE = pd.DataFrame()
        return _FG_DF_CACHE

    pbp = pd.read_parquet(
        PBP_2026_PATH,
        columns=[
            "game_id",
            "play_id",
            "week",
            "home_team",
            "away_team",
            "posteam",
            "defteam",
            "field_goal_attempt",
            "field_goal_result",
            "kick_distance",
            "roof",
            "temp",
            "wind",
            "kicker_player_id",
        ],
    )
    fg = pbp[pbp["field_goal_attempt"] == 1].copy()
    if SCHED_2026_PATH.is_file():
        sched = pd.read_parquet(SCHED_2026_PATH, columns=["game_id", "roof", "temp", "wind"]).drop_duplicates("game_id")
        fg = fg.merge(sched, on="game_id", how="left", suffixes=("", "_sched"))
        fg["roof"] = fg["roof"].fillna(fg["roof_sched"])
        fg["temp"] = fg["temp"].fillna(fg["temp_sched"])
        fg["wind"] = fg["wind"].fillna(fg["wind_sched"])

    fg["home_norm"] = fg["home_team"].map(lambda x: normalize_nfl_team(str(x or "")))
    fg["pos_norm"] = fg["posteam"].map(lambda x: normalize_nfl_team(str(x or "")))
    fg["y_made"] = (fg["field_goal_result"].astype(str) == "made").astype(np.float64)
    fg["is_outdoor"] = fg["roof"].astype(str).isin(["outdoors", "open"]).astype(np.float64)
    # Dome/closed stadiums operate at ~70 F with 0 wind; missing outdoor defaults to 60 F / 7 mph
    fg["temp_eff"] = np.where(
        fg["is_outdoor"] < 0.5,
        70.0,
        fg["temp"].fillna(60.0).astype(float).clip(15.0, 105.0),
    )
    fg["wind_eff"] = np.where(
        fg["is_outdoor"] < 0.5,
        0.0,
        fg["wind"].fillna(7.0).astype(float).clip(0.0, 40.0),
    )
    fg["elev_ft"] = fg["home_norm"].map(lambda t: STADIUM_ELEVATION_FT.get(t, 450.0))
    fg["rho_ratio"] = [
        compute_isa_air_density_ratio(tf, el) for tf, el in zip(fg["temp_eff"], fg["elev_ft"])
    ]
    fg["kick_dist"] = fg["kick_distance"].fillna(38.0).astype(float).clip(18.0, 75.0)
    fg = fg.sort_values(["week", "game_id", "play_id"]).reset_index(drop=True)
    _FG_DF_CACHE = fg
    return _FG_DF_CACHE


def _fit_ridge_logistic(X: np.ndarray, y: np.ndarray, ridge: np.ndarray) -> np.ndarray:
    beta = np.zeros(X.shape[1], dtype=np.float64)
    for _ in range(8):
        z = np.clip(X @ beta, -12.0, 12.0)
        p = 1.0 / (1.0 + np.exp(-z))
        w = np.maximum(1e-4, p * (1.0 - p))
        grad = X.T @ (y - p) - ridge * beta
        hess = (X.T * w[None, :]) @ X + np.diag(ridge)
        step = np.linalg.solve(hess, grad)
        beta += step
        if float(np.max(np.abs(step))) < 1e-6:
            break
    return beta


def _build_base_dist_features(df: pd.DataFrame) -> np.ndarray:
    d = df["kick_dist"].to_numpy(dtype=np.float64)
    dz = (d - 42.0) / 10.0
    dtail = (np.maximum(0.0, d - 47.0) ** 2) / 100.0
    return np.column_stack([np.ones(len(df), dtype=np.float64), dz, dtail])


def _build_full_physics_features(df: pd.DataFrame, eb_resid: np.ndarray) -> np.ndarray:
    base = _build_base_dist_features(df)
    d = df["kick_dist"].to_numpy(dtype=np.float64)
    rho = df["rho_ratio"].to_numpy(dtype=np.float64)
    w_eff = df["wind_eff"].to_numpy(dtype=np.float64)
    air_assist = (1.0 - rho) * (d / 45.0)
    wind_drag = np.maximum(0.0, w_eff - 6.0) * (d / 45.0) / 10.0
    return np.column_stack([base, air_assist, wind_drag, eb_resid])


def _compute_eb_team_kicker_resids(
    train_fg: pd.DataFrame,
    dist_beta: np.ndarray,
    teams: Sequence[str],
) -> Dict[str, float]:
    if train_fg.empty:
        return {t: 0.0 for t in teams}
    Xb = _build_base_dist_features(train_fg)
    p_base = 1.0 / (1.0 + np.exp(-np.clip(Xb @ dist_beta, -10.0, 10.0)))
    resid = train_fg["y_made"].to_numpy(dtype=np.float64) - p_base
    out: Dict[str, float] = {}
    pos_arr = train_fg["pos_norm"].to_numpy()
    for tm in teams:
        mask = pos_arr == tm
        cnt = float(mask.sum())
        if cnt < 1.0:
            out[tm] = 0.0
        else:
            raw_m = float(np.mean(resid[mask]))
            out[tm] = round(_clamp(raw_m * (cnt / (cnt + K0_KICKER_ATTEMPTS)), -0.25, 0.25), 6)
    return out


def fit_causal_15r_kicker_model(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Fit causal (`week < as_of_week`) distance-only baseline & physical 15R FG hazard."""
    if as_of_week in _FG_FIT_CACHE:
        return _FG_FIT_CACHE[as_of_week]

    fg = _load_fg_frame()
    if fg.empty:
        return {"available": False, "as_of_week": as_of_week or 1, "teams": {}, "dist_beta": [1.8, -0.9, -0.3]}

    max_wk = int(fg["week"].max())
    ref_week = (max_wk + 1) if as_of_week is None else int(as_of_week)
    tr = fg[fg["week"].astype(int) < ref_week].copy()
    all_teams = sorted(STADIUM_ELEVATION_FT.keys())
    if len(tr) < 20:
        return {"available": False, "as_of_week": ref_week, "teams": {t: 0.0 for t in all_teams}}

    y_tr = tr["y_made"].to_numpy(dtype=np.float64)
    Xb = _build_base_dist_features(tr)
    dist_beta = _fit_ridge_logistic(Xb, y_tr, np.array([1e-3, 1.0, 2.0], dtype=np.float64))

    team_eb = _compute_eb_team_kicker_resids(tr, dist_beta, all_teams)
    eb_vec = tr["pos_norm"].map(lambda t: team_eb.get(str(t), 0.0)).to_numpy(dtype=np.float64)
    Xf = _build_full_physics_features(tr, eb_vec)
    full_beta = _fit_ridge_logistic(
        Xf, y_tr, np.array([1e-3, 1.0, 2.0, 6.0, 6.0, 8.0], dtype=np.float64)
    )

    arr_eb = np.array([team_eb[t] for t in all_teams], dtype=np.float64)
    mu_eb, sd_eb = float(np.mean(arr_eb)), max(1e-8, float(np.std(arr_eb)))
    team_z = {t: round(_clamp((team_eb[t] - mu_eb) / sd_eb, -3.0, 3.0), 6) for t in all_teams}

    res = {
        "schema": "stream_15r_kicker_air_density_weather_v1",
        "available": True,
        "as_of_week": ref_week,
        "train_fg_attempts": len(tr),
        "dist_beta": [round(float(v), 6) for v in dist_beta],
        "full_beta": [round(float(v), 6) for v in full_beta],
        "team_eb_residual": team_eb,
        "team_kicker_z": team_z,
    }
    _FG_FIT_CACHE[as_of_week] = res
    return res


def predict_fg_make_prob(
    kick_distance: float,
    home_team: str,
    kicking_team: str,
    *,
    roof: Optional[str] = None,
    temp_f: Optional[float] = None,
    wind_mph: Optional[float] = None,
    as_of_week: Optional[int] = None,
) -> float:
    """Physical make probability using stadium elevation, temperature, wind, and causal kicker skill."""
    model = fit_causal_15r_kicker_model(as_of_week=as_of_week)
    home_u = normalize_nfl_team(home_team)
    kick_u = normalize_nfl_team(kicking_team)
    elev = STADIUM_ELEVATION_FT.get(home_u, 450.0)
    is_out = str(roof or "outdoors").lower() in ("outdoors", "open")
    t_eff = 70.0 if not is_out else float(temp_f if temp_f is not None else 60.0)
    w_eff = 0.0 if not is_out else float(wind_mph if wind_mph is not None else 7.0)
    rho = compute_isa_air_density_ratio(t_eff, elev)

    # Physical physics priors combined with causal fitted weights
    beta = np.asarray(model.get("full_beta", [1.9, -0.95, -0.35, 0.30, -0.15, 0.50]), dtype=np.float64)
    d = max(18.0, min(75.0, float(kick_distance)))
    dz = (d - 42.0) / 10.0
    dtail = (max(0.0, d - 47.0) ** 2) / 100.0
    air_assist = (1.0 - rho) * (d / 45.0)
    wind_drag = max(0.0, w_eff - 6.0) * (d / 45.0) / 10.0
    eb = float((model.get("team_eb_residual") or {}).get(kick_u, 0.0))

    # Enforce physical monotonicity on altitude/air-density and wind drag if sparse sample flipped tiny beta sign
    air_coef = max(0.25, float(beta[3])) if len(beta) > 3 else 0.25
    wind_coef = min(-0.15, float(beta[4])) if len(beta) > 4 else -0.15
    logit = (
        float(beta[0])
        + float(beta[1]) * dz
        + float(beta[2]) * dtail
        + air_coef * air_assist
        + wind_coef * wind_drag
        + (float(beta[5]) if len(beta) > 5 else 0.5) * eb
    )
    return round(float(1.0 / (1.0 + math.exp(-max(-10.0, min(10.0, logit))))), 6)


def evaluate_causal_15r_kicker_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Dict[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Strictly swap-symmetric Stream 15R matchup bundle for shared game context."""
    away_u = normalize_nfl_team(away_team)
    home_u = normalize_nfl_team(home_team)
    ctx = context or {}
    is_indoor = bool(ctx.get("is_indoor", False))
    wind_mph = 0.0 if is_indoor else float(ctx.get("wind_mph", 7.0) or 7.0)
    temp_f = 70.0 if is_indoor else float(ctx.get("temp_f", 60.0) or 60.0)
    elev_ft = float(ctx.get("elevation_ft", 450.0) or 450.0)
    rho = compute_isa_air_density_ratio(temp_f, elev_ft)

    model = fit_causal_15r_kicker_model(as_of_week=as_of_week)
    tz = model.get("team_kicker_z") or {}
    aw_z = float(tz.get(away_u, 0.0))
    hm_z = float(tz.get(home_u, 0.0))

    # Bounded swap-symmetric kicker/special-teams edge
    weather_scale = max(0.75, min(1.20, 1.0 - max(0.0, wind_mph - 8.0) * 0.012 + (1.0 - rho) * 0.25))
    aw_edge = round(_clamp(aw_z * 0.0045 * weather_scale, -0.020, 0.020), 6)
    hm_edge = round(_clamp(hm_z * 0.0045 * weather_scale, -0.020, 0.020), 6)

    return {
        "schema": "stream_15r_kicker_air_density_weather_v1",
        "available": bool(model.get("available")),
        "as_of_week": model.get("as_of_week"),
        "away_team": away_u,
        "home_team": home_u,
        "air_density_ratio": round(rho, 6),
        "stream_15r_away_kicker_edge": aw_edge,
        "stream_15r_home_kicker_edge": hm_edge,
        "stream_15r_net_kicker_diff": round(aw_edge - hm_edge, 6),
    }


def evaluate_causal_15r_walkforward_oos(
    eval_weeks: Sequence[int] = tuple(range(4, 11)),
) -> Dict[str, Any]:
    """Strictly causal FG walk-forward OOS test across 2026 `eval_weeks`."""
    fg = _load_fg_frame()
    if fg.empty:
        return {"available": False, "n_fg_attempts": 0, "beats_distance_baseline": False}

    y_all: List[int] = []
    p_dist_all: List[float] = []
    p_15r_all: List[float] = []
    all_teams = sorted(STADIUM_ELEVATION_FT.keys())

    for wk in eval_weeks:
        wk_i = int(wk)
        tr = fg[fg["week"].astype(int) < wk_i]
        te = fg[fg["week"].astype(int) == wk_i]
        if tr.empty or te.empty:
            continue
        mod = fit_causal_15r_kicker_model(as_of_week=wk_i)
        db = np.asarray(mod["dist_beta"], dtype=np.float64)
        fb = np.asarray(mod["full_beta"], dtype=np.float64)
        eb_map = mod["team_eb_residual"]

        X_te_dist = _build_base_dist_features(te)
        eb_te = te["pos_norm"].map(lambda t: eb_map.get(str(t), 0.0)).to_numpy(dtype=np.float64)
        X_te_full = _build_full_physics_features(te, eb_te)

        pd_vec = np.clip(1.0 / (1.0 + np.exp(-np.clip(X_te_dist @ db, -10.0, 10.0))), 0.01, 0.99)
        pf_vec = np.clip(1.0 / (1.0 + np.exp(-np.clip(X_te_full @ fb, -10.0, 10.0))), 0.01, 0.99)

        y_all.extend([int(v) for v in te["y_made"].to_numpy()])
        p_dist_all.extend([float(v) for v in pd_vec])
        p_15r_all.extend([float(v) for v in pf_vec])

    yt = np.asarray(y_all, dtype=np.float64)
    p_d = np.clip(np.asarray(p_dist_all, dtype=np.float64), 1e-6, 1.0 - 1e-6)
    p_f = np.clip(np.asarray(p_15r_all, dtype=np.float64), 1e-6, 1.0 - 1e-6)

    b_d = float(np.mean((p_d - yt) ** 2))
    b_f = float(np.mean((p_f - yt) ** 2))
    l_d = float(-np.mean(yt * np.log(p_d) + (1.0 - yt) * np.log(1.0 - p_d)))
    l_f = float(-np.mean(yt * np.log(p_f) + (1.0 - yt) * np.log(1.0 - p_f)))
    ece_d = expected_calibration_error(y_all, p_dist_all, n_bins=8)
    ece_f = expected_calibration_error(y_all, p_15r_all, n_bins=8)
    eb = paired_brier_empirical_bernstein_lcb(y_all, p_dist_all, p_15r_all)

    return {
        "schema": "stream_15r_walkforward_oos_v1",
        "eval_weeks": [int(w) for w in eval_weeks],
        "n_fg_attempts": len(y_all),
        "brier_distance_baseline": round(b_d, 6),
        "brier_stream_15r_physics": round(b_f, 6),
        "log_loss_distance_baseline": round(l_d, 6),
        "log_loss_stream_15r_physics": round(l_f, 6),
        "ece_distance_baseline": round(ece_d, 6),
        "ece_stream_15r_physics": round(ece_f, 6),
        "eb_lcb_vs_dist_baseline": eb["lcb"],
        "beats_distance_baseline": bool(b_f < b_d and l_f < l_d),
    }


__all__ = [
    "STADIUM_ELEVATION_FT",
    "compute_isa_air_density_ratio",
    "fit_causal_15r_kicker_model",
    "predict_fg_make_prob",
    "evaluate_causal_15r_kicker_matchup",
    "evaluate_causal_15r_walkforward_oos",
]
