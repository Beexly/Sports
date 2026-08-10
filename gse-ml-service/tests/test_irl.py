"""Tests for app.models.irl (MaxEnt IRL scaffold).

Covers the specific honesty requirement from CLAUDE.md's no-fabricated-stats
rule: an untrained (all-zero-weight) LinearRewardModel must return EXACTLY
0.5 from simulate_game for any input, never noise.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.models.irl import LinearRewardModel, simulate_game, train_reward


def test_zero_weight_model_has_all_zero_weights():
    model = LinearRewardModel(n_features=5, seed=0)
    assert np.array_equal(model.weights, np.zeros(5))


def test_constructor_rejects_non_positive_n_features():
    with pytest.raises(ValueError):
        LinearRewardModel(n_features=0)
    with pytest.raises(ValueError):
        LinearRewardModel(n_features=-3)


def test_untrained_model_reward_is_always_zero():
    model = LinearRewardModel(n_features=4, seed=1)
    assert model.reward([1.0, 2.0, 3.0, 4.0]) == 0.0
    assert model.reward([-100.0, 50.0, 0.0, 1e6]) == 0.0


def test_reward_rejects_wrong_length_features():
    model = LinearRewardModel(n_features=3)
    with pytest.raises(ValueError):
        model.reward([1.0, 2.0])


def test_reward_rejects_non_finite_features():
    model = LinearRewardModel(n_features=2)
    with pytest.raises(ValueError):
        model.reward([float("nan"), 1.0])


@pytest.mark.parametrize(
    "home_features,away_features",
    [
        ([0.0, 0.0, 0.0], [0.0, 0.0, 0.0]),
        ([1.0, 2.0, 3.0], [4.0, 5.0, 6.0]),
        ([-1.0, 0.0, 1e9], [1e9, -1e9, 0.0]),
        ([0.0], [0.0]),
    ],
)
def test_untrained_model_simulate_game_is_exactly_half(home_features, away_features):
    n = len(home_features)
    model = LinearRewardModel(n_features=n, seed=0)
    probability = simulate_game(model, home_features, away_features)
    assert probability == 0.5


def test_simulate_game_with_single_feature_untrained_is_half():
    model = LinearRewardModel(n_features=1)
    assert simulate_game(model, [42.0], [-42.0]) == 0.5


def _feature_fn(row: dict) -> list[float]:
    return row["features"]


def test_train_reward_rejects_empty_trajectories():
    model = LinearRewardModel(n_features=2)
    with pytest.raises(ValueError):
        train_reward(model, [], _feature_fn)


def test_train_reward_rejects_bad_learning_rate():
    model = LinearRewardModel(n_features=2)
    trajectories = [{"features": [1.0, 0.0], "outcome": 1}]
    with pytest.raises(ValueError):
        train_reward(model, trajectories, _feature_fn, learning_rate=0.0)
    with pytest.raises(ValueError):
        train_reward(model, trajectories, _feature_fn, learning_rate=-1.0)


def test_train_reward_rejects_bad_n_iters():
    model = LinearRewardModel(n_features=2)
    trajectories = [{"features": [1.0, 0.0], "outcome": 1}]
    with pytest.raises(ValueError):
        train_reward(model, trajectories, _feature_fn, n_iters=0)


def test_train_reward_rejects_invalid_outcome_values():
    model = LinearRewardModel(n_features=2)
    trajectories = [{"features": [1.0, 0.0], "outcome": 0.5}]
    with pytest.raises(ValueError):
        train_reward(model, trajectories, _feature_fn)


def test_train_reward_rejects_non_finite_features():
    model = LinearRewardModel(n_features=2)
    trajectories = [{"features": [float("nan"), 0.0], "outcome": 1}]
    with pytest.raises(ValueError):
        train_reward(model, trajectories, _feature_fn)


def test_train_reward_moves_weights_away_from_zero_on_informative_data():
    # Simple separable synthetic dataset: feature[0] perfectly predicts
    # outcome (outcome=1 whenever feature[0] > 0), so MaxEnt IRL should push
    # weights[0] positive.
    rng = np.random.default_rng(0)
    trajectories = []
    for _ in range(200):
        f0 = rng.normal()
        outcome = 1 if f0 > 0 else 0
        trajectories.append({"features": [f0, rng.normal() * 0.01], "outcome": outcome})

    model = LinearRewardModel(n_features=2, seed=0)
    train_reward(model, trajectories, _feature_fn, learning_rate=0.5, n_iters=300)

    assert model.weights[0] > 0.1
    assert not np.array_equal(model.weights, np.zeros(2))


def test_train_reward_updates_model_in_place_and_returns_same_instance():
    model = LinearRewardModel(n_features=2, seed=0)
    trajectories = [
        {"features": [1.0, 0.0], "outcome": 1},
        {"features": [0.0, 1.0], "outcome": 0},
    ]
    returned = train_reward(model, trajectories, _feature_fn, n_iters=10)
    assert returned is model
    assert not np.array_equal(model.weights, np.zeros(2))


def test_trained_model_simulate_game_differs_from_half_after_training():
    rng = np.random.default_rng(1)
    trajectories = []
    for _ in range(200):
        f0 = rng.normal()
        outcome = 1 if f0 > 0 else 0
        trajectories.append({"features": [f0], "outcome": outcome})

    model = LinearRewardModel(n_features=1, seed=0)
    train_reward(model, trajectories, _feature_fn, learning_rate=0.5, n_iters=300)

    probability = simulate_game(model, [3.0], [-3.0])
    assert probability > 0.5
