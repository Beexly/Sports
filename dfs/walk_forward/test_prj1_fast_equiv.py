"""Equivalence pins for prj1_fast.py against the frozen prj1.py (PRJ-1).

THE CONTRACT: the batched construction is the same mathematics. For
every input in this suite -- the frozen suite's own fixtures plus a
randomized suite of 240 synthetic games spanning the full nu grid --
the fast path's pmf entries and CRPS objective values must match the
frozen module's outputs to <= 1e-12, and fitted parameters to <= 1e-12.

Why the centres match at all (documented in
prj1-perf-2026-10-15.md): prj1's bisection returns the first midpoint
with |f| < 1e-12, a point that can sit ~1e-12 from the exact root --
the frozen solver's stopping slack is part of its output. An exact-root
solver therefore deviates from prj1 by up to that slack (observed
1.009e-12 in CRPS before the fix), so prj1_fast REPLAYS the bisection
and returns the same midpoint; residual differences come only from
floating-point summation order in the kernel mean / CRPS reductions
(observed <= ~1e-13). Centres are asserted at the same 1e-12 as the
rest of the contract.

SYNTHETIC INPUTS ONLY, exactly like test_prj1.py. No real game, outcome
or data file is read.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import pit_round2 as R2  # noqa: E402
import prj1  # noqa: E402
import prj1_fast as F  # noqa: E402
from test_prj1 import _synthetic_train  # noqa: E402

TOL = 1e-12
TOL_CENTER = 1e-12  # the replay returns prj1's midpoint; see docstring
MAXIMA = {"pmf": 0.0, "crps": 0.0, "center": 0.0, "objective": 0.0,
          "params": 0.0}


def _note(kind, dev):
    if dev > MAXIMA[kind]:
        MAXIMA[kind] = dev


def _check_game(mu, total, beta_T, p3, p7, nu, ys):
    try:
        ks, ps = prj1.build_pmf(mu, total, beta_T, p3, p7, nu)
    except ValueError:
        # the frozen construction refuses this input (e.g. the mean lock
        # has no root on the lattice once atoms rescale mu); the fast
        # path must refuse identically, and there is nothing to compare.
        try:
            F.build_pmf_fast(mu, total, beta_T, p3, p7, nu)
        except ValueError:
            return
        raise AssertionError("fast path accepted a frozen-refused input: "
                             "%r" % ((mu, total, beta_T, p3, p7, nu),))
    ks2, ps2 = F.build_pmf_fast(mu, total, beta_T, p3, p7, nu)
    assert ks == ks2
    dev = max(abs(a - b) for a, b in zip(ps, ps2))
    _note("pmf", dev)
    assert dev <= TOL, ("pmf", mu, total, beta_T, p3, p7, nu, dev)
    sigma = prj1.sigma_g(beta_T, total)
    c1 = prj1.solve_center(mu, sigma, nu, p3, p7)
    c2 = F.solve_centers_fast(np.array([mu]), np.array([sigma]), nu, p3, p7)[0]
    _note("center", abs(c1 - c2))
    assert abs(c1 - c2) <= TOL_CENTER, ("center", mu, nu, c1, c2)
    for y in ys:
        v1 = prj1.crps_pmf(ks, ps, y)
        v2 = float(F.crps_pmfs_fast(np.array([ps2]), np.array([y]))[0])
        _note("crps", abs(v1 - v2))
        assert abs(v1 - v2) <= TOL, ("crps", mu, total, nu, y, v1, v2)


# ------------------------------------------------------------ fixtures

def test_fixture_constructions_match():
    # every build_pmf / kernel case exercised by test_prj1.py
    cases = [
        (-2.5, 40.5, 0.10, 0.03, 0.02, 8),      # mean-lock with atoms
        (0.0, 44.0, 0.0, 0.0, 0.0, math.inf),   # symmetric zero mu
        (-3.5, 47.0, -0.06, 0.0, 0.0, math.inf),  # nu=inf Gaussian pin
        (-2.5, 44.0, 0.05, 0.02, 0.01, 8),      # shadow game params
        (3.0, 41.0, 0.05, 0.02, 0.01, 8),       # predict/no-IO game
        (0.0, 44.0, 0.0, 0.0, 0.0, 10),         # kernel variance case
    ]
    for (mu, tot, b, p3, p7, nu) in cases:
        _check_game(mu, tot, b, p3, p7, nu, ys=(-7.5, 0.0, 3.0, 21.25))
    # kernel_probs pins
    for (c, s, nu) in ((0.0, 1.0, math.inf), (1.25, 9.0, 6)):
        ref = prj1.kernel_probs(c, s, nu)
        mass = F._kernel_mass(np.array([c]), np.array([s]), nu)
        got = (mass[0] / mass[0].sum()).tolist()
        dev = max(abs(a - b) for a, b in zip(ref, got))
        _note("pmf", dev)
        assert dev <= TOL
    # S-ALL4 construction path (explicit sigma)
    mu, tot = -2.5, 44.0
    sigma = prj1.sigma_g(0.05, tot) * 1.10
    _, ps_ref = prj1._build_pmf_with_sigma(mu, sigma, 8, 0.02, 0.01)
    pmf = F.build_pmfs_with_sigma_fast(np.array([mu]), np.array([sigma]),
                                       8, 0.02, 0.01)
    dev = max(abs(a - b) for a, b in zip(ps_ref, pmf[0].tolist()))
    _note("pmf", dev)
    assert dev <= TOL
    # degenerate pmf CRPS pin (point mass at k=2)
    ps = [0.0] * len(prj1.LATTICE)
    ps[2 - prj1.LATTICE_MIN] = 1.0
    for y, want in ((5.0, 3.0), (-1.5, 3.5), (2.0, 0.0)):
        got = float(F.crps_pmfs_fast(np.array([ps]), np.array([y]))[0])
        assert abs(got - want) < 1e-12
        _note("crps", abs(got - R2.crps_discrete(list(prj1.LATTICE), ps, y)))


def test_fixture_f2_init_matches():
    for (n, seed) in ((30, 7), (12, 3), (10, 5), (16, 11)):
        rows = _synthetic_train(n, seed=seed)
        assert F.f2_initial_fit_fast(rows) == prj1.f2_initial_fit(rows)


def test_fixture_objective_values_match():
    rows = _synthetic_train(120, seed=19)
    mu, total, y = F.rows_to_arrays(rows)
    thetas = [(0.0, 0.0, 0.0), (0.05, 0.03, 0.02), (-0.18, 0.05, 0.08),
              (0.20, 0.0, 0.08), (-0.07, 0.20, 0.20), (0.11, 0.45, 0.05),
              (0.0, 0.30, 0.30)]  # last: W > W_MAX penalty branch
    for nu in (3, 8, math.inf):
        for theta in thetas:
            v1 = prj1._objective(list(theta), nu, rows)
            v2 = F._objective_fast(list(theta), nu, mu, total, y)
            _note("objective", abs(v1 - v2))
            assert abs(v1 - v2) <= TOL, (theta, nu, v1, v2)


def test_fixture_fitted_params_match():
    # same reduced-grid practice as the frozen suite's own fit tests
    for (n, seed, grid) in ((16, 7, (5, math.inf)), (10, 5, (5,))):
        rows = _synthetic_train(n, seed=seed)
        saved = prj1.NU_GRID
        prj1.NU_GRID = grid
        try:
            ref = prj1.fit_week(rows)
            got = F.fit_week_fast(rows)
        finally:
            prj1.NU_GRID = saved
        assert ref is not None and got is not None
        assert ref["nu"] == got["nu"], (ref, got)
        for key in ("beta_T", "p3", "p7", "objective"):
            dev = abs(ref[key] - got[key])
            _note("params", dev)
            assert dev <= TOL, (key, ref, got)


def test_fallback_parity():
    log1, log2 = [], []
    prev = {"nu": 8, "beta_T": 0.05, "p3": 0.02, "p7": 0.01, "objective": 7.2}
    a, ua = prj1.fit_with_fallback([], prev, log1)
    b, ub = F.fit_with_fallback_fast([], prev, log2)
    assert ua == ub and a == b and log1 == log2


# ------------------------------------------------------------ randomized

def _random_cases(n_per_nu=20, seed=20261015):
    rng = random.Random(seed)
    cases = []
    for nu in prj1.NU_GRID:
        for _ in range(n_per_nu):
            mu = rng.choice([rng.uniform(-24.5, 24.5),
                             float(rng.randint(-70, 70)),
                             rng.choice([-60.0, -45.5, 38.0, 52.5])])
            mu = round(mu * 2) / 2
            total = None if rng.random() < 0.1 else round(
                rng.uniform(35.0, 58.0) * 2) / 2
            beta_T = rng.uniform(-0.20, 0.20)
            p3 = rng.choice([0.0, rng.uniform(0.0, 0.25)])
            p7 = rng.choice([0.0, rng.uniform(0.0, 0.25)])
            if p3 + p7 > 0.5:
                p3, p7 = p3 * 0.4, p7 * 0.4
            cases.append((mu, total, beta_T, p3, p7, nu))
    # boundary-flavoured extras: W at the cap, extreme mu, smallest sigma
    cases += [
        (0.0, 44.0, 0.0, 0.25, 0.25, 3),
        (79.0, 58.0, 0.20, 0.0, 0.0, 3),
        (-79.0, 35.0, -0.20, 0.10, 0.10, 50),
        (24.5, 35.0, -0.20, 0.0, 0.0, 3),
        (-24.5, 58.0, 0.20, 0.49, 0.01, math.inf),
    ]
    return cases


def test_randomized_constructions_match():
    cases = _random_cases()
    assert len(cases) >= 200
    rng = random.Random(99)
    for (mu, tot, b, p3, p7, nu) in cases:
        y_like = round(mu + rng.gauss(0.0, 13.0))
        _check_game(mu, tot, b, p3, p7, nu, ys=(y_like, -80.5, 0.0, 80.5))


def test_randomized_batched_rows_match():
    # the production path: whole slates of one nu built in one call,
    # with one shared parameter triple (the shape of a weekly slate).
    rng = random.Random(777)
    b, p3, p7, nu = 0.07, 0.04, 0.03, 8
    mus = [round(rng.uniform(-24.5, 24.5) * 2) / 2 for _ in range(40)]
    tots = [None if rng.random() < 0.1 else round(rng.uniform(35.0, 58.0) * 2) / 2
            for _ in range(40)]
    mu = np.array(mus)
    total = np.array(tots, dtype=object)
    pmf = F.build_pmfs_fast(mu, total, b, p3, p7, nu)
    for i, (m, t) in enumerate(zip(mu, total)):
        _, ps = prj1.build_pmf(float(m), t, b, p3, p7, nu)
        dev = max(abs(a - bb) for a, bb in zip(ps, pmf[i].tolist()))
        _note("pmf", dev)
        assert dev <= TOL


def test_randomized_f2_init_matches():
    rng = random.Random(4242)
    rows = []
    for _ in range(300):
        mu = rng.choice([-7.0, -3.0, -2.5, 0.0, 2.5, 3.0, 6.5])
        total = rng.choice([38.5, 41.0, 44.0, 47.5, 51.0, None])
        rows.append({"spread_line": mu, "total_line": total,
                     "margin": int(round(mu + rng.gauss(0.0, 13.0)))})
    assert F.f2_initial_fit_fast(rows) == prj1.f2_initial_fit(rows)


def run_equivalence():
    """Non-test runner: returns the observed maxima dict (used by the
    performance profile for the deliverable's equivalence table)."""
    test_fixture_constructions_match()
    test_fixture_f2_init_matches()
    test_randomized_constructions_match()
    test_randomized_batched_rows_match()
    test_randomized_f2_init_matches()
    return dict(MAXIMA)


if __name__ == "__main__":
    print(run_equivalence())
