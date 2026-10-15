#!/usr/bin/env python3
"""observable_scan.py -- which columns carry conditional residual information?

The entropy-floor measurement established that the model-free empirical residual
distribution scores 7.164250, WORSE than the fixed Gaussian's 7.154021, when
conditioned on spread and total. Conclusion: sigma-shaping on those two
observables cannot reach the 7.099 gate.

But the frozen filter has 46 columns and I have only ever used 2. This script
tests EVERY remaining column as a conditioning variable, using the same
prior-only model-free oracle, to answer one question empirically:

    does ANY available observable carry exploitable conditional structure in the
    residual (margin - spread_line)?

DIAGNOSTIC ONLY. Prior-only (no lookahead), fail-closed on thin cells, no
imputation. Writes nothing.
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
ORACLE_SPREAD_TOTAL = 7.164250   # measured in entropy_floor.py
MIN_CELL = 40
MAX_POOL = 300


def _num(x, k):
    v = x.get(k)
    if v in ("", "NA", None):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _int(x, k):
    v = _num(x, k)
    return None if v is None else int(v)


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
                # candidate observables, verbatim from the file
                "away_qb_id": (x.get("away_qb_id") or "").strip(),
                "home_qb_id": (x.get("home_qb_id") or "").strip(),
                "stadium": (x.get("stadium") or "").strip(),
                "stadium_id": (x.get("stadium_id") or "").strip(),
                "referee": (x.get("referee") or "").strip(),
                "away_coach": (x.get("away_coach") or "").strip(),
                "home_coach": (x.get("home_coach") or "").strip(),
                "roof": (x.get("roof") or "").strip(),
                "surface": (x.get("surface") or "").strip(),
                "div_game": (x.get("div_game") or "").strip(),
                "weekday": (x.get("weekday") or "").strip(),
                "overtime": (x.get("overtime") or "").strip(),
                "location": (x.get("location") or "").strip(),
                "temp": _num(x, "temp"),
                "wind": _num(x, "wind"),
                "away_rest": _num(x, "away_rest"),
                "home_rest": _num(x, "home_rest"),
            })
    rows.sort(key=lambda r: (r["season"], r["week"]))
    return rows


def crps_sample(draws, y):
    m = len(draws)
    if m == 0:
        return None
    term1 = 0.0
    for d in draws:
        term1 += abs(d - y)
    term1 /= m
    s = 0.0
    for i in range(m):
        di = draws[i]
        for j in range(m):
            d = di - draws[j]
            s += d if d >= 0 else -d
    return term1 - 0.5 * s / (m * m)


def oracle_by(rows, key_fn, min_cell=MIN_CELL, max_pool=MAX_POOL):
    """Prior-only oracle conditioned on key_fn(row). Returns None if the key
    function produces no usable signal (too thin everywhere)."""
    hist = defaultdict(list)
    seen = set()
    per_game = []
    skipped_thin = 0
    for r in rows:
        key = key_fn(r)
        wk = (r["season"], r["week"])
        pool = hist.get(key) if key is not None else None
        if pool is not None and len(pool) >= min_cell:
            if len(pool) > max_pool:
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
        else:
            skipped_thin += 1
        if wk not in seen:
            seen.add(wk)
            if key is not None:
                hist[key].append(r["resid"])
    if len(per_game) < 100:
        return None
    n = len(per_game)
    mean = sum(per_game) / n
    var = sum((v - mean) ** 2 for v in per_game) / max(1, n - 1)
    return {
        "n": n, "crps": mean, "se": math.sqrt(var / n),
        "skipped_thin": skipped_thin,
        "n_cells": len(hist),
    }


def temp_bin(t):
    if t is None:
        return None
    if t < 32:
        return "cold"
    if t < 50:
        return "cool"
    if t < 70:
        return "mild"
    return "warm"


def wind_bin(w):
    if w is None:
        return None
    if w < 8:
        return "calm"
    if w < 15:
        return "breezy"
    return "windy"


def rest_bin(v):
    if v is None:
        return None
    return "short" if v <= 6 else ("normal" if v <= 10 else "long")


CANDIDATES = [
    ("away_qb_id",              lambda r: r["away_qb_id"] or None),
    ("home_qb_id",              lambda r: r["home_qb_id"] or None),
    ("stadium",                 lambda r: r["stadium"] or None),
    ("stadium_id",              lambda r: r["stadium_id"] or None),
    ("referee",                 lambda r: r["referee"] or None),
    ("away_coach",              lambda r: r["away_coach"] or None),
    ("home_coach",              lambda r: r["home_coach"] or None),
    ("roof",                    lambda r: r["roof"] or None),
    ("surface",                 lambda r: r["surface"] or None),
    ("div_game",                lambda r: r["div_game"] or None),
    ("weekday",                 lambda r: r["weekday"] or None),
    ("location",                lambda r: r["location"] or None),
    ("temp_bin",                lambda r: temp_bin(r["temp"])),
    ("wind_bin",                lambda r: wind_bin(r["wind"])),
    ("away_rest_bin",           lambda r: rest_bin(r["away_rest"])),
    ("home_rest_bin",           lambda r: rest_bin(r["home_rest"])),
    # pairs -- the strongest plausible combinations
    ("home_qb_id x stadium",    lambda r: (r["home_qb_id"], r["stadium"]) if r["home_qb_id"] and r["stadium"] else None),
    ("roof x temp_bin",         lambda r: (r["roof"], temp_bin(r["temp"])) if r["roof"] and temp_bin(r["temp"]) else None),
    ("referee x roof",          lambda r: (r["referee"], r["roof"]) if r["referee"] and r["roof"] else None),
    ("div_game x weekday",      lambda r: (r["div_game"], r["weekday"]) if r["div_game"] and r["weekday"] else None),
]


def main():
    rows = load()
    print("frozen filter n = %d  (46 columns available)" % len(rows))
    print("fixed Gaussian baseline  = %.6f" % BASELINE)
    print("oracle on spread+total   = %.6f  (measured previously)" % ORACLE_SPREAD_TOTAL)
    print("gate                     = %.3f" % GATE)
    print()
    print("Prior-only, model-free oracle per observable. Lower is better.")
    print("A column is INFORMATIVE if conditioning on it beats the Gaussian.")
    print()
    print("  %-22s %6s %10s %9s %7s %6s" % ("observable", "n", "CRPS", "SE", "cells", "thin"))
    print("  " + "-" * 66)

    results = []
    for name, fn in CANDIDATES:
        res = oracle_by(rows, fn)
        if res is None:
            print("  %-22s %s" % (name, "  <too thin, no usable cells>"))
            continue
        flag = ""
        if res["crps"] < BASELINE:
            flag = "  <-- BEATS GAUSSIAN"
        if res["crps"] < GATE:
            flag = "  <-- CLEARS GATE"
        print("  %-22s %6d %10.6f %9.6f %7d %6d%s"
              % (name, res["n"], res["crps"], res["se"], res["n_cells"],
                 res["skipped_thin"], flag))
        results.append((res["crps"], name, res))

    print()
    if not results:
        print("no observable produced a usable cell structure")
        return
    results.sort()
    best_crps, best_name, best = results[0]
    print("BEST OBSERVABLE: %s at %.6f (n=%d)" % (best_name, best_crps, best["n"]))
    print("  vs Gaussian baseline : %+.6f" % (best_crps - BASELINE))
    print("  vs spread+total      : %+.6f" % (best_crps - ORACLE_SPREAD_TOTAL))
    print("  vs gate              : %+.6f" % (best_crps - GATE))
    print()
    informative = [r for r in results if r[0] < BASELINE]
    print("observables that beat the fixed Gaussian: %d of %d tested"
          % (len(informative), len(results)))
    if informative:
        for c, n, r in informative:
            print("   %-22s %.6f  (%+.6f vs Gaussian)" % (n, c, c - BASELINE))
    else:
        print("   NONE. No single available observable carries enough conditional")
        print("   residual information to beat a fixed Gaussian(mu=close, sigma=13.45).")
    print()
    print("HONESTY NOTE: a negative result here does NOT prove these observables are")
    print("useless -- the oracle is model-free and bin-limited, and a real model can")
    print("extract more from a feature than an empirical cell mean can. What it DOES")
    print("establish is the ceiling for sigma-shaping alone on each column.")


if __name__ == "__main__":
    main()
