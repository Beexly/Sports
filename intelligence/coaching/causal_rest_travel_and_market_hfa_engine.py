"""
Stream 15W: Causal Rest, Dynamic HFA Decay, Cold-Weather & Market Efficiency Audit Engine
=======================================================================================

Strictly causal (`season < eval_season`, exponential season decay `0.78^age`, plus
causal `week < as_of_week` in-season updates) Ridge-shrunk structural venue & rest
model built over cleared CC-BY-4.0 `data/nflverse/schedules_games_through_2026_w10.parquet`.

Key Empirical Results (`2021-2026` Walk-Forward OOS, `n = 1,509` REG Games):
  1. **Dynamic Decayed HFA + Rest + Div + Cold vs Legacy 2.5pt HFA:**
     - Legacy 2.5pt HFA: Margin MSE = `200.1847`, Win Brier = `0.250889` (worse than coin flip).
     - Zero-HFA baseline: Margin MSE = `203.0417`, Win Brier = `0.250000`.
     - Causal Stream 15W Ridge (`HFA ~ 1.5-1.6 pts`): Margin MSE = `199.4822`, Win Brier = `0.248757`
       (strictly beats BOTH zero baseline and legacy 2.5pt HFA!). -> **PROMOTED** (`+0.15` to EPA tilt).
  2. **Closing-Spread ATS Residual Audit (`actual_margin - spread_line`):**
     - Zero market override ATS MSE = `158.2820` vs causal ATS linear overlay MSE = `158.6382`.
     - Market closing spreads already price routine HFA/rest/cold efficiently ->
       **HONEST NULL HOLD** (`ats_override_weight = 0.0`; Stage 5 always respects closing line).

Outputs:
  1. `compute_causal_15w_hfa_and_rest_profiles(as_of_season=2026, as_of_week=11)`
  2. `evaluate_causal_15w_hfa_rest_matchup(away_team, home_team, context=None, as_of_season=2026, as_of_week=11)`
  3. `evaluate_causal_15w_walkforward_oos(eval_seasons=range(2021, 2027))`
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional

import numpy as np
import pandas as pd

from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEDULES_PATH = REPO_ROOT / "data" / "nflverse" / "schedules_games_through_2026_w10.parquet"

_CACHE: Dict[str, Any] = {}
_PROFILE_CACHE: Dict[tuple[int, int], Dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _load_schedule_frame() -> pd.DataFrame:
    if "reg" in _CACHE:
        return _CACHE["reg"]

    if not SCHEDULES_PATH.is_file():
        _CACHE["reg"] = pd.DataFrame()
        return _CACHE["reg"]

    cols = [
        "game_id",
        "season",
        "week",
        "game_type",
        "away_team",
        "home_team",
        "away_rest",
        "home_rest",
        "div_game",
        "location",
        "roof",
        "temp",
        "spread_line",
        "result",
    ]
    df = pd.read_parquet(SCHEDULES_PATH, columns=cols).copy()
    reg = df[(df["game_type"] == "REG") & df["result"].notna()].copy()
    reg["away_norm"] = reg["away_team"].map(lambda x: normalize_nfl_team(str(x or "")))
    reg["home_norm"] = reg["home_team"].map(lambda x: normalize_nfl_team(str(x or "")))
    reg["season"] = reg["season"].astype(int)
    reg["week"] = reg["week"].astype(int)
    reg["is_home_loc"] = (reg["location"] == "Home").astype(float)
    reg["rest_diff"] = (reg["home_rest"].fillna(7.0) - reg["away_rest"].fillna(7.0)).clip(-7.0, 7.0)
    reg["div"] = reg["div_game"].fillna(0).astype(float)
    reg["home_cold"] = ((reg["temp"].fillna(68.0) <= 40.0) & (reg["roof"] == "outdoors")).astype(float)
    reg["result_f"] = reg["result"].astype(float)
    sp = pd.to_numeric(reg["spread_line"], errors="coerce")
    reg["ats_resid"] = reg["result_f"] - sp
    _CACHE["reg"] = reg
    return reg


def _fit_ridge_for_season(reg: pd.DataFrame, target_season: int) -> tuple[np.ndarray, np.ndarray]:
    tr = reg[(reg["season"] >= target_season - 6) & (reg["season"] < target_season)]
    if tr.empty:
        return np.array([1.5, 0.11, -0.1, 0.8], dtype=float), np.zeros(4, dtype=float)

    w = 0.78 ** (target_season - 1 - tr["season"].to_numpy(dtype=float))
    X = np.column_stack([tr["is_home_loc"], tr["rest_diff"], tr["div"], tr["home_cold"]])
    Xw = X * np.sqrt(w)[:, None]
    yw = tr["result_f"].to_numpy(dtype=float) * np.sqrt(w)
    beta_margin = np.linalg.solve(Xw.T @ Xw + 80.0 * np.eye(4), Xw.T @ yw)

    tr_a = tr.dropna(subset=["ats_resid"])
    if tr_a.empty:
        beta_ats = np.zeros(4, dtype=float)
    else:
        wa = 0.78 ** (target_season - 1 - tr_a["season"].to_numpy(dtype=float))
        Xa = np.column_stack(
            [tr_a["is_home_loc"], tr_a["rest_diff"], tr_a["div"], tr_a["home_cold"]]
        ) * np.sqrt(wa)[:, None]
        ya = tr_a["ats_resid"].to_numpy(dtype=float) * np.sqrt(wa)
        beta_ats = np.linalg.solve(Xa.T @ Xa + 200.0 * np.eye(4), Xa.T @ ya)

    return beta_margin, beta_ats


def compute_causal_15w_hfa_and_rest_profiles(
    as_of_season: int = 2026,
    as_of_week: int = 11,
) -> Dict[str, Any]:
    """Compute strictly causal Ridge HFA/rest/cold coefficients and team venue residuals."""
    key = (int(as_of_season), int(as_of_week))
    if key in _PROFILE_CACHE:
        return _PROFILE_CACHE[key]

    reg = _load_schedule_frame()
    beta_margin, beta_ats = _fit_ridge_for_season(reg, int(as_of_season))

    # Team-level causal ATS/margin rest-resilience shrinkage over last 4 seasons + current season < as_of_week
    if reg.empty:
        team_map: Dict[str, Dict[str, float]] = {}
    else:
        sub = reg[
            ((reg["season"] >= int(as_of_season) - 4) & (reg["season"] < int(as_of_season)))
            | ((reg["season"] == int(as_of_season)) & (reg["week"] < int(as_of_week)))
        ].copy()
        w_row = np.where(
            sub["season"] == int(as_of_season),
            1.0,
            0.70 ** np.maximum(1, int(as_of_season) - sub["season"]),
        )
        sub["w_row"] = w_row
        # Venue/schedule resilience: realized margin minus spread_line when team is home/away (EB shrunk heavily, diagnostic/secondary)
        home_rows = pd.DataFrame(
            {
                "team": sub["home_norm"],
                "ats": sub["ats_resid"].fillna(0.0),
                "margin": sub["result_f"],
                "w": sub["w_row"],
            }
        )
        away_rows = pd.DataFrame(
            {
                "team": sub["away_norm"],
                "ats": -sub["ats_resid"].fillna(0.0),
                "margin": -sub["result_f"],
                "w": sub["w_row"],
            }
        )
        both = pd.concat([home_rows, away_rows], ignore_index=True)
        both = both[both["team"] != ""].copy()
        both["wm"] = both["margin"] * both["w"]
        both["wa"] = both["ats"] * both["w"]
        grp = both.groupby("team").agg(wm=("wm", "sum"), wa=("wa", "sum"), wn=("w", "sum"))
        team_map = {}
        for tm, row in grp.iterrows():
            wn = float(row["wn"])
            sched_margin_eb = float(row["wm"] / (wn + 32.0))
            ats_resid_eb = float(row["wa"] / (wn + 48.0))
            team_map[str(tm)] = {
                "sched_margin_eb_pts": round(sched_margin_eb, 4),
                "ats_resid_eb_pts": round(ats_resid_eb, 4),
                "eff_games": round(wn, 2),
            }

    out = {
        "schema": "stream_15w_causal_hfa_rest_v1",
        "as_of_season": int(as_of_season),
        "as_of_week": int(as_of_week),
        "dynamic_hfa_pts": round(float(beta_margin[0]), 6),
        "rest_diff_pts_per_day": round(float(beta_margin[1]), 6),
        "div_game_pts_adj": round(float(beta_margin[2]), 6),
        "home_cold_outdoor_pts_adj": round(float(beta_margin[3]), 6),
        "ats_override_beta_null": [round(float(x), 6) for x in beta_ats],
        "teams_count": len(team_map),
        "teams": team_map,
    }
    _PROFILE_CACHE[key] = out
    return out


def evaluate_causal_15w_hfa_rest_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
    as_of_season: int = 2026,
    as_of_week: int = 11,
) -> Dict[str, Any]:
    """Evaluate Stream 15W conditioners with strict swap symmetry on team fields."""
    ctx = context or {}
    aw = normalize_nfl_team(str(away_team or ""))
    hm = normalize_nfl_team(str(home_team or ""))
    prof = compute_causal_15w_hfa_and_rest_profiles(
        as_of_season=as_of_season,
        as_of_week=as_of_week,
    )
    teams = prof.get("teams") or {}
    aw_p = teams.get(aw)
    hm_p = teams.get(hm)

    if aw_p is None or hm_p is None:
        return {
            "schema": "stream_15w_matchup_v1",
            "as_of_season": prof["as_of_season"],
            "as_of_week": prof["as_of_week"],
            "stream_15w_dynamic_hfa_pts": float(prof["dynamic_hfa_pts"]),
            "stream_15w_away_sched_resilience_edge": 0.0,
            "stream_15w_home_sched_resilience_edge": 0.0,
            "stream_15w_away_ats_null_override": 0.0,
            "stream_15w_home_ats_null_override": 0.0,
            "stream_15w_net_sched_resilience_diff": 0.0,
        }

    # Team-level swap-symmetric shrunk EPA-unit resilience (14 pts margin ~= 0.25 EPA/play scale -> / 50.0 bounded)
    aw_res = _clamp(aw_p["sched_margin_eb_pts"] / 50.0, -0.15, 0.15)
    hm_res = _clamp(hm_p["sched_margin_eb_pts"] / 50.0, -0.15, 0.15)

    # Honest null diagnostic for closing-line ATS override (weight 0.0 in simulator)
    aw_ats_null = _clamp(aw_p["ats_resid_eb_pts"] / 40.0, -0.10, 0.10)
    hm_ats_null = _clamp(hm_p["ats_resid_eb_pts"] / 40.0, -0.10, 0.10)

    is_neutral = bool(ctx.get("is_neutral_site", False))
    hfa_pts = 0.0 if is_neutral else float(prof["dynamic_hfa_pts"])
    net_diff = _clamp(aw_res - hm_res, -0.25, 0.25)

    return {
        "schema": "stream_15w_matchup_v1",
        "as_of_season": prof["as_of_season"],
        "as_of_week": prof["as_of_week"],
        "stream_15w_dynamic_hfa_pts": round(hfa_pts, 6),
        "stream_15w_away_sched_resilience_edge": round(aw_res, 6),
        "stream_15w_home_sched_resilience_edge": round(hm_res, 6),
        "stream_15w_away_ats_null_override": round(aw_ats_null, 6),
        "stream_15w_home_ats_null_override": round(hm_ats_null, 6),
        "stream_15w_net_sched_resilience_diff": round(net_diff, 6),
    }


def evaluate_causal_15w_walkforward_oos(
    eval_seasons: Iterable[int] = range(2021, 2027),
) -> Dict[str, Any]:
    """Strict seasonal walk-forward OOS evaluation over 2021-2026 REG games."""
    reg = _load_schedule_frame()
    ym: List[float] = []
    p0: List[float] = []
    p25: List[float] = []
    pc: List[float] = []
    ya: List[float] = []
    pa: List[float] = []

    seasons_list = [int(s) for s in eval_seasons]
    for eval_yr in seasons_list:
        te = reg[reg["season"] == eval_yr]
        if te.empty:
            continue
        beta_m, beta_a = _fit_ridge_for_season(reg, eval_yr)
        X_te = np.column_stack([te["is_home_loc"], te["rest_diff"], te["div"], te["home_cold"]])
        ym.extend(te["result_f"].to_numpy(dtype=float))
        p0.extend(np.zeros(len(te), dtype=float))
        p25.extend(2.5 * te["is_home_loc"].to_numpy(dtype=float))
        pc.extend(X_te @ beta_m)

        te_a = te.dropna(subset=["ats_resid"])
        if not te_a.empty:
            Xa = np.column_stack(
                [te_a["is_home_loc"], te_a["rest_diff"], te_a["div"], te_a["home_cold"]]
            )
            ya.extend(te_a["ats_resid"].to_numpy(dtype=float))
            pa.extend(Xa @ beta_a)

    yma = np.asarray(ym, dtype=float)
    p0a = np.asarray(p0, dtype=float)
    p25a = np.asarray(p25, dtype=float)
    pca = np.asarray(pc, dtype=float)
    hw = (yma > 0.0).astype(float)

    def _win_brier(m: np.ndarray) -> float:
        p = 1.0 / (1.0 + np.exp(-m / 8.0))
        return float(np.mean((hw - p) ** 2))

    mse_zero = float(np.mean((yma - p0a) ** 2)) if len(yma) else 0.0
    mse_legacy_25 = float(np.mean((yma - p25a) ** 2)) if len(yma) else 0.0
    mse_causal = float(np.mean((yma - pca) ** 2)) if len(yma) else 0.0
    brier_zero = _win_brier(p0a) if len(yma) else 0.25
    brier_legacy_25 = _win_brier(p25a) if len(yma) else 0.25
    brier_causal = _win_brier(pca) if len(yma) else 0.25

    yaa = np.asarray(ya, dtype=float)
    paa = np.asarray(pa, dtype=float)
    ats_mse_zero = float(np.mean(yaa ** 2)) if len(yaa) else 0.0
    ats_mse_causal = float(np.mean((yaa - paa) ** 2)) if len(yaa) else 0.0

    margin_beats_both = mse_causal < mse_zero and mse_causal < mse_legacy_25
    brier_beats_both = brier_causal < brier_zero and brier_causal < brier_legacy_25
    ats_beats_closing = ats_mse_causal < ats_mse_zero

    return {
        "schema": "stream_15w_walkforward_oos_v1",
        "eval_seasons": seasons_list,
        "n_games": int(len(yma)),
        "structural_hfa_rest_cold": {
            "margin_mse_zero": round(mse_zero, 4),
            "margin_mse_legacy_25pt": round(mse_legacy_25, 4),
            "margin_mse_stream_15w": round(mse_causal, 4),
            "win_brier_zero": round(brier_zero, 6),
            "win_brier_legacy_25pt": round(brier_legacy_25, 6),
            "win_brier_stream_15w": round(brier_causal, 6),
            "beats_zero_and_legacy_25pt": bool(margin_beats_both and brier_beats_both),
        },
        "closing_spread_ats_audit": {
            "n_games_priced": int(len(yaa)),
            "ats_mse_zero_override": round(ats_mse_zero, 4),
            "ats_mse_causal_overlay": round(ats_mse_causal, 4),
            "beats_closing_spread": bool(ats_beats_closing),
        },
        "all_promoted_components_beat_baseline": bool(margin_beats_both and brier_beats_both),
    }
