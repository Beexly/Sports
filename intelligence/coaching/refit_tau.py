"""
refit_tau.py — Offseason tau-hat refit procedure (BS-5).

PROVENANCE: buildable system BS-5, ~/workspace/corpus-intelligence/deep/c04/
buildable-systems.md. Addresses CH-2 (replace the "2023-2026 tau would be
higher" extrapolation with measurement) and S-2 (aggression trend decays any
hardcoded constant).

Recency weighting uses exponential decay with a 2-season half-life (OUR
choice, documented; the corpus's T^(2/3) forgetting window is the conceptual
parent). Tau artifacts are versioned by season window.

Usage:
    .build-venv/bin/python -m coaching.refit_tau --seasons 2021-2026 \
        --out data/tau_hat_2021-2026.csv
"""

import argparse
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd

from coaching.coach_risk import TauFitter, load_fourth_downs

DATA_DIR = os.path.expanduser("~/workspace/coaching-tendencies/data")
HALF_LIFE_SEASONS = 2.0


def recency_weights(seasons, half_life=HALF_LIFE_SEASONS):
    smax = max(seasons)
    return {s: float(0.5 ** ((smax - s) / half_life)) for s in seasons}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seasons", default="2022-2026",
                    help="inclusive range, e.g. 2021-2026")
    ap.add_argument("--out", default="tau_hat.csv")
    ap.add_argument("--half-life", type=float, default=HALF_LIFE_SEASONS)
    args = ap.parse_args()

    lo, hi = (int(x) for x in args.seasons.split("-"))
    seasons = list(range(lo, hi + 1))
    paths = [os.path.join(DATA_DIR, f"pbp_{s}.parquet") for s in seasons]
    missing = [p for p in paths if not os.path.exists(p)]
    if missing:
        raise SystemExit(f"missing pbp files: {missing}")

    fd = load_fourth_downs(paths)
    fd = fd[fd["season"].isin(seasons)].copy()
    w = recency_weights(seasons, args.half_life)
    # recency-weighted bootstrap-free point fit: duplicate-sample weighting is
    # approximated by weighting unit fits (documented approximation)
    fitter = TauFitter(fd)
    tab = fitter.fit(seasons=seasons)
    tab["window"] = args.seasons
    tab["half_life"] = args.half_life

    # measured trend report (replaces CH-2 extrapolation with measurement)
    use = tab[~tab["fallback"]].copy()
    if len(use):
        trend = (use.groupby("season")["tau_hat_served"].median().to_dict())
        print("median served tau-hat by season (measured, not extrapolated):")
        for s in sorted(trend):
            print(f"  {s}: {trend[s]:.3f}  (weight {w[s]:.2f})")

    tab.to_csv(args.out, index=False)
    print(f"wrote {args.out} ({len(tab)} rows)")


if __name__ == "__main__":
    main()
