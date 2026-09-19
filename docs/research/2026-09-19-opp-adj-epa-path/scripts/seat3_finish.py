"""Seat-3 finish: totals CRPS vs close + aDOT Wilson + 4th&1 split + books replica.

PRE-REGISTRATIONS:
1. Totals: rolling independent-Poisson total (team prior-game scoring/allowing means,
   weeks >= 2), Normal CRPS approx with sd = sqrt(lambda_total). Market: N(total_line,
   sd fitted on prior weeks). Kill: model beats close by >= 0.01 CRPS. PREDICTION: FAIL.
2. aDOT>20 share at >=20 mph: Wilson non-overlap vs 0-14 required to graduate the
   deep-ball penalty. PREDICTION: FAIL (n=1,796).
3. Books-depth replica (locked claim, fresh rows): MLB spread hit rate by
   bookmakerCount bucket (3-9 vs 10+) on published non-bootstrap settled rows,
   STRATIFIED by modelVersion. Locked finding: v5.2.7 stratum not established.
"""
import json
import numpy as np
import pandas as pd
from scipy.stats import spearmanr, norm

DATA = "data"
OUT = {}


def wilson(k, n, z=1.96):
    if n == 0:
        return (np.nan, np.nan)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (c - h, c + h)


def crps_gaussian(m, s, y):
    z = (y - m) / s
    return s * (z * (2 * norm.cdf(z) - 1) + 2 * norm.pdf(z) - 1 / np.sqrt(np.pi))


# ---- 1. totals walk-forward CRPS, 2025 ----
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
s = sched[(sched.season == 2025) & (sched.game_type == "REG")].dropna(
    subset=["home_score", "away_score"]).copy()
s["total"] = s.home_score + s.away_score
s = s.sort_values("gameday").reset_index(drop=True)
long_pts = pd.concat([
    s[["game_id", "week", "home_team", "home_score"]].rename(
        columns={"home_team": "team", "home_score": "pts"}),
    s[["game_id", "week", "away_team", "away_score"]].rename(
        columns={"away_team": "team", "away_score": "pts"}),
])
long_alw = pd.concat([
    s[["game_id", "week", "away_team", "home_score"]].rename(
        columns={"away_team": "team", "home_score": "alw"}),
    s[["game_id", "week", "home_team", "away_score"]].rename(
        columns={"home_team": "team", "away_score": "alw"}),
])
recs = []
for w in sorted(s.week.unique()):
    if w < 2:
        continue
    hist_pts = long_pts[long_pts.week < w]
    hist_alw = long_alw[long_alw.week < w]
    wk = s[s.week == w].dropna(subset=["total_line"])
    rows = []
    for r in wk.itertuples():
        hp = hist_pts[hist_pts.team == r.home_team].pts.tail(6)
        ap = hist_pts[hist_pts.team == r.away_team].pts.tail(6)
        ha = hist_alw[hist_alw.team == r.home_team].alw.tail(6)
        aa = hist_alw[hist_alw.team == r.away_team].alw.tail(6)
        if len(hp) < 1 or len(ap) < 1 or len(ha) < 1 or len(aa) < 1:
            continue
        lam_h = (hp.mean() + aa.mean()) / 2
        lam_a = (ap.mean() + ha.mean()) / 2
        rows.append({"game_id": r.game_id, "total": r.total, "total_line": r.total_line,
                     "lam": lam_h + lam_a})
    recs.append(pd.DataFrame(rows))
wf = pd.concat(recs, ignore_index=True)
# market sd fitted on prior weeks (rolling): approximate with a global fit on first
# half, then per-week using prior totals-vs-line residuals
res = []
for w in sorted(s.week.unique()):
    if w < 3:
        continue
    d = wf[wf.game_id.isin(s[(s.week == w)].game_id)]
    prior = s[s.week < w].dropna(subset=["total_line"])
    sd_mkt = float((prior.total - prior.total_line).std())
    d = d.copy()
    d["crps_model"] = [crps_gaussian(l, np.sqrt(l), y) for l, y in zip(d.lam, d.total)]
    d["crps_mkt"] = [crps_gaussian(l, sd_mkt, y) for l, y in zip(d.total_line, d.total)]
    res.append(d[["crps_model", "crps_mkt"]])
tt = pd.concat(res, ignore_index=True)
OUT["totals_crps_2025"] = {
    "n_games": int(len(tt)),
    "model_crps": round(float(tt.crps_model.mean()), 3),
    "close_crps": round(float(tt.crps_mkt.mean()), 3),
    "verdict": "PASS" if tt.crps_model.mean() <= tt.crps_mkt.mean() - 0.01 else "FAIL",
}
print("=== totals CRPS (2025 rolling Poisson vs close) ===")
print(OUT["totals_crps_2025"])

# ---- 2. aDOT Wilson (rebuild from pbp quickly) ----
pa = []
for y in range(2023, 2026):
    pb = pd.read_csv(f"{DATA}/pbp_{y}.csv.gz", compression="gzip", low_memory=False,
                     usecols=["game_id", "season_type", "posteam", "play_type",
                              "air_yards"])
    sched_y = sched[sched.season == y][["game_id", "wind"]]
    pb = pb[(pb.season_type == "REG") & (pb.play_type == "pass") & pb.air_yards.notna()]
    pa.append(pb.merge(sched_y, on="game_id"))
pa3 = pd.concat(pa, ignore_index=True)
pa3["wb"] = np.where(pa3.wind < 15, "0-14", np.where(pa3.wind < 20, "15-19", ">=20"))
base = pa3[pa3.wb == "0-14"]
base_share = float((base.air_yards > 20).mean())
blo, bhi = wilson(int((base.air_yards > 20).sum()), len(base))
for b in ["15-19", ">=20"]:
    d = pa3[pa3.wb == b]
    share = float((d.air_yards > 20).mean())
    lo, hi = wilson(int((d.air_yards > 20).sum()), len(d))
    grad = (lo > bhi) or (hi < blo)
    print(f"aDOT>20 {b}: {share:.4f} Wilson [{lo:.4f},{hi:.4f}] vs base "
          f"[{blo:.4f},{bhi:.4f}] -> {'GRADUATES' if grad else 'no non-overlap'}")
    OUT[f"adot_{b}"] = {"share": round(share, 4), "n": len(d), "graduates": bool(grad)}

# ---- 3. 4th&1 run vs pass split ----
fth = []
for y in range(2019, 2026):
    pb = pd.read_csv(f"{DATA}/pbp_{y}.csv.gz", compression="gzip", low_memory=False,
                     usecols=["season_type", "down", "ydstogo", "play_type",
                              "first_down", "touchdown"])
    pb = pb[(pb.season_type == "REG") & (pb.down == 4)
            & pb.play_type.isin(["pass", "run"]) & (pb.ydstogo == 1)]
    fth.append(pb)
f = pd.concat(fth, ignore_index=True)
f["converted"] = ((f.first_down.fillna(0) == 1) | (f.touchdown.fillna(0) == 1)).astype(int)
OUT["fourth1_split"] = {
    "run": {"n": int((f.play_type == "run").sum()),
            "rate": round(float(f[f.play_type == "run"].converted.mean()), 4)},
    "pass": {"n": int((f.play_type == "pass").sum()),
             "rate": round(float(f[f.play_type == "pass"].converted.mean()), 4)},
}
print("\n=== 4th&1 by play type (2019-2025) ===")
print(OUT["fourth1_split"])

with open(f"{DATA}/seat3_finish.json", "w") as fjson:
    json.dump(OUT, fjson, indent=2)
print("saved data/seat3_finish.json")
