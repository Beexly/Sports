"""
GSE-GSI Conformal-OT v2.0 - MIMIC-IV demo benchmark (out-of-sample, repeated stratified CV).

Compares against the v1 hand-weighted baseline (0.7721 full-stay retrospective AUC) WITHOUT tuning to any
target number. Protocol:

* Features: causal multi-frame rolling-covariance / localized-Mahalanobis / velocity features per stay,
  computed only from charting <= the horizon (6h / 12h / 24h / full stay).
* Models, all scored OUT-OF-FOLD (never on data they were fit on), 10 repeats x 5-fold stratified:
    - shock_index_only     (anchor; no fitting)
    - v2_logistic          (L2 logistic on v2 features, scaler fit on train fold only)
    - v2_rff_mahalanobis   (non-linear kernel Mahalanobis fit on train-fold NEGATIVES only; unsupervised
                            wrt positives)
* Conformal: within each outer-train fold, negatives are split 70/30 into fit/calibration, so the
  threshold is calibrated on data the model never saw; coverage is measured on held-out test negatives.

Label caveat (inherited from v1, not fixed here): y = sepsis ICD code OR in-hospital death for the whole
admission; ICD codes are assigned after the fact. Prospective horizons truncate the FEATURES, not the label.
n = 138 stays / 38 positives from the public MIMIC-IV demo -> wide CIs; this is a pilot, not validation.
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
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data" / "mimic_iv_demo"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from galaxy_conformal_ot.wasserstein_mahalanobis_whitening import (  # noqa: E402
    RFFMahalanobis,
    hourly_state_matrix,
    multi_frame_features,
    split_conformal_threshold,
)

ITEMS = {
    "hr": {220045},
    "sbp": {220050, 220179},
    "dbp": {220051, 220180},
    "map": {220052, 220181},
    "rr": {220210},
    "spo2": {220277},
}
ALL_ITEMS = set().union(*ITEMS.values())
ALPHA = 0.10
N_REPEATS = 10
N_FOLDS = 5


def auc(y, s) -> float:
    y = np.asarray(y, int)
    s = np.asarray(s, float)
    npos, nneg = int((y == 1).sum()), int((y == 0).sum())
    if npos == 0 or nneg == 0:
        return float("nan")
    r = pd.Series(s).rank(method="average").values
    return float((r[y == 1].sum() - npos * (npos + 1) / 2.0) / (npos * nneg))


def boot_ci(y, s, n=1000, seed=7):
    rng = np.random.default_rng(seed)
    y, s = np.asarray(y), np.asarray(s)
    vals = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        a = auc(y[i], s[i])
        if not np.isnan(a):
            vals.append(a)
    return [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))]


def load_stays():
    stays = pd.read_csv(DATA_DIR / "icu_icustays.csv.gz", parse_dates=["intime"])
    adm = pd.read_csv(DATA_DIR / "hosp_admissions.csv.gz")
    dx = pd.read_csv(DATA_DIR / "hosp_diagnoses_icd.csv.gz")
    code = dx["icd_code"].astype(str).str.upper()
    sep = (
        code.str.startswith(("A40", "A41", "R652", "99591", "99592", "78552"))
    )
    sepsis = set(dx.loc[sep, "hadm_id"].unique())
    dead = set(adm.loc[adm["hospital_expire_flag"] == 1, "hadm_id"].unique())
    ce = pd.read_csv(DATA_DIR / "icu_chartevents.csv.gz", usecols=["stay_id", "charttime", "itemid", "valuenum"])
    ce = ce[ce["itemid"].isin(ALL_ITEMS) & ce["valuenum"].notna()].copy()
    ce["charttime"] = pd.to_datetime(ce["charttime"])
    out = []
    intime = dict(zip(stays["stay_id"], stays["intime"]))
    hadm = dict(zip(stays["stay_id"], stays["hadm_id"]))
    for sid, g in ce.groupby("stay_id"):
        if sid not in intime:
            continue
        obs = {}
        for name, ids in ITEMS.items():
            gg = g[g["itemid"].isin(ids)].sort_values("charttime")
            obs[name] = (gg["charttime"].values.astype("datetime64[ns]"), gg["valuenum"].values.astype(float))
        h = int(hadm[sid])
        out.append({"stay_id": int(sid), "y": int(h in sepsis or h in dead),
                    "t0": np.datetime64(intime[sid], "ns"), "obs": obs})
    return out


def build_matrix(stays, horizon):
    rows, ys, ids, base = [], [], [], []
    for s in stays:
        M = hourly_state_matrix(s["obs"], s["t0"], horizon)
        if len(M) < 3:
            continue
        f = multi_frame_features(M)
        rows.append(f)
        ys.append(s["y"])
        ids.append(s["stay_id"])
        base.append(float(np.mean(M[:, 0] / np.clip(M[:, 1], 40.0, None))))
    X = pd.DataFrame(rows).fillna(0.0)
    return X, np.array(ys), np.array(ids), np.array(base)


def cv_evaluate(X: pd.DataFrame, y: np.ndarray, base: np.ndarray) -> dict:
    Xv = X.values.astype(float)
    n = len(y)
    names = ("shock_index_only", "v2_logistic", "v2_rff_mahalanobis")
    oof = {k: np.zeros((N_REPEATS, n)) for k in names}
    oof["shock_index_only"][:] = base
    conf = {k: {"neg_alarm": [], "pos_alarm": []} for k in names if k != "shock_index_only"}
    for r in range(N_REPEATS):
        skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=100 + r)
        for tr, te in skf.split(Xv, y):
            rng = np.random.default_rng(1000 * r + int(te[0]))
            neg_tr = tr[y[tr] == 0]
            pos_tr = tr[y[tr] == 1]
            neg_perm = rng.permutation(neg_tr)
            n_fit = int(round(0.7 * len(neg_perm)))
            neg_fit, neg_cal = neg_perm[:n_fit], neg_perm[n_fit:]

            # --- logistic: fit on pos_tr + neg_fit, calibrate on neg_cal ---
            fit_idx = np.concatenate([pos_tr, neg_fit])
            sc = StandardScaler().fit(Xv[fit_idx])
            clf = LogisticRegression(C=0.05, class_weight="balanced", max_iter=2000)
            clf.fit(sc.transform(Xv[fit_idx]), y[fit_idx])
            s_te = clf.decision_function(sc.transform(Xv[te]))
            s_cal = clf.decision_function(sc.transform(Xv[neg_cal]))
            oof["v2_logistic"][r, te] = s_te
            tau = split_conformal_threshold(s_cal, ALPHA)
            conf["v2_logistic"]["neg_alarm"] += list(s_te[y[te] == 0] > tau)
            conf["v2_logistic"]["pos_alarm"] += list(s_te[y[te] == 1] > tau)

            # --- RFF Mahalanobis: fit on negatives only (neg_fit), calibrate on neg_cal ---
            sc2 = StandardScaler().fit(Xv[neg_fit])
            rff = RFFMahalanobis(n_features=32, shrink=0.25, seed=r).fit(sc2.transform(Xv[neg_fit]))
            m_te = rff.score(sc2.transform(Xv[te]))
            m_cal = rff.score(sc2.transform(Xv[neg_cal]))
            oof["v2_rff_mahalanobis"][r, te] = m_te
            tau2 = split_conformal_threshold(m_cal, ALPHA)
            conf["v2_rff_mahalanobis"]["neg_alarm"] += list(m_te[y[te] == 0] > tau2)
            conf["v2_rff_mahalanobis"]["pos_alarm"] += list(m_te[y[te] == 1] > tau2)

    res = {}
    for k in names:
        per_rep = [auc(y, oof[k][r]) for r in range(N_REPEATS)]
        avg = oof[k].mean(axis=0)
        res[k] = {
            "oof_auc_mean_over_repeats": float(np.mean(per_rep)),
            "oof_auc_sd_over_repeats": float(np.std(per_rep)),
            "oof_auc_repeat_averaged_scores": auc(y, avg),
            "bootstrap_ci95_repeat_averaged": boot_ci(y, avg),
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
    stays = load_stays()
    report = {
        "dataset": "MIMIC-IV Clinical Database Demo v2.2 (public demo; n small)",
        "protocol": f"{N_REPEATS}x repeated {N_FOLDS}-fold stratified CV, all scores out-of-fold; "
                    "conformal calibration on held-out negatives never used to fit the model",
        "label": "sepsis ICD OR in-hospital death (whole admission; ICD assigned post hoc) - inherited from v1",
        "v1_baseline_reference": {"full_stay_retrospective_auc": 0.7721, "ci95": [0.6722, 0.8452],
                                  "note": "v1 hand weights, scored on its own 138-stay cohort, not CV"},
        "horizons": {},
    }
    for label, h in (("first_6h", 6.0), ("first_12h", 12.0), ("first_24h", 24.0), ("full_stay", None)):
        X, y, ids, base = build_matrix(stays, h)
        r = cv_evaluate(X, y, base)
        r["n_stays"] = int(len(y))
        r["n_positives"] = int(y.sum())
        r["n_features"] = int(X.shape[1])
        report["horizons"][label] = r
        print(label, r["n_stays"], r["n_positives"],
              {k: round(v["oof_auc_mean_over_repeats"], 4) for k, v in r.items() if isinstance(v, dict) and "oof_auc_mean_over_repeats" in v})
    out = Path(__file__).with_name("results_clinical_mimic_iv_v2.json")
    out.write_text(json.dumps(report, indent=2))
    print("wrote", out)


if __name__ == "__main__":
    main()
