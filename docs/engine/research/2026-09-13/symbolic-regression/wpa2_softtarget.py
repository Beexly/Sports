"""CONDITIONAL — Experiment 3: Soft-target SR on full WPA^2 (Redesign C).

RUN ONLY IF Redesign A fails (no quarter_seconds_remaining term in any
LATE-stratum program on either split). See MOVE-37-ANALYSIS-04, section 1.3.

Protocol: identical to wpa2_robust.py primary split (train 2021-2022 ->
test 2023; target wpa^2 clipped at train 99th pct, standardized; 9 W1 features
standardized; pop 2000 x 30 gens; parsimony 0.001; log-cosh fitness), with ONE
change: soft target regularization beta=0.9 applied to y_train before fitting
(Vanneschi & Castelli 2021; tournament.soft_target_transform).

Question: does the soft-target + log-cosh combination preserve enough
conditional structure for a quarter_seconds_remaining (X4) term to appear?

Verdict rule: X4 retained (in-program AND swing test) in any seed ->
Redesign C SUCCEEDS where A failed. No X4 in any seed -> declare the SR
method STRUCTURALLY INCAPABLE of this target class (per the analysis).
"""
import warnings, time, pickle, os, json, sys
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from gplearn.genetic import SymbolicRegressor
from gplearn.functions import make_function
from gplearn.fitness import make_fitness

sys.path.insert(0, "/home/hatch/workspace/gse-discovery")
import tournament as T

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"
CKPT = f"{WORK}/wpa2_softtarget_ckpt.json"
ESTDIR = f"{WORK}/wpa2_softtarget_ests"
os.makedirs(ESTDIR, exist_ok=True)

FEATS = ["down", "ydstogo", "yardline_100", "score_differential",
         "quarter_seconds_remaining", "shotgun", "no_huddle",
         "posteam_timeouts_remaining", "defteam_timeouts_remaining"]
TIME_IDX = FEATS.index("quarter_seconds_remaining")
BETA = 0.9
SEEDS = [42, 123, 7]

def _tanh(x):
    return np.tanh(x)
TANH = make_function(function=_tanh, name="tanh", arity=1)

def _logcosh(y, y_pred, w):
    r = y - y_pred
    return np.log(np.cosh(np.clip(r, -20, 20))).mean()
LOGCOSH = make_fitness(function=_logcosh, greater_is_better=False)

FUNCS = ["add", "sub", "mul", "div", "sqrt", "log", "abs", "inv", TANH]

def ckpt():
    return json.load(open(CKPT)) if os.path.exists(CKPT) else {"done": []}
def mark(phase):
    c = ckpt()
    if phase not in c["done"]:
        c["done"].append(phase)
        json.dump(c, open(CKPT, "w"), indent=2)

def load():
    frames = [pd.read_parquet(f"{WORK}/data/pbp_{y}.parquet") for y in (2021, 2022, 2023, 2024)]
    df = pd.concat(frames, ignore_index=True)
    df = df[df["play_type"].isin(["pass", "run"])].copy()
    df[["shotgun", "no_huddle"]] = df[["shotgun", "no_huddle"]].fillna(0)
    df = df.dropna(subset=FEATS + ["wpa", "wp", "game_id", "season"]).reset_index(drop=True)
    return df

def prep_split(df):
    dtr = df[df.season.isin((2021, 2022))].reset_index(drop=True)
    dte = df[df.season == 2023].reset_index(drop=True)
    T.row_alignment_guard(len(dtr), dtr[FEATS].to_numpy(), dtr["wpa"].to_numpy(), name="st/train")
    T.row_alignment_guard(len(dte), dte[FEATS].to_numpy(), dte["wpa"].to_numpy(), name="st/test")
    ytr_raw = dtr["wpa"].to_numpy(float) ** 2
    yte_raw = dte["wpa"].to_numpy(float) ** 2
    cap = float(np.quantile(ytr_raw, 0.99))
    ytr = np.clip(ytr_raw, 0, cap); yte = np.clip(yte_raw, 0, cap)
    mu, sd = float(ytr.mean()), float(ytr.std())
    sc = StandardScaler().fit(dtr[FEATS].to_numpy(float))
    return dict(Xtr=sc.transform(dtr[FEATS].to_numpy(float)),
                Xte=sc.transform(dte[FEATS].to_numpy(float)),
                Xte_raw=dte[FEATS].to_numpy(float),
                ytrs=(ytr - mu) / sd, ytes=(yte - mu) / sd,
                mu=mu, sd=sd, cap=cap, scaler=sc, n_tr=len(dtr), n_te=len(dte))

def r2(y, p):
    p = np.asarray(p, float); m = np.isfinite(p)
    y, p = y[m], p[m]
    ss = np.sum((y - p) ** 2); tot = np.sum((y - y.mean()) ** 2)
    return float(1 - ss / tot) if tot > 0 else float("nan")

def time_term_check(prog, est, scaler, Xte_raw):
    in_program = f"X{TIME_IDX}" in prog
    is_constant = not any(f"X{i}" in prog for i in range(len(FEATS)))
    med = np.median(Xte_raw, axis=0)
    p10, p90 = np.percentile(Xte_raw[:, TIME_IDX], [10, 90])
    xa = np.tile(med, (2, 1)); xa[0, TIME_IDX] = p10; xa[1, TIME_IDX] = p90
    pas = est.predict(scaler.transform(xa))
    pred_std = float(np.std(est.predict(scaler.transform(Xte_raw))))
    swing = float(abs(pas[1] - pas[0]))
    rel = swing / pred_std if pred_std > 0 else 0.0
    return dict(in_program=in_program, swing_rel_pct=round(rel * 100, 1),
                retained=bool(in_program and rel > 0.05 and not is_constant),
                is_constant=is_constant)

def main():
    c = ckpt()
    df = load()
    P = prep_split(df)
    print(f"[soft-target] train 2021+2022 n={P['n_tr']} -> test 2023 n={P['n_te']}, "
          f"beta={BETA}, clip99={P['cap']:.4f}", flush=True)
    print("  baseline registry:", T.baseline_existence_check("wpa2"), flush=True)
    gate = T.gbm_ceiling_probe(P["Xtr"], P["ytrs"], P["Xte"], P["ytes"])
    print(f"  GBM ceiling={gate['ceiling']} tier={gate['tier']}", flush=True)
    y_fit = T.soft_target_transform(P["ytrs"], beta=BETA)
    print(f"  soft-target: train target std {P['ytrs'].std():.4f} -> {y_fit.std():.4f}, "
          f"median preserved {np.median(y_fit)==np.median(P['ytrs'])}", flush=True)
    recs = []
    for seed in SEEDS:
        ep = f"{ESTDIR}/seed{seed}.pkl"
        if os.path.exists(ep):
            est = pickle.load(open(ep, "rb"))
            print(f"  seed {seed}: checkpoint exists", flush=True)
        else:
            print(f"  seed {seed}: fitting...", flush=True)
            est = T.robust_symbolic_fit(P["Xtr"], P["ytrs"], loss='logcosh', seed=seed,
                                        population_size=2000, generations=30,
                                        soft_target_beta=BETA)
            pickle.dump(est, open(ep, "wb"))
            print(f"  seed {seed}: done, prog={est._program}", flush=True)
        prog = str(est._program)
        tr2 = r2(P["ytes"], est.predict(P["Xte"]))
        tt = time_term_check(prog, est, P["scaler"], P["Xte_raw"])
        sl = T.smooth_linear_test(est.predict, P["Xte"], P["ytes"])
        rec = dict(seed=seed, test_r2=round(tr2, 4), length=est._program.length_,
                   program=prog, time_term=tt, smooth_linear=sl)
        recs.append(rec)
        print(f"  seed {seed}: test_R2={tr2:.4f} X4_in_prog={tt['in_program']} "
              f"retained={tt['retained']} kink_decoration={sl['kink_is_decoration']}\n"
              f"    prog={prog}", flush=True)
    any_x4 = any(r["time_term"]["retained"] for r in recs)
    verdict = ("REDESIGN C SUCCEEDS — soft target preserved conditional structure"
               if any_x4 else
               "SR METHOD DECLARED STRUCTURALLY INCAPABLE of this target class — "
               "no quarter_seconds_remaining term under log-cosh + soft target (beta=0.9)")
    print("VERDICT:", verdict, flush=True)
    json.dump({"seeds": SEEDS, "beta": BETA, "results": recs, "verdict": verdict},
              open(f"{WORK}/wpa2_softtarget_results.json", "w"), indent=2)
    mark("done")
    print("DONE", flush=True)

if __name__ == "__main__":
    main()
