"""Multi-season repeat of the opponent-adjustment validation (2023/2024/2025).

v2 — fixes the v1 orientation bug: test-game scores now come from the SCHEDULE
(home_team/away_team/margin joined on game_id), never from team-game row order.

PRE-REGISTRATION (same kill line per season, stated before running):
- Train: weeks 1-8. Test: weeks 9-18. No test row touches fitting.
- ADJ = iterative opponent adjustment (repo algorithm: unweighted means, 100 iters).
- RAW = unadjusted mean off/def EPA/play.
- Margin model per method: margin ~ a*score + b fitted on TRAIN rows only,
  score = (net_home - net_away) + 2.0 (2.0 = fixed HFA prior, absorbed by b).
- ADJ must beat RAW by >= 0.2 RMSE AND tie-or-beat on Spearman, else NULL for that season.
- MKT (spread_line) reported for context, never for the verdict.

Consistency check: 2025 via this own-agg pipeline vs the validated prod-table run
(ADJ 13.322 RMSE / 0.393 Spearman on n=151) — own-agg numbers should land nearby
(filter conventions differ slightly: no garbage-time filter here).
"""
import gzip
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

DATA = "data"

def load_pbp(year):
    pbp = pd.read_csv(f"{DATA}/pbp_{year}.csv.gz", compression="gzip", low_memory=False,
                      usecols=["game_id", "week", "season_type", "posteam", "play_type", "epa",
                               "qtr", "wp"])
    pbp = pbp[(pbp.season_type == "REG") & pbp.posteam.notna()]
    pbp = pbp[pbp.play_type.isin(["pass", "run"])]
    # garbage-time exclusion matching the lab/ingestion conventions (4Q, possession
    # WP >0.95 or <0.05); wp is the possession team's WP
    garbage = (pbp.qtr == 4) & ((pbp.wp > 0.95) | (pbp.wp < 0.05))
    pbp = pbp[~garbage.fillna(False)]
    return pbp

def team_game_epa(year):
    g = load_pbp(year).groupby(["game_id", "week", "posteam"]).agg(
        n=("epa", "size"), s=("epa", "sum")).reset_index().rename(columns={"posteam": "team"})
    g["off"] = g.s / g.n
    rows = []
    for _, d in g.groupby("game_id"):
        if len(d) != 2:
            continue
        a, b = d.iloc[0], d.iloc[1]
        rows.append({"game_id": a.game_id, "week": a.week, "team": a.team,
                     "opponent": b.team, "off": a.off, "n": a.n})
        rows.append({"game_id": b.game_id, "week": b.week, "team": b.team,
                     "opponent": a.team, "off": b.off, "n": b.n})
    tg = pd.DataFrame(rows)
    # defense allowed = mirror of opponent offense (built from a column slice to
    # avoid duplicate-label rename collisions)
    d = tg[["game_id", "team", "off"]].rename(columns={"team": "opponent", "off": "def"})
    tg = tg.merge(d, on=["game_id", "opponent"])
    return tg

def ratings_iterative(tg, iterations=100):
    by_team = {t: g for t, g in tg.groupby("team")}
    lg_off, lg_def = tg["off"].mean(), tg["def"].mean()
    adj_off = {t: g["off"].mean() for t, g in by_team.items()}
    adj_def = {t: g["def"].mean() for t, g in by_team.items()}
    for _ in range(iterations):
        n_off = {t: (g["off"] - g["opponent"].map(adj_def).fillna(lg_def).sub(lg_def)).mean()
                 for t, g in by_team.items()}
        n_def = {t: (g["def"] - g["opponent"].map(adj_off).fillna(lg_off).sub(lg_off)).mean()
                 for t, g in by_team.items()}
        adj_off, adj_def = n_off, n_def
    return pd.DataFrame({"off": adj_off, "def": adj_def})

def net_diff(r, h, a):
    return (r.loc[h, "off"] - r.loc[h, "def"]) - (r.loc[a, "off"] - r.loc[a, "def"])

def evaluate(year):
    tg = team_game_epa(year)
    sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
    s = sched[(sched.season == year) & (sched.game_type == "REG")].copy()
    s["margin"] = s.home_score - s.away_score
    trn = s[s.week <= 8].dropna(subset=["margin", "spread_line"])
    tst = s[((s.week >= 9) & (s.week <= 18))].dropna(subset=["margin"])

    out = {}
    for name in ["raw", "adj"]:
        r = ratings_iterative(tg[tg.week <= 8]) if name == "adj" else \
            tg[tg.week <= 8].groupby("team")[["off", "def"]].mean()
        sc_trn = np.array([net_diff(r, x.home_team, x.away_team) + 2.0 for x in trn.itertuples()])
        A = np.vstack([sc_trn, np.ones(len(sc_trn))]).T
        a_fit, b_fit = np.linalg.lstsq(A, trn.margin.values, rcond=None)[0]
        keep = tst[tst.home_team.isin(r.index) & tst.away_team.isin(r.index)]
        sc = np.array([net_diff(r, x.home_team, x.away_team) + 2.0 for x in keep.itertuples()])
        pred = a_fit * sc + b_fit
        out[name] = {"n": len(keep), "rmse": float(np.sqrt(np.mean((pred - keep.margin) ** 2))),
                     "spearman": float(spearmanr(pred, keep.margin).statistic)}
    mkt = tst.dropna(subset=["spread_line"])
    sp_trn = trn.dropna(subset=["spread_line"])
    A2 = np.vstack([-sp_trn.spread_line.values, np.ones(len(sp_trn))]).T
    ma, mb = np.linalg.lstsq(A2, sp_trn.margin.values, rcond=None)[0]
    mkt_pred = ma * (-mkt.spread_line.values) + mb
    out["mkt"] = {"n": len(mkt), "rmse": float(np.sqrt(np.mean((mkt_pred - mkt.margin) ** 2))),
                  "spearman": float(spearmanr(mkt_pred, mkt.margin).statistic)}
    return out

rows = []
for year in [2023, 2024, 2025]:
    r = evaluate(year)
    verdict = "PASS" if (r["raw"]["rmse"] - r["adj"]["rmse"] >= 0.2 and
                         r["adj"]["spearman"] >= r["raw"]["spearman"]) else "NULL"
    rows.append({"season": year, "method": "raw", **r["raw"]})
    rows.append({"season": year, "method": "adj", **r["adj"], "verdict": verdict})
    rows.append({"season": year, "method": "mkt", **r["mkt"]})

df = pd.DataFrame(rows)
print(df.to_string(index=False))
df.to_csv(f"{DATA}/validation_multi_season_v2.csv", index=False)
n_pass = sum(1 for x in rows if x.get("verdict") == "PASS")
print(f"\n{n_pass}/3 seasons pass the pre-registered kill line")
