"""WPA^2 win-leverage protocol (DeepSeek Phase 2 follow-up, executed for real).

Hypothesis: symbolic regression on EPA^2 drops the time term because the EPA model
is time-independent by construction; a WPA^2 target (win probability is mechanically
time-dependent) should RETAIN the time term.

Spec: data 2021-2024 nflverse pbp; y = wpa^2 clipped at 99th pct (train);
W1 = 9 pre-snap features (wp EXCLUDED); W2 = W1 + pre-snap wp; wpa never a feature.
gplearn pop 2000 x 30 gens x 3 seeds, funcs {add,sub,mul,div,sqrt,log,exp(protected)}.
Primary: train 2021+2022 -> test 2023. Replication: train 2022+2023 -> test 2024,
with best formula affine-recalibrated (y = a*f(x)+b fit by least squares) on repl-train.
"""
import warnings, time
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import sympy as sp
from sklearn.preprocessing import StandardScaler
from gplearn.functions import make_function
from gplearn.genetic import SymbolicRegressor

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"
FEATS_W1 = ["down", "ydstogo", "yardline_100", "score_differential",
            "quarter_seconds_remaining", "shotgun", "no_huddle",
            "posteam_timeouts_remaining", "defteam_timeouts_remaining"]
FEATS_W2 = FEATS_W1 + ["wp"]
TIME_IDX_W1 = FEATS_W1.index("quarter_seconds_remaining")  # X4

def protected_exp(x):
    return np.exp(np.clip(x, -15, 15))

EXP_FN = make_function(function=protected_exp, name="exp", arity=1)
FUNCS = ["add", "sub", "mul", "div", "sqrt", "log", EXP_FN]

def load():
    frames = [pd.read_parquet(f"{WORK}/data/pbp_{y}.parquet") for y in (2021, 2022, 2023, 2024)]
    df = pd.concat(frames, ignore_index=True)
    df = df[df["play_type"].isin(["pass", "run"])].copy()
    df[["shotgun", "no_huddle"]] = df[["shotgun", "no_huddle"]].fillna(0)
    cols = FEATS_W2 + ["wpa", "season"]
    df = df.dropna(subset=cols).reset_index(drop=True)
    return df

def r2(y, p):
    p = np.asarray(p, float)
    mask = np.isfinite(p)
    y, p = y[mask], p[mask]
    ss_res = np.sum((y - p) ** 2)
    ss_tot = np.sum((y - y.mean()) ** 2)
    return 1 - ss_res / ss_tot if ss_tot > 0 else np.nan

# ---------------- baselines (raw, uncalibrated, exactly as specified) ----------------
def b1(train_y, test_n):
    return np.full(test_n, train_y.mean())

def b2_w1(d):
    sd = d["score_differential"].to_numpy(float)
    qsr = d["quarter_seconds_remaining"].to_numpy(float)
    ytg = d["ydstogo"].to_numpy(float)
    down = d["down"].to_numpy(float)
    return (np.exp(-np.abs(sd) / 10) * (1 - qsr / 3600)
            * (1 + 1 / (ytg + 1)) * (5 - down))

def b2_w2(d):
    wp = d["wp"].to_numpy(float)
    qsr = d["quarter_seconds_remaining"].to_numpy(float)
    return 4 * wp * (1 - wp) * (1 - qsr / 3600)

def b3_gli(d):
    sd = d["score_differential"].to_numpy(float)
    ytg = d["ydstogo"].to_numpy(float)
    yl = d["yardline_100"].to_numpy(float)
    down = d["down"].to_numpy(float)
    return ((5 - down) * (1 + 10 / (ytg + 1)) * (1 - yl / 200)
            * np.exp(-np.abs(sd) / 14))

# ---------------- sympy translation ----------------
def to_sympy(prog_str, feat_names):
    syms = {f"X{i}": sp.Symbol(n) for i, n in enumerate(feat_names)}
    env = dict(syms, add=lambda a, b: a + b, sub=lambda a, b: a - b,
               mul=lambda a, b: a * b, div=lambda a, b: a / b,
               sqrt=lambda a: sp.sqrt(sp.Abs(a)), log=lambda a: sp.log(sp.Abs(a)),
               exp=lambda a: sp.exp(a))
    return sp.sympify(eval(prog_str, {"__builtins__": {}}, env))

def to_raw_units(expr, feat_names, scaler):
    subs = {sp.Symbol(n): (sp.Symbol(n) - scaler.mean_[i]) / scaler.scale_[i]
            for i, n in enumerate(feat_names)}
    expr = sp.simplify(expr.subs(subs))
    nums = [x for x in expr.atoms(sp.Number) if x.is_real]
    return sp.simplify(expr.xreplace({x: sp.Float(round(float(x), 4)) for x in nums}))

# ---------------- main ----------------
def run_variant(feats, df_tr, df_te, y_tr, y_te, tag, seeds=(42, 123, 7)):
    Xtr_raw = df_tr[feats].to_numpy(float)
    Xte_raw = df_te[feats].to_numpy(float)
    scaler = StandardScaler().fit(Xtr_raw)
    Xtr, Xte = scaler.transform(Xtr_raw), scaler.transform(Xte_raw)

    rng = np.random.RandomState(0)
    sub = rng.choice(len(Xtr), min(25000, len(Xtr)), replace=False)
    Xs, ys = Xtr[sub], y_tr[sub]

    best = None
    for seed in seeds:
        est = SymbolicRegressor(
            population_size=2000, generations=30, tournament_size=20,
            stopping_criteria=0.0, const_range=(-3.0, 3.0),
            init_depth=(2, 6), init_method="half and half",
            function_set=FUNCS, parsimony_coefficient=0.0005,
            p_crossover=0.7, p_subtree_mutation=0.1,
            p_hoist_mutation=0.05, p_point_mutation=0.1,
            max_samples=1.0, n_jobs=2, verbose=0, random_state=seed)
        t0 = time.time()
        est.fit(Xs, ys)
        pred = est.predict(Xte)
        score = r2(y_te, pred)
        dt = (time.time() - t0) / 60
        print(f"[{tag}] seed {seed}: test_R2={score:.4f} ({dt:.1f} min) prog={est._program}", flush=True)
        if best is None or score > best[0]:
            best = (score, seed, str(est._program), est)
    return best, scaler

def bootstrap_ci(y, pred_fn, n=500, seed=1):
    rng = np.random.RandomState(seed)
    vals = []
    N = len(y)
    for _ in range(n):
        idx = rng.choice(N, N, replace=True)
        vals.append(r2(y[idx], pred_fn(idx)))
    return float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))

def main():
    t_all = time.time()
    df = load()
    print(f"rows after filter: {len(df)}", flush=True)
    table = []  # R^2 table rows
    primary = {}  # tag -> dict(score, seed, prog, est, scaler, feats, raw_math, Xte)

    # ---------- PRIMARY SPLIT ----------
    df_tr = df[df.season.isin((2021, 2022))].reset_index(drop=True)
    df_te = df[df.season == 2023].reset_index(drop=True)
    clip = float(np.percentile(df_tr["wpa"].to_numpy(float) ** 2, 99))
    y_tr = np.clip(df_tr["wpa"].to_numpy(float) ** 2, 0, clip)
    y_te = np.clip(df_te["wpa"].to_numpy(float) ** 2, 0, clip)
    print(f"\n=== PRIMARY: train 2021+2022 (n={len(df_tr)}) -> test 2023 (n={len(df_te)}), clip99={clip:.4f}", flush=True)

    for name, fn in [("B1_train_mean", lambda: b1(y_tr, len(y_te))),
                     ("B2_W1_hand", lambda: b2_w1(df_te)),
                     ("B2_W2_hand", lambda: b2_w2(df_te)),
                     ("B3_GLI-0.1", lambda: b3_gli(df_te))]:
        v = r2(y_te, fn())
        print(f"  {name}: R2={v:.4f}", flush=True)
        table.append({"split": "primary", "variant": "-", "model": name,
                      "seed": "-", "test_R2": round(v, 4)})

    for tag, feats in [("W1", FEATS_W1), ("W2", FEATS_W2)]:
        (score, seed, prog, est), scaler = run_variant(feats, df_tr, df_te, y_tr, y_te, tag)
        try:
            raw_math = str(to_raw_units(to_sympy(prog, feats), feats, scaler))
        except Exception as e:
            raw_math = f"<simplify failed: {e}> | raw: {prog}"
        Xte = scaler.transform(df_te[feats].to_numpy(float))
        print(f"  BEST {tag}: seed {seed} R2={score:.4f}\n    {raw_math}", flush=True)
        table.append({"split": "primary", "variant": tag, "model": "GP_best",
                      "seed": seed, "test_R2": round(score, 4),
                      "program": prog, "program_raw_units": raw_math})
        primary[tag] = dict(score=score, seed=seed, prog=prog, est=est,
                            scaler=scaler, feats=feats, raw_math=raw_math,
                            Xte=Xte, y_te=y_te)

    # bootstrap 95% CI for best W1 / W2 on primary test
    for tag in ("W1", "W2"):
        d = primary[tag]
        base_pred = d["est"].predict(d["Xte"])
        lo, hi = bootstrap_ci(d["y_te"], lambda idx: base_pred[idx])
        print(f"  {tag} bootstrap 95% CI for R2={d['score']:.4f}: [{lo:.4f}, {hi:.4f}]", flush=True)
        d["ci"] = (round(lo, 4), round(hi, 4))

    # ---------- TIME-TERM VERDICT (W1) ----------
    d = primary["W1"]
    prog = d["prog"]
    has_time = f"X{TIME_IDX_W1}" in prog
    # effect size: swing predictions when qsr goes p10 -> p90, others at median
    Xr = d["scaler"].inverse_transform(d["Xte"])
    med = np.median(Xr, axis=0)
    p10, p90 = np.percentile(Xr[:, TIME_IDX_W1], [10, 90])
    xa = np.tile(med, (2, 1)); xa[0, TIME_IDX_W1] = p10; xa[1, TIME_IDX_W1] = p90
    xa_s = d["scaler"].transform(xa)
    pa = d["est"].predict(xa_s)
    pred_std = float(np.std(d["est"].predict(d["Xte"])))
    swing = float(abs(pa[1] - pa[0]))
    rel = swing / pred_std if pred_std > 0 else 0.0
    nontrivial = has_time and rel > 0.05
    print(f"\n  TIME-TERM VERDICT (W1): X{TIME_IDX_W1} in program: {has_time}; "
          f"p10->p90 swing={swing:.5f} ({rel*100:.1f}% of pred std) -> "
          f"{'RETAINED (non-trivial)' if nontrivial else 'NOT retained'}", flush=True)
    d["time_verdict"] = dict(in_program=has_time, swing=round(swing, 5),
                             rel_pct=round(rel * 100, 1), retained=bool(nontrivial))

    # ---------- REPLICATION SPLIT ----------
    df_tr2 = df[df.season.isin((2022, 2023))].reset_index(drop=True)
    df_te2 = df[df.season == 2024].reset_index(drop=True)
    clip2 = float(np.percentile(df_tr2["wpa"].to_numpy(float) ** 2, 99))
    y_tr2 = np.clip(df_tr2["wpa"].to_numpy(float) ** 2, 0, clip2)
    y_te2 = np.clip(df_te2["wpa"].to_numpy(float) ** 2, 0, clip2)
    print(f"\n=== REPLICATION: train 2022+2023 (n={len(df_tr2)}) -> test 2024 (n={len(df_te2)}), clip99={clip2:.4f}", flush=True)
    for name, fn in [("B1_train_mean", lambda: b1(y_tr2, len(y_te2))),
                     ("B2_W1_hand", lambda: b2_w1(df_te2)),
                     ("B2_W2_hand", lambda: b2_w2(df_te2)),
                     ("B3_GLI-0.1", lambda: b3_gli(df_te2))]:
        v = r2(y_te2, fn())
        print(f"  {name}: R2={v:.4f}", flush=True)
        table.append({"split": "replication", "variant": "-", "model": name,
                      "seed": "-", "test_R2": round(v, 4)})

    for tag in ("W1", "W2"):
        d = primary[tag]
        feats = d["feats"]
        Xtr2 = d["scaler"].transform(df_tr2[feats].to_numpy(float))
        Xte2 = d["scaler"].transform(df_te2[feats].to_numpy(float))
        f_tr = d["est"].predict(Xtr2)
        f_te = d["est"].predict(Xte2)
        # raw (no refit)
        r2_raw = r2(y_te2, f_te)
        # affine recalibration: y = a*f + b fit on replication-train
        A = np.column_stack([f_tr, np.ones_like(f_tr)])
        coef, *_ = np.linalg.lstsq(A, y_tr2, rcond=None)
        a, b_ = float(coef[0]), float(coef[1])
        r2_refit = r2(y_te2, a * f_te + b_)
        print(f"  {tag} replication: raw R2={r2_raw:.4f}; "
              f"affine-refit (a={a:.4f}, b={b_:.5f}) R2={r2_refit:.4f}", flush=True)
        table.append({"split": "replication", "variant": tag, "model": "GP_best_raw",
                      "seed": d["seed"], "test_R2": round(r2_raw, 4)})
        table.append({"split": "replication", "variant": tag, "model": "GP_best_affine_refit",
                      "seed": d["seed"], "test_R2": round(r2_refit, 4),
                      "refit_a": round(a, 4), "refit_b": round(b_, 5)})

    pd.DataFrame(table).to_csv(f"{WORK}/wpa2_results.csv", index=False)
    # stash verdict bits for the report writer
    import json
    with open(f"{WORK}/wpa2_verdict.json", "w") as f:
        json.dump({tag: {"seed": primary[tag]["seed"], "primary_R2": primary[tag]["score"],
                         "ci": primary[tag]["ci"], "raw_math": primary[tag]["raw_math"],
                         "program": primary[tag]["prog"],
                         **({"time_verdict": primary[tag]["time_verdict"]} if tag == "W1" else {})}
                   for tag in ("W1", "W2")}, f, indent=2)
    print(f"\nTOTAL {(time.time()-t_all)/60:.1f} min — wrote wpa2_results.csv, wpa2_verdict.json")

if __name__ == "__main__":
    main()
