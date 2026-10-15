#!/usr/bin/env python3
"""observable_scan_fair.py -- is the oracle's apparent win real, or selection bias?

WHY THIS EXISTS
observable_scan.py reported weekday at CRPS 6.493182 "CLEARS GATE" and
away_rest_bin at 6.764911 "CLEARS GATE". Those look like findings. They are
probably artefacts, and this script tests that suspicion instead of reporting it.

THE BIAS
The oracle SKIPS any game whose cell has fewer than MIN_CELL prior games. It
scored 122 of 2462 games for weekday and 242 for away_rest_bin, while the
Gaussian scores all 2462. Comparing 6.493182 (n=122) against 7.154021 (n=2462)
is not a fair comparison: the oracle earned its low score partly by DISCARDING
the games it could not predict. Thin cells are thin because the situation is
rare, and rare situations are disproportionately unpredictable.

THE FIX
Compute BOTH scores on the IDENTICAL set of games -- exactly the ones the oracle
managed to score. If the oracle still wins there, the effect is real. If it
loses, the earlier "gate clear" was selection bias and must be retracted.
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
                "spread_line": sp, "resid": (hs - as_) - sp,
                "weekday": (x.get("weekday") or "").strip(),
                "roof": (x.get("roof") or "").strip(),
                "surface": (x.get("surface") or "").strip(),
                "div_game": (x.get("div_game") or "").strip(),
                "wind": _num(x, "wind"),
                "away_rest": _num(x, "away_rest"),
                "home_rest": _num(x, "home_rest"),
            })
    rows.sort(key=lambda r: (r["season"], r["week"]))
    return rows


def crps_gaussian(mu, sd, y):
    z = (y - mu) / sd
    phi = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    Phi = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return sd * (z * (2.0 * Phi - 1.0) + 2.0 * phi - 1.0 / math.sqrt(math.pi))


def crps_sample(draws, y):
    m = len(draws)
    if m == 0:
        return None
    t1 = 0.0
    for d in draws:
        t1 += abs(d - y)
    t1 /= m
    s = 0.0
    for i in range(m):
        di = draws[i]
        for j in range(m):
            d = di - draws[j]
            s += d if d >= 0 else -d
    return t1 - 0.5 * s / (m * m)


def wind_bin(w):
    if w is None:
        return None
    return "calm" if w < 8 else ("breezy" if w < 15 else "windy")


def rest_bin(v):
    if v is None:
        return None
    return "short" if v <= 6 else ("normal" if v <= 10 else "long")


def paired_scan(rows, name, key_fn):
    """Score the oracle and the Gaussian on the EXACT SAME games."""
    hist = defaultdict(list)
    seen = set()
    oracle_scores, gauss_scores = [], []
    for r in rows:
        key = key_fn(r)
        wk = (r["season"], r["week"])
        pool = hist.get(key) if key is not None else None
        if pool is not None and len(pool) >= MIN_CELL:
            p = pool
            if len(p) > MAX_POOL:
                stride = len(p) / float(MAX_POOL)
                idx = sorted({int(i * stride) for i in range(MAX_POOL)})
                p = [pool[i] for i in idx]
            mu = r["spread_line"]
            y = mu + r["resid"]
            oc = crps_sample([mu + v for v in p], y)
            gc = crps_gaussian(mu, 13.45, y)
            if oc is not None:
                oracle_scores.append(oc)
                gauss_scores.append(gc)
        if wk not in seen:
            seen.add(wk)
            if key is not None:
                hist[key].append(r["resid"])
    if len(oracle_scores) < 30:
        return None
    n = len(oracle_scores)
    om = sum(oracle_scores) / n
    gm = sum(gauss_scores) / n
    # paired SE on the per-game difference
    diffs = [o - g for o, g in zip(oracle_scores, gauss_scores)]
    dm = sum(diffs) / n
    var = sum((d - dm) ** 2 for d in diffs) / max(1, n - 1)
    se = math.sqrt(var / n) if n > 1 else float("nan")
    return {"name": name, "n": n, "oracle": om, "gauss_same_subset": gm,
            "delta": om - gm, "se": se,
            "significant": abs(dm) > 2 * se if se == se else False}


def main():
    rows = load()
    print("frozen filter n = %d" % len(rows))
    print("Gaussian on ALL games = %.6f   gate = %.3f" % (BASELINE, GATE))
    print()
    print("PAIRED comparison: oracle vs Gaussian on the IDENTICAL subset of games.")
    print("This removes the selection bias that inflated the first scan.")
    print()
    print("  %-18s %6s %10s %12s %10s %9s %s"
          % ("observable", "n", "oracle", "gauss(subset)", "delta", "SE", "verdict"))
    print("  " + "-" * 84)

    cands = [
        ("weekday", lambda r: r["weekday"] or None),
        ("away_rest_bin", lambda r: rest_bin(r["away_rest"])),
        ("home_rest_bin", lambda r: rest_bin(r["home_rest"])),
        ("surface", lambda r: r["surface"] or None),
        ("wind_bin", lambda r: wind_bin(r["wind"])),
        ("div_game", lambda r: r["div_game"] or None),
        ("roof", lambda r: r["roof"] or None),
        ("location", lambda r: "home"),
    ]
    out = []
    for name, fn in cands:
        res = paired_scan(rows, name, fn)
        if res is None:
            print("  %-18s %s" % (name, "<too few paired games>"))
            continue
        verdict = "REAL" if (res["significant"] and res["delta"] < 0) else "not significant"
        print("  %-18s %6d %10.6f %12.6f %+10.6f %9.6f %s"
              % (res["name"], res["n"], res["oracle"], res["gauss_same_subset"],
                 res["delta"], res["se"], verdict))
        out.append(res)

    print()
    if not out:
        print("nothing scored enough paired games")
        return
    real = [r for r in out if r["significant"] and r["delta"] < 0]
    print("observables with a STATISTICALLY REAL improvement over the fixed")
    print("Gaussian on the same games: %d of %d" % (len(real), len(out)))
    if real:
        for r in sorted(real, key=lambda x: x["delta"]):
            print("   %-18s delta %+.6f +/- %.6f  (n=%d)" % (r["name"], r["delta"], r["se"], r["n"]))
    else:
        print("   NONE.")
        print()
        print("   The first scan's 'gate clears' for weekday (6.493182) and")
        print("   away_rest_bin (6.764911) were SELECTION BIAS: those observables")
        print("   scored only 122 and 242 of 2462 games, discarding the")
        print("   unpredictable ones. On a paired comparison the advantage vanishes.")
        print()
        print("   RETRACTED: no observable clears the 7.099 gate. The honest")
        print("   conclusion stands -- sigma-shaping on available columns does not")
        print("   reach the gate.")


if __name__ == "__main__":
    main()
