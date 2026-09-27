"""Target B only (drive scoring), resumable per-seed checkpoints.
Run: .venv/bin/python discover_b.py ; safe to re-run, skips finished seeds.
Then: .venv/bin/python assemble_b.py
"""
import warnings, time, pickle, os
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.ensemble import HistGradientBoostingClassifier
from gplearn.genetic import SymbolicRegressor

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"
FEATS = ["yardline_100", "game_seconds_remaining", "qtr",
         "score_differential", "down", "ydstogo"]
FUNCS = ["add", "sub", "mul", "div", "sqrt", "log", "abs", "neg",
         "inv", "max", "min", "sin", "cos"]
SEEDS = [42, 7]

def data():
    df = pd.read_parquet(f"{WORK}/data/target_b.parquet")
    tr = df[df.season <= 2023].reset_index(drop=True)
    te = df[df.season >= 2024].reset_index(drop=True)
    Xtr_raw, ytr = tr[FEATS].to_numpy(float), tr["scored"].to_numpy(float)
    Xte_raw, yte = te[FEATS].to_numpy(float), te["scored"].to_numpy(float)
    sc = StandardScaler().fit(Xtr_raw)
    return sc.transform(Xtr_raw), ytr, sc.transform(Xte_raw), yte, sc

def run_seed(seed, Xtr, ytr, Xte, yte):
    ck = f"{WORK}/ckpt_b_seed{seed}.pkl"
    if os.path.exists(ck):
        print(f"[B] seed {seed}: checkpoint exists, skipping", flush=True)
        return pickle.load(open(ck, "rb"))
    est = SymbolicRegressor(
        population_size=3000, generations=150, tournament_size=50,
        stopping_criteria=0.0, const_range=(-3.0, 3.0),
        init_depth=(2, 6), init_method="half and half",
        function_set=FUNCS, parsimony_coefficient=0.0001,
        p_crossover=0.7, p_subtree_mutation=0.1,
        p_hoist_mutation=0.05, p_point_mutation=0.1,
        max_samples=1.0, n_jobs=2, verbose=0, random_state=seed)
    t0 = time.time()
    est.fit(Xtr, ytr)
    dt = (time.time() - t0) / 60
    # elites -> holdout AUC
    cands, seen = [], set()
    for p in sorted(est._programs[-1], key=lambda q: q.raw_fitness_)[:200]:
        s = str(p)
        if s in seen:
            continue
        seen.add(s)
        try:
            pred = p.execute(Xte)
            if np.all(np.isfinite(pred)):
                cands.append((s, pred))
        except Exception:
            continue
    scored = []
    for s, pred in cands:
        try:
            scored.append((s, float(roc_auc_score(yte, pred)),
                           float(brier_score_loss(yte, np.clip(pred, 0, 1)))))
        except Exception:
            continue
    scored.sort(key=lambda x: x[1], reverse=True)
    out = {"seed": seed, "fit_min": round(dt, 1), "n_elites": len(scored),
           "top": scored[:15]}
    pickle.dump(out, open(ck, "wb"))
    print(f"[B] seed {seed}: fit {dt:.1f} min, {len(scored)} elites, "
          f"best holdout AUC={scored[0][1]:.4f}", flush=True)
    return out

def main():
    Xtr, ytr, Xte, yte, sc = data()
    t0 = time.time()
    hgb = HistGradientBoostingClassifier(random_state=42).fit(Xtr, ytr)
    print(f"[B] HGB holdout AUC={roc_auc_score(yte, hgb.predict_proba(Xte)[:,1]):.4f} "
          f"(fit {(time.time()-t0)/60:.1f} min)", flush=True)
    for seed in SEEDS:
        run_seed(seed, Xtr, ytr, Xte, yte)
    print("[B] done. Run assemble_b.py", flush=True)

if __name__ == "__main__":
    main()
