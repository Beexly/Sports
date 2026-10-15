#!/usr/bin/env python3
"""knm_keynumbers.py -- does adding key numbers 6 and 10 improve the hybrid?

The corpus (gse-deep-nfl-metrics-catalog-2026.md L333) specifies discrete key masses
at 3, 7, 6 AND 10. The walk-forward has only ever tested 3 and 7. The vectorized
harness runs in 0.32s, so this is now cheap to answer instead of speculative.

METHOD, pre-registered before looking at the answer:
  - frozen filter, REG 2017 W1..2026 W5, n=2462, mu = spread_line
  - prior-only excess estimate (expanding window, no lookahead)
  - energy-form CRPS, mean-preserving residual-relative atoms
  - delta = crps_with_atoms - crps_gaussian; negative is an improvement
  - every candidate is scored on the SAME games under the SAME order of operations

DIAGNOSTIC ONLY. Does not clear the gate. Emission stays ZERO_OBJECT.
"""
from __future__ import annotations

import csv
import json
import math
import os
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent / "intelligence" / "ratings"))

import hybrid_crps as hc  # noqa: E402
from math import erf as _erf  # noqa: E402
_erf_vec = np.vectorize(_erf, otypes=[float])

SIGMA = 13.45
GATE = 7.099
SQRT2 = math.sqrt(2.0)
INV_SQRT_PI = 1.0 / math.sqrt(math.pi)
MIN_CELL = 30
MIN_HISTORY = 50
EXPECTED_N = 2462
EXPECTED_GAUSSIAN = 7.154021

CSV = Path(os.environ.get(
    "GAMES_CSV",
    r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/nflverse_games.csv"))


def _Phi(z):
    return 0.5 * (1.0 + _erf_vec(np.asarray(z, float) / SQRT2))


def crps_gaussian(y, mu, sigma):
    y, mu, sigma = np.asarray(y, float), np.asarray(mu, float), np.asarray(sigma, float)
    z = (y - mu) / sigma
    phi = np.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    return sigma * (z * (2.0 * _Phi(z) - 1.0) + 2.0 * phi - INV_SQRT_PI)


# ---- energy form generalised to an ARBITRARY symmetric atom set -------------
def crps_atoms(mu, sd, y, masses):
    """masses: dict {|k|: total_probability_at_that_key}, split equally +-k.

    Mean-preserving: each pair contributes p_k * mu, identical to the continuous
    piece at the same location, so E[X] = mu exactly with no location solve.
    """
    total = sum(masses.values())
    if total <= 0:
        return float(crps_gaussian(y, mu, sd))
    if total > 1.0 + 1e-12:
        raise ValueError(f"atom mass {total} exceeds 1")
    pc = 1.0 - total
    atoms = []
    for k, p in masses.items():
        if p <= 0:
            continue
        atoms.append((p / 2.0, mu + k))
        atoms.append((p / 2.0, mu - k))

    e1 = pc * _e_abs_gauss(mu - y, sd)
    e1 += sum(w * abs(loc - y) for w, loc in atoms)
    e2 = pc * pc * (2.0 * sd * INV_SQRT_PI)
    for w, loc in atoms:
        e2 += 2.0 * pc * w * _e_abs_gauss(loc - mu, sd)
    for wi, li in atoms:
        for wj, lj in atoms:
            e2 += wi * wj * abs(li - lj)
    return e1 - 0.5 * e2


def _e_abs_gauss(d, sd):
    z = d / sd
    phi = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    return sd * (2.0 * phi + z * (2.0 * (0.5 * (1.0 + _erf(z / SQRT2))) - 1.0))


class Priors:
    """Cumulative counts at global level (the only level needed for a key-number
    frequency test, and deliberately the coarsest so n is never sparse)."""

    def __init__(self):
        self.n = 0
        self.key = defaultdict(int)

    def add(self, margin):
        self.n += 1
        a = abs(int(round(margin)))
        if a in KEYSET:
            self.key[a] += 1

    def masses(self):
        if self.n < MIN_HISTORY:
            return {}
        return {k: self.key[k] / self.n for k in KEYSET if self.key[k] > 0}


KEYSET = (3, 6, 7, 10)


def load_games():
    games = []
    with open(CSV, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row.get("game_type") != "REG":
                continue
            try:
                s, w = int(row["season"]), int(row["week"])
            except (TypeError, ValueError):
                continue
            if not (s >= 2017 and (s < 2026 or (s == 2026 and w <= 5))):
                continue
            try:
                hs, aws, sp = (float(row["home_score"]), float(row["away_score"]),
                               float(row["spread_line"]))
            except (TypeError, ValueError, KeyError):
                continue
            games.append({"game_id": row["game_id"], "season": s, "week": w,
                          "mu": sp, "y": hs - aws})
    return sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))


# Pre-registered candidate atom sets. Order fixed BEFORE scoring.
CANDIDATES = [
    ("none (pure Gaussian)", set()),
    ("3,7 (current)", {3, 7}),
    ("3,6,7,10 (corpus spec)", {3, 6, 7, 10}),
    ("3,7,10", {3, 7, 10}),
    ("3,6,7", {3, 6, 7}),
    ("6,7,10", {6, 7, 10}),
    ("3,6,7,10,14,17", {3, 6, 7, 10, 14, 17}),
]


def main():
    global KEYSET
    games = load_games()
    print(f"filter n = {len(games)}")
    base = float(np.mean(crps_gaussian([g["y"] for g in games],
                                       [g["mu"] for g in games], SIGMA)))
    print(f"Gaussian baseline CRPS = {base:.6f}  (expect {EXPECTED_GAUSSIAN})")
    print()

    # sanity: atom sets must not overlap the KEYSET used for counting
    all_keys = set()
    for _n, ks in CANDIDATES:
        all_keys |= ks
    KEYSET = tuple(sorted(all_keys))

    results = []
    for name, keys in CANDIDATES:
        KEYSET = tuple(sorted(all_keys))          # count every candidate key
        priors = Priors()
        scores = []
        # expanding window, prior weeks only
        blocks, cur_k, cur = [], None, []
        for g in games:
            k = (g["season"], g["week"])
            if k != cur_k:
                if cur:
                    blocks.append(cur)
                cur, cur_k = [], k
            cur.append(g)
        if cur:
            blocks.append(cur)

        for block in blocks:
            if priors.n >= MIN_HISTORY:
                m_all = priors.masses()
                masses = {k: v for k, v in m_all.items() if k in keys}
                for g in block:
                    scores.append(crps_atoms(g["mu"], SIGMA, g["y"], masses))
            for g in block:
                priors.add(g["y"] - g["mu"])

        n = len(scores)
        crps = float(np.mean(scores))
        results.append({"candidate": name, "keys": sorted(keys), "n": n,
                        "crps": round(crps, 6),
                        "delta_vs_gaussian": round(crps - base, 6),
                        "gate": GATE, "cleared": bool(n >= 150 and crps <= GATE)})

    print("%-30s %10s %12s %10s" % ("candidate", "CRPS", "delta", "n"))
    print("-" * 66)
    for r in sorted(results, key=lambda r: r["crps"]):
        print("%-30s %10.6f %+12.6f %10d%s"
              % (r["candidate"], r["crps"], r["delta_vs_gaussian"], r["n"],
                 "  <-- CLEARS GATE" if r["cleared"] else ""))

    out = HERE / "knm_keynumbers_result.json"
    json.dump({"filter": "REG 2017 W1..2026 W5", "n_filter": len(games),
               "gaussian_baseline": round(base, 6),
               "method": "prior-only global key frequency, expanding window, "
                         "mean-preserving residual-relative atoms, energy-form CRPS",
               "results": results, "passed": False,
               "emission": "0 picks / 0 parlays / 0 DFS"},
              open(out, "w", encoding="utf-8"), indent=1)
    print()
    print("written", out)


if __name__ == "__main__":
    main()
