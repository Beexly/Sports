"""Experiment 1 — Robustified WPA^2 SR with log-cosh loss (MOVE-37-ANALYSIS-02, section 2).

Execution lab run. Fixes to the paste's spec (documented, not silent):
  - make_fitness imported from gplearn.fitness (paste wrongly used gplearn.functions).
  - wp / qsec carried in the SAME filtered dataframe as X -> alignment by construction.
  - B3 (GLI-0.1) added: affine-calibrated on train, evaluated on test.
  - Added: replication SR rerun (1 seed, train 2021-2023 -> test 2024) for the
    falsification rule's "both splits" clause + criterion 3.
  - Added: shuffled-target null (refit best-config on shuffled train y).
  - gen-0 diagnostic: implied train R^2 of the generation-0 best program, to test
    whether the heavy-tail attractor signature (impossible gen-0 R^2 ~ 0.63) persists.
  - Features standardized with StandardScaler fit on train (same as round 1,
    isolates the fitness-function intervention). Full train data, n_jobs=2.

Phases (each checkpointed; safe to re-run, skips finished phases):
  P1 fit primary SR x3 seeds -> est pickles
  P2 evaluate primary + baselines
  P3 fit replication SR x1 seed -> est pickle
  P4 evaluate replication + fit/evaluate shuffled null
  P5 assemble REPORT_WPA2_ROBUST.md inputs -> wpa2_robust_summary.json

Pre-registered criteria (paste section 2.1):
  1. Best SR holdout R^2 > 0.05 (primary: train 2021-22 -> test 2023).
  2. Best SR beats B2 by >= 0.02.
  3. Best SR replicates at R^2 > 0.03 on 2024.
  4. Best formula contains a term involving quarter_seconds_remaining (X4).
  5. Shuffled-target R^2 <= 0.05.
Falsification: best formula collapses to a constant OR drops the time term on
BOTH splits -> time-term hypothesis rejected, method declared incapable.
"""
import warnings, time, pickle, os, json
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import r2_score
from sklearn.preprocessing import StandardScaler
from gplearn.genetic import SymbolicRegressor
from gplearn.functions import make_function
from gplearn.fitness import make_fitness

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"
CKPT = f"{WORK}/wpa2_robust_ckpt.json"
ESTDIR = f"{WORK}/wpa2_robust_ests"
SUMMARY = f"{WORK}/wpa2_robust_summary.json"
os.makedirs(ESTDIR, exist_ok=True)

FEATS = ["down", "ydstogo", "yardline_100", "score_differential",
         "quarter_seconds_remaining", "shotgun", "no_huddle",
         "posteam_timeouts_remaining", "defteam_timeouts_remaining"]
TIME_IDX = FEATS.index("quarter_seconds_remaining")  # X4

def _tanh(x):
    return np.tanh(x)
TANH = make_function(function=_tanh, name="tanh", arity=1)

def _logcosh(y, y_pred, w):
    r = y - y_pred
    return np.log(np.cosh(np.clip(r, -20, 20))).mean()
LOGCOSH = make_fitness(function=_logcosh, greater_is_better=False)

FUNCS = ["add", "sub", "mul", "div", "sqrt", "log", "abs", "inv", TANH]
SEEDS_PRIMARY = [42, 123, 7]
SEED_REPL = 42
SEED_SHUFFLE = 42

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

def prep_split(df, train_seasons, test_season):
    dtr = df[df.season.isin(train_seasons)].reset_index(drop=True)
    dte = df[df.season == test_season].reset_index(drop=True)
    ytr_raw = dtr["wpa"].to_numpy(float) ** 2
    yte_raw = dte["wpa"].to_numpy(float) ** 2
    cap = float(np.quantile(ytr_raw, 0.99))
    ytr = np.clip(ytr_raw, 0, cap)
    yte = np.clip(yte_raw, 0, cap)
    mu, sd = float(ytr.mean()), float(ytr.std())
    sc = StandardScaler().fit(dtr[FEATS].to_numpy(float))
    Xtr = sc.transform(dtr[FEATS].to_numpy(float))
    Xte_raw = dte[FEATS].to_numpy(float)
    return dict(Xtr=Xtr, Xte=sc.transform(Xte_raw), Xte_raw=Xte_raw,
                ytrs=(ytr - mu) / sd, ytes=(yte - mu) / sd, mu=mu, sd=sd, cap=cap,
                scaler=sc, wp_te=dte["wp"].to_numpy(float),
                qsec_te=dte["quarter_seconds_remaining"].to_numpy(float),
                gid_tr=dtr["game_id"].to_numpy(), gid_te=dte["game_id"].to_numpy(),
                dtr=dtr, dte=dte, n_tr=len(dtr), n_te=len(dte))

def r2(y, p):
    p = np.asarray(p, float)
    m = np.isfinite(p)
    y, p = y[m], p[m]
    ss = np.sum((y - p) ** 2); tot = np.sum((y - y.mean()) ** 2)
    return float(1 - ss / tot) if tot > 0 else float("nan")

def gli_raw(d):
    down = d["down"].to_numpy(float); ytg = d["ydstogo"].to_numpy(float)
    yl = d["yardline_100"].to_numpy(float); sd = d["score_differential"].to_numpy(float)
    return ((5 - down) * (1 + 10 / (ytg + 1)) * (1 - yl / 200)
            * np.exp(-np.abs(sd) / 14))

def fit_sr(Xtr, ytrs, seed):
    est = SymbolicRegressor(population_size=2000, generations=30,
                            tournament_size=20, stopping_criteria=0.0,
                            const_range=(-3.0, 3.0), init_depth=(2, 6),
                            init_method="half and half", function_set=FUNCS,
                            parsimony_coefficient=0.001,
                            p_crossover=0.7, p_subtree_mutation=0.1,
                            p_hoist_mutation=0.05, p_point_mutation=0.1,
                            max_samples=1.0, metric=LOGCOSH,
                            n_jobs=2, verbose=0, random_state=seed)
    t0 = time.time()
    est.fit(Xtr, ytrs)
    return est, (time.time() - t0) / 60

def gen0_r2(est, Xtr, ytrs):
    """Implied train R^2 of the generation-0 best program (attractor diagnostic)."""
    try:
        gen0_best = min(est._programs[0], key=lambda p: p.raw_fitness_)
        return r2(ytrs, gen0_best.execute(Xtr))
    except Exception:
        return float("nan")

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
    retained = bool(in_program and rel > 0.05 and not is_constant)
    return dict(in_program=in_program, swing_rel_pct=round(rel * 100, 1),
                retained=retained, is_constant=is_constant)

def est_path(phase, seed):
    return f"{ESTDIR}/{phase}_seed{seed}.pkl"

# ---------------- PHASES ----------------
def phase_fit_primary():
    df = load(); P = prep_split(df, (2021, 2022), 2023)
    print(f"[P1] primary train 2021+2022 n={P['n_tr']} -> test 2023 n={P['n_te']}, "
          f"clip99={P['cap']:.4f}", flush=True)
    for seed in SEEDS_PRIMARY:
        if os.path.exists(est_path("primary", seed)):
            print(f"  seed {seed}: checkpoint exists, skipping", flush=True)
            continue
        print(f"  seed {seed}: fitting...", flush=True)
        est, mins = fit_sr(P["Xtr"], P["ytrs"], seed)
        pickle.dump(est, open(est_path("primary", seed), "wb"))
        print(f"  seed {seed}: done in {mins:.1f} min, prog={est._program}", flush=True)
    mark("fit_primary")

def phase_eval_primary():
    df = load(); P = prep_split(df, (2021, 2022), 2023)
    out = {"baselines": {}, "sr": []}
    # baselines
    out["baselines"]["B1_train_mean"] = round(r2(P["ytes"], np.full_like(P["ytes"], P["ytrs"].mean())), 4)
    out["baselines"]["B2_human_heuristic"] = round(
        r2(P["ytes"], 4 * P["wp_te"] * (1 - P["wp_te"]) * (1 - P["qsec_te"] / 3600)), 4)
    g_tr, g_te = gli_raw(P["dtr"]), gli_raw(P["dte"])
    A = np.column_stack([g_tr, np.ones_like(g_tr)])
    coef, *_ = np.linalg.lstsq(A, P["ytrs"], rcond=None)
    a, b_ = float(coef[0]), float(coef[1])
    out["baselines"]["B3_GLI_calibrated"] = round(r2(P["ytes"], a * g_te + b_), 4)
    out["baselines"]["B3_GLI_raw_uncalibrated"] = round(r2(P["ytes"], g_te), 4)
    out["baselines"]["B3_affine_a"] = a; out["baselines"]["B3_affine_b"] = b_
    hgb = HistGradientBoostingRegressor(max_iter=200, learning_rate=0.05,
                                       max_depth=6, random_state=42)
    hgb.fit(P["Xtr"], P["ytrs"])
    out["baselines"]["B4_HGB_ceiling"] = round(r2(P["ytes"], hgb.predict(P["Xte"])), 4)
    # SR seeds
    for seed in SEEDS_PRIMARY:
        est = pickle.load(open(est_path("primary", seed), "rb"))
        prog = str(est._program)
        tr2 = r2(P["ytes"], est.predict(P["Xte"]))
        tt = time_term_check(prog, est, P["scaler"], P["Xte_raw"])
        g0 = gen0_r2(est, P["Xtr"], P["ytrs"])
        rec = dict(seed=seed, test_r2=round(tr2, 4), length=est._program.length_,
                   program=prog, time_term=tt,
                   gen0_implied_train_r2=round(g0, 4) if np.isfinite(g0) else None)
        out["sr"].append(rec)
        print(f"  seed {seed}: test_R2={tr2:.4f} len={est._program.length_} "
              f"time_in_prog={tt['in_program']} swing={tt['swing_rel_pct']}% "
              f"gen0_R2={g0:.4f}\n    prog={prog}", flush=True)
    best = max(out["sr"], key=lambda d: d["test_r2"])
    out["best"] = best
    print("  baselines:", out["baselines"], flush=True)
    print(f"  BEST seed {best['seed']} R2={best['test_r2']}", flush=True)
    json.dump(out, open(f"{WORK}/wpa2_robust_eval_primary.json", "w"), indent=2)
    mark("eval_primary")

def phase_fit_replication():
    df = load(); R = prep_split(df, (2021, 2022, 2023), 2024)
    print(f"[P3] replication train 2021-2023 n={R['n_tr']} -> test 2024 n={R['n_te']}, "
          f"clip99={R['cap']:.4f}", flush=True)
    if not os.path.exists(est_path("replication", SEED_REPL)):
        print(f"  seed {SEED_REPL}: fitting...", flush=True)
        est, mins = fit_sr(R["Xtr"], R["ytrs"], SEED_REPL)
        pickle.dump(est, open(est_path("replication", SEED_REPL), "wb"))
        print(f"  seed {SEED_REPL}: done in {mins:.1f} min, prog={est._program}", flush=True)
    else:
        print(f"  seed {SEED_REPL}: checkpoint exists, skipping", flush=True)
    mark("fit_replication")

def phase_eval_replication_and_shuffle():
    df = load(); R = prep_split(df, (2021, 2022, 2023), 2024)
    out = {}
    est = pickle.load(open(est_path("replication", SEED_REPL), "rb"))
    prog = str(est._program)
    tr2 = r2(R["ytes"], est.predict(R["Xte"]))
    tt = time_term_check(prog, est, R["scaler"], R["Xte_raw"])
    g0 = gen0_r2(est, R["Xtr"], R["ytrs"])
    out["replication"] = dict(seed=SEED_REPL, test_r2=round(tr2, 4),
                              length=est._program.length_, program=prog,
                              time_term=tt,
                              gen0_implied_train_r2=round(g0, 4) if np.isfinite(g0) else None)
    print(f"  replication seed {SEED_REPL}: test_R2={tr2:.4f} len={est._program.length_} "
          f"time_in_prog={tt['in_program']} swing={tt['swing_rel_pct']}% "
          f"gen0_R2={g0:.4f}\n    prog={prog}", flush=True)
    # shuffled null: shuffle train y within games, refit seed 42 on PRIMARY split
    P = prep_split(df, (2021, 2022), 2023)
    if not os.path.exists(est_path("shuffled", SEED_SHUFFLE)):
        rng = np.random.RandomState(0)
        ysh = P["ytrs"].copy()
        for gid in np.unique(P["gid_tr"]):
            idx = np.where(P["gid_tr"] == gid)[0]
            ysh[idx] = rng.permutation(ysh[idx])
        print("  shuffled: fitting...", flush=True)
        sest, mins = fit_sr(P["Xtr"], ysh, SEED_SHUFFLE)
        pickle.dump(sest, open(est_path("shuffled", SEED_SHUFFLE), "wb"))
        print(f"  shuffled: done in {mins:.1f} min", flush=True)
    else:
        print("  shuffled: checkpoint exists, skipping fit", flush=True)
    sest = pickle.load(open(est_path("shuffled", SEED_SHUFFLE), "rb"))
    sh_r2 = r2(P["ytes"], sest.predict(P["Xte"]))
    out["shuffled"] = dict(seed=SEED_SHUFFLE, test_r2=round(sh_r2, 4),
                           program=str(sest._program),
                           length=sest._program.length_)
    print(f"  shuffled-target R2={sh_r2:.4f} prog={sest._program}", flush=True)
    json.dump(out, open(f"{WORK}/wpa2_robust_eval_repl_shuff.json", "w"), indent=2)
    mark("eval_replication_shuffle")

def phase_assemble():
    ev = json.load(open(f"{WORK}/wpa2_robust_eval_primary.json"))
    rs = json.load(open(f"{WORK}/wpa2_robust_eval_repl_shuff.json"))
    B = ev["baselines"]; best = ev["best"]
    rows = []
    for name, v in [("B1 (train mean)", B["B1_train_mean"]),
                    ("B2 (human heuristic)", B["B2_human_heuristic"]),
                    ("B3 (GLI-0.1 calibrated)", B["B3_GLI_calibrated"]),
                    ("B4 (HGB ceiling)", B["B4_HGB_ceiling"])]:
        rows.append({"split": "primary", "model": name, "seed": "-", "test_R2": v})
    for s in ev["sr"]:
        rows.append({"split": "primary", "model": "SR_logcosh", "seed": s["seed"],
                     "test_R2": s["test_r2"], "length": s["length"],
                     "gen0_implied_train_R2": s["gen0_implied_train_r2"]})
    rows.append({"split": "replication", "model": "SR_logcosh", "seed": rs["replication"]["seed"],
                 "test_R2": rs["replication"]["test_r2"]})
    rows.append({"split": "primary", "model": "SR_logcosh_shuffled_y",
                 "seed": rs["shuffled"]["seed"], "test_R2": rs["shuffled"]["test_r2"]})
    pd.DataFrame(rows).to_csv(f"{WORK}/wpa2_robust_results.csv", index=False)
    # criteria
    c1 = best["test_r2"] > 0.05
    c2 = (best["test_r2"] - B["B2_human_heuristic"]) >= 0.02
    c3 = rs["replication"]["test_r2"] > 0.03
    c4 = best["time_term"]["retained"]
    c5 = rs["shuffled"]["test_r2"] <= 0.05
    falsified = (best["time_term"]["is_constant"]
                 or (not best["time_term"]["in_program"]
                     and not rs["replication"]["time_term"]["in_program"]))
    summary = dict(baselines=B, best=best,
                   replication=rs["replication"], shuffled=rs["shuffled"],
                   criteria={"c1_R2_gt_0.05": [c1, best["test_r2"]],
                             "c2_beats_B2_by_0.02": [c2, round(best["test_r2"] - B["B2_human_heuristic"], 4)],
                             "c3_replicates_gt_0.03": [c3, rs["replication"]["test_r2"]],
                             "c4_time_term_retained": [c4, best["time_term"]],
                             "c5_shuffled_le_0.05": [c5, rs["shuffled"]["test_r2"]]},
                   falsified=falsified,
                   all_pass=all([c1, c2, c3, c4, c5]))
    json.dump(summary, open(SUMMARY, "w"), indent=2)
    print("\n=== SUMMARY ===", flush=True)
    print(json.dumps(summary["criteria"], indent=2), flush=True)
    print(f"falsified={falsified} all_pass={summary['all_pass']}", flush=True)
    mark("assemble")

def main():
    import sys
    c = ckpt()
    if "fit_primary" not in c["done"]:
        phase_fit_primary()
    if "eval_primary" not in c["done"]:
        phase_eval_primary()
    if "fit_replication" not in c["done"]:
        phase_fit_replication()
    if "eval_replication_shuffle" not in c["done"]:
        phase_eval_replication_and_shuffle()
    if "assemble" not in c["done"]:
        phase_assemble()
    print("\nALL PHASES COMPLETE", flush=True)

if __name__ == "__main__":
    main()
