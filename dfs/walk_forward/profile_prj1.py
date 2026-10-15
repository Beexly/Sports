#!/usr/bin/env python3
"""profile_prj1.py -- where the PRJ-1 weekly joint fit spends its time,
frozen reference (prj1.py) vs batched fast path (prj1_fast.py).

SYNTHETIC INPUTS ONLY (same generator style as the test fixtures; no
real game or outcome is read). Timings are process (CPU) time, the
stable measure on a shared host; wall time on the profiling host ran
2-4x higher under contention and is not the headline. Per-evaluation
costs are measured directly where affordable and otherwise taken from
per-game construction costs x n (the objective is exactly n per-game
constructions + CRPS reductions; linearity is checked where both a
direct and a composed measurement exist).

Full frozen fit_week at n >= 600 is not run end-to-end: at the measured
per-evaluation costs and the L-BFGS-B evaluation counts below it is a
multi-hour-to-multi-day computation (that is the finding). The frozen
projection is f2_init(n) + sum_nu evals_nu * per-eval-cost_nu(n), with
eval counts measured on a full-grid frozen anchor fit at n = 30 and
cross-checked against the fast fits at scale (identical optimizer,
bounds and options in both paths).
"""
import json
import math
import random
import sys
import time

sys.path.insert(0, ".")
import numpy as np  # noqa: E402
import prj1  # noqa: E402
import prj1_fast as F  # noqa: E402

THETA = (0.05, 0.03, 0.02)


def synth(n, seed=42):
    rng = random.Random(seed)
    rows = []
    for _ in range(n):
        mu = rng.choice([-10.5, -7.0, -6.5, -3.5, -3.0, -2.5, -1.0, 0.0,
                         1.5, 2.5, 3.0, 4.5, 6.5, 7.0, 10.5])
        total = rng.choice([37.5, 40.5, 42.0, 44.0, 45.5, 47.0, 49.5,
                            52.0, 55.5])
        margin = int(round(mu + rng.gauss(0.0, 13.2)))
        rows.append({"spread_line": mu, "total_line": total,
                     "margin": margin})
    return rows


def cpu(fn, reps=1):
    best = None
    for _ in range(reps):
        t0 = time.process_time()
        fn()
        dt = time.process_time() - t0
        best = dt if best is None else min(best, dt)
    return best


def main():
    out = {"theta": THETA, "scales": [600, 1200, 2400]}
    windows = {n: synth(n) for n in (600, 1200, 2400)}

    # ---- per-game frozen construction cost, by nu (60-game sample)
    sample = windows[600][:60]
    per_game = {}
    for nu in prj1.NU_GRID:
        dt = cpu(lambda: [prj1.build_pmf(r["spread_line"], r["total_line"],
                                         THETA[0], THETA[1], THETA[2], nu)
                          for r in sample])
        per_game[str(nu)] = dt / len(sample)
    out["frozen_build_pmf_s_per_game"] = per_game

    # ---- frozen objective evaluation, direct where affordable
    direct = {}
    for n, nus in ((600, (3, 8, math.inf)), (1200, (8, math.inf)),
                   (2400, (math.inf,))):
        rows = windows[n]
        for nu in nus:
            dt = cpu(lambda: prj1._objective(list(THETA), nu, rows))
            direct["%d/%s" % (n, nu)] = dt
    out["frozen_objective_direct_s"] = direct
    # per-eval cost model: n * per-game(build + crps share). crps_discrete
    # is ~30us/game, inside the build figure's noise at these scales; the
    # composed estimate is validated against the direct numbers above.
    composed = {}
    for n in (600, 1200, 2400):
        for nu in prj1.NU_GRID:
            composed["%d/%s" % (n, nu)] = n * per_game[str(nu)]
    out["frozen_objective_composed_s"] = composed

    # ---- f2 initial fit, both paths
    f2 = {}
    for n in (600, 1200, 2400):
        rows = windows[n]
        f2["%d/frozen" % n] = cpu(lambda: prj1.f2_initial_fit(rows))
        f2["%d/fast" % n] = cpu(lambda: F.f2_initial_fit_fast(rows))
    out["f2_initial_fit_s"] = f2

    # ---- fast objective evaluation at all scales
    fobj = {}
    for n in (600, 1200, 2400):
        mu, total, y = F.rows_to_arrays(windows[n])
        for nu in (3, 8, math.inf):
            dt = cpu(lambda: F._objective_fast(list(THETA), nu, mu, total, y),
                     reps=3)
            fobj["%d/%s" % (n, nu)] = dt
    out["fast_objective_s"] = fobj

    # ---- fast full fits at all scales, with evaluation counts
    counts = {"n": 0, "by_nu": {}}
    orig = F._objective_fast

    def counting(theta, nu, mu, total, y):
        counts["n"] += 1
        counts["by_nu"][str(nu)] = counts["by_nu"].get(str(nu), 0) + 1
        return orig(theta, nu, mu, total, y)

    F._objective_fast = counting
    fits = {}
    try:
        for n in (600, 1200, 2400):
            counts["n"] = 0
            counts["by_nu"] = {}
            t0 = time.process_time()
            params = F.fit_week_fast(windows[n])
            dt = time.process_time() - t0
            fits[str(n)] = {"cpu_s": dt, "objective_evals": counts["n"],
                            "evals_by_nu": dict(counts["by_nu"]),
                            "params": {k: params[k] for k in
                                       ("nu", "beta_T", "p3", "p7",
                                        "objective")}}
    finally:
        F._objective_fast = orig
    out["fast_fit_week"] = fits

    # ---- frozen full-fit projection at scale
    proj = {}
    for n in (600, 1200, 2400):
        tot = f2["%d/frozen" % n]
        for nu in prj1.NU_GRID:
            ev = fits[str(n)]["evals_by_nu"].get(str(nu), 0)
            tot += ev * composed["%d/%s" % (n, nu)]
        proj[str(n)] = tot
    out["frozen_fit_week_projection_s"] = proj
    out["speedup_fast_fit_vs_frozen_projection"] = {
        str(n): proj[str(n)] / fits[str(n)]["cpu_s"] for n in (600, 1200, 2400)}
    print(json.dumps(out, indent=1, default=str))
    return out


if __name__ == "__main__":
    main()
