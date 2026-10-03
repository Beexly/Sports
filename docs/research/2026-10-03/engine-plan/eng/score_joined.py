"""Walk-forward the columns already joined onto the game frame.

Does not invent a feature. Does not read play-by-play. Does not write Neon,
Vercel, or a new mint. Champion definition matches eng/qb_air_cpoe.py:
home_flag + qb_pit + elo_res + stress + int_rate + int_hit, market offset,
lambda chosen on the prior season.

beta_league is attached here from eng/league_baselines.parquet as home minus
away. That file already applied the PIT rule in league_baselines.py. Missing
side or missing value stays null, then fillna(0) only inside the fit, same
as the air-yard scorer.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ENG = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03\eng")
OUT = Path(__file__).resolve().parent / "score_joined_results.json"

WIDE = pd.read_parquet(ENG / "learn_wide_plus.parquet")
CORP = pd.read_parquet(ENG / "corpus_features.parquet")
BASE = pd.read_parquet(ENG / "league_baselines.parquet")

need = ["game_id", "stress", "int_rate", "int_hit"]
S = WIDE.merge(CORP[need], on="game_id", how="left")

def side(frame, team_col, prefix):
    m = frame.merge(
        BASE,
        left_on=["season", "week", team_col],
        right_on=["season", "week", "team"],
        how="left",
    )
    return m[["game_id", "beta_league"]].rename(columns={"beta_league": prefix})

home = side(S, "home", "h_beta")
away = side(S, "away", "a_beta")
beta = home.merge(away, on="game_id")
both = beta.h_beta.notna() & beta.a_beta.notna()
beta["beta_league_diff"] = np.where(both, beta.h_beta - beta.a_beta, np.nan)
S = S.merge(beta[["game_id", "beta_league_diff"]], on="game_id", how="left")

S = S[S.y.notna()].copy()
S["y"] = S.y.astype(float)

FAMILIES = {
    "weekly_tendencies": [
        "weekly_tendencies__early_down_pass_rate",
        "weekly_tendencies__shotgun_rate",
        "weekly_tendencies__no_huddle_rate",
        "weekly_tendencies__quick_game_rate",
        "weekly_tendencies__avg_air_yards",
        "weekly_tendencies__pass_rate_all",
        "weekly_tendencies__under_center_rate",
    ],
    "qb_pbp": ["cpoe_pbp", "adot", "deep_rate_20", "scramble_rate", "epa", "p2s_eb"],
    "target_share": ["hhi", "n_eff", "top_share", "top2_share", "top_ay_share"],
    "protection_stress": ["protection_stress"],
    "def_pressure": [
        "def_pressure_weekly__db",
        "def_pressure_weekly__pressures",
        "def_pressure_weekly__proxy_rate",
        "def_pressure_weekly__trail4_proxy",
    ],
    "plus_windows": [
        "top_share_4wk_mean",
        "top_share_4wk_sd",
        "top_share_cv_4wk",
        "quick_game_rate_season_prior",
    ],
    "beta_league": ["beta_league_diff"],
}

missing = [c for cols in FAMILIES.values() for c in cols if c not in S.columns]
if missing:
    raise SystemExit("missing columns: " + ", ".join(missing))

def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    for _ in range(60):
        p = 1 / (1 + np.exp(-(off + Z @ w)))
        g = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        w -= np.linalg.solve(H, g)
    return w, mu, sd

def pred(m, X, off):
    w, mu, sd = m
    return 1 / (1 + np.exp(-(off + ((X - mu) / sd) @ w)))

def ll(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))

def brier(p, y):
    return (p - y) ** 2

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
        parts.append(pd.DataFrame({
            "game_id": te.game_id.values,
            "l": ll(p, te.y.values),
            "b": brier(p, te.y.values),
        }))
    return pd.concat(parts, ignore_index=True).sort_values("game_id")

rng = np.random.default_rng(7)

def boot(delta, n=2000):
    idx = rng.integers(0, len(delta), (n, len(delta)))
    m = delta[idx].mean(1)
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))

print("scoring champion", flush=True)
ch = run(champ)
rows = []
for name, cols in FAMILIES.items():
    print("scoring", name, flush=True)
    nw = run(champ + cols)
    assert list(ch.game_id) == list(nw.game_id)
    d_ll = nw.l.values - ch.l.values
    d_br = nw.b.values - ch.b.values
    lo, hi = boot(d_ll)
    blo, bhi = boot(d_br)
    cov = {c: round(float(S[c].notna().mean()), 4) for c in cols}
    row = {
        "family": name,
        "columns": cols,
        "coverage": cov,
        "n": int(len(nw)),
        "ll": round(float(nw.l.mean()), 6),
        "brier": round(float(nw.b.mean()), 6),
        "delta_ll": round(float(d_ll.mean()), 6),
        "ci95_ll": [round(lo, 6), round(hi, 6)],
        "delta_brier": round(float(d_br.mean()), 6),
        "ci95_brier": [round(blo, 6), round(bhi, 6)],
        "clears_zero": bool(hi < 0),
    }
    rows.append(row)
    print(name, row["delta_ll"], row["ci95_ll"], "clears", row["clears_zero"], flush=True)

out = {
    "not_a_mint": True,
    "champion": champ,
    "champion_ll": round(float(ch.l.mean()), 6),
    "champion_brier": round(float(ch.b.mean()), 6),
    "n": int(len(ch)),
    "fillna": 0,
    "beta_league_diff_coverage": round(float(S.beta_league_diff.notna().mean()), 4),
    "families": rows,
    "wired_into_mint": [],
}
OUT.write_text(json.dumps(out, indent=1), encoding="utf-8")
(ENG / "score_joined_results.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(json.dumps(out, indent=1))
