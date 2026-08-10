"""Maximum-Entropy Inverse Reinforcement Learning (MaxEnt IRL) scaffold.

RESEARCH SIDECAR — NOT PRODUCTION. See gse-ml-service/README.md and
app/main.py's module docstring for the full non-production banner.

Why this file looks the way it does
------------------------------------
An earlier draft of this module's `simulate_game`-equivalent function was a
placeholder that looked like a probability estimator but was actually pure
noise dressed up as a prediction:

    return np.mean([random.random() for _ in range(num_rollouts)])

That is exactly the kind of thing CLAUDE.md's non-negotiable rules forbid:
"No fake data — all picks sourced from real API data" and "No fabricated
stats — content is data-backed only." A function whose output is
`random.random()` averaged over some rollouts is fabricated noise, not a
signal, no matter how it's dressed up (and it also implicitly took opaque
team-name strings as input, which this standalone service — it has no team
database of its own — has no legitimate way to turn into a prediction).

This module replaces that placeholder with an honest, minimal MaxEnt-IRL
scaffold instead:

  - `LinearRewardModel` holds a linear reward function over caller-supplied
    numeric feature vectors (never bare team-name strings). Its weights
    start at exactly zero — a neutral, "no information yet" state, not a
    randomly confident one.
  - `train_reward` fits those weights with a real MaxEnt IRL gradient step
    (feature-expectation matching), following:

        Ziebart, B. D., Maas, A., Bagnell, J. A., & Dey, A. K. (2008).
        "Maximum Entropy Inverse Reinforcement Learning." AAAI.

  - `simulate_game` turns a (trained or untrained) `LinearRewardModel` plus
    two numeric feature vectors into a win-probability-style scalar via a
    logistic function of the reward difference.

`simulate_game` is only *meaningful* after `train_reward` has been run on
real historical outcome data — which this standalone service does not
currently have access to (no database, no ingestion pipeline; see
`packages/data-ingestion` in the main app for where that would live). Until
then, an untrained (all-zero-weight) model is used, and it MUST return
exactly 0.5 for any input: the honest "no information yet" output, never
noise dressed up as confidence. This is enforced by construction (a
zero-weight dot product is always zero, and `sigmoid(0) == 0.5`) and is
covered by a test.
"""

from __future__ import annotations

import numpy as np


class LinearRewardModel:
    """A linear reward function over a caller-supplied numeric feature vector.

    `reward(features) = weights . features`

    Parameters
    ----------
    n_features:
        Number of input features the reward function operates over. Must be
        a positive integer.
    seed:
        Optional seed for this model's internal `np.random.Generator`. The
        weights themselves are NOT randomly initialized (see below) — the
        RNG is stored for use by `train_reward` if/when it needs
        stochastic elements (e.g. minibatching), and so this class's
        behavior stays consistent with the rest of this service's
        deterministic-by-seed convention.

    Notes
    -----
    `weights` is initialized to an all-zero vector, NOT random noise. An
    untrained reward model should be neutral (every feature vector scores
    a reward of exactly 0, and `simulate_game` on two zero-reward teams
    returns exactly 0.5) rather than randomly confident about anything.
    """

    def __init__(self, n_features: int, seed: int | None = None) -> None:
        if not isinstance(n_features, (int, np.integer)) or n_features < 1:
            raise ValueError(
                f"n_features must be a positive integer, got {n_features!r}"
            )
        self.n_features = int(n_features)
        self._rng = np.random.default_rng(seed)
        self.weights = np.zeros(self.n_features, dtype=float)

    def reward(self, features: np.ndarray) -> float:
        """Compute the scalar reward `weights . features` for one feature vector."""
        feature_array = np.asarray(features, dtype=float).reshape(-1)
        if feature_array.shape != (self.n_features,):
            raise ValueError(
                f"features must have shape ({self.n_features},), got {feature_array.shape}"
            )
        if not np.all(np.isfinite(feature_array)):
            raise ValueError("features must contain only finite values")
        return float(self.weights @ feature_array)


def train_reward(
    model: LinearRewardModel,
    expert_trajectories: list[dict],
    feature_fn,
    learning_rate: float = 0.05,
    n_iters: int = 200,
) -> LinearRewardModel:
    """Fit `model.weights` via MaxEnt IRL feature-expectation matching.

    This implements the standard MaxEnt IRL gradient (Ziebart et al. 2008):
    the gradient of the log-likelihood of the expert data with respect to
    the reward weights is the difference between the expert's empirical
    feature expectation and the feature expectation predicted by the
    current reward model's induced (softmax) policy over the same
    trajectories:

        grad = E_expert[features] - E_policy[features]
        weights <- weights + learning_rate * grad

    Here, "policy" is deliberately kept simple for this binary-outcome
    setting: for each expert trajectory row (a single decision with a
    binary `outcome` — e.g. "home team won" = 1, else 0 — and a feature
    vector), the model's softmax policy assigns probability
    `sigmoid(reward(features))` to outcome 1. `E_policy[features]` for that
    row is therefore `sigmoid(reward(features)) * features` (the
    feature-expectation contribution of choosing outcome 1 weighted by the
    model's current probability of choosing it). Averaging that gradient
    over all expert rows and taking a fixed number of full-batch gradient
    ascent steps is a real, working instance of feature-expectation
    matching — intentionally simple, but not a placeholder.

    Parameters
    ----------
    model:
        The `LinearRewardModel` to update **in place** (and also returned,
        for convenient chaining).
    expert_trajectories:
        A list of `{"features": list[float], "outcome": 0 or 1}` rows. Each
        row is one observed (features, binary outcome) example from real
        data — e.g. "home_features - away_features" and whether the home
        team actually won.
    feature_fn:
        A callable `feature_fn(row) -> np.ndarray` that extracts the
        feature vector to use from one `expert_trajectories` row. Kept as
        an explicit argument (rather than hardcoding `row["features"]`) so
        callers can adapt richer trajectory representations without
        changing this function.
    learning_rate:
        Gradient ascent step size. Must be positive.
    n_iters:
        Number of full-batch gradient ascent iterations. Must be a
        positive integer.

    Returns
    -------
    LinearRewardModel
        The same `model` instance, with `weights` updated in place.

    Raises
    ------
    ValueError
        If `expert_trajectories` is empty, `learning_rate` is not positive,
        or `n_iters` is not a positive integer.
    """
    if not expert_trajectories:
        raise ValueError("expert_trajectories must be a non-empty list")
    if not np.isfinite(learning_rate) or learning_rate <= 0:
        raise ValueError(f"learning_rate must be a finite positive number, got {learning_rate!r}")
    if not isinstance(n_iters, (int, np.integer)) or n_iters < 1:
        raise ValueError(f"n_iters must be a positive integer, got {n_iters!r}")

    features_matrix = np.stack(
        [np.asarray(feature_fn(row), dtype=float).reshape(-1) for row in expert_trajectories]
    )
    outcomes = np.array([float(row["outcome"]) for row in expert_trajectories])

    if features_matrix.shape[1] != model.n_features:
        raise ValueError(
            f"feature_fn produced vectors of length {features_matrix.shape[1]}, "
            f"expected {model.n_features}"
        )
    if not np.all(np.isfinite(features_matrix)) or not np.all(np.isfinite(outcomes)):
        raise ValueError("expert_trajectories must contain only finite feature/outcome values")
    if not np.all(np.isin(outcomes, [0.0, 1.0])):
        raise ValueError("every trajectory's 'outcome' must be 0 or 1")

    expert_feature_expectation = (features_matrix * outcomes[:, None]).mean(axis=0)

    for _ in range(int(n_iters)):
        rewards = features_matrix @ model.weights  # (n_examples,)
        policy_prob_outcome1 = 1.0 / (1.0 + np.exp(-rewards))  # sigmoid
        policy_feature_expectation = (features_matrix * policy_prob_outcome1[:, None]).mean(axis=0)

        gradient = expert_feature_expectation - policy_feature_expectation
        model.weights = model.weights + learning_rate * gradient

    return model


def simulate_game(
    model: LinearRewardModel, home_features: list[float], away_features: list[float]
) -> float:
    """Return a logistic win probability for `home` given the reward model.

    Computes `reward(home_features)` and `reward(away_features)` as dot
    products with `model.weights`, then squashes their difference through a
    logistic (sigmoid) function to produce a probability in (0, 1) that the
    home side "wins" under this reward model.

    With an untrained (all-zero-weight) `model`, `reward(...)` is 0 for any
    input, so the difference is always 0 and this function returns exactly
    0.5 — the honest "no information yet" output. This is intentional and
    covered by a test; do not special-case it away, and do not replace this
    function's math with anything that could return a value other than 0.5
    when `model.weights` is all zero.

    Parameters
    ----------
    model:
        A `LinearRewardModel` — untrained (zero weights) or previously fit
        via `train_reward` on real historical outcome data.
    home_features, away_features:
        Numeric feature vectors of length `model.n_features` describing the
        home and away side respectively (e.g. team-strength summary stats
        derived from real structured data upstream of this service — never
        bare team-name strings, since this service has no team database to
        resolve them against).

    Returns
    -------
    float
        A value in (0, 1): the model's estimated probability that home
        "wins" this matchup, given its current (possibly untrained) reward
        weights.
    """
    home_reward = model.reward(home_features)
    away_reward = model.reward(away_features)
    diff = home_reward - away_reward
    return 1.0 / (1.0 + np.exp(-diff))
