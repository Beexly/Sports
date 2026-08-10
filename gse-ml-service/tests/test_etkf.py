"""Tests for app.models.etkf.ETKF."""

from __future__ import annotations

import numpy as np
import pytest

from app.models.etkf import ETKF


def test_constructor_rejects_ensemble_size_below_2():
    with pytest.raises(ValueError):
        ETKF(n_teams=4, state_dim=2, ensemble_size=1, seed=0)


def test_constructor_rejects_ensemble_size_zero():
    with pytest.raises(ValueError):
        ETKF(n_teams=4, state_dim=2, ensemble_size=0, seed=0)


def test_constructor_rejects_non_positive_n_teams():
    with pytest.raises(ValueError):
        ETKF(n_teams=0, state_dim=2, ensemble_size=10, seed=0)


def test_constructor_rejects_non_positive_state_dim():
    with pytest.raises(ValueError):
        ETKF(n_teams=4, state_dim=0, ensemble_size=10, seed=0)


def test_constructor_is_deterministic_given_seed():
    a = ETKF(n_teams=4, state_dim=2, ensemble_size=10, seed=42)
    b = ETKF(n_teams=4, state_dim=2, ensemble_size=10, seed=42)
    assert np.allclose(a.ensemble, b.ensemble)


def test_constructor_does_not_pollute_global_numpy_random_state():
    before = np.random.get_state()
    ETKF(n_teams=4, state_dim=2, ensemble_size=10, seed=123)
    after = np.random.get_state()
    # Compare the actual state arrays (index 1 of the tuple).
    assert np.array_equal(before[1], after[1])


def test_update_rejects_non_finite_y():
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=0)
    h = np.zeros(6)
    h[0] = 1.0
    with pytest.raises(ValueError):
        filt.update(float("nan"), h)
    with pytest.raises(ValueError):
        filt.update(float("inf"), h)


def test_update_rejects_wrong_shaped_obs_operator():
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=0)
    with pytest.raises(ValueError):
        filt.update(1.0, np.zeros(3))  # should be length 6 (3 * 2)


def test_update_rejects_non_finite_obs_operator():
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=0)
    h = np.zeros(6)
    h[0] = float("nan")
    with pytest.raises(ValueError):
        filt.update(1.0, h)


def test_update_changes_ensemble_shape_is_preserved():
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=0)
    h = np.zeros(6)
    h[0] = 1.0
    h[2] = -1.0
    before_shape = filt.ensemble.shape
    filt.update(1.0, h)
    assert filt.ensemble.shape == before_shape
    assert np.all(np.isfinite(filt.ensemble))


def test_update_moves_ensemble_mean_toward_observation():
    # Team 0 vs team 1 contrast; observe a strongly positive outcome for
    # team 0. After assimilation, team 0's mean state should increase
    # relative to team 1's.
    filt = ETKF(n_teams=2, state_dim=1, ensemble_size=30, seed=7)
    h = np.array([1.0, -1.0])
    for _ in range(20):
        filt.update(5.0, h)
    mean_state = filt.ensemble.mean(axis=1)
    assert mean_state[0] > mean_state[1]


def test_predict_returns_value_in_open_unit_interval():
    filt = ETKF(n_teams=4, state_dim=3, ensemble_size=20, seed=1)
    p = filt.predict(0, 1)
    assert 0.0 < p < 1.0


def test_predict_near_half_before_any_updates():
    # With the neutral (small-noise) initialization and no observations
    # assimilated, predictions should be close to the uninformative 0.5.
    filt = ETKF(n_teams=6, state_dim=4, ensemble_size=50, seed=99)
    p = filt.predict(2, 5)
    assert abs(p - 0.5) < 0.15


def test_predict_rejects_out_of_range_indices():
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=0)
    with pytest.raises(ValueError):
        filt.predict(-1, 1)
    with pytest.raises(ValueError):
        filt.predict(0, 3)


def test_predict_rejects_identical_indices():
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=0)
    with pytest.raises(ValueError):
        filt.predict(1, 1)


def test_no_self_h_attribute_stored():
    # Design invariant: obs_operator is a per-call parameter, not stashed
    # on self as a stale "H" attribute.
    filt = ETKF(n_teams=3, state_dim=2, ensemble_size=10, seed=0)
    assert not hasattr(filt, "H")
    assert not hasattr(filt, "h")


def test_repeated_updates_with_different_operators_stay_finite():
    filt = ETKF(n_teams=5, state_dim=2, ensemble_size=25, seed=3)
    rng = np.random.default_rng(0)
    for _ in range(15):
        h = rng.normal(size=10)
        y = float(rng.normal())
        filt.update(y, h)
    assert np.all(np.isfinite(filt.ensemble))
    p = filt.predict(0, 4)
    assert 0.0 < p < 1.0
