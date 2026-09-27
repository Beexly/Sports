"""Diagnostic: same spec budget (2000x30) but y STANDARDIZED.
If this finds structure, the protocol's failure was target scaling, not budget.
Predictions are unstandardized before scoring R2 on the raw target.
"""
import warnings, time, sys
warnings.filterwarnings("ignore")
sys.path.insert(0, "/home/hatch/workspace/gse-discovery/symbolic-regression")
import numpy as np
from wpa2 import load, r2, to_sympy, to_raw_units, FEATS_W1, TIME_IDX_W1, FUNCS
from sklearn.preprocessing import StandardScaler
from gplearn.genetic import SymbolicRegressor

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"

def main():
    df = load()
    df_tr = df[df.season.isin((2021, 2022))].reset_index(drop=True)
    df_te = df[df.season == 2023].reset_index(drop=True)
    clip = float(np.percentile(df_tr["wpa"].to_numpy(float) ** 2, 99))
    y_tr_raw = np.clip(df_tr["wpa"].to_numpy(float) ** 2, 0, clip)
    y_te_raw = np.clip(df_te["wpa"].to_numpy(float) ** 2, 0, clip)
    mu, sd = y_tr_raw.mean(), y_tr_raw.std()
    y_tr = y_tr_raw
    sc = StandardScaler().fit(df_tr[FEATS_W1].to_numpy(float))
    Xtr, Xte = sc.transform(df_tr[FEATS_W1].to_numpy(float)), sc.transform(df_te[FEATS_W1].to_numpy(float))
    rng = np.random.RandomState(0)
    sub = rng.choice(len(Xtr), 25000, replace=False)
    est = SymbolicRegressor(
        population_size=2000, generations=30, tournament_size=20,
        stopping_criteria=0.0, const_range=(-0.01, 0.01),
        init_depth=(2, 6), init_method="half and half",
        function_set=FUNCS, parsimony_coefficient=0.0001,
        p_crossover=0.7, p_subtree_mutation=0.1,
        p_hoist_mutation=0.05, p_point_mutation=0.1,
        max_samples=1.0, n_jobs=2, verbose=0, random_state=42)
    t0 = time.time()
    est.fit(Xtr[sub], y_tr[sub])
    print(f"fit {(time.time()-t0)/60:.1f} min", flush=True)
    pred_std = est.predict(Xte)
    pred_raw = pred_std
    score = r2(y_te_raw, pred_raw)
    prog = str(est._program)
    print(f"DIAG const_range fix (raw y, spec 2000x30 budget): raw-scale test R2={score:.4f}", flush=True)
    print(f"program: {prog}", flush=True)
    try:
        expr = to_sympy(prog, FEATS_W1)
        raw = str(to_raw_units(expr, FEATS_W1, sc))
    except Exception as e:
        raw = f"<simplify failed: {e}>"
    print(f"raw units: {raw}", flush=True)
    has_time = f"X{TIME_IDX_W1}" in prog
    print(f"time term X{TIME_IDX_W1} in program: {has_time}", flush=True)
    with open(f"{WORK}/wpa2_cr_result.txt", "w") as f:
        f.write(f"test_R2={score:.4f}\nprogram={prog}\nraw_units={raw}\ntime_in_program={has_time}\n")

if __name__ == "__main__":
    main()
