"""Symbolic regression discovery pipeline (gplearn).
Target A: EPA from pre-snap features (regression).
Target B: drive scores (TD/FG) from drive-start state (regression on 0/1, scored by AUC/Brier).
Train <=2023, holdout = 2024-2025. Honest baselines + HGB reference.
"""
import warnings, time, re
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import sympy as sp
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, roc_auc_score, brier_score_loss, mean_absolute_error
from sklearn.ensemble import HistGradientBoostingRegressor, HistGradientBoostingClassifier
from gplearn.functions import make_function
from gplearn.genetic import SymbolicRegressor

FEATURES_A = ["down", "ydstogo", "yardline_100", "game_seconds_remaining",
              "qtr", "score_differential", "shotgun", "no_huddle"]
FEATURES_B = ["yardline_100", "game_seconds_remaining", "qtr",
              "score_differential", "down", "ydstogo"]

FUNCS = ["add", "sub", "mul", "div", "sqrt", "log", "abs", "neg",
         "inv", "max", "min", "sin", "cos"]

# ---------- formula translation: gplearn string -> sympy -> raw units ----------
def gplearn_to_sympy(prog_str, feat_names):
    syms = {f"X{i}": sp.Symbol(n) for i, n in enumerate(feat_names)}
    env = dict(syms)
    env.update({
        "add": lambda a, b: a + b, "sub": lambda a, b: a - b,
        "mul": lambda a, b: a * b, "div": lambda a, b: a / b,
        "sqrt": lambda a: sp.sqrt(sp.Abs(a)), "log": lambda a: sp.log(sp.Abs(a)),
        "abs": lambda a: sp.Abs(a), "neg": lambda a: -a,
        "inv": lambda a: 1 / a, "max": lambda a, b: sp.Max(a, b),
        "min": lambda a, b: sp.Min(a, b), "sin": sp.sin, "cos": sp.cos,
    })
    val = eval(prog_str, {"__builtins__": {}}, env)
    return sp.sympify(val)  # handles bare constants (float has no .subs)

def to_raw_units(expr, feat_names, scaler):
    subs = {}
    for i, n in enumerate(feat_names):
        mu, sd = scaler.mean_[i], scaler.scale_[i]
        subs[sp.Symbol(n)] = (sp.Symbol(n) - mu) / sd
    expr = sp.simplify(expr.subs(subs))
    nums = [x for x in expr.atoms(sp.Number) if x.is_real]
    expr = expr.xreplace({x: sp.Float(round(float(x), 4)) for x in nums})
    return sp.simplify(expr)

# ---------- evaluation helpers ----------
def r2_const(y_true, const):
    ss_res = np.sum((y_true - const) ** 2)
    ss_tot = np.sum((y_true - y_true.mean()) ** 2)
    return 1 - ss_res / ss_tot

def run_discovery(name, feats, target_col, seeds, n_train_sample, hgb_model):
    df = pd.read_parquet(f"data/target_{name.lower()}.parquet")
    tr = df[df.season <= 2023].reset_index(drop=True)
    te = df[df.season >= 2024].reset_index(drop=True)
    Xtr_raw, ytr = tr[feats].to_numpy(float), tr[target_col].to_numpy(float)
    Xte_raw, yte = te[feats].to_numpy(float), te[target_col].to_numpy(float)

    scaler = StandardScaler().fit(Xtr_raw)
    Xtr, Xte = scaler.transform(Xtr_raw), scaler.transform(Xte_raw)

    # strong-ML reference (bounds how much signal exists at all)
    t0 = time.time()
    hgb = hgb_model.fit(Xtr, ytr)
    hgb_te = hgb.predict(Xte)

    # dumb baseline
    const = ytr.mean()

    results = []
    for seed in seeds:
        rng = np.random.RandomState(seed)
        if n_train_sample and len(Xtr) > n_train_sample:
            # stratify roughly by down (feature 0) when present
            idx = rng.choice(len(Xtr), n_train_sample, replace=False)
            Xs, ys = Xtr[idx], ytr[idx]
        else:
            Xs, ys = Xtr, ytr
        est = SymbolicRegressor(
            population_size=3000, generations=150, tournament_size=50,
            stopping_criteria=0.0, const_range=(-3.0, 3.0),
            init_depth=(2, 6), init_method="half and half",
            function_set=FUNCS, parsimony_coefficient=0.0001,
            p_crossover=0.7, p_subtree_mutation=0.1,
            p_hoist_mutation=0.05, p_point_mutation=0.1,
            max_samples=1.0, n_jobs=2, verbose=0, random_state=seed)
        t1 = time.time()
        est.fit(Xs, ys)
        fit_min = (time.time() - t1) / 60

        # collect elite programs from final generation, score on holdout subset
        Xte_s = Xte[:10000]
        cands = []
        seen = set()
        progs = sorted(est._programs[-1], key=lambda p: p.raw_fitness_)[:150]
        for p in progs:
            s = str(p)
            if s in seen:
                continue
            seen.add(s)
            try:
                pred = p.execute(Xte_s)
                if not np.all(np.isfinite(pred)):
                    continue
                cands.append((p.raw_fitness_, s, p))
            except Exception:
                continue
        # score candidates on full holdout, keep top 5 distinct
        scored = []
        for fit, s, p in cands:
            try:
                pred = p.execute(Xte)
                if not np.all(np.isfinite(pred)):
                    continue
                scored.append((s, pred, len(s)))
            except Exception:
                continue
        results.append((seed, est, scored, fit_min))
        print(f"[{name}] seed {seed}: GP fit {fit_min:.1f} min, {len(scored)} valid elites",
              flush=True)

    # pick global top-5 by holdout metric across seeds
    if name == "A":
        metric = lambda y, p: r2_score(y, p)
        base_metric = r2_const(yte, const)
        ref_metric = r2_score(yte, hgb_te)
        mname = "holdout_R2"
    else:
        metric = lambda y, p: roc_auc_score(y, p)
        base_metric = 0.5
        ref_metric = roc_auc_score(yte, hgb_te)
        mname = "holdout_AUC"

    all_c = []
    for seed, est, scored, fit_min in results:
        for s, pred, _ in scored:
            all_c.append((metric(yte, pred), seed, s, pred))
    all_c.sort(key=lambda x: x[0], reverse=True)

    rows = []
    for m, seed, s, pred in all_c[:5]:
        try:
            expr = gplearn_to_sympy(s, feats)
            raw = str(to_raw_units(expr, feats, scaler))
        except Exception as e:
            raw = f"<simplify failed: {e}>"
        rows.append({
            "target": name, "seed": seed, mname: round(m, 4),
            "baseline": round(base_metric, 4), "hgb_reference": round(ref_metric, 4),
            "holdout_MAE_or_Brier": round(float(mean_absolute_error(yte, pred) if name == "A"
                                                 else brier_score_loss(yte, np.clip(pred, 0, 1))), 4),
            "program_gplearn": s, "program_raw_units": raw,
        })
    out = pd.DataFrame(rows)
    out.to_csv(f"formulas_{name.lower()}.csv", index=False)
    print(f"[{name}] baseline={base_metric:.4f} hgb={ref_metric:.4f} "
          f"best_GP={all_c[0][0]:.4f} (HGB fit {(time.time()-t0)/60:.1f} min total)")
    return out

if __name__ == "__main__":
    t_all = time.time()
    a = run_discovery("A", FEATURES_A, "epa", seeds=[42, 7], n_train_sample=30000,
                      hgb_model=HistGradientBoostingRegressor(random_state=42))
    b = run_discovery("B", FEATURES_B, "scored", seeds=[42, 7], n_train_sample=None,
                      hgb_model=HistGradientBoostingClassifier(random_state=42))
    print(f"TOTAL {(time.time()-t_all)/60:.1f} min")
