"""Full-sample walk-forward with a present flag.

cpoe_pbp and adot are prior-week home-minus-away (join_learn.py: week < W).
fillna(0) on the full sample hides them. The flag is 1 when the diff is
non-null, else 0, and the value is 0 when missing. A column is mint-eligible
only if the paired 95% interval on the full 1914 is entirely below 0.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
OUT = Path(__file__).resolve().parent / "score_present_flag.json"
WIDE = pd.read_parquet(ENG / "learn_wide.parquet")
CORP = pd.read_parquet(ENG / "corpus_features.parquet")
S = WIDE.merge(CORP[["game_id", "stress", "int_rate", "int_hit"]], on="game_id", how="left")
S = S[S.y.notna()].copy()
S["y"] = S.y.astype(float)
for c in ("home_flag", "qb_pit", "elo_res", "stress", "int_rate", "int_hit", "mkt"):
    S[c] = S[c].fillna(0.0)

for c in ("cpoe_pbp", "adot"):
    S[c + "_present"] = S[c].notna().astype(float)
    S[c] = S[c].fillna(0.0)

print("corr", round(float(S.cpoe_pbp.corr(S.adot)), 4), "present", int(S.adot_present.sum()), flush=True)

def fit(X, y, off, lam):
    sd = X.std(0)
    keep = sd > 1e-8
    if not np.any(keep):
        return None
    X = X[:, keep]
    mu, sd = X.mean(0), sd[keep] + 1e-9
    Z = (X - mu) / sd
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    for _ in range(40):
        eta = np.clip(off + Z @ w, -20, 20)
        p = 1 / (1 + np.exp(-eta))
        g = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        step = np.linalg.solve(H, g)
        w -= step
        if np.max(np.abs(step)) < 1e-8:
            break
    return w, mu, sd, keep

def pred(m, X, off):
    if m is None:
        return 1 / (1 + np.exp(-np.clip(off, -20, 20)))
    w, mu, sd, keep = m
    Z = (X[:, keep] - mu) / sd
    eta = np.clip(off + Z @ w, -20, 20)
    return 1 / (1 + np.exp(-eta))

def ll(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))

LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
TESTS = list(range(2019, 2027))
champ = ["home_flag", "qb_pit", "elo_res", "stress", "int_rate", "int_hit"]
families = {
    "champion": champ,
    "adot_flag": champ + ["adot", "adot_present"],
    "cpoe_flag": champ + ["cpoe_pbp", "cpoe_pbp_present"],
    "both_flag": champ + ["adot", "adot_present", "cpoe_pbp", "cpoe_pbp_present"],
}

def run(feats):
    parts = []
    for T in TESTS:
        tr, te = S[S.season < T], S[S.season == T]
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

def boot(delta, n=2000):
    idx = rng.integers(0, len(delta), (n, len(delta)))
    m = delta[idx].mean(1)
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))

stored = {name: run(feats) for name, feats in families.items()}
ch = stored["champion"]
rows = {}
for name, nw in stored.items():
    if name == "champion":
        rows[name] = {"n": int(len(nw)), "ll": round(float(nw.l.mean()), 6)}
        continue
    assert list(ch.game_id) == list(nw.game_id)
    d = nw.l.values - ch.l.values
    lo, hi = boot(d)
    rows[name] = {
        "n": int(len(nw)),
        "ll": round(float(nw.l.mean()), 6),
        "delta_ll": round(float(d.mean()), 6),
        "ci95_ll": [round(lo, 6), round(hi, 6)],
        "clears_zero": bool(hi < 0),
    }
    print(name, rows[name], flush=True)

out = {
    "not_a_mint": True,
    "pit": "join_learn.py latest row with week < W, lag <= 2 seasons, home minus away",
    "corr_adot_cpoe_filled": round(float(S.cpoe_pbp.corr(S.adot)), 4),
    "rows": rows,
}
text = json.dumps(out, indent=1)
OUT.write_text(text, encoding="utf-8")
(ENG / "score_present_flag.json").write_text(text, encoding="utf-8")
print(text)
