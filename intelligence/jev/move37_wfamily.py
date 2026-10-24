"""Move-37 lab: W5-W8 family duels vs dumb baselines, pre-registered kill lines.

Pre-registration (from the repo record, AGENTS.md machine-discovery lane):
  W5 Wasserstein (play-mix distance to next opponent) vs rolling-EPA(4): KILL if family R^2 < 0.02
  W6 DFA exponent of EPA sequence vs season-to-date mean EPA:         KILL if family R^2 < 0.01
  W7 intrinsic dimension of play-call manifold vs distinct play-type count: KILL if family R^2 < 0.02
  W8 permutation entropy of EPA sequence vs dropback rate (pass_oe proxy):  KILL if family R^2 < 0.02

Target (all families): team's NEXT-game offensive EPA/play. All features are
strictly causal (computed from games strictly before the target game).
Split: train 2019-2023, test 2024-2025. Model per duel: ridge (L2=1e-3,
features standardized with train stats) on [family] vs [baseline], same rows.
"""
import glob
import json
import math
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

DATA = "C:/workspace/gse-lab-20260919/data"
OUT_MD = "C:/workspace/gse-lab-20260919/move37_wfamily_results.md"
OUT_JSON = "C:/workspace/gse-lab-20260919/move37_wfamily_results.json"
TRAIN_SEASONS = [2019, 2020, 2021, 2022, 2023]
TEST_SEASONS = [2024, 2025]
WINDOW_PLAYS = 200     # per-play sequence length for W6/W7/W8
WINDOW_GAMES = 4       # for W5 distributions and the rolling-EPA baseline
MIN_PLAYS = 100
K_ID = 10              # kNN k for intrinsic-dim MLE (Levina-Bickel)
M_PERM = 4             # permutation-entropy embedding order

# ---------------------------------------------------------------- load
frames = []
for f in sorted(glob.glob(f"{DATA}/pbp_20*.csv.gz")):
    season = int(f.split("_")[-1].split(".")[0])
    if season > 2025:
        continue
    df = pd.read_csv(f, low_memory=False)
    keep = [c for c in ["game_id", "season", "season_type", "week", "posteam",
                        "home_team", "away_team", "play_type", "play_id", "epa",
                        "wp", "qb_kneel", "qb_spike", "qtr", "yardline_100",
                        "ydstogo", "down", "shotgun", "play_action",
                        "qb_dropback", "pass_length", "run_gap", "pass_location"]
            if c in df.columns]
    frames.append(df[keep])
pbp = pd.concat(frames, ignore_index=True)
pbp = pbp[(pbp.season_type == "REG") & (pbp.play_type.isin(["pass", "run"]))]
pbp = pbp[pbp.get("qb_kneel", 0) != 1]
pbp = pbp[pbp.get("qb_spike", 0) != 1]
pbp = pbp[np.isfinite(pbp.epa)]
if "wp" in pbp.columns:  # garbage-time filter: exclude decided 4th quarters
    q4 = pbp.qtr == 4
    pbp = pbp[~(q4 & ((pbp.wp >= 0.95) | (pbp.wp <= 0.05)) | pbp.wp.isna())]
pbp["defteam"] = np.where(pbp.posteam == pbp.home_team, pbp.away_team, pbp.home_team)
pbp = pbp.sort_values(["posteam", "season", "week"]).reset_index(drop=True)
print(f"filtered plays: {len(pbp):,}")

# --------------------------------------- cumulative defensive EPA by (season, defteam, week)
def_epa = (pbp[pbp.defteam.notna()]
           .groupby(["season", "defteam", "week"], as_index=False)
           .epa.apply(lambda s: np.sort(s.values))
           .rename(columns={"epa": "arr"}))
def_cum = {}  # (season, defteam) -> {week: concatenated array of all prior weeks}
for (season, dt), g in def_epa.groupby(["season", "defteam"]):
    cum, store = [], {}
    for _, r in g.sort_values("week").iterrows():
        store[int(r.week)] = np.concatenate(cum) if cum else np.array([])
        cum.append(r.arr)
    def_cum[(season, dt)] = store

# ------------------------------------------------- per (team, game) target
tg = pbp.groupby(["season", "posteam", "game_id", "week", "home_team", "away_team"],
                 as_index=False).agg(epa_play=("epa", "mean"), n=("epa", "size"))
tg = tg[tg.n >= 10].sort_values(["posteam", "season", "week"]).reset_index(drop=True)
tg["next_epa_play"] = tg.groupby("posteam").epa_play.shift(-1)
tg["next_opp"] = np.where(tg.posteam == tg.home_team, tg.away_team, tg.home_team)
tg["next_opp"] = tg.groupby("posteam").next_opp.shift(-1)
pbp_by_team = {t: g for t, g in pbp.groupby("posteam")}

# ------------------------------------------------------------- math helpers
def w1_dist(a, b):
    a, b = np.sort(np.asarray(a, float)), np.sort(np.asarray(b, float))
    allv = np.unique(np.concatenate([a, b]))
    cdf_a = np.searchsorted(a, allv, side="right") / len(a)
    cdf_b = np.searchsorted(b, allv, side="right") / len(b)
    span = max(allv.max() - allv.min(), 1e-9)
    return float(np.mean(np.abs(cdf_a - cdf_b)) * span)

def dfa_alpha(x):
    x = np.asarray(x, float)
    if len(x) < 32:
        return np.nan
    y = np.cumsum(x - x.mean())
    ns = np.unique(np.logspace(np.log10(4), np.log10(len(x) // 2), 8).astype(int))
    fs = []
    for n in ns:
        m = len(x) // n
        seg = y[: m * n].reshape(m, n)
        t = np.arange(n)
        tb = t - t.mean()
        coef = (seg * tb).sum(1) / (tb * tb).sum()
        fs.append(np.sqrt(np.mean((seg - coef[:, None] * t) ** 2)))
    fs = np.array(fs)
    ok = np.isfinite(fs) & (fs > 0)
    if ok.sum() < 4:
        return np.nan
    return float(np.polyfit(np.log(ns[ok]), np.log(fs[ok]), 1)[0])

def intrinsic_dim(x):
    """Levina-Bickel kNN MLE: m = [ (1/(k-1)) * sum_j ln(r_k / r_j) ]^-1."""
    x = np.asarray(x, float)
    n = len(x)
    if n < K_ID + 2:
        return np.nan
    d2 = ((x[:, None, :] - x[None, :, :]) ** 2).sum(-1)
    np.fill_diagonal(d2, np.inf)
    ds = np.sort(d2, 1)
    rk = np.sqrt(ds[:, K_ID - 1])            # k-th neighbour
    rj = np.sqrt(ds[:, 1:K_ID])              # 1..k-1 neighbours
    ok = (rk > 0) & (rj > 0).all(1)
    if ok.sum() < K_ID + 1:
        return np.nan
    s = (np.log(rk[ok][:, None] / rj[ok]).sum(1) / (K_ID - 1)).mean()
    return float(1.0 / s) if s > 0 else np.nan

def perm_entropy(x):
    x = np.asarray(x, float)
    if len(x) < M_PERM * 10:
        return np.nan
    n = len(x) - M_PERM + 1
    idx = np.arange(M_PERM) + np.arange(n)[:, None]
    pat = np.argsort(x[idx], axis=1)
    _, cnt = np.unique(pat, axis=0, return_counts=True)
    p = cnt / cnt.sum()
    return float(-(p * np.log(p)).sum() / math.log(math.factorial(M_PERM)))

MANIFOLD = [c for c in ["epa", "yardline_100", "ydstogo", "down", "shotgun", "play_action"]
            if c in pbp.columns]

def causal_features():
    rows = []
    for (team, season), g in tg.groupby(["posteam", "season"], sort=False):
        seq = pbp_by_team[team]
        seq = seq[seq.season == season]
        for i in range(1, len(g)):
            row = g.iloc[i]
            upto = seq[seq.week < row.week]
            if len(upto) < MIN_PLAYS:
                continue
            tail = upto.tail(WINDOW_PLAYS)
            f_w5 = np.nan
            opp = row.next_opp
            if isinstance(opp, str):
                store = def_cum.get((season, opp), {})
                prior = store.get(int(row.week), np.array([]))
                if len(prior) >= MIN_PLAYS:
                    f_w5 = -w1_dist(tail.epa.values, prior)
            recent_g = g.iloc[max(0, i - WINDOW_GAMES): i]
            pt = upto.pass_length.fillna("") + "|" + upto.run_gap.fillna("") + "|" + upto.pass_location.fillna("")
            rows.append({
                "season": season, "week": row.week, "team": team,
                "y": row.next_epa_play,
                "base_roll4": recent_g.epa_play.mean() if len(recent_g) else np.nan,
                "base_meane": g.epa_play.iloc[:i].mean(),
                "w5_wass": f_w5,
                "w6_dfa": dfa_alpha(tail.epa.values),
                "w7_id": intrinsic_dim(tail[MANIFOLD].values),
                "w8_pe": perm_entropy(tail.epa.values),
                "base_distinct": pt.nunique(),
                "base_dropback": upto.qb_dropback.mean() if "qb_dropback" in upto else np.nan,
            })
    return pd.DataFrame(rows)

feat = causal_features().dropna(subset=["y"])
print(f"feature rows: {len(feat):,}")

# ---------------------------------------------------------------- duels
def r2_ridge(rows_tr, rows_te, col):
    Xtr = np.c_[np.ones(len(rows_tr)), rows_tr[col].to_numpy(float)]
    ytr = rows_tr.y.to_numpy(float)
    mu, sd = Xtr[1:].mean(0), Xtr[1:].std(0) + 1e-9
    Xtr = (Xtr - mu) / sd
    Xtr[:, 0] = 1.0
    A = Xtr.T @ Xtr + 1e-3 * np.eye(Xtr.shape[1]); A[0, 0] -= 1e-3
    w = np.linalg.solve(A, Xtr.T @ ytr)
    Xte = np.c_[np.ones(len(rows_te)), rows_te[col].to_numpy(float)]
    Xte = (Xte - mu) / sd
    Xte[:, 0] = 1.0
    pred = Xte @ w
    yte = rows_te.y.to_numpy(float)
    return 1 - ((yte - pred) ** 2).sum() / ((yte - yte.mean()) ** 2).sum()

tr = feat[feat.season.isin(TRAIN_SEASONS)]
te = feat[feat.season.isin(TEST_SEASONS)]
DUELS = [
    ("W5", "Wasserstein play-mix distance to next opponent", "rolling-EPA(4)", "w5_wass", "base_roll4", 0.02),
    ("W6", "DFA exponent of EPA sequence", "season-to-date mean EPA", "w6_dfa", "base_meane", 0.01),
    ("W7", "intrinsic dim of play-call manifold (Levina-Bickel)", "distinct play-type count", "w7_id", "base_distinct", 0.02),
    ("W8", "permutation entropy of EPA sequence", "dropback rate (pass_oe proxy)", "w8_pe", "base_dropback", 0.02),
]
results = []
for fam, desc, base_name, fcol, bcol, kill in DUELS:
    tr2 = tr.dropna(subset=[fcol, bcol])
    te2 = te.dropna(subset=[fcol, bcol])
    fr2 = r2_ridge(tr2, te2, fcol)
    br2 = r2_ridge(tr2, te2, bcol)
    verdict = "KILLED" if fr2 < kill else "SURVIVES-to-next-gate"
    results.append({"family": fam, "description": desc, "target": "next-game offensive EPA/play",
                    "split": "train 2019-2023 / test 2024-2025", "n_train": len(tr2), "n_test": len(te2),
                    "family_r2": round(fr2, 4), "baseline_r2": round(br2, 4),
                    "baseline_name": base_name, "kill_line": kill, "verdict": verdict})
    print(f"{fam}: family R2={fr2:.4f} vs {base_name} R2={br2:.4f} (n_test={len(te2)}) -> {verdict}")

with open(OUT_JSON, "w") as f:
    json.dump(results, f, indent=1)
desc_of = {d[0]: d[1] for d in DUELS}
lines = ["# Move-37 W-family lab verdicts (2026-09-19)", "",
         "OBSERVATION: one ridge per duel, causal features, target = next-game offensive EPA/play.",
         "Filter: REG, pass/run, no kneels/spikes, decided-4Q garbage excluded. "
         f"Test rows per family below. Split: train 2019-2023, test 2024-2025.", ""]
for r in results:
    lines += [f"## {r['family']} — {r['description']}",
              f"- baseline: {r['baseline_name']}  R2={r['baseline_r2']}",
              f"- family R2={r['family_r2']} (kill line {r['kill_line']})  n_train={r['n_train']} n_test={r['n_test']}",
              f"- VERDICT: **{r['verdict']}**",
              "- LIMITATION: lab implementation of the theorist SPEC; window sizes fixed before running; "
              "single season split; features not opponent-adjusted except W5's distance term.", ""]
open(OUT_MD, "w").write("\n".join(lines))
print("wrote", OUT_MD)
