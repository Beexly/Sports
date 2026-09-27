"""Experiment 2 — Time-stratified SR on WPA^2 (MOVE-37-ANALYSIS-04, section 1.3, Redesign A).

SPEC CORRECTION (documented, not silent): the paste defines strata on
quarter_seconds_remaining (qsec > 2700 = "Q1", qsec < 900 = "Q4"). In nflfastR,
quarter_seconds_remaining is SECONDS REMAINING IN THE QUARTER (max 900); the
paste's author assumed game-level seconds. With that column the spec's strata
are degenerate (Q1 stratum = 0 rows, Q4 stratum = all rows). The spec's INTENT
is unambiguous — early-game plays where time is ~constant vs late-game plays
where time varies maximally — so stratification uses game_seconds_remaining:
  EARLY stratum: game_seconds_remaining > 2700  (1st quarter; time ~constant)
  LATE  stratum: game_seconds_remaining < 900   (4th quarter; time varies max)
The SR feature set is UNCHANGED (W1, X4 = quarter_seconds_remaining); inside
the LATE stratum (all Q4/OT plays) quarter_seconds_remaining == game seconds
remaining, so the end-of-game time gradient is present in X4 exactly where the
conditional-contribution hypothesis says it should matter.

Pre-registered interpretation rule:
  - LATE-stratum SR discovers a quarter_seconds_remaining (X4) term on either
    split  -> conditional-contribution hypothesis CONFIRMED.
  - No X4 term in ANY LATE-stratum program on BOTH splits ->
    search-space limitation CONFIRMED at the strongest possible test.
EARLY stratum is a control: time ~constant, so no time term is expected; the
|score_differential| term should reappear (sanity that SR still works in-stratum).

Protocol (reused from REPORT_WPA2_ROBUST): target y = wpa^2, clipped at the
stratum-train 99th pct, standardized on stratum-train; 9 W1 features,
standardized with StandardScaler fit on stratum-train; gplearn
SymbolicRegressor, log-cosh fitness, function set
{add,sub,mul,div,sqrt,log,abs,inv,tanh}, pop 2000 x 30 gens, parsimony 0.001.
Seeds: LATE [42,123,7] (critical stratum), EARLY [42,123].
Splits: primary train 2021-2022 -> test 2023; replication train 2021-2023 -> test 2024.

New harness diagnostics per stratum x split (§7):
  - GBM ceiling probe + multi-tier gate + structure diagnostic
  - gen-0 diagnostic (1-gen probe; gap > 0.15 -> attractor suspect)
  - ALL baselines affine-calibrated before R^2 comparison
  - smooth-linear simplification test on the best formula
  - row-alignment guard on every evaluation frame

Phases (each checkpointed; safe to re-run, skips finished phases):
  P0 probe gates + gen-0 diagnostics (fast, no 30-gen fits)
  P1/P2 fit + eval LATE primary | P3/P4 fit + eval LATE replication
  P5/P6 fit + eval EARLY primary | P7/P8 fit + eval EARLY replication
  P9 assemble JSON + verdicts
"""
import warnings, time, pickle, os, json, sys
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.metrics import r2_score
from sklearn.preprocessing import StandardScaler
from gplearn.genetic import SymbolicRegressor
from gplearn.functions import make_function
from gplearn.fitness import make_fitness

sys.path.insert(0, "/home/hatch/workspace/gse-discovery")
import tournament as T

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"
CKPT = f"{WORK}/wpa2_strat_ckpt.json"
ESTDIR = f"{WORK}/wpa2_strat_ests"
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
SEEDS = {"LATE": [42, 123, 7], "EARLY": [42, 123]}
STRATA = {"EARLY": ("game_seconds_remaining", ">", 2700),
          "LATE": ("game_seconds_remaining", "<", 900)}
SPLITS = {"primary": ((2021, 2022), 2023), "replication": ((2021, 2022, 2023), 2024)}

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
    df = df.dropna(subset=FEATS + ["wpa", "wp", "game_id", "season",
                                   "game_seconds_remaining"]).reset_index(drop=True)
    return df

def stratify(df, stratum):
    col, op, thr = STRATA[stratum]
    m = df[col] > thr if op == ">" else df[col] < thr
    return df[m].reset_index(drop=True)

def prep_split(dstr, train_seasons, test_season):
    dtr = dstr[dstr.season.isin(train_seasons)].reset_index(drop=True)
    dte = dstr[dstr.season == test_season].reset_index(drop=True)
    T.row_alignment_guard(len(dtr), dtr[FEATS].to_numpy(), dtr["wpa"].to_numpy(),
                          name="prep_split/train")
    T.row_alignment_guard(len(dte), dte[FEATS].to_numpy(), dte["wpa"].to_numpy(),
                          dte["wp"].to_numpy(),
                          dte["quarter_seconds_remaining"].to_numpy(),
                          name="prep_split/test")
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
                mu=mu, sd=sd, cap=cap, scaler=sc,
                wp_te=dte["wp"].to_numpy(float),
                qsec_te=dte["quarter_seconds_remaining"].to_numpy(float),
                dtr=dtr, dte=dte, n_tr=len(dtr), n_te=len(dte))

def r2(y, p):
    p = np.asarray(p, float); m = np.isfinite(p)
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
    t0 = time.time(); est.fit(Xtr, ytrs)
    return est, (time.time() - t0) / 60

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

def est_path(stratum, split, seed):
    return f"{ESTDIR}/{stratum}_{split}_seed{seed}.pkl"

def baselines(P):
    """ALL baselines affine-calibrated (§7 fix 1)."""
    out = {}
    b1 = float(P["ytrs"].mean())
    out["B1_train_mean"] = round(r2(P["ytes"], np.full_like(P["ytes"], b1)), 4)
    b2_raw_tr = 4 * P["dtr"]["wp"].to_numpy(float) * (1 - P["dtr"]["wp"].to_numpy(float)) \
        * (1 - P["dtr"]["quarter_seconds_remaining"].to_numpy(float) / 3600)
    b2_raw_te = 4 * P["wp_te"] * (1 - P["wp_te"]) * (1 - P["qsec_te"] / 3600)
    b2c, a2, s2 = T.affine_calibrate(P["ytrs"], b2_raw_tr, b2_raw_te)
    out["B2_human_heuristic_calibrated"] = round(r2(P["ytes"], b2c), 4)
    out["B2_affine"] = [round(a2, 4), round(s2, 6)]
    g_tr, g_te = gli_raw(P["dtr"]), gli_raw(P["dte"])
    g3c, a3, s3 = T.affine_calibrate(P["ytrs"], g_tr, g_te)
    out["B3_GLI_calibrated"] = round(r2(P["ytes"], g3c), 4)
    out["B3_affine"] = [round(a3, 4), round(s3, 6)]
    return out

def diagnostics(P, stratum, split):
    """GBM ceiling gate + gen-0 diagnostic + tail report (§7 fixes 2,3,4)."""
    gate = T.gbm_ceiling_probe(P["Xtr"], P["ytrs"], P["Xte"], P["ytes"], seed=42)
    g0 = T.gen0_diagnostic(P["Xtr"], P["ytrs"], P["Xte"], P["ytes"],
                           function_set=FUNCS, seed=42, loss='logcosh')
    tail = T.tail_report(P["ytrs"], name=f"wpa2_{stratum}_{split}_train")
    print(f"  [{stratum}/{split}] n_tr={P['n_tr']} n_te={P['n_te']} "
          f"clip99={P['cap']:.4f} tail_kurt={tail['excess_kurtosis']}", flush=True)
    print(f"    GBM ceiling={gate['ceiling']} tier={gate['tier']} "
          f"ols_linear={gate['ols_linear_r2']}", flush=True)
    if gate["structure"]:
        print(f"    structure: {gate['structure']['note']}", flush=True)
    print(f"    gen0: train={g0['gen0_train_r2']} test={g0['gen0_test_r2']} "
          f"gap={g0['gap']} attractor_suspect={g0['attractor_suspect']}", flush=True)
    return {"gate": gate, "gen0": g0, "tail": tail,
            "n_tr": P["n_tr"], "n_te": P["n_te"], "clip99": round(P["cap"], 4)}

def phase_probe():
    df = load()
    out = {}
    for stratum in ("LATE", "EARLY"):
        dstr = stratify(df, stratum)
        out[stratum] = {"n_total": len(dstr)}
        for split, (trs, tes) in SPLITS.items():
            P = prep_split(dstr, trs, tes)
            out[stratum][split] = diagnostics(P, stratum, split)
            out[stratum][split]["baselines"] = baselines(P)
            B = out[stratum][split]["baselines"]
            print(f"    baselines: B1={B['B1_train_mean']} "
                  f"B2_cal={B['B2_human_heuristic_calibrated']} "
                  f"B3_cal={B['B3_GLI_calibrated']}", flush=True)
    json.dump(out, open(f"{WORK}/wpa2_strat_probe.json", "w"), indent=2)
    mark("probe")

def phase_fit(stratum, split):
    df = load(); dstr = stratify(df, stratum)
    trs, tes = SPLITS[split]
    P = prep_split(dstr, trs, tes)
    print(f"[fit {stratum}/{split}] n_tr={P['n_tr']} n_te={P['n_te']}", flush=True)
    for seed in SEEDS[stratum]:
        ep = est_path(stratum, split, seed)
        if os.path.exists(ep):
            print(f"  seed {seed}: checkpoint exists, skipping", flush=True)
            continue
        print(f"  seed {seed}: fitting...", flush=True)
        est, mins = fit_sr(P["Xtr"], P["ytrs"], seed)
        pickle.dump(est, open(ep, "wb"))
        print(f"  seed {seed}: done in {mins:.1f} min, prog={est._program}", flush=True)
    mark(f"fit_{stratum}_{split}")

def phase_eval(stratum, split):
    df = load(); dstr = stratify(df, stratum)
    trs, tes = SPLITS[split]
    P = prep_split(dstr, trs, tes)
    recs = []
    for seed in SEEDS[stratum]:
        est = pickle.load(open(est_path(stratum, split, seed), "rb"))
        prog = str(est._program)
        tr2 = r2(P["ytes"], est.predict(P["Xte"]))
        tt = time_term_check(prog, est, P["scaler"], P["Xte_raw"])
        try:
            g0b = min(est._programs[0], key=lambda p: p.raw_fitness_)
            g0 = r2(P["ytrs"], g0b.execute(P["Xtr"]))
        except Exception:
            g0 = float("nan")
        rec = dict(seed=seed, test_r2=round(tr2, 4), length=est._program.length_,
                   program=prog, time_term=tt,
                   gen0_implied_train_r2=round(g0, 4) if np.isfinite(g0) else None)
        recs.append(rec)
        print(f"  [{stratum}/{split}] seed {seed}: test_R2={tr2:.4f} "
              f"len={est._program.length_} X4_in_prog={tt['in_program']} "
              f"swing={tt['swing_rel_pct']}% retained={tt['retained']} "
              f"gen0_R2={g0:.4f}\n    prog={prog}", flush=True)
    best = max(recs, key=lambda d: d["test_r2"])
    sl = T.smooth_linear_test(lambda X: pickle.load(
        open(est_path(stratum, split, best["seed"]), "rb")).predict(X),
        P["Xte"], P["ytes"])
    print(f"  [{stratum}/{split}] BEST seed {best['seed']} R2={best['test_r2']} "
          f"smooth-linear: formula={sl['formula_test_r2']} linear={sl['smooth_linear_test_r2']} "
          f"kink_decoration={sl['kink_is_decoration']}", flush=True)
    out = {"sr": recs, "best": best, "smooth_linear_test": sl,
           "baselines": baselines(P)}
    json.dump(out, open(f"{WORK}/wpa2_strat_eval_{stratum}_{split}.json", "w"), indent=2)
    mark(f"eval_{stratum}_{split}")

def phase_assemble():
    probe = json.load(open(f"{WORK}/wpa2_strat_probe.json"))
    res = {}
    for stratum in ("LATE", "EARLY"):
        res[stratum] = {}
        for split in SPLITS:
            res[stratum][split] = json.load(
                open(f"{WORK}/wpa2_strat_eval_{stratum}_{split}.json"))
    # pre-registered verdicts
    late_progs = [s for split in SPLITS
                  for s in res["LATE"][split]["sr"]]
    late_any_x4 = any(s["time_term"]["retained"] for s in late_progs)
    late_any_in_prog = any(s["time_term"]["in_program"] for s in late_progs)
    if late_any_x4:
        verdict_late = ("CONFIRMED — conditional-contribution hypothesis: a retained "
                        "quarter_seconds_remaining term was discovered in the LATE stratum")
    elif late_any_in_prog:
        verdict_late = ("PARTIAL — X4 appears in a program but fails the retention "
                        "(swing) test; search-space limitation likely")
    else:
        verdict_late = ("SEARCH-SPACE LIMITATION CONFIRMED at the strongest test — "
                        "no quarter_seconds_remaining term in any LATE-stratum program "
                        "on either split")
    early_progs = [s for split in SPLITS
                   for s in res["EARLY"][split]["sr"]]
    early_any_x4 = any(s["time_term"]["retained"] for s in early_progs)
    verdict_early = ("control: " +
                     ("UNEXPECTED — time term retained in EARLY stratum"
                      if early_any_x4 else
                      "as expected — no time term in EARLY stratum (time ~constant)"))
    summary = {"probe": probe, "results": res,
               "verdict_LATE": verdict_late, "verdict_EARLY": verdict_early,
               "spec_correction": ("quarter_seconds_remaining is quarter-level "
                                   "(max 900); stratified on game_seconds_remaining "
                                   "to preserve the spec's intent")}
    json.dump(summary, open(f"{WORK}/wpa2_strat_summary.json", "w"), indent=2)
    print("\n=== VERDICTS ===", flush=True)
    print("LATE:", verdict_late, flush=True)
    print("EARLY:", verdict_early, flush=True)
    mark("assemble")

def main():
    c = ckpt()
    if "probe" not in c["done"]:
        phase_probe()
    for stratum in ("LATE", "EARLY"):
        for split in SPLITS:
            if f"fit_{stratum}_{split}" not in c["done"]:
                phase_fit(stratum, split)
            if f"eval_{stratum}_{split}" not in c["done"]:
                phase_eval(stratum, split)
    if "assemble" not in c["done"]:
        phase_assemble()
    print("\nALL PHASES COMPLETE", flush=True)

if __name__ == "__main__":
    main()
