"""Assemble formulas_b.csv from per-seed checkpoints (ckpt_b_seed*.pkl)."""
import warnings, pickle, glob, os
warnings.filterwarnings("ignore")
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier
from discover import gplearn_to_sympy, to_raw_units  # safe: discover has __main__ guard

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"
FEATS = ["yardline_100", "game_seconds_remaining", "qtr",
         "score_differential", "down", "ydstogo"]

def main():
    df = pd.read_parquet(f"{WORK}/data/target_b.parquet")
    tr = df[df.season <= 2023].reset_index(drop=True)
    te = df[df.season >= 2024].reset_index(drop=True)
    sc = StandardScaler().fit(tr[FEATS].to_numpy(float))
    Xte = sc.transform(te[FEATS].to_numpy(float))
    yte = te["scored"].to_numpy(float)
    hgb = HistGradientBoostingClassifier(random_state=42).fit(
        sc.transform(tr[FEATS].to_numpy(float)), tr["scored"].to_numpy(float))
    hgb_auc = roc_auc_score(yte, hgb.predict_proba(Xte)[:, 1])

    cands = []
    for ck in sorted(glob.glob(f"{WORK}/ckpt_b_seed*.pkl")):
        d = pickle.load(open(ck, "rb"))
        for s, auc, brier in d["top"]:
            cands.append((auc, d["seed"], s, brier))
    cands.sort(key=lambda x: x[0], reverse=True)

    rows, seen = [], set()
    for auc, seed, s, brier in cands:
        try:
            raw = str(to_raw_units(gplearn_to_sympy(s, FEATS), FEATS, sc))
        except Exception as e:
            raw = f"<simplify failed: {e}>"
        key = (round(auc, 4), raw)
        if key in seen:
            continue
        seen.add(key)
        rows.append({"target": "B", "seed": seed, "holdout_AUC": round(auc, 4),
                     "baseline": 0.5, "hgb_reference": round(hgb_auc, 4),
                     "holdout_Brier": round(brier, 4),
                     "program_gplearn": s, "program_raw_units": raw})
        if len(rows) == 5:
            break
    pd.DataFrame(rows).to_csv(f"{WORK}/formulas_b.csv", index=False)
    print(f"wrote formulas_b.csv with {len(rows)} formulas; best AUC={rows[0]['holdout_AUC']}")
    for r in rows:
        print(f"  seed {r['seed']} AUC={r['holdout_AUC']}: {r['program_raw_units'][:150]}")

if __name__ == "__main__":
    main()
