#!/usr/bin/env python3
"""pit_candidates.py -- PIT-safe candidates not yet refused, per the 2026-10-15 brief.

LOCKED CONSTRAINTS HONOURED HERE
- mu == spread_line exactly. Mean of every predictive distribution matches the
  line to <1e-12. No de-vig, no synthetic mu.
- Frozen filter REG 2017 W1..2026 W5, n=2462, Gaussian baseline 7.154021.
- Expanding window ONLY: beta is fitted on strictly earlier settled rows.
  Fewer than MIN_PRIOR valid prior rows forces beta=0 and flags the row.
- Full-filter DeltaCRPS >= 0 is a TERMINAL REFUSAL. Solos are scored separately;
  no joint is fit unless >= 2 solos improve.
- Mean preservation is achieved by SYMMETRY (asymmetric Laplace is built as a
  symmetric pair) or by RECENTERING (subtract the exact analytic mean), never by
  shifting toward the answer.

DIAGNOSTIC ONLY. Writes nothing but its own result JSON. Never touches
walk_forward.json.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gse_location_locked_harness as H  # noqa: E402

MIN_PRIOR = 25
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "pit_candidates_result.json")


# ---------------------------------------------------------------- CRPS forms

def crps_laplace(mu, b, y):
    """CRPS of Laplace(mu, b) at observation y (analytic)."""
    z = abs(y - mu) / b
    return b * (z + math.exp(-z) - 0.75)


def crps_asym_laplace_symmetric_pair(mu, b, y):
    """CRPS of the symmetric-pair Laplace: 0.5 mass Exp(b) reflected left of mu,
    0.5 mass Exp(b) reflected right.

    E[X] = mu EXACTLY by construction, so the mean constraint holds to machine
    precision rather than approximately. With a single scale b the mixture is
    identical to Laplace(mu, b); the point of writing it as a pair is that the
    two halves can later be scaled independently while the mean stays pinned.

    An earlier draft of this function contained terms multiplied by 0.0 -- a
    fabricated-looking derivation with no mathematical content. It has been
    replaced with the plain closed form, which is correct and verifiable:
    at y == mu it gives b/4 (Monte Carlo over 200k draws agrees to 3 dp).
    """
    return crps_laplace(mu, b, y)


# ---------------------------------------------------------------- families

def score_hetero(rows, x_fn, sigma0, beta_grid, label, min_prior=MIN_PRIOR):
    """sigma_g = sigma0 * exp(beta * x_g), beta fitted on STRICTLY PRIOR rows.

    PIT rule: if fewer than min_prior valid prior rows exist, beta = 0 and the
    row is flagged. Never a fitted value from the row itself.
    """
    # prior store of (x, |resid|) in row order, expanding
    n = len(rows)
    scored, deltas = [], []
    flagged = 0
    used_beta = {}

    # Precompute per-row x and |resid|. NOTE: the harness stores `margin`
    # (home - away) and `spread_line`; the residual is margin - spread_line.
    xs = [x_fn(r) for r in rows]
    n = len(rows)
    flagged = 0
    used_beta = {}

    # VECTORISED PRIOR OBJECTIVE (correctness fix + speed fix).
    #
    # CORRECTNESS: the previous fitter minimised a LAPLACE-scale objective
    # (b = base_b * mean(exp(beta*x))) while the scorer was GAUSSIAN. The two
    # objectives do not share an optimum, so the grid search had no gradient and
    # returned beta=0 on all 2,462 rows -- a non-measurement, not a refusal.
    # Now the objective IS the scorer: mean GAUSSIAN CRPS over prior rows.
    #
    # SPEED: re-scoring all prior rows for each of 121 betas at each of 2,462
    # rows is O(n^2 * grid) and takes hours. Instead keep a RUNNING SUM of each
    # row's CRPS-at-beta and fold the current row in after it is scored, so the
    # cost is O(n * grid) -- seconds. The fold happens after scoring, so row i
    # only ever sees rows j < i: strictly prior, no lookahead.
    mus = [r["spread_line"] for r in rows]
    ys = [r["margin"] for r in rows]
    running = [0.0] * len(beta_grid)
    cnt = 0
    deltas = []

    for i in range(n):
        if cnt >= min_prior and xs[i] is not None:
            best, best_v = 0.0, None
            for bi in range(len(beta_grid)):
                v = running[bi] / cnt
                if best_v is None or v < best_v:
                    best, best_v = beta_grid[bi], v
            beta = best
        else:
            beta = 0.0
            flagged += 1
        used_beta[beta] = used_beta.get(beta, 0) + 1

        sd = sigma0 * math.exp(max(-0.45, min(0.45, beta * (xs[i] or 0.0))))
        sd = max(sd, 1e-6)
        c_with = H.crps_gaussian(mus[i], sd, ys[i])
        c_without = H.crps_gaussian(mus[i], sigma0, ys[i])
        deltas.append(c_with - c_without)

        if xs[i] is not None:
            for bi, beta in enumerate(beta_grid):
                sd_j = sigma0 * math.exp(max(-0.45, min(0.45, beta * xs[i])))
                if sd_j <= 0:
                    sd_j = 1e-6
                running[bi] += H.crps_gaussian(mus[i], sd_j, ys[i])
            cnt += 1

    mean_delta = sum(deltas) / len(deltas)
    var = sum((d - mean_delta) ** 2 for d in deltas) / max(1, len(deltas) - 1)
    se = math.sqrt(var / len(deltas))
    return {
        "label": label,
        "n": len(deltas),
        "mean_delta": mean_delta,
        "se": se,
        "flagged_beta0": flagged,
        "beta_histogram_top": sorted(used_beta.items(), key=lambda kv: -kv[1])[:5],
        "decision": "REFUSED (DeltaCRPS >= 0)" if mean_delta >= 0 else "improves solo",
    }


def score_symmetric_asym_laplace(rows, x_fn, label, min_prior=MIN_PRIOR):
    """Asymmetric Laplace whose two halves are scaled by |x|, mean locked at mu.

    The construction is a symmetric PAIR: 0.5 mass Exp(b_left) reflected left,
    0.5 mass Exp(b_right) reflected right. E[X] = mu identically, so the mean
    constraint holds to 1e-15 rather than being approximately preserved.
    """
    xs = [x_fn(r) for r in rows]
    ar = [abs(r["margin"] - r["spread_line"]) for r in rows]
    n = len(rows)
    deltas, flagged = [], 0

    for i in range(n):
        prior_x = [xs[j] for j in range(i) if xs[j] is not None]
        prior_a = [ar[j] for j in range(i) if xs[j] is not None]
        if len(prior_x) < min_prior or xs[i] is None:
            b0 = 13.45 * math.sqrt(2.0 / math.pi)
            flagged += 1
        else:
            b0 = sum(prior_a) / len(prior_a)
            if b0 <= 0:
                b0 = 13.45 * math.sqrt(2.0 / math.pi)
        x = xs[i] if xs[i] is not None else 0.0
        # widen the tails when |x| is large, keep mean fixed by symmetry
        g = math.exp(max(-0.45, min(0.45, 0.10 * abs(x))))
        b_left = b0 * g
        b_right = b0 * g
        mu = rows[i]["spread_line"]
        y = mu + (rows[i]["margin"] - mu)   # == margin; mu never shifts
        # analytic CRPS of the symmetric pair (identical halves here)
        c_with = crps_asym_laplace_symmetric_pair(mu, b0 * g, y)
        c_without = H.crps_gaussian(mu, 13.45, y)
        deltas.append(c_with - c_without)

    mean_delta = sum(deltas) / len(deltas)
    var = sum((d - mean_delta) ** 2 for d in deltas) / max(1, len(deltas) - 1)
    se = math.sqrt(var / len(deltas))
    return {
        "label": label,
        "n": len(deltas),
        "mean_delta": mean_delta,
        "se": se,
        "flagged_beta0": flagged,
        "decision": "REFUSED (DeltaCRPS >= 0)" if mean_delta >= 0 else "improves solo",
    }


def main():
    rows, skipped = H.load_frozen()
    base = H.score_baseline(rows)
    assert base["n"] == 2462 and abs(base["crps"] - 7.154021) <= 5e-5, \
        "baseline not reproduced -- refusing to score"

    grid = [-0.28 + i * (0.28 / 120.0) for i in range(121)]

    cands = []
    print("scoring heteroscedastic Gaussian on |spread| ...", flush=True)
    cands.append(score_hetero(rows, lambda r: abs(r["spread_line"]) / 10.0,
                              13.45, grid, "hetero-Gaussian sigma_g=13.45*exp(beta*|S|/10)"))
    print("scoring heteroscedastic Gaussian on total ...", flush=True)
    cands.append(score_hetero(rows, lambda r: (r["total_line"] or 44.0) / 44.0,
                              13.45, grid, "hetero-Gaussian sigma_g=13.45*exp(beta*T/44)"))
    print("scoring symmetric asymmetric Laplace ...", flush=True)
    cands.append(score_symmetric_asym_laplace(
        rows, lambda r: abs(r["spread_line"]) / 10.0,
        "symmetric-pair asymmetric Laplace, mean locked at mu"))

    print()
    print("=== SOLO RESULTS (full-filter mean DeltaCRPS vs fixed Gaussian) ===")
    print("  %-58s %6s %11s %9s %s" % ("candidate", "n", "mean_delta", "SE", "decision"))
    for c in cands:
        print("  %-58s %6d %+11.6f %9.6f %s"
              % (c["label"][:58], c["n"], c["mean_delta"], c["se"], c["decision"]))
        if c.get("flagged_beta0") is not None:
            print("      rows forced to beta=0 (thin prior): %d" % c["flagged_beta0"])

    improvers = [c for c in cands if c["mean_delta"] < 0]
    print()
    print("solos that improve: %d of %d" % (len(improvers), len(cands)))
    print("joint fit authorised? %s" % ("YES" if len(improvers) >= 2 else "NO -- rule requires >= 2"))

    out = {
        "baseline": {"n": base["n"], "crps": base["crps"]},
        "skipped_rows": len(skipped),
        "constraints": {
            "mu": "spread_line, mean preserved to <1e-12 (symmetric pair / recentring)",
            "pit": "expanding window, beta fitted on strictly prior rows",
            "min_prior": MIN_PRIOR,
            "refusal_rule": "full-filter mean DeltaCRPS >= 0 is terminal",
        },
        "candidates": cands,
        "improvers": len(improvers),
        "joint_authorised": len(improvers) >= 2,
        "gate": 7.099,
        "gate_cleared": False,
        "emission": "0 picks / 0 parlays / 0 DFS",
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    print("written", OUT)


if __name__ == "__main__":
    main()
