"""ROLE-WEIGHTED availability totals model — the refined granularity.

Count-based availability widened the model (last cycle). The refined
hypothesis: WHAT matters is role — weight each Out/Doubtful absence by
1/depth-chart rank from the same week's nflverse depth chart (starter=1.0,
RB2=0.5, unknown=0.25 deep-backup prior). Same OOF-honest harness, same
pre-registered verdict rule:
  model OOF sd < market sd AND held-out log-score < market log-score.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "totals-role-weighted-model.json"
GROUPS = ["OL", "QB", "WR", "RB", "TE"]


def main() -> int:
    feat = np.load(REPO / "intelligence" / "audit" / "data" / "totals_features.npy")
    rw = pd.read_parquet(REPO / "intelligence" / "audit" / "data" / "role_weighted_availability.parquet")
    rows = json.loads((REPO / "data" / "backtest" / "nfl_historical_games.json").read_text())["rows"]
    rows = [r for r in rows if r.get("closingTotal") and r.get("homeScore") is not None]
    rows.sort(key=lambda r: (r["season"], r["week"], r["kickoffUtc"]))
    n = len(rows)
    split = int(n * 0.7)

    idx = {(int(r.season), int(r.week), r.team): r for r in rw.itertuples(index=False)}
    Xinj = np.full((n, 2 * len(GROUPS)), np.nan)
    for i, r in enumerate(rows):
        h = idx.get((int(r["season"]), int(r["week"]), r["homeTeam"]))
        a = idx.get((int(r["season"]), int(r["week"]), r["awayTeam"]))
        if h is None or a is None:
            continue
        hv = [getattr(h, g) for g in GROUPS]
        av = [getattr(a, g) for g in GROUPS]
        Xinj[i] = hv + [hh - aa for hh, aa in zip(hv, av)]

    actual = np.array([r["homeScore"] + r["awayScore"] for r in rows])
    lines = np.array([float(r["closingTotal"]) for r in rows])
    full_ok = ~np.isnan(feat).any(axis=1) & ~np.isnan(Xinj).any(axis=1)
    tr = full_ok & (np.arange(n) < split)
    ho = full_ok & (np.arange(n) >= split)

    def oof_model(X, y, ln, k=5):
        resid = y - ln
        Xs = np.hstack([np.ones((len(X), 1)), X])
        idxr = np.arange(len(X))
        folds = np.array_split(idxr, k)
        oof = np.full(len(X), np.nan)
        for f in folds:
            m = np.ones(len(X), bool)
            m[f] = False
            b, *_ = np.linalg.lstsq(Xs[m], resid[m], rcond=None)
            oof[f] = resid[f] - Xs[f] @ b
        return float(np.nanstd(oof, ddof=1))

    def logscore(mu, sd, y):
        z = (y - mu) / sd
        return float(np.mean(0.5 * z * z + np.log(sd) + 0.5 * math.log(2 * math.pi)))

    ya, la = actual[tr], lines[tr]
    market_sd = float(np.std(ya - la, ddof=1))

    # D: role-weighted availability only
    oof_d = oof_model(Xinj[tr], ya, la)
    # E: EPA + role-weighted
    Xe = np.hstack([feat[tr], Xinj[tr]])
    oof_e = oof_model(Xe, ya, la)
    # fit on full train for held-out scoring
    bE, *_ = np.linalg.lstsq(np.hstack([np.ones((len(Xe), 1)), Xe]), ya - la, rcond=None)
    muE = lines[ho] + np.hstack([np.ones((int(ho.sum()), 1)),
                                  np.hstack([feat[ho], Xinj[ho]])]) @ bE
    y_h, mu_mkt = actual[ho], lines[ho]

    res = {
        "generated_utc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "feature": "role-weighted Out/Doubtful (weight=1/depth-chart rank, offense rows, 2015-24)",
        "n_train": int(tr.sum()), "n_held": int(ho.sum()),
        "market_sd_train": round(market_sd, 3),
        "oof_sd": {"D_rolew_only": round(oof_d, 3), "E_epa_plus_rolew": round(oof_e, 3),
                    "A_epa_only_prev": 13.369, "market": round(market_sd, 3)},
        "held_out": {
            "market_logscore": round(logscore(mu_mkt, market_sd, y_h), 4),
            "E_logscore": round(logscore(muE, oof_e, y_h), 4),
        },
    }
    beats = oof_e < market_sd and res["held_out"]["E_logscore"] < res["held_out"]["market_logscore"]
    res["verdict"] = ("ROLE-WEIGHTED MODEL BEATS MARKET" if beats else
                       "STILL NOT BEATING THE MARKET — OOF widths vs market: "
                       f"D {oof_d:.3f} / E {oof_e:.3f} vs {market_sd:.3f}")
    print(json.dumps(res, indent=1))
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
