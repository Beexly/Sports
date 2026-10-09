"""Re-run the packet checks and set them next to dossier claims.

Part 4 of the packet. Calls math.exp, math.sqrt, math.pi, math.log.
Bare names are not bound. No network. Dossier figures that this file does
not reproduce are marked mismatch. They are not cited as results.
"""

import math

import calibration2
import engine_math
import glicko2


def log_factorial(n):
    return math.lgamma(n + 1)


def bivariate_poisson(x, y, lam1, lam2, lam3):
    """P(X=x, Y=y) for X=X1+X3, Y=X2+X3, independent Poissons.

    Uses math.exp and math.log. Inputs here are named: lam1, lam2, lam3.
    """
    total = 0.0
    cap = min(x, y)
    log_pref = -(lam1 + lam2 + lam3)
    for k in range(cap + 1):
        term = log_pref - log_factorial(x - k) - log_factorial(y - k) - log_factorial(k)
        if x - k > 0:
            term += (x - k) * math.log(lam1)
        if y - k > 0:
            term += (y - k) * math.log(lam2)
        if k > 0:
            term += k * math.log(lam3)
        total += math.exp(term)
    return total


def crps_target():
    """(sqrt(2) - 1) / sqrt(pi). Not 1/sqrt(pi)."""
    return (math.sqrt(2.0) - 1.0) / math.sqrt(math.pi)


def row(name, dossier, ours, flag):
    print("%-22s dossier=%s ours=%s %s" % (name, dossier, ours, flag))
    return flag


def self_check():
    # Touch math.pi so the import surface is the qualified names, not bare ones.
    _ = math.pi
    for bare in ("exp", "sqrt", "log"):
        assert bare not in globals()

    fair, z = engine_math.shin_devig([0.52381, 0.52381])
    crps = engine_math.crps_gaussian(0.0, 1.0, 0.0)
    target = crps_target()
    par = glicko2.glicko2_parallel(
        1500.0,
        200.0,
        0.06,
        [(1400.0, 30.0, 1.0), (1550.0, 100.0, 0.0), (1700.0, 300.0, 0.0)],
    )
    cover = calibration2.gaussian_coverage(seed=2, n_cal=1000, n_test=1000, alpha=0.1)
    biv = bivariate_poisson(1, 1, 1.0, 1.0, 0.2)

    print("verify_claims")
    print(
        "shin z=%.4f fair=%.4f/%.4f" % (z, fair[0], fair[1])
    )
    print("crps %.6f target %.6f (1/sqrt(pi)=%.6f is not the value)" % (crps, target, 1.0 / math.sqrt(math.pi)))
    print(
        "glicko2 %.2f / %.2f / %.6f (paper 1464.06; 0.01 is the scale constant)"
        % (par["rating"], par["rd"], par["sigma"])
    )
    print(
        "split conformal seed %d coverage %.4f q=%.3f"
        % (cover["seed"], cover["coverage"], cover["q"])
    )
    print("bivariate Poisson P(1,1; lam=1,1,0.2)=%.4f" % biv)

    assert abs(z - 0.0476) < 0.00015 and abs(fair[0] - 0.5) < 1e-9
    assert abs(crps - target) < 1e-12
    assert abs(crps - 0.2337) < 1e-4
    assert abs(par["rating"] - 1464.05) < 0.02
    assert abs(par["sigma"] - 0.059996) < 1e-5
    assert cover["coverage"] + 1e-12 >= 0.9
    assert abs(biv - 0.1330) < 0.00015

    print("--- dossier beside this run ---")
    # Broken paste said Shin does not recover z. Appendix B v4.10 is the fix.
    row("shin z on -110/-110", "does not recover z", "%.4f" % z, "MISMATCH")
    row("crps N(0,1) at 0", "1/sqrt(pi)", "%.4f" % crps, "MISMATCH")
    row(
        "glicko2 rating",
        "1464.06 paper",
        "%.2f" % par["rating"],
        "ACCEPTABLE",
    )
    row(
        "conformal coverage",
        "0.908",
        "%.4f seed %d" % (cover["coverage"], cover["seed"]),
        "MISMATCH",
    )
    row("bivariate P(1,1)", "0.1231 unnamed inputs", "%.4f lam=1,1,0.2" % biv, "MISMATCH")
    row("teaser -155 -> -127", "dossier setup", "not this teaser_mc", "MISMATCH")
    row("ESPN 93/77 Brier 0.2868->0.2464", "dossier", "scoreboard not re-hit", "DOSSIER-ONLY")
    row("DK hold 4.2-4.8%", "live probe", "not re-run", "DOSSIER-ONLY")
    row("Kelly 0.0167 vs 0.0115", "dossier", "not this sketch", "DOSSIER-ONLY")
    row("CLV +1.19u", "dossier", "ledger not built", "DOSSIER-ONLY")
    print("verify_claims self_check ok")


if __name__ == "__main__":
    self_check()
