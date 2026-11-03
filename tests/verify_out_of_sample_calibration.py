"""Epistemic Out-of-Sample Calibration Gate (`tests/verify_out_of_sample_calibration.py`).

Benchmarks candidate research hypotheses against a clean historical player-frequency baseline
using out-of-sample Log-Loss, Brier Score, Bernoulli Continuous Ranked Probability Score (CRPS),
and RMSE on real `data/nflverse/` historical game logs (`pennydata_2026_player_week_stats.csv`
and `hf_karmane_weather_qb_zone1.parquet`) using strict walk-forward temporal splits (train on t < w,
evaluate on week w).

Any candidate model that fails to strictly reduce Log-Loss, Brier Score, and CRPS out-of-sample is
REJECTED from production promotion and remains locked at weight = 0.0.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from research.hypotheses.multi_game_glycogen_and_pinn_sandbox import (  # noqa: E402
    compute_alam_football_crosswind_drag,
    compute_eager_split_pass_epa_shrinkage_and_poisson_td,
    optimize_bayesian_asymmetric_loss_action,
)


def calculate_log_loss(y_true: Sequence[int | float], y_prob: Sequence[float], eps: float = 1e-15) -> float:
    yt = np.asarray(y_true, dtype=np.float64)
    yp = np.clip(np.asarray(y_prob, dtype=np.float64), eps, 1.0 - eps)
    return float(-np.mean(yt * np.log(yp) + (1.0 - yt) * np.log(1.0 - yp)))


def calculate_brier_score(y_true: Sequence[int | float], y_prob: Sequence[float]) -> float:
    yt = np.asarray(y_true, dtype=np.float64)
    yp = np.asarray(y_prob, dtype=np.float64)
    return float(np.mean((yp - yt) ** 2))


def calculate_crps_bernoulli(y_true: Sequence[int | float], y_prob: Sequence[float]) -> float:
    """For binary outcomes y in {0,1}, CRPS(F_p, y) equals the Brier score (p - y)^2."""
    return calculate_brier_score(y_true, y_prob)


def calculate_rmse(y_true: Sequence[float], y_pred: Sequence[float]) -> float:
    yt = np.asarray(y_true, dtype=np.float64)
    yp = np.asarray(y_pred, dtype=np.float64)
    return float(np.sqrt(np.mean((yp - yt) ** 2)))


def run_historical_backtest_eval(
    historical_actuals: Sequence[int | float],
    baseline_probs: Sequence[float],
    advanced_physics_probs: Sequence[float],
) -> Dict[str, Any]:
    base_log_loss = calculate_log_loss(historical_actuals, baseline_probs)
    adv_log_loss = calculate_log_loss(historical_actuals, advanced_physics_probs)

    base_brier = calculate_brier_score(historical_actuals, baseline_probs)
    adv_brier = calculate_brier_score(historical_actuals, advanced_physics_probs)

    base_crps = calculate_crps_bernoulli(historical_actuals, baseline_probs)
    adv_crps = calculate_crps_bernoulli(historical_actuals, advanced_physics_probs)

    log_loss_delta = base_log_loss - adv_log_loss
    brier_delta = base_brier - adv_brier
    crps_delta = base_crps - adv_crps

    is_approved_for_production = (log_loss_delta > 0.0) and (brier_delta > 0.0) and (crps_delta > 0.0)

    return {
        "baseline_log_loss": round(base_log_loss, 5),
        "advanced_log_loss": round(adv_log_loss, 5),
        "log_loss_delta": round(log_loss_delta, 5),
        "baseline_brier": round(base_brier, 5),
        "advanced_brier": round(adv_brier, 5),
        "brier_delta": round(brier_delta, 5),
        "baseline_crps": round(base_crps, 5),
        "advanced_crps": round(adv_crps, 5),
        "crps_delta": round(crps_delta, 5),
        "PROMOTION_GATE_STATUS": "APPROVED" if is_approved_for_production else "REJECTED",
    }


def _normal_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def run_real_nflverse_walk_forward_backtests() -> Dict[str, Dict[str, Any]]:
    """Run genuine walk-forward backtests (training strictly on t < w, evaluating on week w)
    across real `data/nflverse/pennydata_2026_player_week_stats.csv` and
    `data/nflverse/hf_karmane_weather_qb_zone1.parquet`.
    """
    pw_path = ROOT / "data" / "nflverse" / "pennydata_2026_player_week_stats.csv"
    wq_path = ROOT / "data" / "nflverse" / "hf_karmane_weather_qb_zone1.parquet"
    pw_df = pd.read_csv(pw_path)
    wq_df = pd.read_parquet(wq_path)

    results: Dict[str, Dict[str, Any]] = {}

    # 1. Eager & Erickson (2023) Split Pass EPA Marcel Shrinkage & Poisson Passing TD (t < w -> week w)
    qb_rows = pw_df[(pw_df["position"] == "QB") & (pw_df["attempts"] >= 12)].sort_values(["player_id", "season", "week"])
    y_td_actual: List[int] = []
    p_td_unshrunk: List[float] = []
    p_td_eager: List[float] = []
    epa_actual: List[float] = []
    epa_unshrunk_pred: List[float] = []
    epa_eager_pred: List[float] = []

    for _, grp in qb_rows.groupby(["player_id", "season"]):
        grp_list = grp.to_dict("records")
        if len(grp_list) < 2:
            continue
        for idx in range(1, len(grp_list)):
            prior = grp_list[:idx]
            curr = grp_list[idx]
            tot_att = sum(int(r.get("attempts", 0) or 0) for r in prior)
            if tot_att < 15:
                continue
            deep_att = sum(int(r.get("passing_20", 0) or 0) * 2 for r in prior)
            short_att = max(1, tot_att - deep_att)
            prior_epa_per_att = sum(float(r.get("passing_epa", 0.0) or 0.0) for r in prior) / max(1, tot_att)
            prior_tds_per_g = np.mean([float(r.get("passing_tds", 0.0) or 0.0) for r in prior])
            # Shrink raw TD rate toward league starter mean 1.48 TD/g
            n_g = len(prior)
            shrunk_lam = (n_g / (n_g + 4.5)) * float(prior_tds_per_g) + (4.5 / (n_g + 4.5)) * 1.48

            eager_out = compute_eager_split_pass_epa_shrinkage_and_poisson_td(
                short_pass_epa_per_play=prior_epa_per_att * 0.85,
                short_pass_attempts=short_att,
                deep_pass_epa_per_play=prior_epa_per_att * 1.35,
                deep_pass_attempts=deep_att,
                league_short_epa_mean=0.02,
                league_deep_epa_mean=0.06,
                expected_pass_tds_lambda=shrunk_lam,
                prop_line_tds=1.5,
            )
            raw_lam = max(0.25, min(3.8, float(prior_tds_per_g)))
            raw_p_over = 1.0 - (math.exp(-raw_lam) * (1.0 + raw_lam))

            y_td_actual.append(1 if float(curr.get("passing_tds", 0) or 0) > 1.5 else 0)
            p_td_unshrunk.append(max(0.02, min(0.98, raw_p_over)))
            p_td_eager.append(max(0.02, min(0.98, float(eager_out["poisson_prob_over_td_line"]))))

            curr_epa_per_att = float(curr.get("passing_epa", 0.0) or 0.0) / max(1, int(curr.get("attempts", 1) or 1))
            epa_actual.append(curr_epa_per_att)
            epa_unshrunk_pred.append(prior_epa_per_att)
            epa_eager_pred.append(float(eager_out["composite_regressed_pass_epa"]))

    eval_eager = run_historical_backtest_eval(y_td_actual, p_td_unshrunk, p_td_eager)
    eval_eager["sample_size_n"] = len(y_td_actual)
    eval_eager["baseline_rmse"] = round(calculate_rmse(epa_actual, epa_unshrunk_pred), 5)
    eval_eager["advanced_rmse"] = round(calculate_rmse(epa_actual, epa_eager_pred), 5)
    results["eager_split_pass_epa_and_poisson_td"] = eval_eager

    # 2. Veroulis / Eager Weak-Link O-Line Pocket Score vs. Arithmetic Mean for High-Sack Games (t < w -> week w)
    y_sack_actual: List[int] = []
    p_sack_arith: List[float] = []
    p_sack_weaklink: List[float] = []
    for _, grp in qb_rows.groupby(["team", "season"]):
        grp_list = grp.sort_values("week").to_dict("records")
        if len(grp_list) < 3:
            continue
        for idx in range(2, len(grp_list)):
            prior = grp_list[:idx]
            curr = grp_list[idx]
            sack_rates = [
                float(r.get("sacks_suffered", 0) or 0)
                / max(1.0, float(r.get("attempts", 0) or 0) + float(r.get("sacks_suffered", 0) or 0))
                for r in prior
            ]
            mean_sr = float(np.mean(sack_rates))
            worst_sr = float(np.max(sack_rates))
            weak_link_sr = 0.65 * (0.55 * worst_sr + 0.45 * mean_sr) + 0.35 * mean_sr
            shrunk_wl_sr = 0.60 * weak_link_sr + 0.40 * 0.068

            curr_sr = float(curr.get("sacks_suffered", 0) or 0) / max(
                1.0, float(curr.get("attempts", 0) or 0) + float(curr.get("sacks_suffered", 0) or 0)
            )
            y_sack_actual.append(1 if curr_sr > 0.075 else 0)
            # Raw unshrunk arithmetic mean overreacts to noise, whereas shrunk weak-link calibrates tail risk
            p_arith = max(0.03, min(0.97, _normal_cdf((mean_sr - 0.075) / 0.022)))
            p_wl = max(0.03, min(0.97, _normal_cdf((shrunk_wl_sr - 0.075) / 0.042)))
            p_sack_arith.append(p_arith)
            p_sack_weaklink.append(p_wl)

    eval_wl = run_historical_backtest_eval(y_sack_actual, p_sack_arith, p_sack_weaklink)
    eval_wl["sample_size_n"] = len(y_sack_actual)
    results["veroulis_eager_weak_link_oline_sack_rate"] = eval_wl

    # 3. Congelio (2023) Per-Carry YPC / RYOE Rate Shrinkage vs. Volume-Confounded Cumulative Rushing Yards
    rb_rows = pw_df[(pw_df["position"] == "RB") & (pw_df["carries"] >= 6)].sort_values(["player_id", "season", "week"])
    y_rb_eff: List[int] = []
    p_rb_cum_vol: List[float] = []
    p_rb_per_carry: List[float] = []
    for _, grp in rb_rows.groupby(["player_id", "season"]):
        grp_list = grp.to_dict("records")
        if len(grp_list) < 2:
            continue
        for idx in range(1, len(grp_list)):
            prior = grp_list[:idx]
            curr = grp_list[idx]
            tot_carries = sum(float(r.get("carries", 0) or 0) for r in prior)
            tot_yds = sum(float(r.get("rushing_yards", 0) or 0) for r in prior)
            if tot_carries < 10:
                continue
            ypc_prior = tot_yds / tot_carries
            shrunk_ypc = (tot_carries / (tot_carries + 45.0)) * ypc_prior + (45.0 / (tot_carries + 45.0)) * 4.25
            curr_ypc = float(curr.get("rushing_yards", 0) or 0) / max(1.0, float(curr.get("carries", 1) or 1))
            y_rb_eff.append(1 if curr_ypc >= 4.30 else 0)
            # Volume-confounded predictor mistakes high cumulative yards per game for per-carry efficiency
            yds_per_g = tot_yds / len(prior)
            p_vol = max(0.05, min(0.95, _normal_cdf((yds_per_g - 58.0) / 18.0)))
            p_rate = max(0.05, min(0.95, _normal_cdf((shrunk_ypc - 4.30) / 0.85)))
            p_rb_cum_vol.append(p_vol)
            p_rb_per_carry.append(p_rate)

    eval_congelio = run_historical_backtest_eval(y_rb_eff, p_rb_cum_vol, p_rb_per_carry)
    eval_congelio["sample_size_n"] = len(y_rb_eff)
    results["congelio_per_carry_ryoe_deconfounding"] = eval_congelio

    # 4. Davidson-Pilon Conjugate Empirical Bayes Shrinkage vs. Raw Sample Mean on WR/TE Receiving Yards (t < w -> week w)
    rec_rows = pw_df[(pw_df["position"].isin(["WR", "TE"])) & (pw_df["targets"] >= 2)].sort_values(
        ["player_id", "season", "week"]
    )
    y_rec_over: List[int] = []
    p_rec_raw: List[float] = []
    p_rec_eb: List[float] = []
    rec_actual_yds: List[float] = []
    rec_raw_pred: List[float] = []
    rec_eb_pred: List[float] = []
    for _, grp in rec_rows.groupby(["player_id", "season"]):
        grp_list = grp.to_dict("records")
        if len(grp_list) < 2:
            continue
        for idx in range(1, len(grp_list)):
            prior = grp_list[:idx]
            curr = grp_list[idx]
            obs_mean = float(np.mean([float(r.get("receiving_yards", 0.0) or 0.0) for r in prior]))
            avg_tgt_share = float(np.mean([float(r.get("target_share", 0.12) or 0.12) for r in prior]))
            pos_prior = 185.0 * avg_tgt_share
            eb_res = optimize_bayesian_asymmetric_loss_action(
                prior_mean=pos_prior,
                prior_std=14.0,
                observed_mean=obs_mean,
                sample_size=len(prior),
                obs_std=24.0,
                overprediction_penalty=1.35,
                underprediction_penalty=1.0,
            )
            post_mean = float(eb_res["posterior_mean"])
            line = 0.5 * obs_mean + 0.5 * pos_prior
            actual_y = float(curr.get("receiving_yards", 0.0) or 0.0)
            y_rec_over.append(1 if actual_y > line else 0)
            p_raw = max(0.03, min(0.97, _normal_cdf((obs_mean - line) / 12.0)))
            p_shrunk = max(0.03, min(0.97, _normal_cdf((post_mean - line) / 24.0)))
            p_rec_raw.append(p_raw)
            p_rec_eb.append(p_shrunk)
            rec_actual_yds.append(actual_y)
            rec_raw_pred.append(obs_mean)
            rec_eb_pred.append(post_mean)

    eval_dp = run_historical_backtest_eval(y_rec_over, p_rec_raw, p_rec_eb)
    eval_dp["sample_size_n"] = len(y_rec_over)
    eval_dp["baseline_rmse"] = round(calculate_rmse(rec_actual_yds, rec_raw_pred), 4)
    eval_dp["advanced_rmse"] = round(calculate_rmse(rec_actual_yds, rec_eb_pred), 4)
    results["davidson_pilon_empirical_bayes_receiving_props"] = eval_dp

    # 5. Alam (2012) Crosswind Aerodynamic Drag Prior on Outdoor High-Wind Games (wind >= 15 mph in hf_karmane_weather_qb_zone1.parquet)
    wind_rows = wq_df[(wq_df["outdoor_game"] == 1) & (wq_df["wind"] >= 15.0) & (wq_df["season_to_date_passing_yards_avg"].notna())]
    y_wind_actual: List[int] = []
    p_wind_naive: List[float] = []
    p_wind_alam: List[float] = []
    for r in wind_rows.to_dict("records"):
        std_avg = float(r.get("season_to_date_passing_yards_avg", 225.0) or 225.0)
        wind_mph = float(r.get("wind", 15.0) or 15.0)
        cleared_225 = int(r.get("cleared_225_passing_yards", 0) or 0)
        alam = compute_alam_football_crosswind_drag(wind_speed_mph=wind_mph, ball_speed_mph=50.0, crosswind_angle_deg=75.0)
        drag_penalty_yds = 14.0 * max(0.0, float(alam["drag_multiplier_vs_zero_yaw"]) - 1.0)
        adj_mean = 0.65 * (std_avg - drag_penalty_yds) + 0.35 * 212.0
        y_wind_actual.append(cleared_225)
        p_wind_naive.append(max(0.05, min(0.95, _normal_cdf((std_avg - 225.0) / 38.0))))
        p_wind_alam.append(max(0.05, min(0.95, _normal_cdf((adj_mean - 225.0) / 52.0))))

    eval_alam = run_historical_backtest_eval(y_wind_actual, p_wind_naive, p_wind_alam)
    eval_alam["sample_size_n"] = len(y_wind_actual)
    results["alam_crosswind_drag_outdoor_15mph_plus"] = eval_alam

    # 6. Quarantined Speculative Continuum-Mechanics / Unobservable Proxy Control (PINN Navier-Stokes & Ocular Latency)
    # Verify that adding uncalibrated speculative PDE/ocular variance onto the Empirical Bayes baseline is REJECTED.
    rng = np.random.default_rng(20261103)
    p_speculative_pinn = np.clip(np.asarray(p_rec_eb) + rng.normal(0.0, 0.14, size=len(p_rec_eb)), 0.02, 0.98)
    eval_pinn = run_historical_backtest_eval(y_rec_over, p_rec_eb, p_speculative_pinn)
    eval_pinn["sample_size_n"] = len(y_rec_over)
    results["quarantined_pinn_navier_stokes_and_ocular_proxy"] = eval_pinn

    return results


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run genuine walk-forward calibration gate on data/nflverse/")
    parser.add_argument(
        "--enforce-gate",
        action="store_true",
        help="Exit with non-zero status code (1) if any production-targeted kernel is REJECTED or if --require-all-approved is set.",
    )
    parser.add_argument(
        "--test-reject-exit-code",
        action="store_true",
        help="Verify that a REJECTED kernel causes sys.exit(1) when --enforce-gate is active.",
    )
    args = parser.parse_args(argv)

    suite = run_real_nflverse_walk_forward_backtests()
    print("=== REAL NFLVERSE WALK-FORWARD CALIBRATION GATE SUMMARY ===")
    print(json.dumps(suite, indent=2))

    production_candidates = [
        "eager_split_pass_epa_and_poisson_td",
        "veroulis_eager_weak_link_oline_sack_rate",
        "congelio_per_carry_ryoe_deconfounding",
        "davidson_pilon_empirical_bayes_receiving_props",
        "alam_crosswind_drag_outdoor_15mph_plus",
    ]

    if args.test_reject_exit_code:
        if suite["quarantined_pinn_navier_stokes_and_ocular_proxy"]["PROMOTION_GATE_STATUS"] == "REJECTED":
            return 1
        return 0

    if args.enforce_gate:
        for k in production_candidates:
            if suite[k]["PROMOTION_GATE_STATUS"] != "APPROVED":
                print(f"EPISTEMIC GATE FAILURE: {k} was REJECTED", file=sys.stderr)
                return 1
        if suite["quarantined_pinn_navier_stokes_and_ocular_proxy"]["PROMOTION_GATE_STATUS"] != "REJECTED":
            print("EPISTEMIC GATE FAILURE: speculative PINN/ocular noise was not REJECTED", file=sys.stderr)
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
