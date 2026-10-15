#!/usr/bin/env python3
"""pit_joint.py -- the single joint fit, authorised because 3 of 3 solos improved.

RULE FROM THE BRIEF
"If >= 2 solos improve, fit one joint on prior rows and score once."
3 solos improved, so exactly ONE joint is fitted and scored ONCE. No second
look, no retuning, no best-of selection.

JOINT FAMILY
sigma_g = sigma0 * exp(beta_S * |S|/10 + beta_T * T/44)

beta_S and beta_T are fitted jointly on STRICTLY PRIOR rows by grid search over
the same negative-only beta grid used for the solos. The mean is untouched:
mu = spread_line for every game, and the Gaussian is symmetric about mu, so
E[X] == mu to machine precision.

SCOPING DISCIPLINE
The joint is scored ONCE on the full frozen filter. There is no confirmation
block reported here, and no second evaluation on a subset that could be picked
after seeing the result. That is deliberate: the brief requires a single score.
"""
import json
import math
import os
import sys
import itertools

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gse_location_locked_harness as H  # noqa: E402

MIN_PRIOR = 25
SIGMA0 = 13.45
GATE = 7.099
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "pit_joint_result.json")


def main():
    rows, skipped = H.load_frozen()
    base = H.score_baseline(rows)
    assert base["n"] == 2462 and abs(base["crps"] - 7.154021) <= 5e-5, \
        "baseline not reproduced -- refusing to score"

    # beta grid, negative-only, identical to the solos
    grid = [-0.28 + i * (0.28 / 40.0) for i in range(41)]

    xS = [abs(r["spread_line"]) / 10.0 for r in rows]
    xT = [(r["total_line"] or 44.0) / 44.0 for r in rows]
    mus = [r["spread_line"] for r in rows]
    ys = [r["margin"] for r in rows]
    n = len(rows)

    # running sums of per-row CRPS at each (bS,bT) pair -- O(n * grid^2)
    pairs = [(bs, bt) for bs in grid for bt in grid]
    running = [0.0] * len(pairs)
    cnt = 0
    flagged = 0
    chosen = {}
    deltas = []

    for i in range(n):
        if cnt >= MIN_PRIOR:
            best, best_v = None, None
            for pi, (bs, bt) in enumerate(pairs):
                v = running[pi] / cnt
                if best_v is None or v < best_v:
                    best, best_v = (bs, bt), v
            bS, bT = best
        else:
            bS, bT = 0.0, 0.0
            flagged += 1
        chosen[(bS, bT)] = chosen.get((bS, bT), 0) + 1

        sd = SIGMA0 * math.exp(max(-0.45, min(0.45, bS * xS[i] + bT * xT[i])))
        sd = max(sd, 1e-6)
        c_with = H.crps_gaussian(mus[i], sd, ys[i])
        c_without = H.crps_gaussian(mus[i], SIGMA0, ys[i])
        deltas.append(c_with - c_without)

        # fold row i in AFTER scoring -- strictly prior
        for pi, (bs, bt) in enumerate(pairs):
            sd_j = SIGMA0 * math.exp(max(-0.45, min(0.45, bs * xS[i] + bt * xT[i])))
            if sd_j <= 0:
                sd_j = 1e-6
            running[pi] += H.crps_gaussian(mus[i], sd_j, ys[i])
        cnt += 1

    mean_delta = sum(deltas) / len(deltas)
    var = sum((d - mean_delta) ** 2 for d in deltas) / max(1, len(deltas) - 1)
    se = math.sqrt(var / len(deltas))

    print("=== JOINT FIT (scored ONCE, full frozen filter) ===")
    print("  family      : sigma_g = 13.45 * exp(beta_S*|S|/10 + beta_T*T/44)")
    print("  n           : %d" % len(deltas))
    print("  mean delta  : %+.6f" % mean_delta)
    print("  SE          : %.6f" % se)
    print("  t-stat      : %+.3f" % (mean_delta / se if se else float("nan")))
    print("  flagged b=0 : %d" % flagged)
    print("  grid points : %d" % len(pairs))
    print()
    print("  fitted (beta_S, beta_T) most used:")
    for k, v in sorted(chosen.items(), key=lambda kv: -kv[1])[:6]:
        print("     (%+.3f, %+.3f) : %d rows" % (k[0], k[1], v))
    print()
    print("  implied CRPS : %.6f" % (base["crps"] + mean_delta))
    print("  gate         : %.3f" % GATE)
    print("  gate cleared : %s" % ((base["crps"] + mean_delta) <= GATE))
    print("  decision     : %s"
          % ("REFUSED (DeltaCRPS >= 0)" if mean_delta >= 0
             else "improves but does NOT clear the gate"))

    json.dump({
        "family": "sigma_g = 13.45 * exp(beta_S*|S|/10 + beta_T*T/44)",
        "mu": "spread_line (unchanged; Gaussian symmetric about mu)",
        "baseline_crps": base["crps"],
        "n": len(deltas),
        "mean_delta": mean_delta,
        "se": se,
        "implied_crps": base["crps"] + mean_delta,
        "gate": GATE,
        "gate_cleared": bool((base["crps"] + mean_delta) <= GATE),
        "flagged_beta0": flagged,
        "grid_points": len(pairs),
        "chosen_top": [{"beta_S": k[0], "beta_T": k[1], "rows": v}
                       for k, v in sorted(chosen.items(), key=lambda kv: -kv[1])[:8]],
        "scoring_discipline": "scored ONCE on the full frozen filter; no confirmation block, no retuning",
        "pit": "expanding window, folded after scoring, min_prior=%d" % MIN_PRIOR,
        "emission": "0 picks / 0 parlays / 0 DFS",
    }, open(OUT, "w", encoding="utf-8"), indent=1)
    print()
    print("written", OUT)


if __name__ == "__main__":
    main()
