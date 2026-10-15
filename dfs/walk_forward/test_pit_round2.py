"""Pins for pit_round2.py families. DIAGNOSTIC."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pit_round2 as P
import gse_location_locked_harness as H


def test_student_t_closed_matches_numeric():
    # numeric reference (+-60 sd grid) is only trusted for nu >= 6; at nu=3 its
    # truncated heavy tail is off by ~0.2, so nu=3 is pinned against Monte Carlo.
    for nu in (6.0, 30.0):
        for y in (-3.0, 0.0, 2.5, 14.0):
            a = P.crps_student_t_closed(1.5, 10.0, nu, y)
            b = P.crps_student_t(1.5, 10.0, nu, y)
            assert abs(a - b) < 1e-3, (nu, y, a, b)


def test_student_t_closed_matches_monte_carlo_nu3():
    random.seed(11)
    nu, s, mu, y, N = 3.0, 10.0, 1.5, -20.0, 200000
    def d():
        z = random.gauss(0, 1)
        c = sum(random.gauss(0, 1) ** 2 for _ in range(3))
        return mu + s * z / math.sqrt(c / nu)
    xs = [d() for _ in range(N)]; x2 = [d() for _ in range(N)]
    mc = sum(abs(x - y) for x in xs) / N - 0.5 * sum(abs(a - b) for a, b in zip(xs, x2)) / N
    assert abs(mc - P.crps_student_t_closed(mu, s, nu, y)) < 0.15


def test_student_t_large_nu_approaches_gaussian():
    a = P.crps_student_t_closed(0.0, 13.45, 1e5, 7.0)
    assert abs(a - H.crps_gaussian(0.0, 13.45, 7.0)) < 1e-3


def test_t_scale_variance_matched():
    s = P.t_scale_var_matched(6.0)
    assert abs(s * s * 6.0 / 4.0 - 13.45 ** 2) < 1e-9


def test_integer_support_mean_lock_and_mc():
    for mu in (-6.5, -3.0, 0.0, 2.5, 7.0, 13.5):
        ks, ps = P.int_support_probs(mu, 13.45)
        assert abs(sum(ps) - 1) < 1e-12
        assert abs(sum(k * p for k, p in zip(ks, ps)) - mu) < 1e-12
    # discrete CRPS == E|X-y| - .5E|X-X'| on a small support
    ks, ps = [0, 1, 2], [0.2, 0.5, 0.3]
    y = 1.0
    e1 = sum(p * abs(k - y) for k, p in zip(ks, ps))
    e2 = sum(pi * pj * abs(a - b) for a, pi in zip(ks, ps) for b, pj in zip(ks, ps))
    assert abs(P.crps_discrete(ks, ps, y) - (e1 - 0.5 * e2)) < 1e-12
    assert abs(P.crps_discrete(ks, ps, -2.0) - (sum(p * abs(k + 2) for k, p in zip(ks, ps)) - 0.5 * e2)) < 1e-12


def test_keynum_zero_atoms_is_gaussian_and_mean_locked():
    for y in (-10.0, 0.0, 3.0, 21.0):
        assert abs(P.crps_keynum(2.5, 13.45, 0, 0, y) - H.crps_gaussian(2.5, 13.45, y)) < 1e-12
    for mu in (-7.5, 3.0, 9.5):
        assert abs(P.mixture_mean(mu, 13.0, 0.05, 0.03) - mu) < 1e-12


def test_keynum_energy_matches_monte_carlo():
    random.seed(7)
    mu, sd, p3, p7, y = 3.5, 13.0, 0.05, 0.03, 7.0
    w, c, atoms = P.keynum_components(mu, sd, p3, p7)
    def draw():
        u = random.random(); acc = 0.0
        for a, q in atoms:
            acc += q
            if u < acc:
                return a
        return random.gauss(c, sd)
    N = 200000
    xs = [draw() for _ in range(N)]; xs2 = [draw() for _ in range(N)]
    mc = sum(abs(x - y) for x in xs) / N - 0.5 * sum(abs(a - b) for a, b in zip(xs, xs2)) / N
    assert abs(mc - P.crps_keynum(mu, sd, p3, p7, y)) < 0.05


def test_pit_select_uses_only_strictly_prior_weeks():
    rows = [{"season": 2017, "week": w} for w in (1, 1, 2, 2, 3)]
    # param 1 is great on week-2 rows only; must not be visible to week-2 rows
    table = [[1, 1, 1, 1, 1], [5, 5, 0, 0, 5]]
    picks = P.pit_select(rows, table, min_prior=1)
    assert picks[:2] == [None, None]
    assert picks[2] == 0 and picks[3] == 0     # only week-1 rows visible
    assert picks[4] == 0                         # prior sums: p0=4, p1=10


def test_student_t_cdf_symmetry_switch():
    # pins the betainc symmetry-switch bug: large nu -> Gaussian, nu=1 -> Cauchy
    for u in (0.05, 0.1, 0.5, 1.0, 2.0, -0.3):
        assert abs(P._student_t_cdf(u, 1e6) - 0.5 * (1 + math.erf(u / math.sqrt(2)))) < 1e-5
        assert abs(P._student_t_cdf(u, 1.0) - (0.5 + math.atan(u) / math.pi)) < 1e-9
