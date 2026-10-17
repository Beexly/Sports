"""INJURY-CONDITIONED TOTALS MODEL — OOF-honest width test.

Extends the totals-efficiency harness with availability features built from
the nflverse injuries releases (2015-2024, Out/Doubtful counts by position
group): home/away OL, QB, WR, RB, TE, DEF absence counts and the home-minus-
away differences. The question: does availability adjust the EPA location
edge AND/OR narrow the width out-of-fold, breaking the collinearity with
the closing line?

HONESTY RULES (learned from the retraction cycle):
  - ALL width claims are OUT-OF-FOLD (5-fold on train). No in-sample sd.
  - The verdict requires: model OOF sd < market sd AND log-score >= market's.
  - Injury features are joined on (season, week, team) with the report
    released BEFORE the game (week N report = pre-game status).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "totals-injury-model.json"

GROUPS = ["OL", "QB", "WR", "RB", "TE", "DEF"]


def main() -> int:
    feat = np.load(REPO / "intelligence" / "audit" / "data" / "totals_features.npy")
    inj = pd.read_parquet(REPO / "intelligence" / "audit" / "data" / "injury_counts.parquet")
    rows = json.loads((REPO / "data" / "backtest" / "nfl_historical_games.json").read_text())["rows"]
    rows = [r for r in rows if r.get("closingTotal") and r.get("homeScore") is not None]
    rows.sort(key=lambda r: (r["season"], r["week"], r["kickoffUtc"]))
    n = len(rows)
    split = int(n * 0.7)

    inj_idx = {(int(r.season), int(r.week), r.team): r for r in inj.itertuples(index=False)}
    ZERO = {g: 0.0 for g in GROUPS}

    def inj_vec(season, week, team):
        r = inj_idx.get((int(season), int(week), team))
        if r is None:
            return None
        return [getattr(r, g) for g in GROUPS]

    # injury features: home_out_*, away_out_*, and diff (home - away)
    Xinj = np.full((n, 3 * len(GROUPS)), np.nan)
    for i, r in enumerate(rows):
        h = inj_vec(r["season"], r["week"], r["homeTeam"])
        a = inj_vec(r["season"], r["week"], r["awayTeam"])
        if h is None or a is None:
            continue
        Xinj[i] = h + a + [hh - aa for hh, aa in zip(h, a)]

    actual = np.array([r["homeScore"] + r["awayScore"] for r in rows])
    lines = np.array([float(r["closingTotal"]) for r in rows])
    base_ok = ~np.isnan(feat).any(axis=1)
    full_ok = base_ok & ~np.isnan(Xinj).any(axis=1)
    tr = full_ok & (np.arange(n) < split)
    ho = full_ok & (np.arange(n) >= split)

    def oof_model(X, y, ln, k=5):
        resid = y - ln
        Xs = np.hstack([np.ones((len(X), 1)), X])
        idx = np.arange(len(X))
        folds = np.array_split(idx, k)
        oof = np.full(len(X), np.nan)
        coefs = []
        for f in folds:
            m = np.ones(len(X), bool)
            m[f] = False
            b, *_ = np.linalg.lstsq(Xs[m], resid[m], rcond=None)
            oof[f] = resid[f] - Xs[f] @ b
            coefs.append(b)
        return oof, float(np.nanstd(oof, ddof=1)), np.mean(coefs, axis=0)

    def logscore(mu, sd, y):
        z = (y - mu) / sd
        return float(np.mean(0.5 * z * z + np.log(sd) + 0.5 * math.log(2 * math.pi)))

    def cov(mu, sd, y, z=1.645):
        return float(np.mean(np.abs(y - mu) <= z * sd))

    # A: EPA-only model (baseline from last cycle), OOF
    Xa, ya, la = feat[tr], actual[tr], lines[tr]
    _, oof_sd_a, beta_a = oof_model(Xa, ya, la)
    # B: EPA + injuries
    Xb = np.hstack([feat[tr], Xinj[tr]])
    _, oof_sd_b, beta_b = oof_model(Xb, ya, la)
    # C: injuries only
    Xc = Xinj[tr]
    _, oof_sd_c, beta_c = oof_model(Xc, ya, la)

    market_sd = float(np.std(ya - la, ddof=1))

    # held-out: fit on full train, score held-out with OOF-calibrated width
    bA, *_ = np.linalg.lstsq(np.hstack([np.ones((len(Xa), 1)), Xa]), ya - la, rcond=None)
    bB, *_ = np.linalg.lstsq(np.hstack([np.ones((len(Xb), 1)), Xb]), ya - la, rcond=None)
    muA = lines[ho] + np.hstack([np.ones((int(ho.sum()), 1)), feat[ho]]) @ bA
    muB = lines[ho] + np.hstack([np.ones((int(ho.sum()), 1)), np.hstack([feat[ho], Xinj[ho]])]) @ bB
    y_h, mu_mkt = actual[ho], lines[ho]

    res = {
        "generated_utc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "honesty_rules": ["all widths out-of-fold (5-fold on train)",
                           "verdict = OOF sd < market sd AND held-out log-score >= market"],
        "n_train": int(tr.sum()), "n_held": int(ho.sum()),
        "market_sd_train": round(market_sd, 3),
        "models": {
            "A_epa_only": {"oof_sd": round(oof_sd_a, 3)},
            "B_epa_plus_injuries": {"oof_sd": round(oof_sd_b, 3),
                                     "injury_coefs": {g: round(float(c), 3) for g, c in
                                                       zip(["OL", "QB", "WR", "RB", "TE", "DEF",
                                                             "dOL", "dQB", "dWR", "dRB", "dTE", "dDEF"],
                                                            beta_b[1:7])}},
            "C_injuries_only": {"oof_sd": round(oof_sd_c, 3)},
        },
        "held_out": {
            "market_logscore": round(logscore(mu_mkt, market_sd, y_h), 4),
            "A_logscore": round(logscore(muA, oof_sd_a, y_h), 4),
            "B_logscore": round(logscore(muB, oof_sd_b, y_h), 4),
            "market_coverage_90": round(cov(mu_mkt, market_sd, y_h), 4),
            "B_coverage_90": round(cov(muB, oof_sd_b, y_h), 4),
        },
    }
    b_beats = (res["held_out"]["B_logscore"] < res["held_out"]["market_logscore"]
               and oof_sd_b < market_sd)
    res["verdict"] = ("INJURY-CONDITIONED MODEL BEATS MARKET (OOF width + location)"
                       if b_beats else
                       "MODEL DOES NOT BEAT MARKET — recorded; A/B/C OOF widths vs market "
                       f"{market_sd:.3f}: {oof_sd_a:.3f}/{oof_sd_b:.3f}/{oof_sd_c:.3f}")
    print(json.dumps(res, indent=1))
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
