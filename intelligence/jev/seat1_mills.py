"""Seat-1 mills: frozen-w split test + walk-forward CRPS vs close.

PRE-REGISTRATIONS:
1. Split weight: choose w* = argmax mean Spearman over 2019-2023 walk-forwards
   (each season: W1-8 split-adjusted ratings, W9-18 test, in-train linear scale).
   Freeze w*. Kill: on 2024-2025 pooled test, Spearman(w*) must beat Spearman(w=0.5)
   by >= 0.05. If not, keep pooled EPA (w=0.5) and the split is descriptive-only.
2. CRPS: Gaussian predictive CRPS with per-week in-train residual sd, both sides
   (model margin and market spread through identical machinery). Kill (locked,
   restated): model must beat close by >= 0.01 CRPS on n >= 150 to be anything but
   a Rung 2 prior. Prediction: FAIL.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr, norm
from split_validation import team_game_splits, adjust

DATA = "data"
HFA = 2.0
TRAIN_SEASONS = [2019, 2020, 2021, 2022, 2023]
TEST_SEASONS = [2024, 2025]
W_GRID = [round(0.30 + 0.05 * i, 2) for i in range(13)]


def season_pred(year, w):
    tg = team_game_splits(year)
    sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
    s = sched[(sched.season == year) & (sched.game_type == "REG")].dropna(
        subset=["home_score", "away_score"]).copy()
    s["margin"] = s.home_score - s.away_score
    trn_g = tg[tg.week <= 8]
    tst = s[((s.week >= 9) & (s.week <= 18))].dropna(subset=["margin", "spread_line"])
    pr, pdf_ = adjust(trn_g, "pass_rate", "pass_def")
    rr, rdf = adjust(trn_g, "rush_rate", "rush_def")
    tm = s[s.week <= 8].set_index("game_id")

    def sc(row_home, row_away, w_):
        return (w_ * ((pr.get(row_home, np.nan) - pdf_.get(row_home, np.nan))
                      - (pr.get(row_away, np.nan) - pdf_.get(row_away, np.nan)))
                + (1 - w_) * ((rr.get(row_home, np.nan) - rdf.get(row_home, np.nan))
                              - (rr.get(row_away, np.nan) - rdf.get(row_away, np.nan)))
                + HFA)

    keep = tst[tst.home_team.isin(pr.index) & tst.away_team.isin(pr.index)]
    # in-train fit of scale + residual sd
    tsc, tmg = [], []
    seen = set()
    for r in trn_g.itertuples():
        if r.game_id in seen or r.game_id not in tm.index:
            continue
        seen.add(r.game_id)
        h, a = tm.loc[r.game_id, "home_team"], tm.loc[r.game_id, "away_team"]
        s_val = sc(h, a, w)
        m_val = tm.loc[r.game_id, "margin"]
        if np.isfinite(s_val) and np.isfinite(m_val):
            tsc.append(s_val)
            tmg.append(m_val)
    if len(tsc) < 8:
        return None
    A = np.vstack([tsc, np.ones(len(tsc))]).T
    a_fit, b_fit = np.linalg.lstsq(A, np.array(tmg), rcond=None)[0]
    resid = np.array(tmg) - (a_fit * np.array(tsc) + b_fit)
    sd = float(np.std(resid, ddof=1))
    pred = a_fit * keep.home_team.map(lambda h: sc(h, r"__away__", 0)).values * 0  # placeholder
    # vectorized test predictions
    ph = keep.home_team.map(lambda h: pr.get(h, np.nan) - pdf_.get(h, np.nan))
    pa = keep.away_team.map(lambda a: pr.get(a, np.nan) - pdf_.get(a, np.nan))
    rh = keep.home_team.map(lambda h: rr.get(h, np.nan) - rdf.get(h, np.nan))
    ra = keep.away_team.map(lambda a: rr.get(a, np.nan) - rdf.get(a, np.nan))
    score = w * (ph - pa) + (1 - w) * (rh - ra) + HFA
    pred = a_fit * score + b_fit
    return keep.assign(pred=pred, sd=sd)


def crps_gaussian(m, s, y):
    z = (y - m) / s
    return s * (z * (2 * norm.cdf(z) - 1) + 2 * norm.pdf(z) - 1 / np.sqrt(np.pi))


# ---- 1. choose w* on 2019-2023 ----
rows = []
for y in TRAIN_SEASONS:
    for w in W_GRID:
        k = season_pred(y, w)
        if k is None:
            continue
        rows.append({"season": y, "w": w,
                     "spearman": float(spearmanr(k.pred, k.margin).statistic),
                     "rmse": float(np.sqrt(np.mean((k.pred - k.margin) ** 2)))})
tr = pd.DataFrame(rows)
means = tr.groupby("w").spearman.mean()
w_star = float(means.idxmax())
print("=== split-weight train folds (2019-2023 mean Spearman by w) ===")
print(means.round(4).to_string())
print(f"w* = {w_star}")

# ---- 2. frozen-w test on 2024-2025 pooled ----
test_parts, test_pooled = [], []
for y in TEST_SEASONS:
    kw = season_pred(y, w_star)
    k0 = season_pred(y, 0.5)
    test_parts.append((y,
                       float(spearmanr(kw.pred, kw.margin).statistic),
                       float(spearmanr(k0.pred, k0.margin).statistic)))
    test_pooled.append(kw.assign(model=f"w*={w_star}"))
    test_pooled.append(k0.assign(model="pooled=0.5"))
print("\n=== frozen-w test (per season + pooled) ===")
for y, sw, s0 in test_parts:
    print(f"{y}: w*={w_star} SP {sw:.4f} | pooled SP {s0:.4f} | lift {sw - s0:+.4f}")
tp = pd.concat(test_pooled)
sp_w = float(spearmanr(tp[tp.model == f"w*={w_star}"].pred, tp[tp.model == f"w*={w_star}"].margin).statistic)
sp_0 = float(spearmanr(tp[tp.model == "pooled=0.5"].pred, tp[tp.model == "pooled=0.5"].margin).statistic)
print(f"POOLED TEST: w* SP {sp_w:.4f} vs pooled SP {sp_0:.4f} -> lift {sp_w - sp_0:+.4f} "
      f"(kill >= +0.05: {'PASS' if sp_w - sp_0 >= 0.05 else 'FAIL'})")
tp.to_csv(f"{DATA}/split_frozen_w_test.csv", index=False)

# ---- 3. walk-forward CRPS 2025 (model vs close, identical machinery) ----
print("\n=== 2025 walk-forward CRPS (W2-W18, prior-week fits) ===")
from extend_validation_v2 import load_pbp, team_game_epa, ratings_iterative
year = 2025
pbp = load_pbp(year)
tg = team_game_epa(year)
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
s = sched[(sched.season == year) & (sched.game_type == "REG")].dropna(
    subset=["home_score", "away_score"]).copy()
s["margin"] = s.home_score - s.away_score
recs = []
for w in sorted(s.week.unique()):
    if w < 2:
        continue
    trn = tg[tg.week < w]
    r = ratings_iterative(trn)
    wk = s[s.week == w]
    keep = wk[wk.home_team.isin(r.index) & wk.away_team.isin(r.index)].copy()
    if len(keep) == 0:
        continue

    def net(h, a):
        return ((r.loc[h, "off"] - r.loc[h, "def"]) - (r.loc[a, "off"] - r.loc[a, "def"]))

    keep["adj_score"] = [net(h, a) + HFA for h, a in zip(keep.home_team, keep.away_team)]
    tm = s[s.week < w].set_index("game_id")
    tg1 = trn.drop_duplicates("game_id")
    sc_t, mg_t, sp_t = [], [], []
    for row in tg1.itertuples():
        if row.game_id not in tm.index:
            continue
        h, a = tm.loc[row.game_id, "home_team"], tm.loc[row.game_id, "away_team"]
        sc_t.append(net(h, a) + HFA)
        mg_t.append(tm.loc[row.game_id, "margin"])
        sl = tm.loc[row.game_id, "spread_line"]
        if pd.notna(sl):
            sp_t.append((sl, tm.loc[row.game_id, "margin"]))
    A = np.vstack([sc_t, np.ones(len(sc_t))]).T
    a_fit, b_fit = np.linalg.lstsq(A, np.array(mg_t), rcond=None)[0]
    sd_adj = float(np.std(np.array(mg_t) - (a_fit * np.array(sc_t) + b_fit), ddof=1))
    sp_arr = np.array(sp_t)
    A2 = np.vstack([sp_arr[:, 0], np.ones(len(sp_arr))]).T
    ma, mb = np.linalg.lstsq(A2, sp_arr[:, 1], rcond=None)[0]
    sd_mkt = float(np.std(sp_arr[:, 1] - (ma * sp_arr[:, 0] + mb), ddof=1))
    keep["m_pred"] = a_fit * keep.adj_score + b_fit
    keep["m_mkt"] = ma * keep.spread_line + mb
    keep["sd_adj"] = sd_adj
    keep["sd_mkt"] = sd_mkt
    recs.append(keep[["game_id", "margin", "m_pred", "m_mkt", "sd_adj", "sd_mkt"]])
wf = pd.concat(recs, ignore_index=True)
wf["crps_adj"] = [crps_gaussian(m, sd, y) for m, sd, y in
                  zip(wf.m_pred, wf.sd_adj, wf.margin)]
wf["crps_mkt"] = [crps_gaussian(m, sd, y) for m, sd, y in
                  zip(wf.m_mkt, wf.sd_mkt, wf.margin)]
print(f"n games: {len(wf)} (n team-games: {2 * len(wf)})")
print(f"CRPS adj (DAVE 2025 walk-forward): {wf.crps_adj.mean():.3f}  mean sd {wf.sd_adj.mean():.2f}")
print(f"CRPS close (market):               {wf.crps_mkt.mean():.3f}  mean sd {wf.sd_mkt.mean():.2f}")
print(f"locked fleet close CRPS: 7.109 | locked DAVE k=8: 7.500 (n~1,871, 2019-2025)")
wf.to_csv(f"{DATA}/walkforward_2025_crps.csv", index=False)
