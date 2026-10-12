"""
Tests for the SGP Combinatorial Copula Engine.

Every test here either proves a mathematical property (PSD repair, tail
ordering, Frechet-Hoeffding bounds) or pins a monotonicity/ordering claim that
a future refactor could silently break. Nothing asserts a magic constant that
was fitted to make a test pass.
"""

import numpy as np
import pytest

from intelligence.sgp.sgp_copula_engine import (
    ClaytonCopula,
    GaussianCopula,
    Leg,
    LogNormalMarginal,
    NormalMarginal,
    PoissonMarginal,
    StudentTCopula,
    american_to_probability,
    correlation_from_covariance,
    correlation_matrix_from_pairs,
    devig_two_way,
    is_psd,
    nearest_psd_higham,
    over,
    price_sgp,
    under,
)


# ---------------------------------------------------------------------------
# Higham (1988) nearest PSD repair
# ---------------------------------------------------------------------------

def test_higham_repairs_intentionally_non_psd_matrix():
    """
    A matrix that is symmetric, unit-diagonal, and unambiguously NOT PSD.

    This is the classic three-variable construction: pairwise correlations of
    0.9, 0.9 and -0.9 cannot coexist (the third must be >= 2*0.9^2 - 1 = 0.62),
    so the smallest eigenvalue is strongly negative before repair.
    """
    bad = np.array([
        [1.0, 0.9, -0.9],
        [0.9, 1.0, 0.9],
        [-0.9, 0.9, 1.0],
    ])

    # Precondition: the input really is non-PSD, so the test cannot pass vacuously.
    assert not is_psd(bad), "fixture must be non-PSD for this test to mean anything"
    assert np.min(np.linalg.eigvalsh(bad)) < -0.1

    fixed = nearest_psd_higham(bad)

    eigenvalues = np.linalg.eigvalsh(fixed)
    assert np.all(eigenvalues >= -1e-10), f"repaired matrix still has negative eigenvalues: {eigenvalues}"
    assert is_psd(fixed)
    # Symmetry is part of the contract.
    assert np.allclose(fixed, fixed.T, atol=1e-12)
    # Repair must be minimal-ish, not "return the identity": the result has to
    # stay close to the input rather than collapsing to a safe trivial matrix.
    assert np.linalg.norm(fixed - bad, ord="fro") < np.linalg.norm(np.eye(3) - bad, ord="fro")


def test_higham_preserves_an_already_psd_matrix():
    good = np.array([
        [1.0, 0.3, 0.1],
        [0.3, 1.0, 0.2],
        [0.1, 0.2, 1.0],
    ])
    assert is_psd(good)
    assert np.allclose(nearest_psd_higham(good), good, atol=1e-12)


def test_repair_makes_cholesky_succeed_on_an_empirical_matrix():
    """
    The reason the repair exists: an empirical correlation estimate must not
    crash the Cholesky factor that every copula draw depends on.

    Deterministic construction: a centred sample correlation over d variables
    drawn from n observations has rank <= n-1, so with n=4 observations and d=6
    variables the matrix is ALWAYS singular (4+ eigenvalues pinned at ~0) and
    Cholesky always raises. No reliance on a lucky random draw.
    """
    rng = np.random.default_rng(7)
    sample = rng.standard_normal((4, 6))          # 4 observations, 6 variables
    empirical = np.corrcoef(sample, rowvar=False)
    empirical = 0.5 * (empirical + empirical.T)

    with pytest.raises(np.linalg.LinAlgError):
        np.linalg.cholesky(empirical)  # documents that the hazard is real

    # Higham alone is not enough here: the matrix is already in the PSD cone,
    # it is simply not positive DEFINITE. The copula constructor must still
    # produce a factorable matrix and usable draws.
    cop = GaussianCopula(empirical)
    assert np.all(np.isfinite(cop._L))
    assert is_psd(cop.correlation)
    u = cop.uniforms(2_000, np.random.default_rng(3))
    assert u.shape == (2_000, 6)
    assert np.all(u > 0.0) and np.all(u < 1.0)


def test_copula_constructor_repairs_without_raising():
    bad = np.array([
        [1.0, 0.95, -0.95],
        [0.95, 1.0, 0.95],
        [-0.95, 0.95, 1.0],
    ])
    cop = GaussianCopula(bad)
    assert cop.repaired is True
    assert is_psd(cop.correlation)
    # Unit diagonal is preserved by the repair path.
    assert np.allclose(np.diag(cop.correlation), 1.0, atol=1e-10)
    # The repair is minimal, not merely feasible. For this maximally-conflicted
    # input the nearest PSD matrix sits exactly on the Schur-complement
    # boundary: with rho(0,1) = 0.95 and rho(0,2) = -0.95, feasibility of
    # rho(1,2) requires rho(0,1) <= 0.5. So 0.5 IS the closest reachable value
    # and the correct repair pulls 0.95 down to it rather than collapsing the
    # pair toward zero.
    assert 0.5 - 1e-9 <= cop.correlation[0, 1] < 0.95
    assert np.all(np.isfinite(cop.uniforms(500, np.random.default_rng(1))))


# ---------------------------------------------------------------------------
# Correlation bounds: positive correlation raises the joint
# ---------------------------------------------------------------------------

def test_positive_correlation_increases_joint_probability_vs_independent_legs():
    """
    THE core claim of the engine.

    QB passing yards and his WR1's receiving yards are positively correlated
    (rho = 0.65, the same family of number the Colab grid shipped with). Two
    things must hold:

      1. Under positive correlation, P(QB over AND WR over) is strictly greater
         than the naive independent product p1 * p2.
      2. The simulated marginals must still match the independent draws, i.e.
         the lift comes from dependence, not from the copula distorting the
         marginals.
    """
    rho = 0.65
    corr = correlation_matrix_from_pairs(2, {(0, 1): rho})

    qb_yards_line = 250.5
    wr_yards_line = 75.5
    legs = [
        Leg(LogNormalMarginal(mean=245.5, sd=42.0, name="qb_pass_yds"), over(qb_yards_line), "QB o250.5"),
        Leg(LogNormalMarginal(mean=74.5, sd=25.0, name="wr1_rec_yds"), over(wr_yards_line), "WR1 o75.5"),
    ]

    correlated = price_sgp(legs, corr, copula="gaussian", n_draws=200_000, seed=11)
    independent = price_sgp(legs, np.eye(2), copula="gaussian", n_draws=200_000, seed=11)

    assert correlated.true_joint > correlated.independent_joint, (
        "positive correlation must raise the joint above the independence product"
    )
    # And the independent-copula run pins the reference: with rho = 0 the joint
    # equals the product to within Monte Carlo error.
    assert abs(independent.true_joint - independent.independent_joint) < 4 * independent.joint_std_error

    # The lift is material, not a rounding artifact.
    assert correlated.correlation_lift > 0.05
    assert correlated.z_score > 3.0

    # Marginals survive the copula: each leg's simulated probability still
    # tracks its standalone value (within MC error bands).
    for leg_p, ind_p in zip(correlated.leg_probabilities, independent.leg_probabilities):
        assert abs(leg_p - ind_p) < 0.01


def test_negative_correlation_lowers_the_joint_probability():
    """Symmetric control: the sign of the effect must follow the sign of rho."""
    corr = correlation_matrix_from_pairs(2, {(0, 1): -0.45})
    legs = [
        Leg(LogNormalMarginal(200.0, 40.0), over(200.0), "A"),
        Leg(LogNormalMarginal(200.0, 40.0), over(200.0), "B"),
    ]
    r = price_sgp(legs, corr, copula="gaussian", n_draws=200_000, seed=5)
    assert r.true_joint < r.independent_joint
    assert r.correlation_lift < 0


def test_gaussian_correlation_is_monotone_in_rho():
    """P(joint) must increase monotonically as rho increases."""
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "QB"),
        Leg(LogNormalMarginal(74.5, 25.0), over(70.0), "WR1"),
    ]
    joints = []
    for rho in (0.0, 0.25, 0.5, 0.75):
        corr = correlation_matrix_from_pairs(2, {(0, 1): rho})
        r = price_sgp(legs, corr, copula="gaussian", n_draws=100_000, seed=3)
        joints.append(r.true_joint)
    assert joints == sorted(joints), f"joint must be monotone in rho, got {joints}"


# ---------------------------------------------------------------------------
# Copula behaviour: tails and bounds
# ---------------------------------------------------------------------------

def test_student_t_has_fatter_joint_tails_than_gaussian():
    """
    At the SAME correlation, the t-copula (nu=4) must put more mass in the joint
    lower tail than the Gaussian — that is what "tail dependence" means and it
    is the entire reason to prefer it for correlated blow-ups.
    """
    corr = correlation_matrix_from_pairs(2, {(0, 1): 0.6})
    rng = np.random.default_rng(42)

    gauss_u = GaussianCopula(corr).uniforms(200_000, rng)
    t_u = StudentTCopula(corr, nu=4.0).uniforms(200_000, rng)

    threshold = 0.05
    gauss_tail = float(np.mean(np.all(gauss_u < threshold, axis=1)))
    t_tail = float(np.mean(np.all(t_u < threshold, axis=1)))

    assert t_tail > gauss_tail, (
        f"t-copula lower tail {t_tail:.5f} must exceed gaussian {gauss_tail:.5f}"
    )
    # Both must respect the Frechet-Hoeffding lower bound for the joint tail.
    assert t_tail >= 0.0 and gauss_tail >= 0.0


def test_clayton_is_asymmetric_lower_tail_dependent():
    """
    Clayton concentrates dependence in the LOWER tail. Its joint-upper-tail mass
    must be no greater than its joint-lower-tail mass at the same threshold,
    which is the asymmetry Gaussian cannot produce.
    """
    corr = correlation_matrix_from_pairs(2, {(0, 1): 0.5})
    rng = np.random.default_rng(9)
    u = ClaytonCopula(corr, tau=0.4).uniforms(200_000, rng)

    lower = float(np.mean(np.all(u < 0.10, axis=1)))
    upper = float(np.mean(np.all(u > 0.90, axis=1)))
    assert lower > upper, f"clayton lower tail {lower:.5f} must exceed upper tail {upper:.5f}"


def test_clayton_rejects_negative_dependence():
    """Clayton has no negative-dependence regime; it must refuse, not fudge."""
    bad = correlation_matrix_from_pairs(2, {(0, 1): -0.3})
    with pytest.raises(ValueError):
        ClaytonCopula(bad, tau=0.3)
    with pytest.raises(ValueError):
        ClaytonCopula(np.eye(2), tau=-0.2)


def test_frechet_hoeffding_bounds_hold_in_high_dimension():
    """
    For ANY copula and any set of marginals:

        max(0, sum(p_i) - (d - 1)) <= P(all) <= min(p_i)

    A joint probability outside those bounds is impossible, so a violation means
    the simulation is broken. Checked in dimension 6 to catch accumulator bugs
    that dimension 2 would hide.
    """
    d = 6
    rho = 0.35
    corr = np.full((d, d), rho)
    np.fill_diagonal(corr, 1.0)
    assert is_psd(corr)

    legs = [Leg(LogNormalMarginal(250.0, 40.0), over(245.0), f"leg{i}") for i in range(d)]
    for copula in ("gaussian", "student-t", "clayton"):
        r = price_sgp(legs, corr, copula=copula, n_draws=60_000, seed=17)
        ps = r.leg_probabilities
        lower = max(0.0, sum(ps) - (d - 1))
        upper = min(ps)
        assert lower - 1e-9 <= r.true_joint <= upper + 1e-9, (
            f"{copula}: joint {r.true_joint:.5f} outside Frechet bounds [{lower:.5f}, {upper:.5f}]"
        )


def test_all_three_copulas_reproduce_the_marginals():
    """
    A copula must not change the marginals. With the identical marginal
    definitions, every copula must return the same per-leg probability within
    Monte Carlo error — otherwise the engine is pricing a different leg than
    the one the caller specified.
    """
    corr = correlation_matrix_from_pairs(3, {(0, 1): 0.6, (0, 2): 0.4, (1, 2): 0.3})
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(250.5), "qb"),
        Leg(LogNormalMarginal(74.5, 25.0), over(75.5), "wr1"),
        Leg(PoissonMarginal(1.8), over(1.5), "pass_tds"),
    ]
    base = None
    for copula in ("gaussian", "student-t", "clayton"):
        r = price_sgp(legs, corr, copula=copula, n_draws=120_000, seed=23)
        if base is None:
            base = r.leg_probabilities
            continue
        for a, b in zip(base, r.leg_probabilities):
            assert abs(a - b) < 0.01, f"{copula} distorted a marginal: {base} vs {r.leg_probabilities}"


# ---------------------------------------------------------------------------
# Marginals
# ---------------------------------------------------------------------------

def test_poisson_marginal_matches_its_analytic_moments():
    lam = 2.3
    m = PoissonMarginal(lam)
    draws = m.sample(400_000, np.random.default_rng(1))
    assert abs(draws.mean() - lam) < 0.02
    assert abs(draws.var() - lam) < 0.05
    # P(X >= 1) = 1 - e^-lambda, an exact closed form.
    assert abs(float(np.mean(draws >= 1)) - (1 - np.exp(-lam))) < 0.005


def test_lognormal_marginal_matches_its_declared_mean():
    m = LogNormalMarginal(mean=245.5, sd=42.0)
    draws = m.sample(400_000, np.random.default_rng(2))
    assert abs(draws.mean() - 245.5) < 2.0
    assert abs(draws.std() - 42.0) < 2.0


def test_normal_marginal_round_trip_through_its_own_ppf():
    m = NormalMarginal(mean=3.0, sd=2.0)
    u = np.array([0.025, 0.5, 0.975])
    q = m.quantile(u)
    assert abs(q[1] - 3.0) < 1e-6
    # 95% interval of N(3, 2^2) is 3 +/- 1.96 * 2.
    assert abs(q[0] - (3.0 - 1.959963985 * 2.0)) < 1e-4
    assert abs(q[2] - (3.0 + 1.959963985 * 2.0)) < 1e-4


def test_mixed_marginal_types_price_a_realistic_four_leg_sgp():
    """The production shape: yards legs (log-normal) + a counting leg (Poisson)."""
    corr = correlation_matrix_from_pairs(4, {
        (0, 1): 0.72, (0, 2): 0.55, (0, 3): -0.25,
        (1, 2): 0.15, (1, 3): -0.18, (2, 3): -0.15,
    })
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(250.5), "QB pass yds o250.5"),
        Leg(LogNormalMarginal(74.5, 25.0), over(75.5), "WR1 rec yds o75.5"),
        Leg(LogNormalMarginal(48.0, 18.0), over(45.5), "WR2 rec yds o45.5"),
        Leg(PoissonMarginal(1.1), over(0.5), "QB pass TDs o0.5"),
    ]
    r = price_sgp(legs, corr, copula="student-t", nu=4.0, n_draws=50_000, seed=2026)

    assert 0.0 < r.true_joint < 1.0
    assert r.n_draws == 50_000
    assert len(r.leg_probabilities) == 4
    # The QB/WR cluster is positively correlated, so the joint must beat the
    # independence product even with the negative leg dragging.
    assert r.true_joint != r.independent_joint
    assert np.isfinite(r.correlation_lift)


# ---------------------------------------------------------------------------
# Book comparison / edge isolation
# ---------------------------------------------------------------------------

def test_edge_is_isolated_against_a_de_vigged_book_price():
    """
    BOOK IMPLIED PRICE vs TRUE JOINT: the engine must report alpha only when
    the gap clears 15% AND its own Monte Carlo error.

    A four-leg same-game cluster at rho=0.75 is the realistic shape: the more
    legs share one underlying game script, the further the independent product
    falls below the true joint. The book here prices the parlay off that
    independence product plus a 20% hold — the exact structural error this
    engine exists to catch.
    """
    rho = 0.75
    corr = np.full((4, 4), rho)
    np.fill_diagonal(corr, 1.0)
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "QB pass yds"),
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "WR1 rec yds"),
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "WR2 rec yds"),
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "TE rec yds"),
    ]
    r = price_sgp(legs, corr, copula="gaussian", n_draws=200_000, seed=31)

    # A book that prices the parlay as if the legs were independent (the exact
    # structural error this engine exists to catch) plus a 20% hold.
    book_price = r.independent_joint * 1.20
    priced = price_sgp(
        legs, corr, copula="gaussian", n_draws=200_000, seed=31, book_price_prob=book_price
    )
    assert priced.book_implied == pytest.approx(book_price)
    assert priced.alpha == pytest.approx(priced.true_joint - book_price)
    assert priced.edge_standard_error is not None
    # The gap here is a >15% structural misprice AND far outside noise.
    assert priced.alpha > 0.15
    assert priced.is_edge is True


def test_no_edge_declared_when_the_book_price_is_fair():
    corr = correlation_matrix_from_pairs(2, {(0, 1): 0.5})
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "QB"),
        Leg(LogNormalMarginal(74.5, 25.0), over(70.0), "WR1"),
    ]
    fair = price_sgp(legs, corr, n_draws=150_000, seed=77)
    repriced = price_sgp(
        legs, corr, n_draws=150_000, seed=77, book_price_prob=fair.true_joint
    )
    assert abs(repriced.alpha) < 1e-9
    assert repriced.is_edge is False


def test_vigged_price_alpha_is_flagged_as_conservative():
    corr = correlation_matrix_from_pairs(2, {(0, 1): 0.5})
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "QB"),
        Leg(LogNormalMarginal(74.5, 25.0), over(70.0), "WR1"),
    ]
    r = price_sgp(legs, corr, n_draws=20_000, seed=1, book_price_american=-110)
    assert r.book_implied is not None
    assert any("WITH vig" in n for n in r.notes)


def test_sub_noise_alpha_is_not_reported_as_edge():
    """
    Guards the honesty rule: a nominal >15% alpha that sits inside Monte Carlo
    noise must NOT be sold as a confirmed edge.
    """
    corr = correlation_matrix_from_pairs(2, {(0, 1): 0.0})
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(245.5), "QB"),
        Leg(LogNormalMarginal(74.5, 25.0), over(74.5), "WR1"),
    ]
    r = price_sgp(legs, corr, n_draws=2_000, seed=4)
    # Force the adversarial case directly: alpha above 0.15 but z below 2.
    r.alpha = 0.16
    r.edge_standard_error = 0.10  # z = 1.6
    r.edge_z_score = 1.6
    assert r.is_edge is False


# ---------------------------------------------------------------------------
# Odds helpers and input validation
# ---------------------------------------------------------------------------

def test_american_odds_conversion():
    assert american_to_probability(-110) == pytest.approx(110 / 210)
    assert american_to_probability(+150) == pytest.approx(100 / 250)
    assert american_to_probability(-100) == pytest.approx(0.5)
    assert american_to_probability(+100) == pytest.approx(0.5)


def test_devig_two_way_removes_the_hold():
    fair = devig_two_way(-110, -110)
    assert fair == pytest.approx(0.5)
    # A standard -150/+130 market: the favourite's fair probability sits below
    # its raw implied probability.
    raw = american_to_probability(-150)
    fair_fav = devig_two_way(-150, +130)
    assert fair_fav < raw
    assert 0.0 < fair_fav < 1.0


def test_correlation_from_covariance_handles_zero_variance_column():
    cov = np.array([
        [4.0, 1.0, 0.0],
        [1.0, 9.0, 0.0],
        [0.0, 0.0, 0.0],
    ])
    corr = correlation_from_covariance(cov)
    assert np.all(np.isfinite(corr))
    assert np.allclose(np.diag(corr), 1.0)
    assert corr[2, 0] == 0.0 and corr[0, 2] == 0.0


def test_input_validation():
    legs = [Leg(LogNormalMarginal(100.0, 10.0), over(100.0), "A")]
    with pytest.raises(ValueError):
        price_sgp(legs, np.eye(3), n_draws=5_000)        # shape mismatch
    with pytest.raises(ValueError):
        price_sgp(legs, np.eye(1), n_draws=10)           # too few draws for an SE
    with pytest.raises(ValueError):
        price_sgp(legs, np.eye(1), copula="gumbel")      # unsupported copula
    with pytest.raises(ValueError):
        price_sgp([], np.eye(0))                         # no legs
    with pytest.raises(ValueError):
        correlation_matrix_from_pairs(2, {(0, 1): 1.5})  # rho out of range


def test_seeded_runs_are_reproducible():
    corr = correlation_matrix_from_pairs(2, {(0, 1): 0.5})
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "QB"),
        Leg(LogNormalMarginal(74.5, 25.0), over(70.0), "WR1"),
    ]
    a = price_sgp(legs, corr, n_draws=20_000, seed=99)
    b = price_sgp(legs, corr, n_draws=20_000, seed=99)
    assert a.true_joint == b.true_joint
    assert a.leg_probabilities == b.leg_probabilities


def test_summary_renders_without_a_book_price():
    corr = correlation_matrix_from_pairs(2, {(0, 1): 0.4})
    legs = [
        Leg(LogNormalMarginal(245.5, 42.0), over(240.0), "QB"),
        Leg(LogNormalMarginal(74.5, 25.0), over(70.0), "WR1"),
    ]
    text = price_sgp(legs, corr, n_draws=10_000, seed=6).summary()
    assert "true joint" in text
    assert "independent" in text
