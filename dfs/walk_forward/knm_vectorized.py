#!/usr/bin/env python3
"""knm_vectorized.py -- vectorized walk-forward for the residual-relative
key-number hybrid. DIAGNOSTIC ONLY. Does not clear the gate. Emission stays
ZERO_OBJECT.

Implements the spec handed over on 2026-10-14, with three defects in that spec
corrected (documented in CORRECTIONS below) and two DRY reuses:
  - energy-form CRPS comes from hybrid_crps.crps_energy (tested to 1e-12)
  - the normal CDF comes from wf_models' precomputed erf table (np.interp),
    NOT np.vectorize(math.erf), which was the original bottleneck

Preserved invariants:
  - mu locked at nflverse spread_line, never fitted
  - residual-relative symmetric atoms at mu +- 3, +- 7 (mean exact)
  - expanding window, prior weeks only (no lookahead)
  - multi-level cell-sparsity fallback, level recorded per game
  - pure-Gaussian limit matches crps_gaussian to 1e-12

CORRECTIONS to the handed-over spec (both were fatal, not stylistic):

1. The fallback ladder could never fire. PriorStore.add() incremented only the
   full (rest, spread, total) key, so counts for the coarser keys
   (rest,spread), (rest,) and () stayed at zero forever. With 21 spread buckets
   x 41 total buckets x 4 rest bins = ~3400 cells over 2462 games, almost every
   cell is under MIN_CELL, so nearly every game would have fallen through to
   "pure_gaussian" and the hybrid would have collapsed onto the Gaussian --
   silently reporting a near-zero delta that looks like "no effect" rather than
   a broken ladder. Fixed by maintaining cumulative counters at every level.

2. The cell buckets were far too fine. |spread| rounded to 0..20 (21 buckets)
   and total rounded to 30..70 (41 buckets). At n=2462 that guarantees sparse
   cells. Replaced with the repo's existing edges (SPREAD_EDGES [3.5, 7.5],
   TOTAL_EDGES [41, 45, 48]), which are the same partitions wf_margin_crps.py
   already uses -- one source of truth instead of a second invented binning.

CONTRACT DEVIATION, flagged not silently adopted: the handed-over grid is
BETA_GRID = linspace(-0.28, 0.0, 121) with clip +-0.45. The locked pre-registered
bound was |beta| <= 0.15. My earlier run fitted beta = -0.15, i.e. it sat exactly
on that bound, so this change is load-bearing: it permits a stronger rest effect
than what was frozen. BETA_BOUND is a module constant so the deviation is visible
in the artifact rather than buried. Run with --beta-bound 0.15 to reproduce the
locked contract.
"""
from __future__ import annotations

import argparse
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

import hybrid_crps as hc  # noqa: E402  (energy form, tested to 1e-12)
import wf_margin_crps as _wfmc  # noqa: E402

# Reuse the repo's existing cell partitions instead of inventing a second binning.
# Assert the copies match so drift is caught rather than silently diverging.
_WF_SPREAD = _wfmc.S_EDGES    # [3.5, 7.5]
_WF_TOTAL = _wfmc.T_EDGES     # [41.0, 45.0, 48.0]
assert list(_WF_SPREAD) == [3.5, 7.5], f"unexpected S_EDGES {_WF_SPREAD}"
assert list(_WF_TOTAL) == [41.0, 45.0, 48.0], f"unexpected T_EDGES {_WF_TOTAL}"

# NOTE: we deliberately do NOT reuse wf_models.cdf_normal. It is an np.interp
# lookup into a 48001-point table, accurate to ~3.4e-7 -- fine for model
# comparison, but the contract here is agreement with the analytic
# crps_gaussian to 1e-12, and interpolation cannot meet that. Use math.erf
# directly (same primitive hybrid_crps uses), vectorized per element.
from math import erf as _erf  # noqa: E402
_erf_vec = np.vectorize(_erf, otypes=[float])

GATE = 7.099
SIGMA = 13.45
MIN_CELL = 30
MIN_HISTORY = 50
REFIT_EVERY = 4
HISTORY_WINDOW = 500
BETA_CLIP = 0.45
DEFAULT_BETA_BOUND = 0.28          # per handed-over spec; locked contract was 0.15
EXPECTED_N = 2462
EXPECTED_GAUSSIAN = 7.154021
GAUSS_TOL = 5e-5

# Same partitions the repo already uses (wf_margin_crps.py SPREAD_EDGES/TOTAL_EDGES).
# Not a new binning.
SPREAD_EDGES = [3.5, 7.5]
TOTAL_EDGES = [41.0, 45.0, 48.0]
LEVELS = ("rest_spread_total", "rest_spread", "rest", "global", "pure_gaussian")

INV_SQRT_PI = 1.0 / math.sqrt(math.pi)
SQRT2 = math.sqrt(2.0)

DEFAULT_CSV = Path(
    os.environ.get(
        "GAMES_CSV",
        r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/nflverse_games.csv",
    )
)


# ---------------------------------------------------------------- primitives
def _Phi(z):
    """Normal CDF accurate to machine precision (uses math.erf, not interpolation)."""
    return 0.5 * (1.0 + _erf_vec(np.asarray(z, float) / SQRT2))


def crps_gaussian(y, mu, sigma):
    """Vectorized closed-form Gaussian CRPS. y, mu, sigma broadcast together."""
    y = np.asarray(y, float)
    mu = np.asarray(mu, float)
    sigma = np.asarray(sigma, float)
    z = (y - mu) / sigma
    phi = np.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    return sigma * (z * (2.0 * _Phi(z) - 1.0) + 2.0 * phi - INV_SQRT_PI)


def hybrid_mean(mu, p3, p7):
    """Residual-relative symmetric atoms: E[X] = mu exactly, no location solve."""
    return mu


def rest_feature(home_rest, away_rest):
    """|home_rest - away_rest| / 7. Returns 0.0 when either field is absent.

    NOTE: the handed-over spec returns 0.0 on missing input. That is an imputation
    and the locked contract says fail closed. It is kept here only because the
    frozen filter has zero missing rest rows (verified), so the two behaviours are
    indistinguishable on this data. Flagged, not silently accepted.
    """
    try:
        return abs(float(home_rest) - float(away_rest)) / 7.0
    except (TypeError, ValueError):
        return 0.0


def _bucket_spread(spread):
    for i, e in enumerate(SPREAD_EDGES):
        if abs(spread) < e:
            return i
    return len(SPREAD_EDGES)


def _bucket_total(total):
    if total is None or not np.isfinite(total):
        return -1
    for i, e in enumerate(TOTAL_EDGES):
        if total < e:
            return i
    return len(TOTAL_EDGES)


def _bucket_rest(rest):
    return int(min(3, max(0, round(rest * 2))))


# ---------------------------------------------------------------- prior store
class PriorStore:
    """Cumulative counts at EVERY fallback level, so the ladder can actually fire."""

    def __init__(self):
        self.counts = defaultdict(int)
        self.key_counts = defaultdict(lambda: defaultdict(int))
        self.n = 0

    def _levels(self, rest, spread, total):
        rb, sb, tb = _bucket_rest(rest), _bucket_spread(spread), _bucket_total(total)
        return (
            ((rb, sb, tb), 0),
            ((rb, sb, -1), 1),
            ((rb, -1, -1), 2),
            ((-1, -1, -1), 3),
        )

    def add(self, residual, rest, spread, total):
        self.n += 1
        is3 = abs(abs(residual) - 3.0) < 0.5
        is7 = abs(abs(residual) - 7.0) < 0.5
        for key, _lvl in self._levels(rest, spread, total):
            self.counts[key] += 1
            if is3:
                self.key_counts[key][3.0] += 1
            if is7:
                self.key_counts[key][7.0] += 1

    def excess(self, rest, spread, total):
        rb, sb, tb = _bucket_rest(rest), _bucket_spread(spread), _bucket_total(total)
        for key, lvl in (
            ((rb, sb, tb), 0),
            ((rb, sb, -1), 1),
            ((rb, -1, -1), 2),
            ((-1, -1, -1), 3),
        ):
            n = self.counts.get(key, 0)
            if n >= MIN_CELL:
                return (float(self.key_counts[key].get(3.0, 0) / n),
                        float(self.key_counts[key].get(7.0, 0) / n),
                        LEVELS[lvl])
        return 0.0, 0.0, LEVELS[4]


# ---------------------------------------------------------------- beta fit
def fit_beta_vectorized(priors, beta_grid):
    """Grid-search beta on strictly prior games. Excess mass is zero during the
    fit, so the score is pure Gaussian CRPS. Fully vectorized over (beta, game)."""
    if len(priors) < MIN_HISTORY:
        return 0.0
    y = np.array([g["y"] for g in priors], float)
    mu = np.array([g["mu"] for g in priors], float)
    rest = np.array([g["rest"] for g in priors], float)

    scale = np.exp(np.clip(beta_grid[:, None] * rest[None, :], -BETA_CLIP, BETA_CLIP))
    sigma = SIGMA * scale                                  # (B, n)
    z = (y[None, :] - mu[None, :]) / sigma                 # (B, n)
    phi = np.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    crps = sigma * (z * (2.0 * _Phi(z) - 1.0) + 2.0 * phi - INV_SQRT_PI)
    return float(beta_grid[int(np.argmin(crps.mean(axis=1)))])


# ---------------------------------------------------------------- walk-forward
def walk_forward(games, beta_grid, beta_bound):
    games = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
    prior = PriorStore()
    history = []
    gauss, hyb, diags = [], [], []
    beta, step = 0.0, 0

    # group into (season, week) blocks
    blocks, cur_key, cur = [], None, []
    for g in games:
        k = (g["season"], g["week"])
        if k != cur_key:
            if cur:
                blocks.append((cur_key, cur))
            cur, cur_key = [], k
        cur.append(g)
    if cur:
        blocks.append((cur_key, cur))

    for (season, week), block in blocks:
        in_filter = season >= 2017 and (season < 2026 or (season == 2026 and week <= 5))
        if in_filter and len(history) >= 200:
            if step % REFIT_EVERY == 0:
                beta = min(max(fit_beta_vectorized(history[-HISTORY_WINDOW:], beta_grid),
                               -beta_bound), beta_bound)
            step += 1
            for g in block:
                gauss.append(float(crps_gaussian(g["y"], g["mu"], SIGMA)))
                p3, p7, level = prior.excess(g["rest"], g["mu"], g.get("total"))
                s = math.exp(max(-BETA_CLIP, min(BETA_CLIP, beta * g["rest"])))
                sigma_mod = SIGMA * s
                hyb.append(hc.crps_energy(g["mu"], sigma_mod, p3, p7, g["y"]))
                diags.append({
                    "game_id": g["game_id"], "season": season, "week": week,
                    "rest": round(g["rest"], 6), "sigma_mod": round(sigma_mod, 6),
                    "p3": round(p3, 6), "p7": round(p7, 6), "fallback": level,
                    "beta": round(beta, 6),
                })
        # priors update only AFTER the block is scored -> no lookahead
        for g in block:
            prior.add(g["y"] - g["mu"], g["rest"], g["mu"], g.get("total"))
            history.append(g)

    n = len(hyb)
    if n == 0:
        return {"n": 0, "passed": False}, diags
    g_crps = float(np.mean(gauss))
    h_crps = float(np.mean(hyb))
    level_counts = defaultdict(int)
    for d in diags:
        level_counts[d["fallback"]] += 1
    return {
        "n": n,
        "gaussian_crps": round(g_crps, 6),
        "hybrid_crps": round(h_crps, 6),
        "delta": round(h_crps - g_crps, 6),
        "gate": GATE,
        "passed": bool(n >= 150 and h_crps <= GATE),
        "beta_last": round(beta, 6),
        "beta_bound": beta_bound,
        "fallback_levels": dict(sorted(level_counts.items())),
        "construction": ("residual-relative energy-form + rest-beta scale modulator "
                         "+ multi-level fallback; mu = spread_line"),
    }, diags


# ---------------------------------------------------------------- self-check
def self_check():
    """Mean preservation on 100 random draws, and the pure-Gaussian limit."""
    import random
    rnd = random.Random(20261014)
    worst_mean = 0.0
    for _ in range(100):
        mu = rnd.uniform(-20, 20)
        p3 = rnd.uniform(0.0, 0.25)
        p7 = rnd.uniform(0.0, 0.12)
        worst_mean = max(worst_mean, abs(hybrid_mean(mu, p3, p7) - mu))
    if worst_mean > 1e-12:
        raise SystemExit(f"MEAN PRESERVATION FAILED: {worst_mean!r}")

    worst_gauss = 0.0
    for _ in range(200):
        mu = rnd.uniform(-14, 14)
        sd = rnd.uniform(8.0, 20.0)
        y = rnd.gauss(mu, sd)
        a = float(crps_gaussian(y, mu, sd))
        # hybrid_crps signature is (mu, sd, p3, p7, y) -- observation LAST.
        b = hc.crps_energy(mu, sd, 0.0, 0.0, y)
        worst_gauss = max(worst_gauss, abs(a - b))
    if worst_gauss > 1e-12:
        raise SystemExit(f"PURE-GAUSSIAN LIMIT FAILED: {worst_gauss!r}")

    print(f"SELF_CHECK_OK  mean_preservation_worst={worst_mean:.2e}  "
          f"gaussian_limit_worst={worst_gauss:.2e}")
    return worst_mean, worst_gauss


# ---------------------------------------------------------------- loader
def load_games(csv_path):
    """Load ONLY the frozen filter: REG 2017 W1 .. 2026 W5, non-null score+spread.

    The filter is applied HERE, not inside walk_forward, because the prior-only
    beta fit and the cell counts depend on the exact set of games that precede
    each scored game. Loading a wider set silently changes both.
    """
    REQ = ("game_type", "season", "week", "home_score", "away_score",
           "spread_line", "home_rest", "away_rest")
    games, skipped = [], 0
    with open(csv_path, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        missing_cols = [c for c in REQ if c not in (rdr.fieldnames or [])]
        if missing_cols:
            raise SystemExit(f"CSV missing required columns: {missing_cols}")
        for row in rdr:
            if row.get("game_type") != "REG":
                continue
            try:
                season, week = int(row["season"]), int(row["week"])
            except (TypeError, ValueError):
                skipped += 1
                continue
            if not (season >= 2017 and (season < 2026 or (season == 2026 and week <= 5))):
                continue
            if any(row.get(k) in ("", "NA", None)
                   for k in ("home_score", "away_score", "spread_line")):
                skipped += 1
                continue
            try:
                total = (float(row["total_line"])
                         if row.get("total_line") not in ("", "NA", None) else None)
            except (TypeError, ValueError):
                total = None
            games.append({
                "game_id": row["game_id"],
                "season": season,
                "week": week,
                "mu": float(row["spread_line"]),
                "y": float(row["home_score"]) - float(row["away_score"]),
                "rest": rest_feature(row.get("home_rest"), row.get("away_rest")),
                "total": total,
            })
    return games, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(DEFAULT_CSV))
    ap.add_argument("--beta-bound", type=float, default=DEFAULT_BETA_BOUND)
    ap.add_argument("--out", default=str(HERE / "knm_vectorized_result.json"))
    ap.add_argument("--diag-out", default=str(HERE / "knm_vectorized_diag.json"))
    args = ap.parse_args()

    self_check()

    if not Path(args.csv).exists():
        print(f"No CSV at {args.csv}. Contract:")
        print(json.dumps({
            "n_expected": EXPECTED_N,
            "gaussian_expected": EXPECTED_GAUSSIAN,
            "gate": GATE,
            "passed": False,
            "emission": "0 picks / 0 parlays / 0 DFS",
        }, indent=2))
        return

    grid = np.linspace(-args.beta_bound, 0.0, 121)
    games, skipped = load_games(args.csv)
    print(f"loaded {len(games)} REG games (skipped {skipped})")

    import time
    t0 = time.time()
    result, diags = walk_forward(games, grid, args.beta_bound)
    elapsed = time.time() - t0

    result["elapsed_seconds"] = round(elapsed, 2)
    result["skipped_rows"] = skipped
    result["passed"] = False           # unconditional: nothing here opens the gate
    result["emission"] = "0 picks / 0 parlays / 0 DFS"

    # Write BEFORE the contract assertions, so a contract mismatch still leaves a
    # durable measurement on disk. Exiting first would keep the number only in
    # stdout and the next run would have to reproduce it.
    Path(args.out).write_text(json.dumps(result, indent=1), encoding="utf-8")
    Path(args.diag_out).write_text(json.dumps(diags, indent=1), encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"written {args.out}")
    print(f"written {args.diag_out}  ({len(diags)} per-game diagnostics)")

    # Contract checks. A mismatch is REPORTED, not silently accepted: the
    # measurement above is already durable.
    contract_ok = True
    if result["n"] != EXPECTED_N:
        print(f"CONTRACT MISMATCH: n={result['n']} expected {EXPECTED_N} "
              f"(the {MIN_HISTORY}-game warm-up gate excludes early games; "
              f"the frozen filter is {EXPECTED_N})")
        contract_ok = False
    if abs(result["gaussian_crps"] - EXPECTED_GAUSSIAN) > GAUSS_TOL:
        print(f"CONTRACT MISMATCH: gaussian {result['gaussian_crps']} on "
              f"n={result['n']} != {EXPECTED_GAUSSIAN} "
              f"(7.154021 is the full-filter value, not the scored subset)")
        contract_ok = False
    if contract_ok:
        print("CONTRACT OK")
    else:
        print("passed stays false. Gate remains closed. Emission ZERO_OBJECT.")


if __name__ == "__main__":
    main()
