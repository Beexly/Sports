"""Independent completion residual. Not NGS cpoe. Not the cp column.

a04-completion-model.md: air_yards is the dominant completion driver.
Logistic complete_pass ~ air_yards, fit only on seasons before the test
season. Residual is complete_pass minus that probability.
Passer-week mean, floor 30 attempts (LEAF_MIN_N). Latest row with
season*100+week strictly before the game, lag 2 seasons, home minus away.
Sacks and spikes excluded. Throwaways are not a column here, so they stay in.
cp and cpoe are not read.

One walk-forward at game level. Does not write a mint.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
PBP = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\pbp")
OUT = Path(__file__).resolve().parent / "independent_cpoe.json"
FLOOR = 30
COLS = ["air_yards", "complete_pass", "pass_attempt", "sack", "qb_spike", "passer_player_id", "season", "week"]

plays = []
for season in range(2016, 2027):
    path = PBP / f"play_by_play_{season}.parquet"
    if not path.exists():
        continue
    frame = pd.read_parquet(path, columns=COLS)
    frame = frame[frame.pass_attempt.eq(1) & frame.air_yards.notna() & frame.passer_player_id.notna()]
    frame = frame[frame.sack.fillna(0).eq(0) & frame.qb_spike.fillna(0).eq(0)]
    frame = frame[frame.complete_pass.isin([0, 1])]
    plays.append(frame[["passer_player_id", "season", "week", "air_yards", "complete_pass"]].copy())
    print("season", season, "plays", len(plays[-1]), flush=True)
P = pd.concat(plays, ignore_index=True)
P["air"] = P.air_yards.astype(float)
P["y"] = P.complete_pass.astype(float)

def fit_air(d):
    x = d.air.values
    y = d.y.values
    mu, sd = x.mean(), x.std() + 1e-9
    z = (x - mu) / sd
    w, off = 0.0, float(np.log(y.mean() / (1 - y.mean() + 1e-9)))
    for _ in range(40):
        p = 1 / (1 + np.exp(-(off + w * z)))
        g_w = np.sum((p - y) * z) + 1.0 * w
        g_o = np.sum(p - y)
        h_ww = np.sum(p * (1 - p) * z * z) + 1.0
        h_wo = np.sum(p * (1 - p) * z)
        h_oo = np.sum(p * (1 - p))
        det = h_ww * h_oo - h_wo * h_wo
        w -= (h_oo * g_w - h_wo * g_o) / det
        off -= (h_ww * g_o - h_wo * g_w) / det
    return mu, sd, w, off

def pred_air(model, x):
    mu, sd, w, off = model
    z = (x - mu) / sd
    return 1 / (1 + np.exp(-(off + w * z)))

parts = []
for T in range(2018, 2027):
    tr = P[P.season < T]
    te = P[P.season == T]
    if len(tr) < 1000 or len(te) < 100:
        continue
    model = fit_air(tr)
    te = te.copy()
    te["resid"] = te.y - pred_air(model, te.air.values)
    parts.append(te)
    print("fit", T, "plays", len(te), flush=True)
R = pd.concat(parts, ignore_index=True)
g = R.groupby(["passer_player_id", "season", "week"], as_index=False).agg(resid=("resid", "mean"), n=("resid", "size"))
g = g[g.n >= FLOOR]
g["ord"] = g.season.astype(int) * 100 + g.week.astype(int)
by_qb = {i: d.sort_values("ord") for i, d in g.groupby("passer_player_id")}
print("passer-weeks", len(g), flush=True)

F = pd.read_parquet(ENG / "features_v1.parquet", columns=["game_id", "season", "week", "h_qb", "a_qb"])

def latest(qb, season, week):
    d = by_qb.get(qb)
    if d is None or not isinstance(qb, str) or not qb:
        return np.nan
    ord_ = int(season) * 100 + int(week)
    lo = (int(season) - 2) * 100
    hit = d[(d.ord < ord_) & (d.ord >= lo)]
    if hit.empty:
        return np.nan
    return float(hit.iloc[-1].resid)

rows = []
for r in F.itertuples(index=False):
    hv = latest(r.h_qb, r.season, r.week)
    av = latest(r.a_qb, r.season, r.week)
    diff = (hv - av) if np.isfinite(hv) and np.isfinite(av) else np.nan
    rows.append({"game_id": r.game_id, "ind_cpoe_pbp": diff, "ind_cpoe_present": float(np.isfinite(diff))})
Q = pd.DataFrame(rows)
print("coverage", round(float(Q.ind_cpoe_pbp.notna().mean()), 4), flush=True)

WIDE = pd.read_parquet(ENG / "learn_wide_plus.parquet")
CORP = pd.read_parquet(ENG / "corpus_features.parquet")
S = WIDE.merge(CORP[["game_id", "stress", "int_rate", "int_hit"]], on="game_id", how="left")
S = S.merge(Q, on="game_id", how="left")
S = S[S.y.notna()].copy()
S["y"] = S.y.astype(float)

def fit(X, y, off, lam):
    keep = X.std(0) > 1e-8
    if not np.any(keep):
        raise RuntimeError("no varying columns")
    X = X[:, keep]
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    for _ in range(60):
        p = 1 / (1 + np.exp(-(off + Z @ w)))
        gvec = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        w -= np.linalg.solve(H, gvec)
    return w, mu, sd, keep

def pred(m, X, off):
    w, mu, sd, keep = m
    X = X[:, keep]
    return 1 / (1 + np.exp(-(off + ((X - mu) / sd) @ w)))

def ll(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))

def brier(p, y):
    return (p - y) ** 2

LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
TESTS = list(range(2019, 2027))
CHAMP = ["home_flag", "qb_pit", "elo_res", "stress", "int_rate", "int_hit"]

def run(feats):
    use = S.copy()
    for c in feats:
        use[c] = use[c].fillna(0.0)
    parts = []
    for T in TESTS:
        tr, te = use[use.season < T], use[use.season == T]
        if len(te) < 20 or len(tr) < 200:
            continue
        a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
        if len(b) < 20:
            b = tr.tail(200)
            a = tr.iloc[:-200]
        def X(d, f=feats):
            return d[f].values.astype(float)
        lam = min(LAMS, key=lambda l: ll(pred(fit(X(a), a.y.values, a.mkt.values, l), X(b), b.mkt.values), b.y.values).mean())
        m = fit(X(tr), tr.y.values, tr.mkt.values, lam)
        p = pred(m, X(te), te.mkt.values)
        parts.append(pd.DataFrame({"game_id": te.game_id.values, "l": ll(p, te.y.values), "b": brier(p, te.y.values)}))
    return pd.concat(parts, ignore_index=True).sort_values("game_id")

rng = np.random.default_rng(7)

def boot(delta, n=2000):
    idx = rng.integers(0, len(delta), (n, len(delta)))
    return float(np.percentile(delta[idx].mean(1), 2.5)), float(np.percentile(delta[idx].mean(1), 97.5))

print("scoring", flush=True)
ch = run(CHAMP)
plus = run(CHAMP + ["ind_cpoe_pbp"])
flagged = run(CHAMP + ["ind_cpoe_pbp", "ind_cpoe_present"])
assert list(ch.game_id) == list(plus.game_id) == list(flagged.game_id)

def pack(name, nw):
    d = nw.l.values - ch.l.values
    lo, hi = boot(d)
    return {
        "name": name,
        "n": int(len(nw)),
        "ll": round(float(nw.l.mean()), 6),
        "brier": round(float(nw.b.mean()), 6),
        "delta_ll": round(float(d.mean()), 6),
        "ci95_ll": [round(lo, 6), round(hi, 6)],
        "clears_zero": bool(hi < 0),
    }

out = {
    "formula": "complete_pass - logistic(air_yards), fit on prior seasons only",
    "source": "docs/engine/research/2026-10-02/corpus-deep/deep/c02/work/a04-completion-model.md",
    "not_ngs": True,
    "cp_cpoe_unread": True,
    "excluded": ["sack", "qb_spike"],
    "not_excluded": "throwaways have no column in this pull",
    "floor_attempts": FLOOR,
    "pit": "season*100+week strictly before the game, lag 2 seasons, home minus away",
    "coverage": round(float(S.ind_cpoe_pbp.notna().mean()), 4),
    "champion_ll": round(float(ch.l.mean()), 6),
    "champion_brier": round(float(ch.b.mean()), 6),
    "n": int(len(ch)),
    "tests": [pack("fillna0", plus), pack("present_flag", flagged)],
    "wired_into_mint": False,
}
OUT.write_text(json.dumps(out, indent=1), encoding="utf-8")
print(json.dumps(out, indent=1))
