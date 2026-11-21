"""
Joint Multi-Stream Meta-Stacking, Collinearity Audit & Frozen Calibration Ablation (Streams 15P..15Y)
====================================================================================================

Evaluates all ten newly built causal NFL intelligence streams (`15P` through `15Y`)
jointly on cleared `data/nflverse/schedules_games_through_2026_w10.parquet`
(`2026 Weeks 4..10`, `n = 102` REG games; strictly causal `as_of_week = game.week`):
  - Computes the 10x10 pairwise correlation matrix across all promoted stream differentials
    to expose any multi-stream collinearity (e.g. `15V` early-down EPA vs `15X` air/YAC pass).
  - Evaluates strict walk-forward (`week < eval_wk`, Weeks 5..10) Ridge-orthogonalized stacking
    and standardized equal-weight stacking against uninformative baseline (`p=0.50` / `0pt`) and
    against de-vigged closing moneylines via the immutable frozen calibration scorer
    `evaluation/frozen/score_walkforward_calibration_v1.py`.
  - Evaluates `baker_mchale_shrunk_kelly(...)` bankroll sizing strictly out-of-sample.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import numpy as np
import pandas as pd

from evaluation.frozen.score_walkforward_calibration_v1 import (
    apply_calibration_transform,
    baker_mchale_shrunk_kelly,
    score_predictions,
)
from intelligence.coaching.causal_air_yac_and_rush_success_engine import (
    evaluate_causal_15x_air_yac_rush_matchup,
)
from intelligence.coaching.causal_box_shell_and_charting_engine import (
    evaluate_causal_15y_box_charting_matchup,
)
from intelligence.coaching.causal_ol_continuity_and_half_splits_engine import (
    evaluate_causal_15z_ol_half_matchup,
)
from intelligence.coaching.causal_third_down_cpoe_st_engine import (
    evaluate_causal_16a_3d_cpoe_st_matchup,
)
from intelligence.coaching.causal_sequencing_trench_punting_engine import (
    evaluate_causal_16b_seq_trench_punt_matchup,
)
from intelligence.coaching.causal_pace_and_penalty_discipline_engine import (
    evaluate_causal_15u_pace_matchup,
)
from intelligence.coaching.causal_positional_vulnerability_engine import (
    evaluate_causal_15p_matchup,
)
from intelligence.coaching.causal_redzone_and_fourth_down_engine import (
    evaluate_causal_15t_redzone_4th_matchup,
)
from intelligence.coaching.causal_rest_travel_and_market_hfa_engine import (
    evaluate_causal_15w_hfa_rest_matchup,
)
from intelligence.coaching.causal_turnover_and_early_down_regression_engine import (
    evaluate_causal_15v_early_down_matchup,
)
from intelligence.coaching.ftn_role_zone_pressure_hazard_engine import (
    evaluate_causal_15q_matchup,
)
from intelligence.coaching.kicker_air_density_weather_hazard_engine import (
    evaluate_causal_15r_kicker_matchup,
)
from intelligence.coaching.ngs_causal_separation_cpoe_ryoe_engine import (
    evaluate_causal_15s_ngs_matchup,
)

SCHEDULES_PATH = REPO_ROOT / "data" / "nflverse" / "schedules_games_through_2026_w10.parquet"
ABLATION_DIR = REPO_ROOT / "configs" / "ablation_ladder"

STREAM_NAMES: Tuple[str, ...] = (
    "15P_pos_vuln",
    "15Q_pressure",
    "15R_kicker",
    "15S_ngs_skill",
    "15T_rz_4th",
    "15U_pace_vol",
    "15V_early_down",
    "15W_hfa_rest",
    "15X_air_rush",
    "15Y_box_chart",
    "15Z_ol_half",
    "16A_3d_cpoe_st",
    "16B_seq_trench_punt",
)


def _american_to_decimal(odds: float) -> float:
    if not math.isfinite(odds) or odds == 0.0:
        return 1.91
    if odds > 0:
        return 1.0 + odds / 100.0
    return 1.0 + 100.0 / abs(odds)


def _american_to_implied(odds: float) -> float:
    d = _american_to_decimal(odds)
    return 1.0 / d if d > 1.0 else 0.5


def _devig_home_prob(away_ml: float, home_ml: float) -> float:
    pa = _american_to_implied(away_ml)
    ph = _american_to_implied(home_ml)
    s = pa + ph
    return float(ph / s) if s > 0 else 0.5


def extract_causal_game_feature_matrix(
    min_week: int = 4,
    max_week: int = 10,
) -> pd.DataFrame:
    """Build strictly causal game-level feature matrix (home-advantage orientation) for 2026."""
    cols = [
        "game_id",
        "season",
        "week",
        "game_type",
        "away_team",
        "home_team",
        "away_moneyline",
        "home_moneyline",
        "spread_line",
        "result",
        "location",
        "roof",
        "wind",
        "temp",
    ]
    df = pd.read_parquet(SCHEDULES_PATH, columns=cols)
    sub = df[
        (df["season"] == 2026)
        & (df["game_type"] == "REG")
        & (df["week"] >= min_week)
        & (df["week"] <= max_week)
        & df["result"].notna()
    ].sort_values(["week", "game_id"])

    rows: List[Dict[str, Any]] = []
    for _, g in sub.iterrows():
        wk = int(g["week"])
        aw = str(g["away_team"])
        hm = str(g["home_team"])
        roof = str(g["roof"] or "")
        is_indoor = roof in ("dome", "closed")
        is_neutral = str(g["location"] or "") != "Home"
        ctx = {
            "is_indoor": is_indoor,
            "wind_mph": 0.0 if is_indoor else float(g["wind"] if pd.notna(g["wind"]) else 7.0),
            "temp_f": 70.0 if is_indoor else float(g["temp"] if pd.notna(g["temp"]) else 60.0),
            "is_neutral_site": is_neutral,
        }

        b15p = evaluate_causal_15p_matchup(aw, hm, ctx, as_of_week=wk)
        b15q = evaluate_causal_15q_matchup(aw, hm, ctx, as_of_week=wk)
        b15r = evaluate_causal_15r_kicker_matchup(aw, hm, ctx, as_of_week=wk)
        b15s = evaluate_causal_15s_ngs_matchup(aw, hm, ctx, as_of_week=wk)
        b15t = evaluate_causal_15t_redzone_4th_matchup(aw, hm, ctx, as_of_week=wk)
        b15u = evaluate_causal_15u_pace_matchup(aw, hm, ctx, as_of_week=wk)
        b15v = evaluate_causal_15v_early_down_matchup(aw, hm, ctx, as_of_week=wk)
        b15w = evaluate_causal_15w_hfa_rest_matchup(aw, hm, ctx, as_of_season=2026, as_of_week=wk)
        b15x = evaluate_causal_15x_air_yac_rush_matchup(aw, hm, ctx, as_of_week=wk)
        b15y = evaluate_causal_15y_box_charting_matchup(aw, hm, ctx, as_of_week=wk)
        b15z = evaluate_causal_15z_ol_half_matchup(aw, hm, ctx, as_of_week=wk)
        b16a = evaluate_causal_16a_3d_cpoe_st_matchup(aw, hm, ctx, as_of_week=wk)
        b16b = evaluate_causal_16b_seq_trench_punt_matchup(aw, hm, ctx, as_of_week=wk)

        hm_ml = float(g["home_moneyline"]) if pd.notna(g["home_moneyline"]) else -110.0
        aw_ml = float(g["away_moneyline"]) if pd.notna(g["away_moneyline"]) else -110.0

        rows.append(
            {
                "game_id": str(g["game_id"]),
                "week": wk,
                "away_team": aw,
                "home_team": hm,
                "margin": float(g["result"]),
                "home_win": 1 if float(g["result"]) > 0.0 else 0,
                "is_tie": bool(float(g["result"]) == 0.0),
                "market_home_prob": _devig_home_prob(aw_ml, hm_ml),
                "home_decimal_odds": _american_to_decimal(hm_ml),
                "away_decimal_odds": _american_to_decimal(aw_ml),
                "15P_pos_vuln": -float(b15p["stream_15p_net_pos_vuln_delta"]),
                "15Q_pressure": float(b15q["stream_15q_home_pressure_survival_edge"])
                - float(b15q["stream_15q_away_pressure_survival_edge"]),
                "15R_kicker": -float(b15r["stream_15r_net_kicker_diff"]),
                "15S_ngs_skill": (
                    float(b15s["stream_15s_home_ngs_pass_cpoe_edge"])
                    + float(b15s["stream_15s_home_ngs_rush_ryoe_edge"])
                )
                - (
                    float(b15s["stream_15s_away_ngs_pass_cpoe_edge"])
                    + float(b15s["stream_15s_away_ngs_rush_ryoe_edge"])
                ),
                "15T_rz_4th": -float(b15t["stream_15t_net_rz_4th_diff"]),
                "15U_pace_vol": -float(b15u["stream_15u_net_tempo_volume_diff"]),
                "15V_early_down": -float(b15v["stream_15v_net_early_down_diff"]),
                "15W_hfa_rest": -float(b15w["stream_15w_net_sched_resilience_diff"]),
                "15X_air_rush": -float(b15x["stream_15x_net_air_rush_diff"]),
                "15Y_box_chart": -float(b15y["stream_15y_net_box_charting_diff"]),
                "15Z_ol_half": -float(b15z["stream_15z_net_ol_half_diff"]),
                "16A_3d_cpoe_st": -float(b16a["stream_16a_net_3d_cpoe_st_diff"]),
                "16B_seq_trench_punt": -float(b16b["stream_16b_net_seq_trench_punt_diff"]),
            }
        )

    return pd.DataFrame(rows)


def run_joint_ablation_and_collinearity_audit() -> Dict[str, Any]:
    """Run 9x9 collinearity audit + walk-forward orthogonal stacking + frozen calibration ladder."""
    df = extract_causal_game_feature_matrix(min_week=4, max_week=10)
    non_tie = df[~df["is_tie"]].copy().reset_index(drop=True)

    feat_mat = non_tie[list(STREAM_NAMES)].to_numpy(dtype=float)
    corr_df = non_tie[list(STREAM_NAMES)].corr()
    top_collinear: List[Dict[str, Any]] = []
    for i in range(len(STREAM_NAMES)):
        for j in range(i + 1, len(STREAM_NAMES)):
            r = float(corr_df.iloc[i, j])
            if abs(r) >= 0.35:
                top_collinear.append(
                    {"a": STREAM_NAMES[i], "b": STREAM_NAMES[j], "pearson_r": round(r, 4)}
                )
    top_collinear.sort(key=lambda d: abs(d["pearson_r"]), reverse=True)

    # Walk-forward Weeks 5..10 using strict train < eval_wk Ridge stacking
    y_oos: List[int] = []
    m_oos: List[float] = []
    p_mkt: List[float] = []
    p_equal_z: List[float] = []
    p_ridge_stack: List[float] = []
    p_ridge_blend_mkt: List[float] = []
    hm_odds_oos: List[float] = []
    aw_odds_oos: List[float] = []

    for wk in range(5, 11):
        tr = non_tie[non_tie["week"] < wk]
        te = non_tie[non_tie["week"] == wk]
        if tr.empty or te.empty:
            continue

        X_tr = tr[list(STREAM_NAMES)].to_numpy(dtype=float)
        X_te = te[list(STREAM_NAMES)].to_numpy(dtype=float)
        mu_f = np.mean(X_tr, axis=0)
        sd_f = np.maximum(np.std(X_tr, axis=0), 1e-6)
        Z_tr = (X_tr - mu_f) / sd_f
        Z_te = (X_te - mu_f) / sd_f

        # Ridge regression on realized margin (heavy L2 penalty = 45.0 handles collinearity cleanly)
        y_m_tr = tr["margin"].to_numpy(dtype=float)
        d_cols = Z_tr.shape[1]
        beta = np.linalg.solve(Z_tr.T @ Z_tr + 45.0 * np.eye(d_cols), Z_tr.T @ y_m_tr)
        pred_margin_ridge = Z_te @ beta
        pred_equal_score = np.mean(Z_te, axis=1)

        for idx, (_, row) in enumerate(te.iterrows()):
            pr = 1.0 / (1.0 + math.exp(-float(pred_margin_ridge[idx]) / 7.5))
            pe = 1.0 / (1.0 + math.exp(-float(pred_equal_score[idx]) * 0.45))
            pm = float(row["market_home_prob"])
            pb = 0.85 * pm + 0.15 * pr

            y_oos.append(int(row["home_win"]))
            m_oos.append(float(row["margin"]))
            p_mkt.append(pm)
            p_equal_z.append(float(min(0.95, max(0.05, pe))))
            p_ridge_stack.append(float(min(0.95, max(0.05, pr))))
            p_ridge_blend_mkt.append(float(min(0.95, max(0.05, pb))))
            hm_odds_oos.append(float(row["home_decimal_odds"]))
            aw_odds_oos.append(float(row["away_decimal_odds"]))

    # Pass Ridge stack OOS probs through frozen calibration configs
    ablation_scores: Dict[str, Any] = {}
    half_idx = len(y_oos) // 2
    for cfg_path in sorted(ABLATION_DIR.glob("*.json")):
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        probs_cal, _ = apply_calibration_transform(
            p_ridge_stack[half_idx:],
            temp_scale=float(cfg.get("temp_scale", 1.0)),
            conformal_shrinkage=float(cfg.get("conformal_shrinkage", 0.0)),
            venn_abers_weight=float(cfg.get("venn_abers_weight", 0.0)),
            aci_gamma=float(cfg.get("aci_gamma", 0.0)),
            train_p=p_ridge_stack[:half_idx],
            train_y=y_oos[:half_idx],
            test_y=y_oos[half_idx:],
        )
        ablation_scores[cfg["name"]] = score_predictions(y_oos[half_idx:], probs_cal)

    # Baker-McHale Kelly bankroll audit strictly vs closing market odds (sigma_p = 0.045)
    pnl_units = 0.0
    total_staked = 0.0
    bets_placed = 0
    for y_val, p_model, ho, ao in zip(y_oos, p_ridge_blend_mkt, hm_odds_oos, aw_odds_oos):
        kh = baker_mchale_shrunk_kelly(p_model, ho, prob_std_error=0.045, max_stake=0.05)
        ka = baker_mchale_shrunk_kelly(1.0 - p_model, ao, prob_std_error=0.045, max_stake=0.05)
        if kh["shrunk_stake"] > ka["shrunk_stake"] and kh["shrunk_stake"] > 0.0:
            st = kh["shrunk_stake"]
            bets_placed += 1
            total_staked += st
            pnl_units += st * (ho - 1.0) if y_val == 1 else -st
        elif ka["shrunk_stake"] > 0.0:
            st = ka["shrunk_stake"]
            bets_placed += 1
            total_staked += st
            pnl_units += st * (ao - 1.0) if y_val == 0 else -st

    return {
        "schema": "streams_15p_to_15x_joint_ablation_v1",
        "n_total_w4_w10": int(len(df)),
        "n_decided_w4_w10": int(len(non_tie)),
        "n_oos_eval_w5_w10": int(len(y_oos)),
        "top_collinear_pairs": top_collinear,
        "oos_benchmarks": {
            "coin_flip_050": score_predictions(y_oos, [0.5] * len(y_oos)),
            "equal_weight_z_stack": score_predictions(y_oos, p_equal_z),
            "ridge_orthogonal_stack": score_predictions(y_oos, p_ridge_stack),
            "closing_market_devig": score_predictions(y_oos, p_mkt),
            "market_85_plus_ridge_15": score_predictions(y_oos, p_ridge_blend_mkt),
        },
        "ridge_beats_equal_weight_brier": bool(
            score_predictions(y_oos, p_ridge_stack)["brier"]
            < score_predictions(y_oos, p_equal_z)["brier"]
        ),
        "frozen_ladder_second_half_w8_w10": ablation_scores,
        "baker_mchale_kelly_vs_close": {
            "bets_placed": bets_placed,
            "total_staked": round(total_staked, 4),
            "net_pnl": round(pnl_units, 4),
        },
    }


if __name__ == "__main__":
    print(json.dumps(run_joint_ablation_and_collinearity_audit(), indent=2))
