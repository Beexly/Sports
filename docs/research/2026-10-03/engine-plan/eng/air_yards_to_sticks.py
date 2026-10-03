"""Point-in-time air yards to the sticks, from nflverse play-by-play.

Formula, a02-ngs-ttt.md: mean(air_yards - ydstogo) over pass_attempt == 1.
Suffix _pbp. Not NGS. Not FTN. Time-to-throw is not emitted.

Floor is LEAF_MIN_N = 30 pass attempts (qb-behavior situational/serve.py).
A passer-week under that floor is not a row. Latest row with
season*100+week strictly before the game, lag at most 2 seasons.
Home minus away. Null if either side has no such row.
No shrinkage constant is stated for this mean, so none is applied.

One walk-forward. Does not write a mint, Neon, or Vercel.
Does not edit wire_k, join_rest, chart, or mind.jsonl.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
PBP = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\pbp")
OUT = Path(__file__).resolve().parent / "air_yards_to_sticks.json"
FLOOR = 30
COLS = ["air_yards", "ydstogo", "pass_attempt", "passer_player_id", "season", "week"]

weeks = []
for season in range(2016, 2027):
    path = PBP / f"play_by_play_{season}.parquet"
    if not path.exists():
        continue
    frame = pd.read_parquet(path, columns=COLS)
    frame = frame[frame.pass_attempt.eq(1)]
    frame = frame[frame.air_yards.notna() & frame.ydstogo.notna() & frame.passer_player_id.notna()]
    frame["sticks"] = frame.air_yards.astype(float) - frame.ydstogo.astype(float)
    g = frame.groupby(["passer_player_id", "season", "week"], as_index=False).agg(
        sticks=("sticks", "mean"), n=("sticks", "size")
    )
    g = g[g.n >= FLOOR]
    weeks.append(g)
    print("season", season, "passer-weeks", len(g), flush=True)

W = pd.concat(weeks, ignore_index=True)
W["ord"] = W.season.astype(int) * 100 + W.week.astype(int)
by_qb = {i: g.sort_values("ord") for i, g in W.groupby("passer_player_id")}

F = pd.read_parquet(ENG / "features_v1.parquet", columns=["game_id", "season", "week", "h_qb", "a_qb"])
ids = set(W.passer_player_id.astype(str))
home_hit = F.h_qb.astype(str).isin(ids).mean()
print("starter id overlap", round(float(home_hit), 4), "qbs", len(ids), flush=True)
if home_hit < 0.5:
    raise SystemExit("h_qb does not match passer_player_id; not inventing a crosswalk")

def latest(qb, season, week):
    g = by_qb.get(qb)
    if g is None or not isinstance(qb, str) or not qb:
        return np.nan
    ord_ = int(season) * 100 + int(week)
    lo = (int(season) - 2) * 100
    hit = g[(g.ord < ord_) & (g.ord >= lo)]
    if hit.empty:
        return np.nan
    return float(hit.iloc[-1].sticks)

rows = []
for r in F.itertuples(index=False):
    hv = latest(r.h_qb, r.season, r.week)
    av = latest(r.a_qb, r.season, r.week)
    diff = (hv - av) if np.isfinite(hv) and np.isfinite(av) else np.nan
    rows.append({"game_id": r.game_id, "air_yards_to_sticks_pbp": diff, "sticks_present": float(np.isfinite(diff))})
Q = pd.DataFrame(rows)
print("coverage", round(float(Q.air_yards_to_sticks_pbp.notna().mean()), 4), flush=True)

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
        g = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        w -= np.linalg.solve(H, g)
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
plus = run(CHAMP + ["air_yards_to_sticks_pbp"])
flagged = run(CHAMP + ["air_yards_to_sticks_pbp", "sticks_present"])
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
    "formula": "mean(air_yards - ydstogo) over pass_attempt==1",
    "source": "docs/engine/research/2026-10-02/corpus-deep/deep/c02/work/a02-ngs-ttt.md",
    "not_ngs": True,
    "not_ftn": True,
    "floor_attempts": FLOOR,
    "floor_source": "intelligence/qb-behavior/src/qb_behavior/situational/serve.py LEAF_MIN_N",
    "pit": "season*100+week strictly before the game, lag 2 seasons, home minus away",
    "shrinkage": "none stated for this mean",
    "coverage": round(float(S.air_yards_to_sticks_pbp.notna().mean()), 4),
    "starter_id_overlap": round(float(home_hit), 4),
    "champion_ll": round(float(ch.l.mean()), 6),
    "champion_brier": round(float(ch.b.mean()), 6),
    "n": int(len(ch)),
    "tests": [pack("fillna0", plus), pack("present_flag", flagged)],
    "wired_into_mint": False,
}
OUT.write_text(json.dumps(out, indent=1), encoding="utf-8")
print(json.dumps(out, indent=1))
