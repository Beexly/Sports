"""Pins for prj1.py (PRJ-1, RULING-C1). SYNTHETIC INPUTS ONLY.

No test in this file reads any real game, outcome, or data file. The only
file read is prj1.py's own source (for the no-outcomes guard) and
prj1_config.json (the frozen mirror of prj1.CONFIG).
"""
import builtins
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prj1  # noqa: E402
import pit_round2 as R2  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def _mean(ks, ps):
    return sum(k * p for k, p in zip(ks, ps))


def _Phi(z):
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


# ------------------------------------------------------- construction pins

def test_kernel_probs_hand_computed_gaussian():
    # c=0, s=1, nu=inf: B(0) = Phi(0.5)-Phi(-0.5), renormalised by Z.
    B = prj1.kernel_probs(0.0, 1.0, math.inf)
    raw = [_Phi(k + 0.5) - _Phi(k - 0.5) for k in prj1.LATTICE]
    Z = sum(raw)
    assert abs(B[0 - prj1.LATTICE_MIN] - raw[80] / Z) < 1e-15
    assert abs((_Phi(0.5) - _Phi(-0.5)) - 0.38292492254802624) < 1e-15
    assert abs(sum(B) - 1.0) < 1e-12


def test_variance_matching_scale_values():
    assert prj1.variance_matched_scale(13.45, math.inf) == 13.45
    assert abs(prj1.variance_matched_scale(13.45, 3) - 13.45 / math.sqrt(3.0)) < 1e-12
    assert abs(prj1.variance_matched_scale(10.0, 5) - 10.0 * math.sqrt(3.0 / 5.0)) < 1e-12


def test_kernel_variance_matches_sigma_approx():
    # Continuous-kernel identity Var = s^2 * nu/(nu-2) = sigma^2, checked on
    # the lattice pmf (discretisation/truncation perturb it slightly).
    sigma, nu = 13.45, 10
    s = prj1.variance_matched_scale(sigma, nu)
    B = prj1.kernel_probs(0.0, s, nu)
    var = sum((k ** 2) * p for k, p in zip(prj1.LATTICE, B))
    assert abs(var - sigma ** 2) / sigma ** 2 < 0.05


def test_mean_lock_root_with_atoms():
    ks, ps = prj1.build_pmf(-2.5, 40.5, 0.10, 0.03, 0.02, 8)
    assert abs(sum(ps) - 1.0) < 1e-12
    assert abs(_mean(ks, ps) - (-2.5)) < 1e-9
    # atoms landed on the absolute lattice points with F2's weights
    base = prj1.kernel_probs(prj1.solve_center(-2.5, prj1.sigma_g(0.10, 40.5), 8, 0.03, 0.02),
                             prj1.variance_matched_scale(prj1.sigma_g(0.10, 40.5), 8), 8)
    assert abs(ps[3 - prj1.LATTICE_MIN] - (0.95 * base[3 - prj1.LATTICE_MIN] + 0.015)) < 1e-12
    assert abs(ps[7 - prj1.LATTICE_MIN] - (0.95 * base[7 - prj1.LATTICE_MIN] + 0.010)) < 1e-12


def test_mean_lock_symmetric_zero_mu():
    ks, ps = prj1.build_pmf(0.0, 44.0, 0.0, 0.0, 0.0, math.inf)
    assert abs(_mean(ks, ps)) < 1e-12
    for k in (1, 5, 17, 40):
        assert abs(ps[k - prj1.LATTICE_MIN] - ps[-k - prj1.LATTICE_MIN]) < 1e-15


def test_atom_cap_enforced():
    try:
        prj1.build_pmf(0.0, 44.0, 0.0, 0.30, 0.30, 8)  # W = 0.60 > 0.5
        assert False, "W cap not enforced"
    except ValueError:
        pass
    try:
        prj1.build_pmf(0.0, 44.0, 0.0, -0.01, 0.0, 8)
        assert False, "negative atom weight not refused"
    except ValueError:
        pass


def test_nu_inf_reduces_to_gaussian():
    mu, total, beta = -3.5, 47.0, -0.06
    ks, ps = prj1.build_pmf(mu, total, beta, 0.0, 0.0, math.inf)
    sigma = R2.hetero_sd(beta, total)
    c = prj1.solve_center(mu, sigma, math.inf, 0.0, 0.0)
    raw = [_Phi((k + 0.5 - c) / sigma) - _Phi((k - 0.5 - c) / sigma) for k in ks]
    Z = sum(raw)
    for p, r in zip(ps, raw):
        assert abs(p - r / Z) < 1e-15
    assert abs(_mean(ks, ps) - mu) < 1e-9


def test_sigma_matches_f2_landed():
    for beta in (-0.20, -0.07, 0.0, 0.13, 0.20):
        for total in (None, 38.5, 44.0, 51.5):
            assert prj1.sigma_g(beta, total) == R2.hetero_sd(beta, total)


def test_vectorised_t_cdf_matches_landed_scalar():
    # prj1 may evaluate T_nu vectorised (scipy.special.stdtr); it must agree
    # with pit_round2's tested scalar implementation.
    for nu in (3, 5, 10, 30):
        for u in (-2.0, -0.37, 0.0, 0.41, 1.9):
            a = prj1.t_cdf(u, nu)
            b = R2._student_t_cdf(u, nu)
            assert abs(a - b) < 1e-12, (nu, u, a, b)
    if prj1._HAVE_VECTOR_CDF:
        B = prj1.kernel_probs(1.25, 9.0, 6)
        raw = [R2._student_t_cdf((k + 0.5 - 1.25) / 9.0, 6)
               - R2._student_t_cdf((k - 0.5 - 1.25) / 9.0, 6) for k in prj1.LATTICE]
        Z = sum(raw)
        for got, r in zip(B, raw):
            assert abs(got - r / Z) < 1e-12


def test_crps_pmf_exact_discrete_toy():
    # Degenerate pmf at k=2: CRPS at y is |2 - y| exactly.
    ks = list(prj1.LATTICE)
    ps = [0.0] * len(ks)
    ps[2 - prj1.LATTICE_MIN] = 1.0
    assert abs(prj1.crps_pmf(ks, ps, 5.0) - 3.0) < 1e-12
    assert abs(prj1.crps_pmf(ks, ps, -1.5) - 3.5) < 1e-12
    assert abs(prj1.crps_pmf(ks, ps, 2.0)) < 1e-12


# ------------------------------------------------------------ fitting pins

def _synthetic_train(n=30, seed=7):
    import random
    rng = random.Random(seed)
    rows = []
    for i in range(n):
        mu = rng.choice([-7.0, -3.0, -2.5, 0.0, 2.5, 3.0, 6.5])
        total = rng.choice([38.5, 41.0, 44.0, 47.5, 51.0])
        margin = int(round(mu + rng.gauss(0.0, 13.0)))
        rows.append({"spread_line": mu, "total_line": total, "margin": margin})
    return rows


def test_fit_week_synthetic_runs_and_selects():
    # The weekly fit is exercised end-to-end on a reduced nu subset for
    # runtime (the full grid G is pinned separately in
    # test_grids_and_bounds_frozen and _select_fit's tie test); the exact
    # mean-lock bisection inside every objective evaluation is the cost.
    rows = _synthetic_train(16)
    grid = prj1.NU_GRID
    prj1.NU_GRID = (5, math.inf)
    try:
        params = prj1.fit_week(rows)
    finally:
        prj1.NU_GRID = grid
    assert params is not None
    assert params["nu"] in (5, math.inf)
    assert prj1.BETA_T_BOUNDS[0] <= params["beta_T"] <= prj1.BETA_T_BOUNDS[1]
    assert 0.0 <= params["p3"] and 0.0 <= params["p7"]
    assert params["p3"] + params["p7"] <= prj1.W_MAX + 1e-9
    ks, ps = prj1.predict_game({"mu": -2.5, "total_line": 44.0}, params)
    assert abs(sum(ps) - 1.0) < 1e-12
    assert abs(_mean(ks, ps) - (-2.5)) < 1e-9


def test_f2_initial_fit_is_landed_grid_point():
    rows = _synthetic_train(12, seed=3)
    init = prj1.f2_initial_fit(rows)
    assert init[0] in R2.BETA_GRID and init[1] in R2.P_GRID and init[2] in R2.P_GRID
    # argmin check against the landed scorer, recomputed independently
    b, p3, p7 = init
    c_init = sum(R2.crps_keynum(r["spread_line"], R2.hetero_sd(b, r["total_line"]),
                                p3, p7, r["margin"]) for r in rows) / len(rows)
    c_base = sum(R2.crps_keynum(r["spread_line"], R2.hetero_sd(0.0, r["total_line"]),
                                0.0, 0.0, r["margin"]) for r in rows) / len(rows)
    assert c_init <= c_base + 1e-12


def test_select_fit_tie_goes_to_larger_nu():
    res = [(5, 1.25, (0.0, 0.0, 0.0)), (math.inf, 1.25, (0.1, 0.0, 0.0)),
           (8, 1.30, (0.0, 0.0, 0.0))]
    sel = prj1._select_fit(res)
    assert sel["nu"] == math.inf
    res2 = [(3, 1.20, (0.0, 0.0, 0.0)), (50, 1.25, (0.0, 0.0, 0.0))]
    assert prj1._select_fit(res2)["nu"] == 3
    assert prj1._select_fit([]) is None


def test_fallback_path_on_total_failure():
    log = []
    prev = {"nu": 8, "beta_T": 0.05, "p3": 0.02, "p7": 0.01, "objective": 7.2}
    params, used = prj1.fit_with_fallback([], prev, log)  # empty train set
    assert used is True and params["nu"] == 8 and params["beta_T"] == 0.05
    assert len(log) == 1 and log[0]["type"] == "INTEGRITY"
    log2 = []
    params2, used2 = prj1.fit_with_fallback([], None, log2)
    assert params2 is None and used2 is True and len(log2) == 1


# ------------------------------------------------------------- shadow pins

def test_shadows_construct():
    params = {"nu": 8, "beta_T": 0.05, "p3": 0.02, "p7": 0.01}
    game = {"mu": -2.5, "total_line": 44.0}
    ks, ps = prj1.shadow_sg_pmf(game, params)
    assert abs(sum(ps) - 1.0) < 1e-12 and abs(_mean(ks, ps) + 2.5) < 1e-9
    w, c, atoms = prj1.shadow_sf2_components(game, params)
    assert abs(w - (1.0 - 0.03)) < 1e-12 and len(atoms) == 4
    ks4, ps4 = prj1.shadow_sall4_pmf(game, params, 1.10)
    assert abs(sum(ps4) - 1.0) < 1e-12 and abs(_mean(ks4, ps4) + 2.5) < 1e-9
    ks1, ps1 = prj1.shadow_sf1_pmf(game)
    assert abs(sum(ps1) - 1.0) < 1e-9
    assert all(v["weight"] == 0 for v in prj1.SHADOWS.values())


# ------------------------------------------------------------ guard pins

def test_module_never_reads_outcomes():
    src = open(os.path.join(HERE, "prj1.py"), encoding="utf-8").read()
    for banned in ("games.csv", "load_frozen", "GAMES_CSV", "open(",
                   "read_csv", "DictReader", "nflverse"):
        assert banned not in src, banned


def test_predict_and_fit_do_no_file_io():
    real_open = builtins.open

    def boom(*a, **k):
        raise AssertionError("file I/O attempted")

    builtins.open = boom
    try:
        params = {"nu": 8, "beta_T": 0.05, "p3": 0.02, "p7": 0.01}
        ks, ps = prj1.predict_game({"mu": 3.0, "total_line": 41.0}, params)
        assert abs(sum(ps) - 1.0) < 1e-12
        rows = _synthetic_train(10, seed=5)
        grid = prj1.NU_GRID
        prj1.NU_GRID = (5,)
        try:
            fitted = prj1.fit_week(rows)
        finally:
            prj1.NU_GRID = grid
        assert fitted is not None
    finally:
        builtins.open = real_open


def test_config_mirror_matches_module():
    cfg = json.load(open(os.path.join(HERE, "prj1_config.json"), encoding="utf-8"))
    assert cfg == prj1.CONFIG, "prj1_config.json drifted from prj1.CONFIG"


def test_grids_and_bounds_frozen():
    assert prj1.NU_GRID == (3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50, math.inf)
    assert prj1.LATTICE == tuple(range(-80, 81))
    assert prj1.EMISSION == "ZERO_OBJECT"
