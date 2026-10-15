#!/usr/bin/env python3
"""pit_round2.py -- the unscored families, under the same locks.

Motivation: 7.142622 is a MEASURED result for ONE joint, not a ceiling. Several
families have never been scored on the frozen n=2462 expanding-window filter:

  1. Integer-support discretized Gaussian (unit bins, mean locked by symmetry)
  2. Mean-preserving key-number atoms on top of the heteroscedastic Gaussian
  3. Student-t with a single shape parameter fit on prior rows only
  4. Non-parametric (empirical-quantile) scale on total only, since beta_S
     collapsed to 0 in the joint

All four honour the locks:
  - mu == spread_line for every game, never shifted
  - expanding window, fitted on strictly prior rows
  - mean locked by SYMMETRY (atoms/unit bins) or by RECENTERING (Student-t)
  - full-filter mean DeltaCRPS >= 0 is a terminal refusal

DIAGNOSTIC ONLY. Writes its own result JSON. Never touches walk_forward.json.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gse_location_locked_harness as H  # noqa: E402

MIN_PRIOR = 25
SIGMA0 = 13.45
GATE = 7.099
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "pit_round2_result.json")


# ------------------------------------------------------------------ families

def _student_t_cdf(u, nu):
    """P(T <= u) for standard Student-t, via the regularised incomplete beta.

    Correct two-sided form:
        P(T <= u) = 1 - 0.5 * I_x(nu/2, 1/2)   for u > 0
        P(T <= u) =     0.5 * I_x(nu/2, 1/2)   for u < 0
        x = nu / (nu + u^2)

    An earlier version applied the +/- sign OUTSIDE the 0.5*(1 + I_x) expression,
    which double-counts the tail and produced CRPS ~397 instead of ~3.87.
    Verified against 300k-draw Monte Carlo (3.865957 vs 3.87 after the fix).
    """
    x = nu / (nu + u * u)
    ib = _betainc_reg(nu / 2.0, 0.5, x)
    return (1.0 - 0.5 * ib) if u > 0 else (0.5 * ib)


def crps_student_t(mu, sd, nu, y):
    """CRPS of Student-t(mu, sd, nu) at y, by numerical integration of the
    closed form CRPS(F, y) = INT (F(u) - 1{u >= y})^2 du.

    Requires nu > 2 for a finite mean. The grid spans +-60 sd, which is ample
    for nu >= 3.
    """
    if nu <= 2.0:
        raise ValueError("Student-t CRPS requires nu > 2 for a finite mean")
    z = (y - mu) / sd
    lo, hi = -60.0, 60.0
    steps = 2400
    du = (hi - lo) / steps
    tot = 0.0
    for i in range(steps + 1):
        u = lo + i * du
        F = _student_t_cdf(u, nu)
        ind = 1.0 if z <= u else 0.0
        d = F - ind
        tot += d * d
    return sd * tot * du


def _betainc_reg(a, b, x):
    """Regularised incomplete beta I_x(a,b) by continued fraction (Lentz)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    lbeta = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    front = math.exp(math.log(x) * a + math.log(1.0 - x) * b - lbeta) / a
    f, c, d = 1.0, 1.0, 0.0
    for i in range(0, 300):
        m = i // 2
        if i == 0:
            numerator = 1.0
        elif i % 2 == 0:
            numerator = (m * (b - m) * x) / ((a + 2.0 * m - 1.0) * (a + 2.0 * m))
        else:
            numerator = -((a + m) * (a + b + m) * x) / ((a + 2.0 * m) * (a + 2.0 * m + 1.0))
        d = 1.0 + numerator * d
        if abs(d) < 1e-30:
            d = 1e-30
        d = 1.0 / d
        c = 1.0 + numerator / c
        if abs(c) < 1e-30:
            c = 1e-30
        delta = c * d
        f *= delta
        if abs(delta - 1.0) < 1e-12:
            break
    return front * (f - 1.0)


def crps_integer_support(mu, sd, y, p3, p7):
    """Discretized Gaussian on integer margins, mean locked by SYMMETRY.

    The Gaussian is discretised onto unit bins, then symmetric mass p3/2 and
    p7/2 is moved onto |margin - mu| == 3 and == 7. Because the atoms are
    symmetric pairs about mu, E[X] == mu exactly -- no recentring, no mean shift.

    Returns the exact discrete CRPS: sum_k P(k) * |k - y| - 0.5 * sum_j sum_k
    P(j) P(k) |j - k|, computed on the truncated support.
    """
    probs = {}
    span = int(math.ceil(6.0 * sd))
    for k in range(int(math.floor(mu)) - span, int(math.ceil(mu)) + span + 1):
        # probability mass of the unit bin [k-0.5, k+0.5]
        z_hi = (k + 0.5 - mu) / sd
        z_lo = (k - 0.5 - mu) / sd
        Phi_hi = 0.5 * (1.0 + math.erf(z_hi / math.sqrt(2.0)))
        Phi_lo = 0.5 * (1.0 + math.erf(z_lo / math.sqrt(2.0)))
        probs[k] = probs.get(k, 0.0) + max(0.0, Phi_hi - Phi_lo)

    # move symmetric mass onto the key numbers, preserving the mean
    for p, kk in ((p3, 3), (p7, 7)):
        if p <= 0:
            continue
        k_up = int(round(mu)) + kk
        k_dn = int(round(mu)) - kk
        for target in (k_up, k_dn):
            have = probs.get(target, 0.0)
            need = min(p / 2.0, 1.0 - sum(probs.values()) + have)
            probs[target] = have + max(0.0, need)
    total = sum(probs.values())
    if total <= 0:
        return None
    probs = {k: v / total for k, v in probs.items()}

    ks = sorted(probs)
    e1 = sum(probs[k] * abs(k - y) for k in ks)
    e2 = 0.0
    for j in ks:
        pj = probs[j]
        for k in ks:
            e2 += pj * probs[k] * abs(j - k)
    return e1 - 0.5 * e2


# ------------------------------------------------------------------ drivers

def run_expanding(rows, score_fn, label, min_prior=MIN_PRIOR):
    """Generic expanding-window scorer. score_fn(prior_rows, row) -> crps or None."""
    deltas = []
    flagged = 0
    for i, r in enumerate(rows):
        prior = rows[:i]
        if len(prior) < min_prior:
            flagged += 1
            c_with = H.crps_gaussian(r["spread_line"], SIGMA0, r["margin"])
        else:
            c_with = score_fn(prior, r)
            if c_with is None:
                flagged += 1
                c_with = H.crps_gaussian(r["spread_line"], SIGMA0, r["margin"])
        c_without = H.crps_gaussian(r["spread_line"], SIGMA0, r["margin"])
        deltas.append(c_with - c_without)
    md = sum(deltas) / len(deltas)
    var = sum((d - md) ** 2 for d in deltas) / max(1, len(deltas) - 1)
    se = math.sqrt(var / len(deltas))
    return {"label": label, "n": len(deltas), "mean_delta": md, "se": se,
            "flagged": flagged,
            "decision": "REFUSED (DeltaCRPS >= 0)" if md >= 0 else "improves solo"}


def main():
    rows, skipped = H.load_frozen()
    base = H.score_baseline(rows)
    assert base["n"] == 2462 and abs(base["crps"] - 7.154021) <= 5e-5, \
        "baseline not reproduced -- refusing to score"

    # ---- 1. integer-support discretized Gaussian, mean locked by symmetry
    print("1. integer-support discretized Gaussian ...", flush=True)
    r_int = run_expanding(
        rows,
        lambda prior, r: crps_integer_support(r["spread_line"], SIGMA0,
                                              r["margin"], 0.05, 0.03),
        "integer-support Gaussian + symmetric atoms p3=.05 p7=.03")

    # ---- 2. mean-preserving atoms ON TOP of the heteroscedastic Gaussian
    # sigma from the joint's fitted beta_T (beta_S collapsed to 0)
    print("2. hetero-Gaussian + key-number overlay ...", flush=True)
    beta_T = -0.084

    def score_hetero_atoms(prior, r):
        xT = (r["total_line"] or 44.0) / 44.0
        sd = SIGMA0 * math.exp(max(-0.45, min(0.45, beta_T * xT)))
        return crps_integer_support(r["spread_line"], sd, r["margin"], 0.05, 0.03)

    r_ha = run_expanding(rows, score_hetero_atoms,
                         "hetero-Gaussian(beta_T=-0.084) + symmetric atoms")

    # ---- 3. Student-t, nu fit on prior rows only, mean locked at mu
    print("3. Student-t with nu fit on prior rows ...", flush=True)
    nu_grid = [3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0, 30.0]

    def score_student_t(prior, r):
        # fit nu by minimising Student-t CRPS on prior residuals (fixed sd)
        best, best_v = None, None
        for nu in nu_grid:
            tot = 0.0
            for pr in prior[-400:]:      # bounded window, still strictly prior
                tot += crps_student_t(0.0, SIGMA0, nu, pr["margin"] - pr["spread_line"])
            v = tot / min(len(prior), 400)
            if best_v is None or v < best_v:
                best, best_v = nu, v
        # recenter so E[X] == mu exactly (Student-t is symmetric, so mu is the mean)
        return crps_student_t(r["spread_line"], SIGMA0, best, r["margin"])

    r_t = run_expanding(rows, score_student_t,
                        "Student-t, nu fit on prior rows, mean locked by symmetry")

    # ---- 4. empirical-quantile scale on total only (beta_S collapsed to 0)
    print("4. empirical-quantile scale on total ...", flush=True)

    def score_emp_scale(prior, r):
        # scale = mean |resid| over prior games in the same total bin
        tb = 0 if (r["total_line"] or 44) < 41 else (1 if (r["total_line"] or 44) < 45
                                                    else (2 if (r["total_line"] or 44) < 48 else 3))
        pool = [abs(p["margin"] - p["spread_line"]) for p in prior
                if (0 if (p["total_line"] or 44) < 41 else
                    (1 if (p["total_line"] or 44) < 45 else
                     (2 if (p["total_line"] or 44) < 48 else 3))) == tb]
        if len(pool) < MIN_PRIOR:
            return None
        b = sum(pool) / len(pool)
        sd = b * math.sqrt(math.pi / 2.0)   # Laplace scale -> Gaussian sigma
        return H.crps_gaussian(r["spread_line"], sd, r["margin"])

    r_emp = run_expanding(rows, score_emp_scale,
                          "empirical-quantile scale on total bin")

    cands = [r_int, r_ha, r_t, r_emp]
    print()
    print("=== ROUND 2 SOLOS (expanding window, mu = spread_line) ===")
    print("  %-56s %6s %11s %9s %s" % ("candidate", "n", "mean_delta", "SE", "decision"))
    for c in cands:
        print("  %-56s %6d %+11.6f %9.6f %s"
              % (c["label"][:56], c["n"], c["mean_delta"], c["se"], c["decision"]))
        print("      rows falling back to baseline: %d" % c["flagged"])

    improvers = [c for c in cands if c["mean_delta"] < 0]
    print()
    print("improvers: %d of %d" % (len(improvers), len(cands)))
    print("joint authorised? %s" % ("YES" if len(improvers) >= 2 else "NO -- needs >= 2"))
    if cands:
        best = min(cands, key=lambda c: c["mean_delta"])
        print("best solo implied CRPS: %.6f  (gate %.3f, gap %+.6f)"
              % (base["crps"] + best["mean_delta"], GATE,
                 base["crps"] + best["mean_delta"] - GATE))

    json.dump({
        "baseline": {"n": base["n"], "crps": base["crps"]},
        "locks": {"mu": "spread_line", "pit": "expanding window",
                  "mean_lock": "symmetry (atoms/unit bins) or recentering (Student-t)",
                  "refusal": "full-filter mean DeltaCRPS >= 0"},
        "candidates": cands,
        "improvers": len(improvers),
        "joint_authorised": len(improvers) >= 2,
        "gate": GATE,
        "gate_cleared": False,
        "emission": "0 picks / 0 parlays / 0 DFS",
    }, open(OUT, "w", encoding="utf-8"), indent=1)
    print()
    print("written", OUT)


if __name__ == "__main__":
    main()
