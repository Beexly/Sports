"""Same walk-forward, but only on games where the added column is non-null.

fillna(0) on a 30% column tests the missingness code, not the feature.
This file tests the feature on the rows that have it. Still not a mint.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
OUT = Path(__file__).resolve().parent / "score_joined_present.json"
WIDE = pd.read_parquet(ENG / "learn_wide_plus.parquet")
CORP = pd.read_parquet(ENG / "corpus_features.parquet")
S = WIDE.merge(CORP[["game_id", "stress", "int_rate", "int_hit"]], on="game_id", how="left")
S = S[S.y.notna()].copy()
S["y"] = S.y.astype(float)

COLS = [
    "weekly_tendencies__shotgun_rate",
    "def_pressure_weekly__db",
    "weekly_tendencies__n_plays",
    "n_eff",
    "hhi",
    "weekly_tendencies__quick_game_rate",
    "top2_share",
    "adjustments__mahal_dist",
    "cpoe_pbp",
    "adot",
]

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
champ = ["home_flag", "qb_pit", "elo_res", "stress", "int_rate", "int_hit"]
rng = np.random.default_rng(7)

def boot(delta, n=1000):
    idx = rng.integers(0, len(delta), (n, len(delta)))
    m = delta[idx].mean(1)
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))

def run(frame, feats):
    use = frame.copy()
    for c in feats:
        use[c] = use[c].fillna(0.0)
    seasons = sorted(int(s) for s in use.season.unique())
    parts = []
    for T in seasons:
        tr, te = use[use.season < T], use[use.season == T]
        if len(te) < 20 or len(tr) < 80:
            continue
        a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
        if len(b) < 15:
            b = tr.tail(min(80, max(15, len(tr) // 5)))
            a = tr.iloc[: len(tr) - len(b)]
        if len(a) < 40:
            continue
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
    if not parts:
        return None
    return pd.concat(parts, ignore_index=True).sort_values("game_id")

rows = []
for col in COLS:
    sub = S[S[col].notna()].copy()
    ch = run(sub, champ)
    nw = run(sub, champ + [col])
    if ch is None or nw is None or list(ch.game_id) != list(nw.game_id):
        rows.append({"column": col, "status": "too_thin", "n_present": int(len(sub))})
        print(col, "too_thin", len(sub), flush=True)
        continue
    d = nw.l.values - ch.l.values
    lo, hi = boot(d)
    row = {
        "column": col,
        "n_present": int(len(sub)),
        "n_scored": int(len(ch)),
        "seasons": sorted(int(s) for s in sub.season.unique()),
        "delta_ll": round(float(d.mean()), 6),
        "ci95_ll": [round(lo, 6), round(hi, 6)],
        "clears_zero": bool(hi < 0),
    }
    rows.append(row)
    print(col, row["n_scored"], row["delta_ll"], row["ci95_ll"], flush=True)

out = {"not_a_mint": True, "rule": "score only rows where the added column is non-null", "rows": rows, "clears_zero": [r["column"] for r in rows if r.get("clears_zero")]}
text = json.dumps(out, indent=1)
OUT.write_text(text, encoding="utf-8")
(ENG / "score_joined_present.json").write_text(text, encoding="utf-8")
print(json.dumps(out, indent=1))
