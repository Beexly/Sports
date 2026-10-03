"""One already-joined column at a time, same walk-forward as score_joined.py.

A column is wired only if its 95% paired interval on log loss is entirely
below zero. None of these columns are written to the mint from this file.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
OUT = Path(__file__).resolve().parent / "score_joined_singles.json"

WIDE = pd.read_parquet(ENG / "learn_wide_plus.parquet")
CORP = pd.read_parquet(ENG / "corpus_features.parquet")
S = WIDE.merge(CORP[["game_id", "stress", "int_rate", "int_hit"]], on="game_id", how="left")
S = S[S.y.notna()].copy()
S["y"] = S.y.astype(float)

SKIP = {
    "game_id", "season", "week", "gameday", "home", "away", "y", "q", "mkt", "elo",
    "home_flag", "neutral", "qb_pit", "qb_act", "h_qb", "a_qb", "h_qb_src", "a_qb_src",
    "h_qb_act", "a_qb_act", "spread_line", "total_line", "result", "total",
    "av_OL", "av_SKILL", "av_FRONT", "av_DB", "av_Q", "elo_res",
    "stress", "int_rate", "int_hit",
}
cands = []
for c in S.columns:
    if c in SKIP or not pd.api.types.is_numeric_dtype(S[c]):
        continue
    cov = float(S[c].notna().mean())
    if cov >= 0.25 and float(S[c].std(skipna=True) or 0) > 0:
        cands.append((c, cov))
cands.sort(key=lambda x: -x[1])
print("candidates", len(cands), flush=True)

def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    for _ in range(40):
        p = 1 / (1 + np.exp(-(off + Z @ w)))
        g = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        step = np.linalg.solve(H, g)
        w -= step
        if np.max(np.abs(step)) < 1e-8:
            break
    return w, mu, sd

def pred(m, X, off):
    w, mu, sd = m
    return 1 / (1 + np.exp(-(off + ((X - mu) / sd) @ w)))

def ll(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))

LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
TESTS = list(range(2019, 2027))
champ = ["home_flag", "qb_pit", "elo_res", "stress", "int_rate", "int_hit"]

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
        lam = min(
            LAMS,
            key=lambda l: ll(
                pred(fit(X(a), a.y.values, a.mkt.values, l), X(b), b.mkt.values),
                b.y.values,
            ).mean(),
        )
        m = fit(X(tr), tr.y.values, tr.mkt.values, lam)
        p = pred(m, X(te), te.mkt.values)
        parts.append(pd.DataFrame({"game_id": te.game_id.values, "l": ll(p, te.y.values)}))
    return pd.concat(parts, ignore_index=True).sort_values("game_id")

rng = np.random.default_rng(7)

def boot(delta, n=1000):
    idx = rng.integers(0, len(delta), (n, len(delta)))
    m = delta[idx].mean(1)
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))

print("champion", flush=True)
ch = run(champ)
rows = []
for i, (col, cov) in enumerate(cands, 1):
    nw = run(champ + [col])
    assert list(ch.game_id) == list(nw.game_id)
    d = nw.l.values - ch.l.values
    lo, hi = boot(d)
    row = {
        "column": col,
        "coverage": round(cov, 4),
        "delta_ll": round(float(d.mean()), 6),
        "ci95_ll": [round(lo, 6), round(hi, 6)],
        "clears_zero": bool(hi < 0),
    }
    rows.append(row)
    print(f"{i}/{len(cands)}", col, row["delta_ll"], row["ci95_ll"], flush=True)

rows.sort(key=lambda r: r["delta_ll"])
out = {
    "not_a_mint": True,
    "champion_ll": round(float(ch.l.mean()), 6),
    "n": int(len(ch)),
    "n_tested": len(rows),
    "clears_zero": [r["column"] for r in rows if r["clears_zero"]],
    "rows": rows,
}
text = json.dumps(out, indent=1)
OUT.write_text(text, encoding="utf-8")
(ENG / "score_joined_singles.json").write_text(text, encoding="utf-8")
print("clears", out["clears_zero"])
print("best", rows[:5])
print("worst", rows[-3:])
