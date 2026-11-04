"""
Real-Data Clinical ICU Benchmark on Open-Access MIT MIMIC-IV v2.2 (140 Real ICU Stays).

Evaluates galaxy_conformal_ot on real de-identified Beth Israel Deaconess Medical Center
ICU patient physiological streams (icu/chartevents.csv.gz, icu/icustays.csv.gz,
hosp/admissions.csv.gz, hosp/diagnoses_icd.csv.gz).

Target Endpoint (y = 1): Severe Clinical Decompensation (Sepsis / Septic Shock ICD-9/10
diagnosis OR In-Hospital ICU Mortality / prolonged critical stay).

Compares:
1. Standard Bedside Threshold Baseline (Shock Index HR/SBP > 0.90 or Tachypnea RR > 24)
2. Vital-Sign Critical Slowing Down (CSD) on continuous bedside chartevents
3. Multi-Organ Schrödinger Bridge Control Energy + Cholesky Whitened Composite Hazard
   wrapped in the Finite-Sample Conformal False-Alarm Gate (alpha = 0.15).
"""

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data" / "mimic_iv_demo"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from galaxy_conformal_ot import (
    compute_critical_slowing_down_index,
    solve_schrodinger_bridge_trajectory,
    conformal_finite_sample_rank,
)

# Standard MIMIC-IV MetaVision Vital Sign ItemIDs
ITEM_HR = {220045}
ITEM_SBP = {220050, 220179}
ITEM_MAP = {220052, 220181}
ITEM_RR = {220210}
ITEM_SPO2 = {220277}
ALL_VITAL_ITEMS = ITEM_HR | ITEM_SBP | ITEM_MAP | ITEM_RR | ITEM_SPO2


def compute_auc(y: np.ndarray, s: np.ndarray) -> float:
    y = np.asarray(y, dtype=int)
    s = np.asarray(s, dtype=float)
    npos = int((y == 1).sum())
    nneg = int((y == 0).sum())
    if npos == 0 or nneg == 0:
        return float("nan")
    ranks = pd.Series(s).rank(method="average").values
    return float((ranks[y == 1].sum() - npos * (npos + 1) / 2.0) / (npos * nneg))


def bootstrap_ci(y: np.ndarray, s: np.ndarray, n_boot: int = 500, seed: int = 42):
    rng = np.random.default_rng(seed)
    y = np.asarray(y, dtype=int)
    s = np.asarray(s, dtype=float)
    aucs = []
    for _ in range(n_boot):
        idx = rng.integers(0, len(y), size=len(y))
        a = compute_auc(y[idx], s[idx])
        if not np.isnan(a):
            aucs.append(a)
    return [float(np.percentile(aucs, 2.5)), float(np.percentile(aucs, 97.5))]


def load_real_clinical():
    icustays = pd.read_csv(DATA_DIR / "icu_icustays.csv.gz")
    admissions = pd.read_csv(DATA_DIR / "hosp_admissions.csv.gz")
    diagnoses = pd.read_csv(DATA_DIR / "hosp_diagnoses_icd.csv.gz")

    # Identify Sepsis / Septic Shock / Severe Shock ICD-9 & ICD-10 codes
    diag_codes = diagnoses["icd_code"].astype(str).str.upper()
    sepsis_mask = (
        diag_codes.str.startswith("A40")
        | diag_codes.str.startswith("A41")
        | diag_codes.str.startswith("R652")
        | diag_codes.str.startswith("99591")
        | diag_codes.str.startswith("99592")
        | diag_codes.str.startswith("78552")
    )
    sepsis_hadms = set(diagnoses.loc[sepsis_mask, "hadm_id"].unique())
    expired_hadms = set(admissions.loc[admissions["hospital_expire_flag"] == 1, "hadm_id"].unique())

    ce = pd.read_csv(
        DATA_DIR / "icu_chartevents.csv.gz",
        usecols=["stay_id", "charttime", "itemid", "valuenum"]
    )
    ce = ce[ce["itemid"].isin(ALL_VITAL_ITEMS) & ce["valuenum"].notna()].copy()
    ce["charttime"] = pd.to_datetime(ce["charttime"])

    rows = []
    for stay_id, g in ce.groupby("stay_id"):
        g = g.sort_values("charttime")
        hr = g.loc[g["itemid"].isin(ITEM_HR), "valuenum"].values
        sbp = g.loc[g["itemid"].isin(ITEM_SBP), "valuenum"].values
        map_v = g.loc[g["itemid"].isin(ITEM_MAP), "valuenum"].values
        rr = g.loc[g["itemid"].isin(ITEM_RR), "valuenum"].values
        spo2 = g.loc[g["itemid"].isin(ITEM_SPO2), "valuenum"].values

        if len(hr) < 6 or len(sbp) < 4 or len(rr) < 4:
            continue

        stay_row = icustays[icustays["stay_id"] == stay_id].iloc[0]
        hadm_id = int(stay_row["hadm_id"])
        is_sepsis_or_mortality = int((hadm_id in sepsis_hadms) or (hadm_id in expired_hadms))

        # 1. Shock index & vital strain
        n_pair = min(len(hr), len(sbp))
        shock_idx_series = hr[:n_pair] / np.clip(sbp[:n_pair], 40.0, None)
        max_shock_index = float(np.percentile(shock_idx_series, 90))
        mean_shock_index = float(np.mean(shock_idx_series))
        rr_p90 = float(np.percentile(rr, 90))
        map_p10 = float(np.percentile(map_v, 10)) if len(map_v) >= 3 else float(np.percentile(sbp, 10) * 0.7)
        spo2_drop = float(max(0.0, 100.0 - np.percentile(spo2, 10))) if len(spo2) >= 3 else 2.0

        # 2. High-frequency Critical Slowing Down (CSD) on continuous HR & RR series
        csd_hr = compute_critical_slowing_down_index(hr, baseline_variance=100.0)
        csd_rr = compute_critical_slowing_down_index(rr, baseline_variance=12.0)
        csd_composite = 0.55 * csd_hr["csd_bifurcation_score"] + 0.45 * csd_rr["csd_bifurcation_score"]

        # 3. 4-Axis Physiological Network Schrödinger Bridge (Cardiovascular HR, Hemodynamic Hypotension, Respiratory RR, Hypoxia SpO2)
        # Compare early window (first third of stay) vs stressed window (peak third)
        k_hr = max(2, len(hr) // 3)
        k_sbp = max(2, len(sbp) // 3)
        k_rr = max(2, len(rr) // 3)
        early_strain = np.array([
            max(0.01, float(np.mean(hr[:k_hr])) - 60.0) / 60.0,
            max(0.01, 120.0 - float(np.mean(sbp[:k_sbp]))) / 50.0,
            max(0.01, float(np.mean(rr[:k_rr])) - 12.0) / 15.0,
            max(0.01, spo2_drop / 10.0),
        ])
        peak_strain = np.array([
            max(0.01, float(np.percentile(hr, 85)) - 60.0) / 60.0,
            max(0.01, 120.0 - float(np.percentile(sbp, 15))) / 50.0,
            max(0.01, rr_p90 - 12.0) / 15.0,
            max(0.01, spo2_drop / 5.0),
        ])
        sb = solve_schrodinger_bridge_trajectory(early_strain, peak_strain, tau=0.30)

        rows.append({
            "stay_id": int(stay_id),
            "hadm_id": hadm_id,
            "y": is_sepsis_or_mortality,
            "n_vital_events": int(len(g)),
            "mean_shock_index": mean_shock_index,
            "max_shock_index": max_shock_index,
            "hypotension_strain": max(0.0, 75.0 - map_p10),
            "tachypnea_strain": max(0.0, rr_p90 - 18.0),
            "csd_composite": csd_composite,
            "sb_control_energy": float(sb["control_drift_energy"]),
            "naive_sirs_alarm": int((max_shock_index > 0.90) or (rr_p90 > 24.0)),
        })

    return pd.DataFrame(rows)


def main():
    df = load_real_clinical()
    feat_cols = ["mean_shock_index", "hypotension_strain", "tachypnea_strain", "csd_composite", "sb_control_energy"]
    X = df[feat_cols].values.astype(float)
    X_z = (X - X.mean(axis=0)) / np.clip(X.std(axis=0), 1e-6, None)
    cov = np.cov(X_z, rowvar=False)
    L = np.linalg.cholesky(cov + 1e-5 * np.eye(len(feat_cols)))
    X_whitened = np.linalg.solve(L, X_z.T).T

    w = np.array([0.30, 0.25, 0.20, 0.12, 0.13])
    df["galaxy_clinical_hazard"] = X_whitened @ w

    # Compare Naive Bedside Alarm vs Conformal-Gated Galaxy Hazard (split calibration on negative ICU stays)
    neg_df = df[df["y"] == 0]
    pos_df = df[df["y"] == 1]
    naive_fa_rate = float(neg_df["naive_sirs_alarm"].mean())
    naive_tpr = float(pos_df["naive_sirs_alarm"].mean())

    neg_scores = neg_df["galaxy_clinical_hazard"].values
    pos_scores = pos_df["galaxy_clinical_hazard"].values
    n_cal = len(neg_scores) // 2
    cal_neg = np.sort(neg_scores[:n_cal])
    test_neg = neg_scores[n_cal:]
    k_rank = conformal_finite_sample_rank(len(cal_neg), 0.15)
    conf_thresh = float(cal_neg[min(k_rank - 1, len(cal_neg) - 1)])

    galaxy_fa_rate = float(np.mean(test_neg > conf_thresh))
    galaxy_tpr = float(np.mean(pos_scores > conf_thresh))
    false_alarm_reduction_pct = float((naive_fa_rate - galaxy_fa_rate) / max(naive_fa_rate, 1e-6) * 100.0)

    res = {
        "dataset": "MIT MIMIC-IV Clinical Database Demo v2.2 (Real Beth Israel Deaconess ICU Stays)",
        "n_icu_stays_evaluated": int(len(df)),
        "total_bedside_vital_measurements": int(df["n_vital_events"].sum()),
        "positives_sepsis_or_mortality": int(df["y"].sum()),
        "alarm_fatigue_comparison": {
            "naive_bedside_sirs_shock_false_alarm_rate": naive_fa_rate,
            "naive_bedside_sirs_shock_detection_rate": naive_tpr,
            "galaxy_conformal_false_alarm_rate": galaxy_fa_rate,
            "galaxy_conformal_detection_rate": galaxy_tpr,
            "relative_false_alarm_reduction_pct": false_alarm_reduction_pct,
        },
        "models": {
            "shock_index_only": {
                "auc": compute_auc(df["y"].values, df["mean_shock_index"].values),
                "ci95": bootstrap_ci(df["y"].values, df["mean_shock_index"].values),
            },
            "galaxy_spectral_schrodinger_conformal_icu": {
                "auc": compute_auc(df["y"].values, df["galaxy_clinical_hazard"].values),
                "ci95": bootstrap_ci(df["y"].values, df["galaxy_clinical_hazard"].values),
            },
        },
    }
    print(json.dumps(res, indent=2))
    Path(__file__).with_name("results_clinical_mimic_iv_real.json").write_text(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
