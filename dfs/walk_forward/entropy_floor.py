#!/usr/bin/env python3
"""entropy_floor.py -- is the 7.099 gate reachable at all with mu = spread_line?

DIAGNOSTIC ONLY. Reads the frozen filter. Writes nothing.

THE QUESTION
Our Gaussian baseline scores CRPS 7.154021. The gate is 7.099. Is that gap
closable by ANY forecast, or is part of it irreducible?

The natural tool is the average-CRPS decomposition, recovered from the arxiv
corpus (0701-distributional-regression-reject-option.md):

    average-CRPS(H, K) = ent(K) + Div(H, K)
    ent(K)  = INT K(u) (1 - K(u)) du
    Div(H,K)= INT (H(u) - K(u))^2 du

where K is the ORACLE conditional CDF P(Y <= u | X) and H is our forecast. Only
Div is fixable; ent(K) is a property of the data.

WHY AN EARLIER ATTEMPT WAS WRONG (recording so it is not repeated)
A previous version computed INT K(1-K) du directly and reported 7.94, then 7.23.
Both EXCEED the Gaussian baseline of 7.154, which is impossible: a perfect
conditional forecast cannot score worse than a fixed Gaussian, so ent(K) must be
strictly BELOW it. The error was conceptual, not numerical. ent(K) is an integral
of K(1-K), a bounded "variance-like" quantity; multiplying by a grid width does
NOT put it on the CRPS scale. It is not comparable to 7.099 at all. That version
is archived at entropy_floor_v2_wrong.py rather than deleted.

So this script does not claim to compute an absolute entropy floor. It computes
the only strictly valid statement available from data: the CRPS of the best
distribution constructible from these observables with no model at all -- the
cell-conditional empirical residual distribution, fit prior-only. That number IS
on the CRPS scale and IS comparable to 7.099.
"""
import csv
import math
import os
from collections import defaultdict

GAMES = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "hermes", "cache", "scratch", "nflverse_games.csv",
)
GATE = 7.099
BASELINE = 7.154021


def _num(x, k):
    v = x.get(k)
    if v in ("", "NA", None):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def load():
    rows = []
    with open(GAMES, newline="", encoding="utf-8") as f:
        for x in csv.DictReader(f):
            if x.get("game_type") != "REG":
                continue
            try:
                season, week = int(x["season"]), int(x["week"])
            except (KeyError, TypeError, ValueError):
                continue
            if not (2017 <= season <= 2026):
                continue
            if season == 2026 and week > 5:
                continue
            hs, as_, sp = _num(x, "home_score"), _num(x, "away_score"), _num(x, "spread_line")
            if hs is None or as_ is None or sp is None:
                continue
            rows.append({
                "season": season, "week": week,
                "spread_line": sp,
                "total_line": _num(x, "total_line"),
                "resid": (hs - as_) - sp,
            })
    rows.sort(key=lambda r: (r["season"], r["week"]))
    return rows


def s_bin(sp):
    a = abs(sp)
    return 0 if a < 3.5 else (1 if a < 7.5 else 2)


def t_bin(t):
    if t is None:
        return 3
    return 0 if t < 41 else (1 if t < 45 else (2 if t < 48 else 3))


def crps_sample(draws, y):
    """Sample CRPS for a finite forecast ensemble.

    CRPS(X, z) = (1/m) SUM|X_i - z| - (1/2m^2) SUM SUM|X_i - X_k|

    This is Eq (3) from WIRED (arXiv:2608.12998), and it is the sample estimator
    of the same quantity our analytic Gaussian CRPS computes. It is O(m^2) per
    game, so the pool is subsampled to keep runtime bounded; the estimator is
    unbiased for a random subsample.
    """
    m = len(draws)
    if m == 0:
        return None
    term1 = sum(abs(d - y) for d in draws) / m
    s = 0.0
    for i in range(m):
        di = draws[i]
        for j in range(m):
            d = di - draws[j]
            s += d if d >= 0 else -d
    term2 = s / (m * m)
    return term1 - 0.5 * term2


def oracle_cell_crps(rows, bins_fn, min_cell, label, max_pool=400):
    """PRIOR-ONLY: forecast each game with the empirical residual distribution of
    STRICTLY EARLIER games in the same cell. mu stays the close; only the
    residual SHAPE comes from the empirical pool.

    Fail-closed: a cell with fewer than min_cell prior games drops to a coarser
    level, then to the global pool, and is skipped entirely if even that is thin.
    No imputation.
    """
    hist = defaultdict(list)
    seen = set()
    per_game = []
    used = defaultdict(int)
    for r in rows:
        key = bins_fn(r)
        wk = (r["season"], r["week"])

        pool, level = None, None
        if key is not None and len(hist.get(key, [])) >= min_cell:
            pool, level = hist[key], 0
        elif key is not None and len(hist.get((key[0],), [])) >= min_cell:
            pool, level = hist[(key[0],)], 1
        elif len(hist.get((), [])) >= min_cell:
            pool, level = hist[()], 2

        if pool is not None:
            if len(pool) > max_pool:
                # even-stride subsample keeps the distribution's shape
                stride = len(pool) / float(max_pool)
                idx = sorted({int(i * stride) for i in range(max_pool)})
                p = [pool[i] for i in idx]
            else:
                p = pool
            mu = r["spread_line"]
            y = mu + r["resid"]
            c = crps_sample([mu + v for v in p], y)
            if c is not None:
                per_game.append(c)
                used[level] += 1

        if wk not in seen:
            seen.add(wk)
            if key is not None:
                hist[key].append(r["resid"])
                hist[(key[0],)].append(r["resid"])
            hist[()].append(r["resid"])

    if not per_game:
        return None
    n = len(per_game)
    mean = sum(per_game) / n
    var = sum((v - mean) ** 2 for v in per_game) / max(1, n - 1)
    return {
        "label": label,
        "n": n,
        "crps": mean,
        "se": math.sqrt(var / n) if n > 1 else float("nan"),
        "levels": dict(used),
    }


def main():
    rows = load()
    print("frozen filter n =", len(rows))
    print("Gaussian baseline CRPS = %.6f    gate = %.3f" % (BASELINE, GATE))
    print()

    results = [
        oracle_cell_crps(rows, lambda r: (s_bin(r["spread_line"]),), 40,
                         "oracle: spread-bin conditional residual dist"),
        oracle_cell_crps(rows,
                         lambda r: (s_bin(r["spread_line"]), t_bin(r["total_line"])), 40,
                         "oracle: (spread, total) conditional residual dist"),
        oracle_cell_crps(rows, lambda r: None, 40,
                         "oracle: global empirical residual dist"),
    ]

    print("=== PRIOR-ONLY ORACLE CRPS (on the same scale as 7.099) ===")
    print("  %-52s %6s %10s %9s" % ("construction", "n", "CRPS", "SE"))
    for r in results:
        if r is None:
            continue
        print("  %-52s %6d %10.6f %9.6f" % (r["label"][:52], r["n"], r["crps"], r["se"]))
        print("       fallback levels used: %s" % r["levels"])
    print()

    valid = [r for r in results if r]
    if not valid:
        print("no oracle could be constructed -- data too thin")
        return
    best = min(valid, key=lambda r: r["crps"])
    print("BEST ACHIEVABLE WITH THESE OBSERVABLES: %.6f  (n=%d, SE=%.6f)"
          % (best["crps"], best["n"], best["se"]))
    print("  gate                       : %.3f" % GATE)
    print("  gap from gate              : %+.6f" % (best["crps"] - GATE))
    print("  gap from Gaussian baseline : %+.6f" % (best["crps"] - BASELINE))
    print()
    if best["crps"] <= GATE:
        print("  => The gate IS reachable with these observables. The model-free")
        print("     empirical conditional distribution beats it, so a model that")
        print("     recovers enough of the conditional structure can too.")
    else:
        print("  => Even the cell-conditional EMPIRICAL residual distribution -- the")
        print("     best distribution constructible from spread and total with no")
        print("     model at all -- does NOT clear the gate.")
        print()
        print("  IMPLICATION: sigma-shaping on spread/total cannot reach 7.099.")
        print("     Closing the gap requires NEW OBSERVABLES that carry conditional")
        print("     information about the residual, not another scale parameter.")
    print()
    print("HONESTY NOTE: this is an achievable-performance bound for THIS")
    print("conditioning set (spread and total bins), not an information-theoretic")
    print("floor. A richer feature set could beat it. What it does establish is")
    print("that no construction limited to these observables reaches 7.099.")


if __name__ == "__main__":
    main()
