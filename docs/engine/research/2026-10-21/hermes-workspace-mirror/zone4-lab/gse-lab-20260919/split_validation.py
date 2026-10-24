"""Task 3: dropback-vs-rush split model vs pooled EPA (2024/2025 holdouts).

PRE-REGISTRATION: adjusted opponent ratings fitted separately on dropback rows and
rush rows (W1-8 train only); margin predictions on W9-18 games combine
w * (pass_net_diff) + (1-w) * (rush_net_diff) through the same in-train linear
scale fit as every other method. Claim to test: w = 0.75 improves Spearman over
the pooled equivalent (w = 0.5) on BOTH holdout seasons. Kill: if 0.75 loses to
0.5 on either season, the weighted split is NOT established (report honestly).
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

DATA = "data"
HFA_PTS = 2.0


def team_game_splits(year):
    pbp = pd.read_csv(f"{DATA}/pbp_{year}.csv.gz", compression="gzip", low_memory=False,
                      usecols=["game_id", "week", "season_type", "posteam", "play_type",
                               "epa", "qtr", "wp"])
    pbp = pbp[(pbp.season_type == "REG") & pbp.posteam.notna()]
    pbp = pbp[pbp.play_type.isin(["pass", "run"])]
    garbage = (pbp.qtr == 4) & ((pbp.wp > 0.95) | (pbp.wp < 0.05))
    pbp = pbp[~garbage.fillna(False)]
    pbp["kind"] = np.where(pbp.play_type == "pass", "pass", "rush")
    g = pbp.groupby(["game_id", "week", "posteam", "kind"]).agg(
        n=("epa", "size"), s=("epa", "sum")).reset_index()
    rows = []
    for gid, d in g.groupby("game_id"):
        if len(d) != 4:  # 2 teams x 2 kinds
            continue
        for team in d.posteam.unique():
            opp = [t for t in d.posteam.unique() if t != team][0]
            dp = d[(d.posteam == team) & (d.kind == "pass")].iloc[0]
            dr = d[(d.posteam == team) & (d.kind == "rush")].iloc[0]
            rows.append({"game_id": gid, "week": team and dp.week, "team": team,
                         "opponent": opp,
                         "pass_n": dp.n, "pass_rate": dp.s / max(dp.n, 1),
                         "rush_n": dr.n, "rush_rate": dr.s / max(dr.n, 1)})
    tg = pd.DataFrame(rows)
    # defense allowed = mirror
    m = tg[["game_id", "team", "pass_rate", "rush_rate", "pass_n", "rush_n"]].rename(
        columns={"team": "opponent", "pass_rate": "pass_def", "rush_rate": "rush_def",
                 "pass_n": "opp_pass_n", "rush_n": "opp_rush_n"})
    tg = tg.merge(m, on=["game_id", "opponent"])
    return tg


def adjust(train_tg, col_rate, col_def, iterations=100):
    """Iterative opponent adjustment on one split; returns team->float Series."""
    teams = sorted(set(train_tg.team) | set(train_tg.opponent))
    rate = {t: train_tg.loc[train_tg.team == t, col_rate].mean() for t in teams}
    d = {t: train_tg.loc[train_tg.team == t, col_def].mean() for t in teams}
    lg_rate = train_tg[col_rate].mean()
    lg_def = train_tg[col_def].mean()
    for _ in range(iterations):
        nr, nd = {}, {}
        for t in teams:
            rows = train_tg[train_tg.team == t]
            nr[t] = (rows[col_rate] - (rows.opponent.map(d) - lg_def)).mean()
            nd[t] = (rows[col_def] - (rows.opponent.map(rate) - lg_rate)).mean()
        rate, d = nr, nd
    return pd.Series(rate), pd.Series(d)


def run(year):
    tg = team_game_splits(year)
    sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
    s = sched[(sched.season == year) & (sched.game_type == "REG")].copy()
    s["margin"] = s.home_score - s.away_score
    trn_g = tg[tg.week <= 8]
    tst = s[((s.week >= 9) & (s.week <= 18))].dropna(subset=["margin"])
    pr, pd_ = adjust(trn_g, "pass_rate", "pass_def")
    rr, rd = adjust(trn_g, "rush_rate", "rush_def")

    def game_scores(frame, wp, wr):
        sc = []
        for r in frame.itertuples():
            ph = pr.get(r.home_team, np.nan) - pd_.get(r.home_team, np.nan)
            pa = pr.get(r.away_team, np.nan) - pd_.get(r.away_team, np.nan)
            rh = rr.get(r.home_team, np.nan) - rd.get(r.home_team, np.nan)
            ra = rr.get(r.away_team, np.nan) - rd.get(r.away_team, np.nan)
            sc.append(wp * (ph - pa) + wr * (rh - ra) + HFA_PTS)
        return np.array(sc)

    keep = tst[tst.home_team.isin(pr.index) & tst.away_team.isin(pr.index)]
    out = {}
    for name, w in [("pooled(0.5)", 0.5), ("weighted(0.75)", 0.75), ("pass-only(1.0)", 1.0)]:
        sc_trn = game_scores(trn_g.merge(
            s[["game_id", "home_team", "away_team"]], on="game_id"), w, 1 - w) \
            if False else None
        # train scale: fit on train games via schedule join
        trn = trn_g.drop_duplicates("game_id")
        trn_map = s[s.week <= 8].set_index("game_id")
        sc_tr = []
        mg = []
        for r in trn.itertuples():
            if r.game_id not in trn_map.index:
                continue
            h = trn_map.loc[r.game_id, "home_team"]
            a = trn_map.loc[r.game_id, "away_team"]
            ph = pr.get(h, np.nan) - pd_.get(h, np.nan)
            pa = pr.get(a, np.nan) - pd_.get(a, np.nan)
            rh = rr.get(h, np.nan) - rd.get(h, np.nan)
            ra = rr.get(a, np.nan) - rd.get(a, np.nan)
            sc_tr.append(w * (ph - pa) + (1 - w) * (rh - ra) + HFA_PTS)
            mg.append(trn_map.loc[r.game_id, "margin"])
        A = np.vstack([sc_tr, np.ones(len(sc_tr))]).T
        a_fit, b_fit = np.linalg.lstsq(A, np.array(mg), rcond=None)[0]
        sc_te = game_scores(keep, w, 1 - w)
        pred = a_fit * sc_te + b_fit
        out[name] = {"n": len(keep), "rmse": float(np.sqrt(np.mean((pred - keep.margin) ** 2))),
                     "spearman": float(spearmanr(pred, keep.margin).statistic)}
    return out


rows = []
for year in [2024, 2025]:
    res = run(year)
    for name, m in res.items():
        rows.append({"season": year, "model": name, **{k: round(v, 3) for k, v in m.items()}})
df = pd.DataFrame(rows)
print(df.to_string(index=False))
df.to_csv(f"{DATA}/split_weight_validation.csv", index=False)
