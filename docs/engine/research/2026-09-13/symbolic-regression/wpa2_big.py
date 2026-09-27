"""SUPPLEMENTARY (not part of the spec'd protocol): one W1 run at the
prototype-grade budget (3000 pop x 150 gen) that the SR prototype showed is
needed to escape degenerate constants. Answers: does SR on wpa^2 retain the
time term when the search actually works?
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
    y_tr = np.clip(df_tr["wpa"].to_numpy(float) ** 2, 0, clip)
    y_te = np.clip(df_te["wpa"].to_numpy(float) ** 2, 0, clip)
    sc = StandardScaler().fit(df_tr[FEATS_W1].to_numpy(float))
    Xtr, Xte = sc.transform(df_tr[FEATS_W1].to_numpy(float)), sc.transform(df_te[FEATS_W1].to_numpy(float))
    rng = np.random.RandomState(0)
    sub = rng.choice(len(Xtr), 25000, replace=False)
    est = SymbolicRegressor(
        population_size=3000, generations=150, tournament_size=50,
        stopping_criteria=0.0, const_range=(-3.0, 3.0),
        init_depth=(2, 6), init_method="half and half",
        function_set=FUNCS, parsimony_coefficient=0.0001,
        p_crossover=0.7, p_subtree_mutation=0.1,
        p_hoist_mutation=0.05, p_point_mutation=0.1,
        max_samples=1.0, n_jobs=2, verbose=0, random_state=42)
    t0 = time.time()
    est.fit(Xtr[sub], y_tr[sub])
    print(f"fit {(time.time()-t0)/60:.1f} min", flush=True)
    pred = est.predict(Xte)
    score = r2(y_te, pred)
    prog = str(est._program)
    print(f"SUPP W1 big-budget: test R2={score:.4f}", flush=True)
    print(f"program: {prog}", flush=True)
    try:
        raw = str(to_raw_units(to_sympy(prog, FEATS_W1), FEATS_W1, sc))
    except Exception as e:
        raw = f"<simplify failed: {e}>"
    print(f"raw units: {raw}", flush=True)
    has_time = f"X{TIME_IDX_W1}" in prog
    # effect size of the time term
    Xr = sc.inverse_transform(Xte)
    med = np.median(Xr, axis=0)
    p10, p90 = np.percentile(Xr[:, TIME_IDX_W1], [10, 90])
    xa = np.tile(med, (2, 1)); xa[0, TIME_IDX_W1] = p10; xa[1, TIME_IDX_W1] = p90
    pa = est.predict(sc.transform(xa))
    psd = float(np.std(pred)); swing = float(abs(pa[1] - pa[0]))
    rel = swing / psd if psd > 0 else 0.0
    print(f"time term X{TIME_IDX_W1} in program: {has_time}; "
          f"p10->p90 swing={swing:.6f} ({rel*100:.1f}% of pred std) -> "
          f"{'RETAINED (non-trivial)' if (has_time and rel > 0.05) else 'NOT retained'}", flush=True)
    with open(f"{WORK}/wpa2_big_result.txt", "w") as f:
        f.write(f"test_R2={score:.4f}\nprogram={prog}\nraw_units={raw}\n"
                f"time_in_program={has_time}\nswing={swing:.6f}\nrel_pct={rel*100:.1f}\n")

if __name__ == "__main__":
    main()
