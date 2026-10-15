#!/usr/bin/env python3
"""hybrid_crps.py -- residual-relative, mean-preserving key-atom hybrid in ENERGY form.
DIAGNOSTIC ONLY. Nothing here writes picks, walk_forward.json, or any gate file.

Distribution:
    X = Y + mu, where Y ~ mixture of
        continuous N(0, sd)  with mass (1 - p3 - p7)
        point mass at +3     with mass p3/2
        point mass at -3     with mass p3/2
        point mass at +7     with mass p7/2
        point mass at -7     with mass p7/2

mu = spread_line (the close). It is a LOCATION ONLY and is never fitted.
The +/- pairs carry equal mass, so E[Y] = 0 exactly and E[X] = mu exactly.

CRPS is the energy form: E|X - y| - 0.5 * E|X - X'|, every term analytic.
There is no Monte-Carlo term, so repeated calls are bit-identical.

Sign convention: y is the REALIZED MARGIN, not a residual. This matches
engine_math.crps_gaussian(mu, sd, x), which also takes the observation.
"""
import math

PHI0 = 1.0 / math.sqrt(2.0 * math.pi)
INV_SQRT_PI = 1.0 / math.sqrt(math.pi)
SQRT2 = math.sqrt(2.0)


def _phi(z):
    return math.exp(-0.5 * z * z) * PHI0


def _Phi(z):
    return 0.5 * (1.0 + math.erf(z / SQRT2))


def hybrid_mean(mu, p3, p7):
    """E[X] for the residual-relative symmetric construction. Exact by symmetry.

    The continuous piece is centered at mu. Each pair (+k, -k) carries p_k/2 at
    each side, so its own mean is mu. There is no location solve.
    """
    cont = (1.0 - p3 - p7) * mu
    pair3 = p3 * mu
    pair7 = p7 * mu
    return cont + pair3 + pair7


def _e_abs_gaussian(sd, d):
    """E|N(0,sd) - d|: exact closed form for the Gaussian absolute first moment."""
    z = d / sd
    return sd * (2.0 * _phi(z) + z * (2.0 * _Phi(z) - 1.0))


# (residual offset, mass) for the four atoms, given p3 and p7.
def _atoms(p3, p7):
    return ((3.0, p3 / 2.0), (-3.0, p3 / 2.0), (7.0, p7 / 2.0), (-7.0, p7 / 2.0))


def crps_energy(mu, sd, p3, p7, y):
    """Energy-form CRPS: E|X - y| - 0.5 * E|X - X'|, all terms analytic.

    With p3 = p7 = 0 this reduces exactly to engine_math.crps_gaussian(mu, sd, y).
    """
    if p3 + p7 > 1.0 + 1e-12:
        raise ValueError(f"excess mass p3+p7={p3 + p7} exceeds 1")
    if p3 < 0.0 or p7 < 0.0:
        raise ValueError(f"excess mass must be non-negative, got p3={p3} p7={p7}")
    if sd <= 0.0:
        raise ValueError(f"sd must be positive, got {sd}")

    pc = 1.0 - p3 - p7
    atoms = _atoms(p3, p7)

    # ---- E|X - y| ----
    e1_cont = pc * _e_abs_gaussian(sd, mu - y)
    e1_atom = sum(p * abs(mu + k - y) for k, p in atoms)
    e1 = e1_cont + e1_atom

    # ---- E|X - X'| ----
    # continuous-continuous: E|N(0,sd) - N(0,sd)| = 2*sd/sqrt(pi)
    e2_cc = pc * pc * (2.0 * sd * INV_SQRT_PI)
    # continuous-atom: the atom is a constant offset k from the continuous draw
    e2_ca = sum(2.0 * pc * p * _e_abs_gaussian(sd, k) for k, p in atoms)
    # atom-atom: constants, |a - b|
    e2_aa = sum(pi_ * pj * abs(ki - kj)
                for ki, pi_ in atoms for kj, pj in atoms)
    e2 = e2_cc + e2_ca + e2_aa

    return e1 - 0.5 * e2
