#!/usr/bin/env python3
"""pick6_hold.py — the payout-TABLE engines reverse-engineered from public structures.
DK Pick6 / PrizePicks / Underdog don't price entries — they set a PAYOUT TABLE.
The hold is structural: guaranteed regardless of per-leg pricing skill.
Derives: hold at p=0.5/leg, per-leg breakeven probability, correlation sensitivity.
Pure math + MC (Gaussian copula for leg correlation)."""
import math
import random

def binom_pmf(k, n, p): return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

# ---- public payout tables (standard structures) ----
POWER = {2: 3.0, 3: 5.0, 4: 10.0, 5: 20.0, 6: 38.0}          # all-must-hit
FLEX = {  # {n: {k_hits: multiplier}}
    3: {3: 2.25, 2: 1.25},
    4: {4: 5.0, 3: 2.0},
    5: {5: 10.0, 4: 2.0, 3: 1.4},
    6: {6: 25.0, 5: 3.0, 4: 1.5},
}

def power_ev(n, p=0.5):
    return POWER[n] * p ** n

def flex_ev(n, p=0.5):
    return sum(m * binom_pmf(k, n, p) for k, m in FLEX[n].items())

def breakeven_per_leg_power(n, lo=0.30, hi=0.90):
    """per-leg p where EV = 1 (EV increasing in p)"""
    for _ in range(60):
        mid = (lo + hi) / 2
        if power_ev(n, mid) > 1.0: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def breakeven_per_leg_flex(n, lo=0.30, hi=0.90):
    for _ in range(60):
        mid = (lo + hi) / 2
        if flex_ev(n, mid) > 1.0: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def p_all_hit_copula(n, rho, p=0.5, n_sims=30000, seed=5):
    """P(all n legs hit) with equicorrelated legs via Gaussian copula.
    Shows what correlation does to the operator's structural hold."""
    rnd = random.Random(seed)
    hits = 0
    sr = math.sqrt(rho); s1 = math.sqrt(1 - rho)
    from math import erf, sqrt
    def ncdf(x): return 0.5 * (1 + erf(x / sqrt(2)))
    thresh = ncdf(0.5) if False else None  # quantile of p
    # threshold z* with Φ(z*) = p
    lo, hi = -6.0, 6.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if ncdf(mid) < p: lo = mid
        else: hi = mid
    zstar = (lo + hi) / 2
    for _ in range(n_sims):
        f = rnd.gauss(0, 1)
        if all(ncdf(sr * f + s1 * rnd.gauss(0, 1)) < p for _ in range(n)):
            hits += 1
    return hits / n_sims

if __name__ == "__main__":
    print("== PAYOUT-TABLE ENGINES: structural hold (per-leg p=0.5) ==")
    print(f"{'entry':22s} {'EV per unit':>11s} {'hold':>8s} {'breakeven p/leg':>16s}")
    for n in sorted(POWER):
        ev = power_ev(n); be = breakeven_per_leg_power(n)
        print(f"{'Power '+str(n)+'-leg ('+str(POWER[n])+'x)':22s} {ev:11.4f} {1-ev:+8.1%} {be:16.3f}")
    for n in sorted(FLEX):
        ev = flex_ev(n); be = breakeven_per_leg_flex(n)
        print(f"{'Flex '+str(n)+'-leg':22s} {ev:11.4f} {1-ev:+8.1%} {be:16.3f}")

    print("\n== CORRELATION SENSITIVITY (P(all hit), copula) — 3-leg power 5x ==")
    for rho in (0.0, 0.15, 0.3, 0.5):
        pa = p_all_hit_copula(3, rho)
        ev = 5.0 * pa
        print(f"  rho={rho:.2f}: P(all 3)={pa:.4f}  EV={ev:.4f}  hold {1-ev:+.1%}")
    print("  -> same-game correlation TRANSFERS hold to the player; tables price legs")
    print("     independently AND the payout assumes independence twice over.")

    print("\n== THE PER-LEG SHADING SWEEP (hold at p = 0.50 / 0.52 / 0.54 per leg) ==")
    for n in sorted(POWER):
        row = [f"Power{n}({POWER[n]}x)".ljust(14)]
        for p in (0.50, 0.52, 0.54):
            row.append(f"p={p}: {1-power_ev(n,p):+7.1%}")
        print("  " + "  ".join(row))
    for n in sorted(FLEX):
        row = [f"Flex{n}".ljust(14)]
        for p in (0.50, 0.52, 0.54):
            row.append(f"p={p}: {1-flex_ev(n,p):+7.1%}")
        print("  " + "  ".join(row))

    print("\n== THE ENGINE MECHANIC ==")
    print("  1. per-leg lines engineered toward p≈0.5 (with a per-market skim)")
    print("  2. payout table sets the hold structurally — no per-entry pricing needed")
    print("  3. breakeven p/leg 0.541-0.577 vs their ~50% engineered lines = the skim")
    print("  4. edges exist ONLY where the player's per-leg p beats breakeven AND")
    print("     correlation is on the player's side (which the flex tables dampen)")
