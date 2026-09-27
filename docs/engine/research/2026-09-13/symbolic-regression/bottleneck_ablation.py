"""Experiment 2 — Min-bottleneck ablation (MOVE-37-ANALYSIS-02, section 3).

Discovered formula (round 1, raw football units):
  score_drive ~= sin(|-0.2007*ydstogo + min(0.0446*yardline_100 - 2.3621,
                                            0.2007*ydstogo - 1.0574) + 1.0574|^0.5)
b = field-position term, c = distance term. NOTE: yardline_100 is yards from OWN
goal line (99 = opponent's 1). Boundary b==c: yl = 4.5*ytg + 29.25.

Protocol (paste 3.3-3.5):
  - Ablation: replace min(b,c) with b alone, c alone, (b+c)/2, max(b,c).
    Refit the output mapping on train (logistic regression of y on the scalar
    variant output), compare holdout AUC. Also report raw (unrefit) AUC.
    Pre-registered prediction: min beats all alternatives by >= 0.02 AUC.
  - Football interpretation: map which term binds on the (yardline, ydstogo) grid.
    Spec expectation: goal-line (yl>90) -> c binds; own territory (yl<20) -> b binds.
  - Cross-era: refit output mapping on 2020-2022, test 2023-2024.
    Prediction: AUC > 0.54; kill if < 0.52.
"""
import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier

WORK = "/home/hatch/workspace/gse-discovery/symbolic-regression"
FEATS = ["yardline_100", "game_seconds_remaining", "qtr",
         "score_differential", "down", "ydstogo"]

def b_term(yl):
    return 0.0446 * yl - 2.3621
def c_term(ytg):
    return 0.2007 * ytg - 1.0574
def wrap(v, ytg):
    return np.sin(np.abs(-0.2007 * ytg + v + 1.0574) ** 0.5)

def variant_scalar(name, yl, ytg):
    """Raw scalar variants (no sin wrapper) + the full discovered formula."""
    b, c = b_term(yl), c_term(ytg)
    if name == "formula_min":
        return wrap(np.minimum(b, c), ytg)
    if name == "min(b,c)":
        return np.minimum(b, c)
    if name == "max(b,c)":
        return np.maximum(b, c)
    if name == "b alone":
        return b
    if name == "c alone":
        return c
    if name == "(b+c)/2":
        return (b + c) / 2
    if name == "c-b (smooth, no kink)":
        return c - b
    if name == "|c-b|":
        return np.abs(c - b)
    raise ValueError(name)

def auc_of(yte, score):
    try:
        return round(float(roc_auc_score(yte, score)), 4)
    except Exception:
        return float("nan")

def main():
    df = pd.read_parquet(f"{WORK}/data/target_b.parquet")
    out = {}

    # ---------- ablation on round-1 split (train <=2023, test >=2024) ----------
    tr = df[df.season <= 2023].reset_index(drop=True)
    te = df[df.season >= 2024].reset_index(drop=True)
    ytr = tr["scored"].to_numpy(float); yte = te["scored"].to_numpy(float)
    print(f"ablation split: train n={len(tr)} (base {ytr.mean():.3f}), "
          f"test n={len(te)} (base {yte.mean():.3f})", flush=True)
    variants = ["formula_min", "min(b,c)", "max(b,c)", "b alone", "c alone",
                "(b+c)/2", "c-b (smooth, no kink)", "|c-b|"]
    auc_raw, auc_refit = {}, {}
    for v in variants:
        str_ = variant_scalar(v, tr["yardline_100"].to_numpy(float), tr["ydstogo"].to_numpy(float))
        ste = variant_scalar(v, te["yardline_100"].to_numpy(float), te["ydstogo"].to_numpy(float))
        auc_raw[v] = auc_of(yte, ste)
        lr = LogisticRegression(max_iter=1000).fit(str_.reshape(-1, 1), ytr)
        auc_refit[v] = auc_of(yte, lr.predict_proba(ste.reshape(-1, 1))[:, 1])
        print(f"  {v:22s} raw_AUC={auc_raw[v]:.4f} refit_AUC={auc_refit[v]:.4f}", flush=True)
    hgb = HistGradientBoostingClassifier(random_state=42).fit(tr[FEATS].to_numpy(float), ytr)
    hgb_auc = round(float(roc_auc_score(yte, hgb.predict_proba(te[FEATS].to_numpy(float))[:, 1])), 4)
    print(f"  HGB reference AUC={hgb_auc:.4f}", flush=True)
    best_alt = max([a for k, a in auc_refit.items() if k not in ("formula_min", "min(b,c)")])
    margin = auc_refit["min(b,c)"] - best_alt
    pred_ok = margin >= 0.02
    print(f"  min(b,c) vs best alternative: {margin:+.4f} -> "
          f"prediction(>=0.02): {'PASS' if pred_ok else 'FAIL'}", flush=True)
    # kink-vs-smooth: does the hard kink add anything over the smooth (c-b)?
    kink_margin = auc_refit["min(b,c)"] - auc_refit["c-b (smooth, no kink)"]
    print(f"  min(b,c) vs smooth (c-b): {kink_margin:+.4f}", flush=True)
    out["ablation"] = dict(raw=auc_raw, refit=auc_refit, hgb=hgb_auc,
                           margin_vs_best_alt=round(margin, 4), prediction_pass=pred_ok,
                           kink_vs_smooth=round(kink_margin, 4))

    # ---------- football interpretation: binding map ----------
    # Feasible combos only: ydstogo cannot exceed distance to goal (100 - yl).
    yl_grid = np.arange(1, 100)
    ytg_grid = np.arange(1, 26)
    YL, YTG = np.meshgrid(yl_grid, ytg_grid)
    feasible = YTG <= (100 - YL)
    binds_c = (c_term(YTG) < b_term(YL)) & feasible
    def frac_region(yl_lo, yl_hi):
        m = feasible[:, (yl_grid >= yl_lo) & (yl_grid < yl_hi)]
        bnd = binds_c[:, (yl_grid >= yl_lo) & (yl_grid < yl_hi)]
        return round(float(bnd.sum() / m.sum()), 3)
    print("\nbinding map — fraction of FEASIBLE (yl,ytg) grid where DISTANCE term c binds:",
          flush=True)
    gl = frac_region(90, 100); ot = frac_region(1, 20); mf = frac_region(40, 60)
    print(f"  goal-line region (yl 90-99):  {gl:.3f}  (spec expects ~1.0)", flush=True)
    print(f"  own-territory (yl 1-19):     {ot:.3f}  (spec expects ~0.0)", flush=True)
    print(f"  midfield (yl 40-59):         {mf:.3f}", flush=True)
    # observed-play check on the test set (not just the grid)
    yl_o = te["yardline_100"].to_numpy(float); ytg_o = te["ydstogo"].to_numpy(float)
    cb_o = c_term(ytg_o) < b_term(yl_o)
    gl_o = cb_o[yl_o >= 90].mean(); ot_o = cb_o[yl_o < 20].mean()
    print(f"  observed test plays: goal-line c-binds={gl_o:.3f} (n={(yl_o>=90).sum()}), "
          f"own-terr c-binds={ot_o:.3f} (n={(yl_o<20).sum()})", flush=True)
    spec_ok = gl > 0.9 and ot < 0.1
    print(f"  boundary matches spec expectation: {spec_ok}", flush=True)
    out["boundary"] = dict(goal_line_c_binds_grid=gl, own_terr_c_binds_grid=ot,
                           midfield_c_binds_grid=mf,
                           goal_line_c_binds_observed=round(float(gl_o), 3),
                           own_terr_c_binds_observed=round(float(ot_o), 3),
                           boundary_line="yl = 4.5*ytg + 29.25",
                           matches_spec=spec_ok)

    # ---------- cross-era: refit 2020-2022 -> test 2023-2024 ----------
    tr2 = df[df.season <= 2022].reset_index(drop=True)
    te2 = df[df.season.isin([2023, 2024])].reset_index(drop=True)
    ytr2 = tr2["scored"].to_numpy(float); yte2 = te2["scored"].to_numpy(float)
    ftr2 = variant_scalar("formula_min", tr2["yardline_100"].to_numpy(float), tr2["ydstogo"].to_numpy(float))
    fte2 = variant_scalar("formula_min", te2["yardline_100"].to_numpy(float), te2["ydstogo"].to_numpy(float))
    lr2 = LogisticRegression(max_iter=1000).fit(ftr2.reshape(-1, 1), ytr2)
    era_auc = round(float(roc_auc_score(yte2, lr2.predict_proba(fte2.reshape(-1, 1))[:, 1])), 4)
    era_raw = round(float(roc_auc_score(yte2, fte2)), 4)
    hgb2 = HistGradientBoostingClassifier(random_state=42).fit(tr2[FEATS].to_numpy(float), ytr2)
    hgb2_auc = round(float(roc_auc_score(yte2, hgb2.predict_proba(te2[FEATS].to_numpy(float))[:, 1])), 4)
    print(f"\ncross-era refit 2020-2022 (n={len(tr2)}) -> test 2023-2024 (n={len(te2)}):", flush=True)
    print(f"  min(b,c) refit AUC={era_auc:.4f} raw AUC={era_raw:.4f} HGB={hgb2_auc:.4f}", flush=True)
    era_pred = era_auc > 0.54
    era_kill = era_auc < 0.52
    print(f"  prediction AUC>0.54: {'PASS' if era_pred else 'FAIL'}; "
          f"kill AUC<0.52: {'KILLED' if era_kill else 'survives'}", flush=True)
    out["cross_era"] = dict(refit_auc=era_auc, raw_auc=era_raw, hgb_auc=hgb2_auc,
                            prediction_pass=era_pred, killed=era_kill)

    # ---------- verdict ----------
    live = pred_ok and spec_ok and not era_kill
    out["verdict"] = "LIVE" if live else "DIE"
    print(f"\nVERDICT: {out['verdict']}", flush=True)
    import json
    json.dump(out, open(f"{WORK}/bottleneck_results.json", "w"), indent=2)
    return out

if __name__ == "__main__":
    main()
