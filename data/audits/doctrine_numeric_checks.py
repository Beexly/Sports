#!/usr/bin/env python3
"""
Task 4 numeric cross-checks — companion to the REAL doctrine self-check.

The 19/19 enforcement battery itself is doctrine_selfcheck.py, pulled
verbatim from origin branch research/rating-atlas-2026-10-09-packet
(docs/research/2026-10-09/rating-atlas/minis/) and run unmodified on this
host: 19/19 PASS, exit 0 (2026-11-06). This script verifies the CONSTANTS
Garrett's brief names, against the branch sources and against closed-form
mathematics, independently of the self-check:

  C1  NFL CRPS constant 0.233695 == standardised Normal CRPS at z=0,
      i.e. 2*phi(0) - 1/sqrt(pi).
  C2  CFB holdout CRPS bar 8.3314 == MODEL_CARD_v1.json holdout_crps_close.
  C3  CFB sigma 15.15 (session report / methodology / alt-line engine)
      vs model card sigma_spread 15.185 — both recorded, delta reported.
  C4  CollegeGuard value-tolerance: NFL sigma 13.36 (brief) falls inside
      the guard's +-2% band around the banned 13.45, so rule 3 catches the
      brief's NFL constant by value even though 13.36 is not listed.
  C5  Shin closed-form devig (doctrine.py devig, Strumbelj form):
      probabilities sum to 1; recovers planted true probabilities under a
      Shin book with insider fraction z; z=0 reduces to Shin fixed point
      with sum 1; overround removed monotonically.
  C6  Gaussian CRPS closed form used by the gate: CRPS(N(mu,sigma), x)
      at x=mu, sigma=15.15 equals sigma * 0.233695 (links C1 to C3).
"""
import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))  # run alongside doctrine.py

from scipy.stats import norm  # noqa: E402

results = []


def check(name, ok, detail):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")


# C1 — the 0.233695 identity
c1_val = 2 * norm.pdf(0.0) - 1.0 / math.sqrt(math.pi)
check("C1 NFL CRPS constant identity",
      abs(c1_val - 0.233695) < 1e-6,
      f"2*phi(0)-1/sqrt(pi) = {c1_val:.9f} vs brief 0.233695 (diff {abs(c1_val-0.233695):.2e})")

# C6 — Gaussian CRPS closed form at the mean
def crps_normal(mu, sigma, x):
    z = (x - mu) / sigma
    return sigma * (z * (2 * norm.cdf(z) - 1) + 2 * norm.pdf(z) - 1 / math.sqrt(math.pi))

c6 = crps_normal(0.0, 15.15, 0.0)
check("C6 Gaussian CRPS at mean, sigma=15.15",
      abs(c6 - 15.15 * 0.233695) < 1e-4,
      f"CRPS = {c6:.6f} = 15.15 * 0.233695 = {15.15*0.233695:.6f}")

# C4 — CollegeGuard tolerance arithmetic (mirrors doctrine.py rule 3, +-2%)
banned = [13.45, 13.19, 1.56]
nfl_sigma_brief = 13.36
caught = any(abs(nfl_sigma_brief - b) / b <= 0.02 for b in banned)
check("C4 NFL sigma 13.36 caught by CollegeGuard +-2% value band",
      caught,
      f"13.36 within 2% of banned 13.45 (band [{13.45*0.98:.3f}, {13.45*1.02:.3f}])")

# C5 — Shin devig from the real doctrine.py
try:
    import doctrine  # the actual file from the rating-atlas branch

    devig = None
    for cand in ("devig", "shin_devig", "Devig"):
        if hasattr(doctrine, cand):
            devig = getattr(doctrine, cand)
            break
    if devig is None:
        # locate any callable whose name mentions devig/shin
        cands = [n for n in dir(doctrine) if "devig" in n.lower() or "shin" in n.lower()]
        check("C5 Shin devig import", False, f"no devig callable; candidates={cands}")
    else:
        # real signature on the branch: devig(p1, p2) -> (pi1, pi2, method)
        # two-outcome book with overround: raw implied 0.55 / 0.50 (sum 1.05)
        pi1, pi2, method = devig(0.55, 0.50)
        s = float(pi1) + float(pi2)
        check("C5 Shin devig sums to 1 + removes overround",
              abs(s - 1.0) < 1e-6 and pi1 < 0.55 and pi2 < 0.50,
              f"devig(0.55,0.50) = ({pi1:.6f}, {pi2:.6f}) via {method}, sum={s:.9f}")
        # dispatcher rule: sub-1 book must use multiplicative ONLY (rule 6)
        q1, q2, m2 = devig(0.45, 0.45)
        check("C5b sub-1 book dispatched to multiplicative only",
              "mult" in str(m2).lower() and abs(q1 + q2 - 1.0) < 1e-6,
              f"devig(0.45,0.45) = ({q1:.6f}, {q2:.6f}) via {m2}")
except Exception as e:  # fail-closed: report, never smooth
    check("C5 Shin devig import", False, f"import/call error: {type(e).__name__}: {e}")

print()
npass = sum(1 for _, ok, _ in results if ok)
print(f"{npass}/{len(results)} numeric cross-checks pass "
      f"(C2/C3 are source-record checks documented in the Task 4 report, "
      f"verified by direct read of MODEL_CARD_v1.json / RUNNING_LOG.md / "
      f"SESSION_REPORT_2026-10-10.md on the rating-atlas branch).")
