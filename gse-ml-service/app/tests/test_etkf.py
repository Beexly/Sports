"""Tests for the Ensemble Transform Kalman Filter.

Every stochastic quantity here is drawn from an explicitly seeded
``numpy.random.default_rng``, so each assertion is deterministic and reproducible.
No wall-clock, no global numpy random state.
"""

from __future__ import annotations

import math
import warnings

import numpy as np
import pytest

from app.models.etkf import ETKF, ETKFNumericalError, _symmetric_sqrt

# Two-team margin operator: observes strength(team 0) - strength(team 1).
MARGIN_OP = np.array([[1.0, -1.0]])


def kalman_reference(
    prior_mean: np.ndarray,
    prior_cov: np.ndarray,
    observation: np.ndarray,
    operator: np.ndarray,
    obs_cov: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Textbook Kalman update, computed independently of the ETKF code path.

    Returns ``(analysis_mean, analysis_cov)``. The ETKF must reproduce both:
    the square-root transform is only correct if it lands on this answer.
    """
    innovation_cov = operator @ prior_cov @ operator.T + obs_cov
    gain = prior_cov @ operator.T @ np.linalg.inv(innovation_cov)
    mean = prior_mean + gain @ (observation - operator @ prior_mean)
    cov = (np.eye(prior_cov.shape[0]) - gain @ operator) @ prior_cov
    return mean, cov


# ---------------------------------------------------------------------------
# 1. The real test: assimilation actually works
# ---------------------------------------------------------------------------


def test_assimilation_converges_to_truth_and_shrinks_spread() -> None:
    """A sequence of consistent observations must pull the ensemble onto the truth.

    Note what is and is not identifiable here: the observation only ever sees the
    *difference* of the two strengths, so the common mode (their sum) is
    unobservable and its uncertainty legitimately never shrinks. The convergence
    claim is therefore made in the observed subspace, which is where the filter
    is actually receiving information.
    """
    true_margin = 2.0
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=64, seed=7, initial_spread=2.0)
    rng = np.random.default_rng(1234)

    errors: list[float] = []
    spreads: list[float] = []
    for _ in range(60):
        observation = np.array([true_margin + rng.normal(0.0, 0.5)])
        filt.update(observation, MARGIN_OP, 0.25)
        projected = (MARGIN_OP @ filt.ensemble).ravel()
        errors.append(abs(float(projected.mean()) - true_margin))
        spreads.append(float(projected.std(ddof=1)))

    # (a) the posterior mean converges toward the truth
    assert errors[-1] < 0.1, f"final error {errors[-1]:.4f} did not converge"
    assert errors[-1] < 0.25 * errors[0], f"error only fell {errors[0]:.4f} -> {errors[-1]:.4f}"
    assert max(errors[-10:]) < 0.15, "error is not stably small over the final window"

    # (b) the spread shrinks as evidence accumulates. With no dynamics model and
    # a fixed R, the ETKF analysis covariance satisfies Pa <= Pf in the Loewner
    # order at *every* step, so this is exactly monotone, not merely "-ish".
    assert all(
        spreads[i + 1] <= spreads[i] + 1e-12 for i in range(len(spreads) - 1)
    ), "ensemble spread increased at some assimilation step"
    assert spreads[-1] < 0.2 * spreads[0], f"spread only fell {spreads[0]:.4f} -> {spreads[-1]:.4f}"

    # Sanity: the spread must not collapse to zero either — 60 noisy observations
    # of variance 0.25 leave a genuine posterior variance of roughly 0.25/60.
    assert spreads[-1] > 0.0


def test_assimilation_recovers_full_state_with_direct_observations() -> None:
    """When both strengths are directly observed, both converge to the truth."""
    truth = np.array([1.2, -0.8])
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=80, seed=3, initial_spread=2.0)
    rng = np.random.default_rng(99)
    identity = np.eye(2)

    initial_error = float(np.abs(filt.mean() - truth).max())
    for _ in range(50):
        filt.update(truth + rng.normal(0.0, 0.5, size=2), identity, 0.25)

    final_error = float(np.abs(filt.mean() - truth).max())
    assert final_error < 0.25, f"means {filt.mean()} did not reach truth {truth}"
    assert final_error < initial_error
    assert np.all(filt.spread() < 0.25)


def test_stronger_team_gets_higher_posterior_strength() -> None:
    """The team that keeps winning by a margin ends up with the larger strength."""
    filt = ETKF(n_teams=3, state_dim=1, ensemble_size=48, seed=21, initial_spread=1.0)
    rng = np.random.default_rng(5)
    for _ in range(40):
        filt.update(np.array([1.5 + rng.normal(0.0, 0.3)]), filt.matchup_operator(0, 1), 0.25)

    assert filt.team_strength(0) > filt.team_strength(1)
    assert filt.team_strength(0) - filt.team_strength(1) == pytest.approx(1.5, abs=0.2)
    # Team 2 was never observed: it must be untouched in the observed direction.
    assert filt.team_strength_spread(2) == pytest.approx(1.0, abs=0.2)


# ---------------------------------------------------------------------------
# 2. Ensemble size and zero-mean perturbations
# ---------------------------------------------------------------------------


def test_ensemble_size_is_preserved_exactly_by_every_update() -> None:
    filt = ETKF(n_teams=4, state_dim=2, ensemble_size=17, seed=13)
    assert filt.ensemble.shape == (8, 17)

    rng = np.random.default_rng(2)
    for _ in range(10):
        operator = filt.matchup_operator(rng.integers(0, 2), rng.integers(2, 4))
        filt.update(np.array([rng.normal()]), operator, 0.4)
        assert filt.ensemble.shape == (8, 17)
        assert filt.ensemble_size == 17
        assert np.all(np.isfinite(filt.ensemble))


def test_transform_is_symmetric_and_preserves_the_ensemble_mean() -> None:
    """The transform must fix the vector of ones, or the analysis mean drifts.

    ``T @ 1 == 1`` is the algebraic statement that ``T`` maps zero-mean
    perturbations to zero-mean perturbations. It holds precisely because the
    square root is taken *symmetrically* (via ``eigh``); an asymmetric square
    root of the same matrix would satisfy ``T T^T = M`` just as well while
    silently shifting the ensemble mean off the Kalman mean.
    """
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=32, seed=17, initial_spread=1.5)
    filt.update(np.array([1.7]), MARGIN_OP, 0.3)

    transform = filt.last_transform
    assert transform is not None
    assert transform.shape == (32, 32)
    assert np.abs(transform - transform.T).max() < 1e-12, "transform is not symmetric"
    assert np.abs(transform.sum(axis=1) - 1.0).max() < 1e-10, "T @ 1 != 1"

    # And the consequence: perturbations about the analysis mean sum to zero.
    assert np.abs(filt.perturbations().sum(axis=1)).max() < 1e-10


def test_analysis_mean_matches_the_textbook_kalman_update() -> None:
    """End-to-end check that the transform did not move the mean off target."""
    filt = ETKF(n_teams=3, state_dim=1, ensemble_size=64, seed=23, initial_spread=1.2)
    operator = np.array([[1.0, -1.0, 0.0], [0.0, 1.0, -1.0]])
    obs_cov = np.diag([0.4, 0.9])
    observation = np.array([1.1, -0.6])

    prior_mean = filt.mean()
    prior_cov = filt.covariance()
    expected_mean, _ = kalman_reference(prior_mean, prior_cov, observation, operator, obs_cov)

    returned_mean = filt.update(observation, operator, obs_cov)

    # ``update`` returns the recomputed ensemble mean, so this simultaneously
    # checks the gain and the mean-preservation property of the transform.
    assert np.allclose(returned_mean, filt.mean(), atol=1e-12)
    assert np.allclose(returned_mean, expected_mean, atol=1e-9)


# ---------------------------------------------------------------------------
# 3. Covariance sanity
# ---------------------------------------------------------------------------


def test_analysis_covariance_matches_kalman_and_never_exceeds_the_prior() -> None:
    """Assimilating information cannot increase uncertainty, in any direction."""
    filt = ETKF(n_teams=3, state_dim=1, ensemble_size=96, seed=29, initial_spread=1.4)
    operator = np.array([[1.0, -1.0, 0.0]])
    obs_cov = np.array([[0.35]])
    observation = np.array([0.9])

    prior_cov = filt.covariance()
    _, expected_cov = kalman_reference(filt.mean(), prior_cov, observation, operator, obs_cov)

    filt.update(observation, operator, obs_cov)
    analysis_cov = filt.covariance()

    # The ETKF is an exact square-root filter: it must reproduce (I - KH) Pf.
    assert np.allclose(analysis_cov, expected_cov, atol=1e-9)

    # Loewner order: Pf - Pa is positive semi-definite, so no linear functional
    # of the state got noisier. This is strictly stronger than "the variances
    # went down", which only checks the diagonal.
    difference_eigenvalues = np.linalg.eigvalsh(prior_cov - analysis_cov)
    assert difference_eigenvalues.min() > -1e-10, f"Pf - Pa not PSD: {difference_eigenvalues}"
    assert np.all(np.diag(analysis_cov) <= np.diag(prior_cov) + 1e-12)

    # The observed direction must actually tighten, not merely fail to widen.
    prior_obs_var = (operator @ prior_cov @ operator.T).item()
    analysis_obs_var = (operator @ analysis_cov @ operator.T).item()
    assert analysis_obs_var < prior_obs_var


def test_repeated_assimilation_is_monotonically_non_increasing_in_every_direction() -> None:
    filt = ETKF(n_teams=3, state_dim=1, ensemble_size=64, seed=31, initial_spread=1.0)
    operator = np.array([[1.0, -1.0, 0.0]])
    previous = filt.covariance()

    for step in range(15):
        filt.update(np.array([0.8]), operator, 0.5)
        current = filt.covariance()
        eigenvalues = np.linalg.eigvalsh(previous - current)
        assert (
            eigenvalues.min() > -1e-10
        ), f"uncertainty grew at step {step}: {eigenvalues.min():.3e}"
        previous = current


def test_inflate_reopens_the_ensemble_without_moving_the_mean() -> None:
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=40, seed=37, initial_spread=1.0)
    filt.update(np.array([1.0]), MARGIN_OP, 0.2)

    mean_before = filt.mean()
    cov_before = filt.covariance()
    filt.inflate(2.0)

    assert np.allclose(filt.mean(), mean_before, atol=1e-12)
    # Variance scales by factor**2.
    assert np.allclose(filt.covariance(), 4.0 * cov_before, atol=1e-10)


# ---------------------------------------------------------------------------
# 4. Determinism
# ---------------------------------------------------------------------------


def test_same_seed_is_bit_identical_and_different_seeds_differ() -> None:
    def run(seed: int) -> ETKF:
        filt = ETKF(n_teams=4, state_dim=2, ensemble_size=25, seed=seed, initial_spread=1.1)
        for value in (0.5, -1.2, 2.0, 0.1):
            filt.update(np.array([value]), filt.matchup_operator(0, 3), 0.3)
        return filt

    first = run(42)
    second = run(42)
    third = run(43)

    assert np.array_equal(first.ensemble, second.ensemble), "same seed produced different ensembles"
    assert first.predict(0, 3) == second.predict(0, 3)

    assert not np.allclose(
        first.ensemble, third.ensemble
    ), "different seeds produced identical ensembles"


def test_construction_alone_is_deterministic() -> None:
    assert np.array_equal(ETKF(3, 2, 20, seed=8).ensemble, ETKF(3, 2, 20, seed=8).ensemble)
    assert not np.allclose(ETKF(3, 2, 20, seed=8).ensemble, ETKF(3, 2, 20, seed=9).ensemble)


def test_initial_ensemble_is_centred_on_the_requested_mean() -> None:
    prior = np.array([0.4, -0.2, 1.1])
    filt = ETKF(n_teams=3, state_dim=1, ensemble_size=30, seed=4, initial_mean=prior)
    assert np.allclose(filt.mean(), prior, atol=1e-12)


# ---------------------------------------------------------------------------
# 5. predict()
# ---------------------------------------------------------------------------


def test_predict_returns_a_probability_strictly_inside_the_unit_interval() -> None:
    filt = ETKF(n_teams=4, state_dim=1, ensemble_size=40, seed=51, initial_spread=1.0)
    rng = np.random.default_rng(6)
    for _ in range(20):
        filt.update(np.array([rng.normal(0.0, 2.0)]), filt.matchup_operator(0, 1), 0.4)

    for home in range(4):
        for away in range(4):
            if home == away:
                continue
            probability = filt.predict(home, away)
            assert isinstance(probability, float)
            assert 0.0 < probability < 1.0, f"predict({home},{away}) = {probability!r}"


def test_predict_is_one_half_for_identical_or_unknown_teams() -> None:
    """A fresh filter knows nothing, so it must say exactly 50/50."""
    filt = ETKF(n_teams=3, state_dim=1, ensemble_size=64, seed=53, initial_spread=1.0)
    assert filt.predict(0, 1) == 0.5
    assert filt.predict(2, 0) == 0.5

    # Two teams driven to the same strength by identical evidence also tie.
    trained = ETKF(n_teams=3, state_dim=1, ensemble_size=64, seed=54, initial_spread=1.0)
    for _ in range(30):
        trained.update(np.array([0.0]), trained.matchup_operator(0, 1), 0.3)
    assert trained.predict(0, 1) == pytest.approx(0.5, abs=1e-3)


def test_predict_moves_in_the_right_direction_for_a_genuinely_stronger_team() -> None:
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=64, seed=55, initial_spread=1.0)
    for _ in range(40):
        filt.update(np.array([1.5]), filt.matchup_operator(0, 1), 0.25)

    strong_at_home = filt.predict(0, 1)
    weak_at_home = filt.predict(1, 0)

    assert strong_at_home > 0.5 and weak_at_home < 0.5
    assert strong_at_home > 0.75, f"expected a confident favourite, got {strong_at_home:.4f}"
    assert filt.team_strength(0) > filt.team_strength(1)


def test_predict_is_exactly_antisymmetric_without_home_advantage() -> None:
    """Sign-swap sentinel: p(a,b) + p(b,a) must be exactly 1.0, not approximately.

    Swapping the teams negates every projected margin exactly in IEEE arithmetic,
    and the logistic helper is exactly antisymmetric (Sterbenz), so any deviation
    at all means a sign has been inverted somewhere in the operator/projection
    path. Asserted with ``==`` on purpose: an approximate assertion would let a
    genuine inversion hide behind a tolerance.
    """
    filt = ETKF(n_teams=5, state_dim=2, ensemble_size=48, seed=57, initial_spread=1.3)
    assert filt.home_advantage == 0.0

    rng = np.random.default_rng(11)
    for _ in range(25):
        home, away = rng.choice(5, size=2, replace=False)
        filt.update(np.array([rng.normal(0.0, 1.5)]), filt.matchup_operator(home, away), 0.35)

    for home in range(5):
        for away in range(5):
            if home == away:
                continue
            forward = filt.predict(home, away)
            reverse = filt.predict(away, home)
            assert forward + reverse == 1.0, (
                f"predict({home},{away})={forward!r} + predict({away},{home})={reverse!r} "
                f"= {forward + reverse!r}"
            )


def test_home_advantage_breaks_antisymmetry_in_the_expected_direction() -> None:
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=40, seed=59, initial_spread=0.5)
    neutral = filt.predict(0, 1)
    boosted = filt.predict(0, 1, home_advantage=0.8)
    penalised = filt.predict(0, 1, home_advantage=-0.8)

    assert boosted > neutral > penalised
    assert boosted + filt.predict(1, 0, home_advantage=0.8) > 1.0


def test_wide_posterior_pulls_the_probability_toward_one_half() -> None:
    """The honest-uncertainty claim in ``predict``'s docstring, asserted."""
    prior = np.array([1.0, 0.0])
    narrow = ETKF(2, 1, ensemble_size=256, seed=61, initial_spread=0.01, initial_mean=prior)
    wide = ETKF(2, 1, ensemble_size=256, seed=61, initial_spread=5.0, initial_mean=prior)

    confident = narrow.predict(0, 1)
    uncertain = wide.predict(0, 1)

    # Both ensembles carry the same mean margin of 1.0; only the spread differs.
    assert confident == pytest.approx(1.0 / (1.0 + math.exp(-1.0)), abs=1e-3)
    assert 0.5 < uncertain < confident, f"wide posterior was not pulled toward 0.5: {uncertain:.4f}"
    assert abs(uncertain - 0.5) < 0.5 * abs(confident - 0.5)


def test_predict_never_saturates_to_zero_or_one_on_extreme_strengths() -> None:
    filt = ETKF(
        2, 1, ensemble_size=16, seed=63, initial_spread=0.0, initial_mean=np.array([1e9, -1e9])
    )
    high = filt.predict(0, 1)
    low = filt.predict(1, 0)
    assert 0.0 < low < high < 1.0
    assert high + low == 1.0


def test_matchup_operator_shape_and_signs() -> None:
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=8, seed=65)
    operator = filt.matchup_operator(2, 0)
    assert operator.shape == (1, 6)
    assert operator[0, 4] == 1.0  # team 2's leading component
    assert operator[0, 0] == -1.0  # team 0's leading component
    assert operator.sum() == 0.0
    assert np.count_nonzero(operator) == 2


# ---------------------------------------------------------------------------
# 6. Adversarial and degenerate inputs
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("bad_value", [np.nan, np.inf, -np.inf])
def test_non_finite_observation_is_rejected_without_corrupting_the_ensemble(
    bad_value: float,
) -> None:
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=20, seed=67, initial_spread=1.0)
    filt.update(np.array([1.0]), MARGIN_OP, 0.3)
    snapshot = filt.ensemble

    with pytest.raises(ValueError, match="non-finite"):
        filt.update(np.array([bad_value]), MARGIN_OP, 0.3)

    assert np.array_equal(filt.ensemble, snapshot), "ensemble mutated by a rejected observation"
    assert np.all(np.isfinite(filt.ensemble))
    # The filter is still usable afterwards.
    filt.update(np.array([1.0]), MARGIN_OP, 0.3)
    assert np.all(np.isfinite(filt.ensemble))


def test_non_finite_operator_and_covariance_are_rejected() -> None:
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=20, seed=69)
    snapshot = filt.ensemble

    with pytest.raises(ValueError, match="non-finite"):
        filt.update(np.array([1.0]), np.array([[1.0, np.nan]]), 0.3)
    with pytest.raises(ValueError, match="non-finite"):
        filt.update(np.array([1.0]), MARGIN_OP, np.array([[np.inf]]))
    with pytest.raises(ValueError, match="negative"):
        filt.update(np.array([1.0]), MARGIN_OP, -1.0)

    assert np.array_equal(filt.ensemble, snapshot)


def test_degenerate_zero_observation_error_collapses_onto_the_observation() -> None:
    """R = 0 means a perfect observation: it must not divide by zero."""
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=40, seed=71, initial_spread=1.5)
    filt.update(np.array([2.0]), MARGIN_OP, 0.0)

    projected = (MARGIN_OP @ filt.ensemble).ravel()
    assert np.all(np.isfinite(filt.ensemble))
    assert projected.mean() == pytest.approx(2.0, abs=1e-8)
    assert projected.std(ddof=1) < 1e-8, "a perfect observation left residual spread"

    # A second perfect observation now faces a singular innovation covariance.
    filt.update(np.array([2.0]), MARGIN_OP, 0.0)
    assert np.all(np.isfinite(filt.ensemble))
    assert (MARGIN_OP @ filt.ensemble).ravel().mean() == pytest.approx(2.0, abs=1e-8)


def test_single_member_ensemble_does_not_divide_by_zero() -> None:
    """N - 1 == 0. A lone member carries no covariance, so update is a no-op."""
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=1, seed=73, initial_spread=1.0)
    snapshot = filt.ensemble

    with pytest.warns(RuntimeWarning, match="no-op"):
        returned = filt.update(np.array([5.0]), MARGIN_OP, 0.25)

    assert np.all(np.isfinite(returned))
    assert np.array_equal(filt.ensemble, snapshot)
    assert filt.ensemble.shape == (2, 1)
    assert np.all(filt.covariance() == 0.0)
    assert np.all(filt.spread() == 0.0)

    probability = filt.predict(0, 1)
    assert 0.0 < probability < 1.0
    assert probability + filt.predict(1, 0) == 1.0


def test_two_member_ensemble_is_the_smallest_working_filter() -> None:
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=2, seed=75, initial_spread=1.0)
    with warnings.catch_warnings():
        warnings.simplefilter("error")  # must NOT warn: N = 2 is legitimate
        filt.update(np.array([1.0]), MARGIN_OP, 0.5)
    assert filt.ensemble.shape == (2, 2)
    assert np.all(np.isfinite(filt.ensemble))


def test_shape_mismatches_raise_value_error() -> None:
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=77)
    snapshot = filt.ensemble

    with pytest.raises(ValueError, match=r"shape \(p, 6\)"):
        filt.update(np.array([1.0]), np.ones((1, 5)), 0.1)
    with pytest.raises(ValueError, match="but y has 2"):
        filt.update(np.array([1.0, 2.0]), np.ones((1, 6)), 0.1)
    with pytest.raises(ValueError, match="R must have shape"):
        filt.update(np.array([1.0]), np.ones((1, 6)), np.ones((2, 2)))
    with pytest.raises(ValueError, match="non-empty"):
        filt.update(np.array([]), np.ones((1, 6)))

    assert np.array_equal(filt.ensemble, snapshot)


def test_invalid_constructor_arguments_are_rejected() -> None:
    with pytest.raises(ValueError, match="n_teams"):
        ETKF(n_teams=0, state_dim=1)
    with pytest.raises(ValueError, match="state_dim"):
        ETKF(n_teams=2, state_dim=0)
    with pytest.raises(ValueError, match="ensemble_size"):
        ETKF(n_teams=2, state_dim=1, ensemble_size=0)
    with pytest.raises(ValueError, match="logistic_scale"):
        ETKF(n_teams=2, state_dim=1, logistic_scale=0.0)
    with pytest.raises(ValueError, match="initial_mean"):
        ETKF(n_teams=2, state_dim=1, initial_mean=np.zeros(5))


def test_invalid_team_indices_are_rejected() -> None:
    filt = ETKF(n_teams=3, state_dim=1, ensemble_size=8, seed=79)
    with pytest.raises(ValueError, match="team index"):
        filt.predict(0, 3)
    with pytest.raises(ValueError, match="team index"):
        filt.predict(-1, 0)
    with pytest.raises(ValueError, match="must differ"):
        filt.predict(1, 1)


def test_ensemble_property_returns_a_copy() -> None:
    """Handing out a view would let a caller break the filter's invariants."""
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=8, seed=81)
    borrowed = filt.ensemble
    borrowed[:] = np.nan
    assert np.all(np.isfinite(filt.ensemble))


# ---------------------------------------------------------------------------
# The symmetric square root itself (gap 2)
# ---------------------------------------------------------------------------


def test_symmetric_sqrt_absorbs_tiny_negative_eigenvalues() -> None:
    """Round-off below tolerance is clipped, not raised on, and stays real."""
    basis = np.linalg.qr(np.random.default_rng(83).standard_normal((6, 6)))[0]
    eigenvalues = np.array([1.0, 0.7, 0.3, 0.0, -1e-14, -1e-15])
    matrix = (basis * eigenvalues) @ basis.T

    root = _symmetric_sqrt(matrix)

    assert np.isrealobj(root)
    assert np.abs(root - root.T).max() < 1e-12
    # T @ T reproduces the PSD projection of the input.
    clipped = (basis * np.clip(eigenvalues, 0.0, 1.0)) @ basis.T
    assert np.allclose(root @ root, clipped, atol=1e-12)


def test_symmetric_sqrt_raises_on_genuine_numerical_failure() -> None:
    """A real negative eigenvalue is a bug, not round-off — do not silently clip."""
    with pytest.raises(ETKFNumericalError, match="outside"):
        _symmetric_sqrt(np.diag([1.0, -0.5]))
    with pytest.raises(ETKFNumericalError, match="outside"):
        _symmetric_sqrt(np.diag([1.0, 4.0]))
    with pytest.raises(ETKFNumericalError, match="non-finite"):
        _symmetric_sqrt(np.diag([1.0, np.nan]))


# ---------------------------------------------------------------------------
# Callable observation operators
# ---------------------------------------------------------------------------


def test_callable_operator_matches_the_equivalent_matrix() -> None:
    """For a linear operator the callable path must be numerically identical."""
    observation = np.array([1.8])

    matrix_filter = ETKF(2, 1, ensemble_size=32, seed=85, initial_spread=1.0)
    matrix_filter.update(observation, MARGIN_OP, 0.3)

    callable_filter = ETKF(2, 1, ensemble_size=32, seed=85, initial_spread=1.0)
    callable_filter.update(observation, lambda x: np.array([x[0] - x[1]]), 0.3)

    assert np.allclose(matrix_filter.ensemble, callable_filter.ensemble, atol=1e-12)


def test_callable_operator_with_inconsistent_output_size_is_rejected() -> None:
    filt = ETKF(2, 1, ensemble_size=6, seed=87)
    calls = {"n": 0}

    def flaky(state: np.ndarray) -> np.ndarray:
        calls["n"] += 1
        return np.array([state[0]]) if calls["n"] < 3 else np.array([state[0], state[1]])

    with pytest.raises(ValueError, match="inconsistent observation sizes"):
        filt.update(np.array([1.0]), flaky, 0.2)
