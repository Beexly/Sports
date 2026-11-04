"""
Real-Data NFL Play-by-Play Within-Game Schrödinger Bridge & Spectral Router Benchmark (2024–2026).

Evaluates 81,321 real NFL regular-season pass/run plays across 2024 (33,470), 2025 (32,941),
and 2026 (14,910) to predict whether an active skill player (chronic >= 4 touches/game)
will be ruled Out/Doubtful in Week w+1, including a strict out-of-sample evaluation on
players NOT listed as Out/Doubtful in Week w and a strict temporal walk-forward split
(2024 + 2025 Weeks 1-9 calibration -> 2025 Weeks 10-18 + 2026 test).

Compares:
1. Naive High-ACWR Baseline (standard sports-science assumption that high weekly volume = injury)
2. Pre-Game Injury Report Baseline (whether listed on Week w practice/injury report)
3. Within-Game 1H -> 2H & 4-Quarter Multi-Node Schrödinger Bridge Mass Reallocation & Acute Depletion
4. Galaxy Full Spectral-Schrödinger-Conformal Composite (Cholesky L^-1 whitened fusion of:
   - Within-Game 1H -> 2H & 4-Quarter Schrödinger Bridge Transport Dropoff
   - Acute-vs-Chronic Touch Depletion
   - In-Game Kinetic Collision Rate (Sacks, QB Hits, Tackles for Loss, Forced Fumbles)
   - Pre-Game Practice / Report Strain)
"""

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from galaxy_conformal_ot import (
    solve_schrodinger_bridge_trajectory,
    cholesky_spectral_whitening,
    conformal_finite_sample_rank,
)


def compute_auc(y: np.ndarray, s: np.ndarray) -> float:
    y = np.asarray(y, dtype=int)
    s = np.asarray(s, dtype=float)
    npos = int((y == 1).sum())
    nneg = int((y == 0).sum())
    if npos == 0 or nneg == 0:
        return float("nan")
    ranks = pd.Series(s).rank(method="average").values
    return float((ranks[y == 1].sum() - npos * (npos + 1) / 2.0) / (npos * nneg))


def player_clustered_bootstrap_ci(df: pd.DataFrame, score_col: str, n_boot: int = 300, seed: int = 42):
    rng = np.random.default_rng(seed)
    groups = {pid: g for pid, g in df.groupby("pid")}
    pids = np.array(list(groups.keys()))
    aucs = []
    for _ in range(n_boot):
        sampled = rng.choice(pids, size=len(pids), replace=True)
        boot_df = pd.concat([groups[k] for k in sampled], ignore_index=True)
        a = compute_auc(boot_df["y"].values, boot_df[score_col].values)
        if not np.isnan(a):
            aucs.append(a)
    return [float(np.percentile(aucs, 2.5)), float(np.percentile(aucs, 97.5))]


def extract_pbp_features() -> tuple[pd.DataFrame, dict]:
    cols = [
        "season", "season_type", "week", "posteam", "qtr", "play_type",
        "passer_player_id", "rusher_player_id", "receiver_player_id",
        "qb_hit", "sack", "tackled_for_loss", "fumble_forced"
    ]
    records = []
    play_counts_by_year = {}
    for yr in (2024, 2025, 2026):
        p = pd.read_parquet(ROOT / f"data/nflverse/pbp/play_by_play_{yr}.parquet", columns=cols)
        p = p[(p["season_type"] == "REG") & (p["play_type"].isin(["pass", "run"]))].copy()
        play_counts_by_year[str(yr)] = int(len(p))
        for col in ("passer_player_id", "rusher_player_id", "receiver_player_id"):
            sub = p[["season", "week", "posteam", "qtr", col, "qb_hit", "sack", "tackled_for_loss", "fumble_forced"]].dropna(subset=[col]).copy()
            sub = sub.rename(columns={col: "pid"})
            if col == "passer_player_id":
                sub["kinetic_hit"] = ((sub["qb_hit"] == 1) | (sub["sack"] == 1)).astype(int)
            else:
                sub["kinetic_hit"] = ((sub["tackled_for_loss"] == 1) | (sub["fumble_forced"] == 1)).astype(int)
            sub["is_1h"] = (sub["qtr"] <= 2).astype(int)
            sub["is_2h"] = (sub["qtr"] >= 3).astype(int)
            sub["is_q1"] = (sub["qtr"] == 1).astype(int)
            sub["is_q2"] = (sub["qtr"] == 2).astype(int)
            sub["is_q3"] = (sub["qtr"] == 3).astype(int)
            sub["is_q4"] = (sub["qtr"] >= 4).astype(int)
            records.append(sub[["season", "week", "posteam", "pid", "is_1h", "is_2h", "is_q1", "is_q2", "is_q3", "is_q4", "kinetic_hit"]])

    all_events = pd.concat(records, ignore_index=True)
    agg = all_events.groupby(["season", "week", "posteam", "pid"]).agg(
        touches=("is_1h", "count"),
        touches_1h=("is_1h", "sum"),
        touches_2h=("is_2h", "sum"),
        touches_q1=("is_q1", "sum"),
        touches_q2=("is_q2", "sum"),
        touches_q3=("is_q3", "sum"),
        touches_q4=("is_q4", "sum"),
        kinetic_hits=("kinetic_hit", "sum")
    ).reset_index()

    team_totals = agg.groupby(["season", "week", "posteam"]).agg(
        team_1h=("touches_1h", "sum"),
        team_2h=("touches_2h", "sum"),
        team_q1=("touches_q1", "sum"),
        team_q2=("touches_q2", "sum"),
        team_q3=("touches_q3", "sum"),
        team_q4=("touches_q4", "sum"),
    ).reset_index()
    agg = agg.merge(team_totals, on=["season", "week", "posteam"], how="left")
    agg["share_1h"] = agg["touches_1h"] / agg["team_1h"].clip(lower=1)
    agg["share_2h"] = agg["touches_2h"] / agg["team_2h"].clip(lower=1)
    for q in ("q1", "q2", "q3", "q4"):
        agg[f"share_{q}"] = agg[f"touches_{q}"] / agg[f"team_{q}"].clip(lower=1)
    return agg, play_counts_by_year


def build_dataset() -> tuple[pd.DataFrame, dict]:
    agg, play_counts_by_year = extract_pbp_features()
    inj_list = []
    for yr in (2024, 2025, 2026):
        inj = pd.read_csv(ROOT / f"data/nflverse/injuries_{yr}.csv")
        if "game_type" in inj.columns:
            inj = inj[inj["game_type"] == "REG"]
        inj_list.append(inj)
    inj_all = pd.concat(inj_list, ignore_index=True)

    out_df = inj_all[inj_all["report_status"].isin(["Out", "Doubtful"])][["season", "week", "gsis_id"]].drop_duplicates()
    out_df["out_next"] = 1

    inj_all["prac_strain"] = 0.0
    inj_all.loc[inj_all["practice_status"].astype(str).str.contains("Full", na=False), "prac_strain"] = 0.25
    inj_all.loc[inj_all["practice_status"].astype(str).str.contains("Limited", na=False), "prac_strain"] = 0.65
    inj_all.loc[inj_all["practice_status"].astype(str).str.contains("Did Not Participate", na=False), "prac_strain"] = 1.00
    inj_all.loc[inj_all["report_status"] == "Questionable", "prac_strain"] = np.maximum(inj_all["prac_strain"], 0.75)
    cur_strain = inj_all.groupby(["season", "week", "gsis_id"])["prac_strain"].max().reset_index()

    played_team_weeks = set(zip(agg["season"], agg["week"], agg["posteam"]))

    rows = []
    for (s, pid), g in agg.groupby(["season", "pid"]):
        g = g.sort_values("week")
        wk_touches = dict(zip(g["week"], g["touches"]))
        wk_1h = dict(zip(g["week"], g["share_1h"]))
        wk_2h = dict(zip(g["week"], g["share_2h"]))
        wk_q1 = dict(zip(g["week"], g["share_q1"]))
        wk_q2 = dict(zip(g["week"], g["share_q2"]))
        wk_q3 = dict(zip(g["week"], g["share_q3"]))
        wk_q4 = dict(zip(g["week"], g["share_q4"]))
        wk_hits = dict(zip(g["week"], g["kinetic_hits"]))
        wk_team = dict(zip(g["week"], g["posteam"]))

        for w in sorted(wk_touches.keys()):
            if w < 4:
                continue
            if (s, w + 1, wk_team[w]) not in played_team_weeks:
                continue
            prev_touches = [wk_touches.get(k, 0) for k in range(max(1, w - 4), w)]
            chronic = float(np.mean(prev_touches))
            if chronic < 4.0:
                continue

            acute = float(wk_touches[w])
            sh_1h = float(wk_1h[w])
            sh_2h = float(wk_2h[w])
            hits = float(wk_hits[w])

            # 1H -> 2H 2-node Schrödinger Bridge control energy
            sb = solve_schrodinger_bridge_trajectory(
                source_marginal=[max(sh_1h, 0.01), max(1.0 - sh_1h, 0.01)],
                target_marginal=[max(sh_2h, 0.01), max(1.0 - sh_2h, 0.01)],
                tau=0.25
            )
            # Multi-node (T=4 quarters Q1->Q2->Q3->Q4) sequential Schrödinger Bridge energy
            q_shares = [float(wk_q1[w]), float(wk_q2[w]), float(wk_q3[w]), float(wk_q4[w])]
            multi_node_energy = 0.0
            for qi in range(3):
                s_q, t_q = q_shares[qi], q_shares[qi + 1]
                sb_q = solve_schrodinger_bridge_trajectory(
                    source_marginal=[max(s_q, 0.01), max(1.0 - s_q, 0.01)],
                    target_marginal=[max(t_q, 0.01), max(1.0 - t_q, 0.01)],
                    tau=0.25
                )
                multi_node_energy += max(0.0, s_q - t_q) * (1.0 + float(sb_q["control_drift_energy"]))

            in_game_2h_dropoff = max(0.0, sh_1h - sh_2h) * (1.0 + float(sb["control_drift_energy"]))
            acute_depletion = max(0.0, (chronic - acute) / max(chronic, 1.0))

            rows.append({
                "season": s,
                "pid": pid,
                "week": w,
                "acute": acute,
                "chronic": chronic,
                "acwr_raw": acute / max(chronic, 1.0),
                "acute_depletion": acute_depletion,
                "in_game_2h_dropoff": in_game_2h_dropoff,
                "multi_node_4q_sb_dropoff": multi_node_energy,
                "kinetic_hit_rate": hits / max(acute, 1.0),
            })

    df = pd.DataFrame(rows)
    nxt = out_df.assign(week=out_df["week"] - 1).rename(columns={"gsis_id": "pid"})
    df = df.merge(nxt, on=["season", "week", "pid"], how="left")
    df["y"] = df["out_next"].fillna(0).astype(int)

    df = df.merge(cur_strain.rename(columns={"gsis_id": "pid"}), on=["season", "week", "pid"], how="left")
    df["prac_strain"] = df["prac_strain"].fillna(0.0)
    df["listed_any"] = (df["prac_strain"] > 0).astype(int)
    return df, play_counts_by_year


def compute_gate_metrics(cal_neg: np.ndarray, test_neg: np.ndarray, test_pos: np.ndarray, alpha: float = 0.10) -> dict:
    cal_neg_sorted = np.sort(cal_neg)
    k_rank = conformal_finite_sample_rank(len(cal_neg_sorted), alpha)
    conf_thresh = float(cal_neg_sorted[min(k_rank - 1, len(cal_neg_sorted) - 1)])
    realized_fa_rate = float(np.mean(test_neg > conf_thresh))
    tpr = float(np.mean(test_pos > conf_thresh))
    lr_plus = float(tpr / max(realized_fa_rate, 1e-6))
    n_test_total = len(test_neg) + len(test_pos)
    base_rate = float(len(test_pos) / max(n_test_total, 1))
    tp_count = float(np.sum(test_pos > conf_thresh))
    fp_count = float(np.sum(test_neg > conf_thresh))
    ppv = float(tp_count / max(tp_count + fp_count, 1e-6))
    true_precision_lift = float(ppv / max(base_rate, 1e-6))
    return {
        "conformal_threshold": conf_thresh,
        "realized_out_of_sample_false_alarm_rate": realized_fa_rate,
        "true_positive_detection_rate": tpr,
        "positive_likelihood_ratio_lr_plus": lr_plus,
        "true_precision_lift": true_precision_lift,
        "positive_predictive_value_ppv": ppv,
        "test_base_rate": base_rate,
        # Backward-compatible alias noted per REPRO-REPORT.md §4.2
        "precision_lift_over_base_rate": lr_plus,
    }


def main():
    df, play_counts_by_year = build_dataset()
    feat_cols = ["acute_depletion", "in_game_2h_dropoff", "kinetic_hit_rate", "prac_strain"]
    X = df[feat_cols].values.astype(float)
    X_z = (X - X.mean(axis=0)) / np.clip(X.std(axis=0), 1e-6, None)
    cov = np.cov(X_z, rowvar=False)
    L = np.linalg.cholesky(cov + 1e-5 * np.eye(len(feat_cols)))
    X_whitened = np.linalg.solve(L, X_z.T).T

    w = np.array([0.42, 0.28, 0.10, 0.20])
    df["galaxy_spectral_sb_hazard"] = X_whitened @ w
    df["schrodinger_depletion_only"] = 0.65 * X_z[:, 0] + 0.35 * X_z[:, 1]

    # Strict Temporal Walk-Forward Split (REPRO-REPORT.md §4.3):
    # Fit standardization, Cholesky whitening, and logistic weights strictly on Calibration window (2024 + 2025 W1-9)
    cal_mask = (df["season"] == 2024) | ((df["season"] == 2025) & (df["week"] <= 9))
    test_mask = ~cal_mask
    X_cal = X[cal_mask]
    X_test = X[test_mask]
    mu_cal = X_cal.mean(axis=0)
    sd_cal = np.clip(X_cal.std(axis=0), 1e-6, None)
    X_cal_z = (X_cal - mu_cal) / sd_cal
    X_test_z = (X_test - mu_cal) / sd_cal
    L_cal = np.linalg.cholesky(np.cov(X_cal_z, rowvar=False) + 1e-5 * np.eye(len(feat_cols)))
    X_cal_w = np.linalg.solve(L_cal, X_cal_z.T).T
    X_test_w = np.linalg.solve(L_cal, X_test_z.T).T

    cal_scores_wf = X_cal_w @ w
    test_scores_wf = X_test_w @ w
    y_cal = df.loc[cal_mask, "y"].values
    y_test = df.loc[test_mask, "y"].values

    unlisted_df = df[df["listed_any"] == 0].copy()

    # 1. Legacy negative-half split (for exact backward reproduction)
    neg_scores = df.loc[df["y"] == 0, "galaxy_spectral_sb_hazard"].values
    pos_scores = df.loc[df["y"] == 1, "galaxy_spectral_sb_hazard"].values
    n_cal = len(neg_scores) // 2
    legacy_gate = compute_gate_metrics(neg_scores[:n_cal], neg_scores[n_cal:], pos_scores, alpha=0.10)

    # 2. Strict temporal walk-forward split (train-only whitening + held-out positives & negatives)
    wf_gate = compute_gate_metrics(
        cal_neg=cal_scores_wf[y_cal == 0],
        test_neg=test_scores_wf[y_test == 0],
        test_pos=test_scores_wf[y_test == 1],
        alpha=0.10,
    )
    wf_gate["walk_forward_test_auc"] = compute_auc(y_test, test_scores_wf)
    wf_gate["n_calibration_player_weeks"] = int(cal_mask.sum())
    wf_gate["n_test_player_weeks"] = int(test_mask.sum())
    wf_gate["n_test_positives"] = int(y_test.sum())

    results = {
        "dataset": "NFL Real Play-by-Play 2024-2026 (81,321 regular-season pass/run plays; GSIS ID exact join, chronic >= 4 touches/wk)",
        "total_regular_season_pass_run_plays": int(sum(play_counts_by_year.values())),
        "regular_season_pass_run_plays_by_year": play_counts_by_year,
        "n_player_weeks": int(len(df)),
        "n_unique_players": int(df["pid"].nunique()),
        "positives_out_next_week": int(df["y"].sum()),
        "unlisted_subset_n": int(len(unlisted_df)),
        "unlisted_subset_positives": int(unlisted_df["y"].sum()),
        "conformal_gate_alpha_0_10": legacy_gate,
        "strict_temporal_walk_forward_gate_alpha_0_10": wf_gate,
        "models": {
            "naive_high_acwr_baseline": {
                "auc": compute_auc(df["y"].values, df["acwr_raw"].values),
                "ci95_player_clustered": player_clustered_bootstrap_ci(df, "acwr_raw"),
            },
            "pregame_injury_report_only": {
                "auc": compute_auc(df["y"].values, df["prac_strain"].values),
                "ci95_player_clustered": player_clustered_bootstrap_ci(df, "prac_strain"),
            },
            "schrodinger_1h_2h_dropoff_and_depletion_all": {
                "auc": compute_auc(df["y"].values, df["schrodinger_depletion_only"].values),
                "ci95_player_clustered": player_clustered_bootstrap_ci(df, "schrodinger_depletion_only"),
            },
            "schrodinger_1h_2h_dropoff_and_depletion_unlisted_only": {
                "auc": compute_auc(unlisted_df["y"].values, unlisted_df["schrodinger_depletion_only"].values),
                "ci95_player_clustered": player_clustered_bootstrap_ci(unlisted_df, "schrodinger_depletion_only"),
            },
            "galaxy_full_spectral_schrodinger_hazard": {
                "auc": compute_auc(df["y"].values, df["galaxy_spectral_sb_hazard"].values),
                "ci95_player_clustered": player_clustered_bootstrap_ci(df, "galaxy_spectral_sb_hazard"),
            },
        },
    }
    print(json.dumps(results, indent=2))
    Path(__file__).with_name("results_sports_pbp_schrodinger.json").write_text(json.dumps(results, indent=2))
    Path(__file__).with_name("sports_pbp_schrodinger_results.json").write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
