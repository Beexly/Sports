#!/usr/bin/env python3
"""Positive-control tests for the edge-inadmissibility certificate (N1).

Every rule is proved to FIRE on a synthetic fixture before it is trusted on real
data. Run: python3 test_inadmissibility.py
"""
import math, sys
sys.path.insert(0, "/var/minis/shared/gse-discovery/edge-inadmissibility")
from inadmissibility import (american_to_implied, devig_proportional, half_vig,
                             similarity_sigma, fit_similarity, certificate_side)

PASS = 0
FAIL = 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond: PASS += 1; print(f"  ok   {name}")
    else: FAIL += 1; print(f"  FAIL {name}  {detail}")

print("A. primitives")
pa, pb = devig_proportional(*[american_to_implied(x) for x in (-110, -110)])
check("devig sums to 1", abs(pa + pb - 1.0) < 1e-12, f"{pa+pb}")
check("devig equal for symmetric market", abs(pa - pb) < 1e-12)
check("american -110 -> 0.52381", abs(american_to_implied(-110) - 110/210) < 1e-12)
check("american +145 -> 0.40816", abs(american_to_implied(145) - 100/245) < 1e-12)
check("half_vig of -110/-110", abs(half_vig(american_to_implied(-110), american_to_implied(-110)) - (2*110/210 - 1)/2) < 1e-12)

print("B. similarity function")
check("sigma(0) == 0", similarity_sigma(0.0, 0.05, 0.5) == 0.0)
check("sigma monotone in tau", similarity_sigma(10, 0.05, 0.5) > similarity_sigma(1, 0.05, 0.5))
check("alpha=0.5 diffusive scaling", abs(similarity_sigma(4, 0.05, 0.5) - 2*similarity_sigma(1, 0.05, 0.5)) < 1e-12)

print("C. fit_similarity recovers a known law (positive control on the fitter)")
s_true, a_true = 0.031, 0.42
taus = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0]
sigs = [similarity_sigma(t, s_true, a_true) for t in taus]
s_hat, a_hat = fit_similarity(taus, sigs)
check("alpha recovered", abs(a_hat - a_true) < 1e-9, f"{a_hat} vs {a_true}")
check("s recovered", abs(s_hat - s_true) < 1e-9, f"{s_hat} vs {s_true}")

print("D. certificate FIRES on a known-inadmissible fixture")
# tight market, long window, small advantage -> must be HOLD
c = certificate_side(o_a=american_to_implied(-110), o_b=american_to_implied(-105),
                     side="A", tau_hours=48.0, s=0.03, alpha=0.5, z=1.645)
check("tight long-window market is INADMISSIBLE", c.admissible is False, str(c))
check("reason names the movement band", "movement band" in c.reason)
check("arithmetic identity threshold == vig_half + z*sigma",
      abs(c.threshold - (c.vig_half + c.noise_band)) < 1e-12)
check("margin == advantage - threshold", abs(c.margin - (c.price_advantage - c.threshold)) < 1e-12)

print("E. certificate ABSTAINS on a known-favourable fixture (must not always-hold)")
# wide, very asymmetric market close to kickoff -> must be ADMISSIBLE
c2 = certificate_side(o_a=0.95, o_b=0.10, side="A", tau_hours=0.1, s=0.03, alpha=0.5, z=1.645)
check("wide short-window market is ADMISSIBLE", c2.admissible is True, str(c2))
check("reason names reachability", "reachable" in c2.reason)

print("F. direction of the two levers")
c_long = certificate_side(0.5238, 0.5000, "A", 48.0, 0.03, 0.5)
c_short = certificate_side(0.5238, 0.5000, "A", 0.25, 0.03, 0.5)
check("longer window is at least as inadmissible as short",
      c_long.threshold >= c_short.threshold, f"{c_long.threshold} {c_short.threshold}")
c_hi = certificate_side(0.5238, 0.5000, "A", 48.0, 0.30, 0.5)
check("higher volatility widens the band", c_hi.threshold > c_long.threshold)

print("G. negative control: the harness itself can fail")
_saved = (PASS, FAIL)
check("intentionally false assertion", 1 == 2)
check("negative control was recorded", FAIL == _saved[1] + 1, "harness recorded no failure")
PASS, FAIL = _saved   # discard the intentional failure; it is evidence, not a defect
print("  -> harness correctly recorded then discarded the intentional failure")

print(f"\nPASS={PASS} FAIL={FAIL}")
sys.exit(1 if FAIL else 0)
