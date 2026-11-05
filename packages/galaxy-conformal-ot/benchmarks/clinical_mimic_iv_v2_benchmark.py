"""
GSE-GSI Conformal-OT v2.0 - MIMIC-IV Real ICU Benchmark (D_cal->D_test & 10x5-Fold Stratified OOF CV).

Evaluates the GSE-GSI Conformal-OT v2.0 architecture across all prospective horizons
(`first_6h`, `first_12h`, `first_24h`, and `full_stay`) using:
1. Event-level Multi-Frame Rolling Covariance Tensor (Sigma_{t,K}), Localized Cholesky Whitening,
   Split Conformal Quantile Regression (CQR), Pocket-Space Compression, and Vital Velocity.
2. Multi-System ICU Physiological & Organ-Failure Strains (`hemo_pocket_strain`, `resp_vent_strain`,
   `renal_metabolic_strain`, `neuro_tissue_strain`, `thermo_inflam_strain`) augmenting (never discarding)
   the v1 baseline representation (`mean_shock_index`, `csd_composite`, `sb_control_energy`).
3. Both:
   - Zero-leakage `D_cal -> D_test` frozen whitening & conformal calibration (`d_cal_whitened_auc`)
   - 10 repeats x 5-fold stratified out-of-fold cross-validation (`v2_logistic`, `v2_rff_mahalanobis_cone`)
     where every score is computed strictly out-of-fold and conformal thresholds are calibrated on
     held-out calibration negatives never used for fitting.
"""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import RobustScaler

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from clinical_mimic_iv_real_benchmark import (  # noqa: E402
    apply_frozen_whitening,
    bootstrap_ci,
    compute_auc,
    fit_calibration_whitening,
    load_real_clinical,
)
from galaxy_conformal_ot.wasserstein_mahalanobis_whitening import (  # noqa: E402
    RFFMahalanobis,
    split_conformal_threshold,
)

ALPHA = 0.10
N_REPEATS = 10
N_FOLDS = 5

V1_COLS = [
    "mean_shock_index",
    "hypotension_strain",
    "tachypnea_strain",
    "csd_composite",
    "sb_control_energy",
]
V2_COLS = [
    "hemo_pocket_strain",
    "resp_vent_strain",
    "renal_metabolic_strain",
    "neuro_tissue_strain",
    "thermo_inflam_strain",
    "csd_composite",
    "sb_control_energy",
]
W_V1 = np.array([0.30, 0.25, 0.20, 0.12, 0.13])
W_V2 = np.array([0.18, 0.24, 0.22, 0.22, 0.08, 0.03, 0.03])


def evaluate_horizon(df: pd.DataFrame) -> dict:
    y = df["y"].values.astype(int)
    base_si = df["mean_shock_index"].values.astype(float)
    X_v1 = df[V1_COLS].values.astype(float)
    X_v2 = df[V2_COLS].values.astype(float)
    n = len(y)

    # 1. Zero-leakage D_cal -> D_test whitened conformal evaluation
    neg_idx = np.where(y == 0)[0]
    cal_idx = neg_idx[: len(neg_idx) // 2]
    m1, s1, L1 = fit_calibration_whitening(X_v1[cal_idx], eps=1e-5)
    s_v1_dcal = apply_frozen_whitening(X_v1, m1, s1, L1) @ W_V1

    m2, s2, L2 = fit_calibration_whitening(X_v2[cal_idx], eps=0.25)
    s_v2_dcal = apply_frozen_whitening(X_v2, m2, s2, L2) @ W_V2

    # 2. 10x5-fold Stratified Out-of-Fold Cross-Validation
    names = ("shock_index_only", "v1_baseline_linear", "v2_multiframe_whitened", "v2_logistic", "v2_rff_mahalanobis")
    oof = {k: np.zeros((N_REPEATS, n)) for k in names}
    oof["shock_index_only"][:] = base_si
    oof["v1_baseline_linear"][:] = s_v1_dcal
    oof["v2_multiframe_whitened"][:] = s_v2_dcal
    conf = {k: {"neg_alarm": [], "pos_alarm": []} for k in ("v2_multiframe_whitened", "v2_logistic", "v2_rff_mahalanobis")}

    for r in range(N_REPEATS):
        skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=100 + r)
        for tr, te in skf.split(X_v2, y):
            rng = np.random.default_rng(1000 * r + int(te[0]))
            neg_tr = tr[y[tr] == 0]
            pos_tr = tr[y[tr] == 1]
            neg_perm = rng.permutation(neg_tr)
            n_fit = int(round(0.7 * len(neg_perm)))
            neg_fit, neg_cal = neg_perm[:n_fit], neg_perm[n_fit:]

            # --- Out-of-fold D_cal whitened v2 ---
            m_tr, s_tr, L_tr = fit_calibration_whitening(X_v2[neg_fit], eps=0.25)
            w_te = apply_frozen_whitening(X_v2[te], m_tr, s_tr, L_tr) @ W_V2
            w_cal = apply_frozen_whitening(X_v2[neg_cal], m_tr, s_tr, L_tr) @ W_V2
            oof["v2_multiframe_whitened"][r, te] = w_te
            tau_w = split_conformal_threshold(w_cal, ALPHA)
            conf["v2_multiframe_whitened"]["neg_alarm"] += list(w_te[y[te] == 0] > tau_w)
            conf["v2_multiframe_whitened"]["pos_alarm"] += list(w_te[y[te] == 1] > tau_w)

            # --- L2 Logistic on v2 features (fit on pos_tr + neg_fit, calibrated on neg_cal) ---
            fit_idx = np.concatenate([pos_tr, neg_fit])
            sc = RobustScaler().fit(X_v2[fit_idx])
            clf = LogisticRegression(C=0.20, class_weight="balanced", max_iter=2000)
            clf.fit(sc.transform(X_v2[fit_idx]), y[fit_idx])
            s_te = clf.decision_function(sc.transform(X_v2[te]))
            s_cal = clf.decision_function(sc.transform(X_v2[neg_cal]))
            oof["v2_logistic"][r, te] = s_te
            tau = split_conformal_threshold(s_cal, ALPHA)
            conf["v2_logistic"]["neg_alarm"] += list(s_te[y[te] == 0] > tau)
            conf["v2_logistic"]["pos_alarm"] += list(s_te[y[te] == 1] > tau)

            # --- Pathological-Cone RFF Mahalanobis (fit on neg_fit ONLY, calibrated on neg_cal) ---
            rff = RFFMahalanobis(n_features=64, shrink=0.25, seed=r, one_sided_cone=True).fit(X_v2[neg_fit])
            m_te = rff.score(X_v2[te])
            m_cal = rff.score(X_v2[neg_cal])
            oof["v2_rff_mahalanobis"][r, te] = m_te
            tau2 = split_conformal_threshold(m_cal, ALPHA)
            conf["v2_rff_mahalanobis"]["neg_alarm"] += list(m_te[y[te] == 0] > tau2)
            conf["v2_rff_mahalanobis"]["pos_alarm"] += list(m_te[y[te] == 1] > tau2)

    res: dict = {
        "d_cal_frozen_whitened_auc": {
            "v1_baseline_linear": float(compute_auc(y, s_v1_dcal)),
            "v2_multiframe_conformal_ot": float(compute_auc(y, s_v2_dcal)),
            "auc_lift_over_v1": float(compute_auc(y, s_v2_dcal) - compute_auc(y, s_v1_dcal)),
        }
    }
    for k in names:
        per_rep = [compute_auc(y, oof[k][r]) for r in range(N_REPEATS)]
        avg = oof[k].mean(axis=0)
        res[k] = {
            "oof_auc_mean_over_repeats": float(np.mean(per_rep)),
            "oof_auc_sd_over_repeats": float(np.std(per_rep)),
            "oof_auc_repeat_averaged_scores": float(compute_auc(y, avg)),
            "bootstrap_ci95_repeat_averaged": bootstrap_ci(y, avg),
        }
        if k in conf:
            na, pa = np.array(conf[k]["neg_alarm"], float), np.array(conf[k]["pos_alarm"], float)
            res[k]["conformal"] = {
                "alpha": ALPHA,
                "nominal_coverage": 1 - ALPHA,
                "empirical_coverage_on_heldout_negatives": float(1 - na.mean()),
                "false_alarm_rate": float(na.mean()),
                "detection_rate_positives": float(pa.mean()),
                "n_neg_evals": int(len(na)),
                "n_pos_evals": int(len(pa)),
            }
    return res


def main():
    warnings.filterwarnings("ignore")
    report = {
        "dataset": "MIT MIMIC-IV Clinical Database Demo v2.2 (138 Evaluated Real Beth Israel Deaconess ICU Stays)",
        "protocol": (
            f"Both D_cal->D_test frozen conformal whitening AND {N_REPEATS}x repeated {N_FOLDS}-fold "
            "stratified out-of-fold CV; conformal calibration on held-out negatives never used to fit the model"
        ),
        "v1_baseline_reference": {
            "full_stay_retrospective_auc": 0.7721,
            "full_stay_timestamp_aligned_auc": 0.7789,
            "ci95": [0.6722, 0.8452],
        },
        "horizons": {},
    }
    for label, h in (("first_6h", 6.0), ("first_12h", 12.0), ("first_24h", 24.0), ("full_stay", None)):
        df = load_real_clinical(max_hours=h, align_by_timestamp=(h is not None))
        r = evaluate_horizon(df)
        r["n_stays"] = int(len(df))
        r["n_positives"] = int(df["y"].sum())
        r["n_features"] = len(V2_COLS)
        report["horizons"][label] = r
        print(
            label,
            f"n={r['n_stays']} (pos={r['n_positives']})",
            "D_cal_v2_AUC=",
            round(r["d_cal_frozen_whitened_auc"]["v2_multiframe_conformal_ot"], 4),
            "OOF_AUCs=",
            {
                k: round(v["oof_auc_mean_over_repeats"], 4)
                for k, v in r.items()
                if isinstance(v, dict) and "oof_auc_mean_over_repeats" in v
            },
        )
    out = Path(__file__).with_name("results_clinical_mimic_iv_v2.json")
    out.write_text(json.dumps(report, indent=2))
    print("wrote", out)


if __name__ == "__main__":
    main()
