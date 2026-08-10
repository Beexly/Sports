"""Ensemble Transform Kalman Filter (ETKF) for sequential team-strength updates.

RESEARCH SIDECAR — NOT PRODUCTION. See gse-ml-service/README.md and
app/main.py's module docstring for the full non-production banner. This
module is an experimental data-assimilation component: it has not been
trained or backtested against real historical results, and its output must
never be treated as a calibrated win probability until that work is done and
an explicit promotion gate is cleared.

Algorithm
---------
The ETKF is a standard square-root ensemble Kalman filter variant for
sequential (online) state estimation, introduced in:

    Bishop, C. H., Etherton, B. J., & Majumdar, S. J. (2001).
    "Adaptive sampling with the ensemble transform Kalman filter. Part I:
    Theoretical aspects." Monthly Weather Review, 129(3), 420-436.

Here the "state" being tracked is a per-team latent strength vector (e.g. an
offense/defense rating block per team), maintained as an ensemble of
plausible states rather than a single point estimate + covariance. Each
`update()` call assimilates one scalar observation (e.g. a game outcome or
margin, expressed however the caller likes) via:

  1. Forecast/perturbation decomposition: split the ensemble into its mean
     and a matrix of member deviations from that mean.
  2. Map the ensemble into observation space via a linear observation
     operator `H` (`obs_operator`), and form the innovation
     `d = y - mean(H @ ensemble)`.
  3. Compute the analysis-error covariance in the *ensemble-size-dimensional*
     coefficient space (not the full state space), which is where ETKF gets
     its efficiency: this matrix is `ensemble_size x ensemble_size`
     regardless of how large the state is.
  4. Take the symmetric matrix square root of that covariance to get the
     ensemble transform matrix, which maps forecast perturbations to
     analysis perturbations while preserving the ensemble mean of the
     transform (the "symmetric square-root" variant avoids the arbitrary
     rotations that a Cholesky-based square root would introduce).
  5. Update the ensemble mean via the standard Kalman-gain-weighted
     innovation, expressed in ensemble coefficient space.

Design notes / deviations from a naive first draft
----------------------------------------------------
- The observation operator `H` is passed to `update()` as `obs_operator`,
  NOT stored on `self`. A naive draft might stash `self.H` in `__init__` and
  then never use it (or worse, silently use a stale copy across calls with
  different operators). Since the operator can legitimately differ between
  assimilation steps (e.g. "team A hosted" vs "team B hosted" contrasts),
  this implementation takes it fresh on every `update()` call and stores
  nothing extra on `self` for it. There is therefore no `self.H` attribute.
- The ensemble's own random number generator is a `numpy.random.Generator`
  created via `np.random.default_rng(seed)`, stored as `self._rng`. It is
  never used to touch the global `numpy.random` state, which keeps tests
  deterministic and keeps this module from silently perturbing unrelated
  code that also uses `numpy.random`.
"""

from __future__ import annotations

import numpy as np
from scipy.linalg import sqrtm


class ETKF:
    """Ensemble Transform Kalman Filter over a block-structured team state.

    The tracked state is conceptually a `(n_teams, state_dim)` array —
    each team owns a contiguous `state_dim`-length block of latent strength
    coordinates — flattened to a single vector of length
    `n_teams * state_dim` for the linear-algebra machinery. The ensemble is
    stored as `self.ensemble`, shape `(n_teams * state_dim, ensemble_size)`:
    each *column* is one ensemble member's full state vector.

    Parameters
    ----------
    n_teams:
        Number of teams being tracked. Must be a positive integer.
    state_dim:
        Dimensionality of each team's latent state block. Must be a
        positive integer.
    ensemble_size:
        Number of ensemble members. Must be >= 2 (the ETKF's ensemble-space
        covariance is only well-defined, and only cheaper than full-state
        Kalman filtering, with at least 2 members).
    seed:
        Optional seed for the internal `np.random.Generator`. Two `ETKF`
        instances built with the same `seed` (and otherwise identical calls)
        produce identical trajectories; omitting it draws fresh entropy from
        the OS.

    Raises
    ------
    ValueError
        If `n_teams`, `state_dim` are not positive integers, or
        `ensemble_size < 2`.
    """

    def __init__(
        self,
        n_teams: int,
        state_dim: int,
        ensemble_size: int = 50,
        seed: int | None = None,
        obs_noise_var: float = 1.0,
    ) -> None:
        if not isinstance(n_teams, (int, np.integer)) or n_teams < 1:
            raise ValueError(f"n_teams must be a positive integer, got {n_teams!r}")
        if not isinstance(state_dim, (int, np.integer)) or state_dim < 1:
            raise ValueError(f"state_dim must be a positive integer, got {state_dim!r}")
        if not isinstance(ensemble_size, (int, np.integer)) or ensemble_size < 2:
            raise ValueError(
                f"ensemble_size must be an integer >= 2, got {ensemble_size!r}"
            )
        if not np.isfinite(obs_noise_var) or obs_noise_var <= 0:
            raise ValueError(
                f"obs_noise_var must be a finite positive number, got {obs_noise_var!r}"
            )

        self.n_teams = int(n_teams)
        self.state_dim = int(state_dim)
        self.ensemble_size = int(ensemble_size)
        self.obs_noise_var = float(obs_noise_var)

        # Dedicated Generator instance — NOT np.random.seed()/np.random.* —
        # so this filter's randomness is isolated and reproducible without
        # mutating any other code's global RNG state.
        self._rng = np.random.default_rng(seed)

        state_len = self.n_teams * self.state_dim
        # Initialize the ensemble as small Gaussian perturbations around a
        # neutral (zero) prior state. This is a deliberately uninformative
        # starting point: with no observations assimilated yet, `predict()`
        # returns ~0.5 for every matchup (see `predict()` docstring).
        self.ensemble: np.ndarray = self._rng.normal(
            loc=0.0, scale=0.1, size=(state_len, self.ensemble_size)
        )

    def update(self, y: float, obs_operator: np.ndarray) -> None:
        """Assimilate one scalar observation into the ensemble (ETKF analysis step).

        Parameters
        ----------
        y:
            The observed scalar value (e.g. a margin, a transformed outcome
            indicator, etc. — the caller decides the observation encoding).
            Must be finite.
        obs_operator:
            A 1-D array of length `n_teams * state_dim` describing how the
            full state vector maps to the (scalar) observation space, i.e.
            the predicted observation for ensemble member `i` is
            `obs_operator @ ensemble[:, i]`. This is `H` in the standard
            Kalman-filter literature. It is a required *parameter* here
            rather than something fixed at construction time, since which
            teams (and which sign) participate in an observation naturally
            changes from game to game.

        Raises
        ------
        ValueError
            If `y` is not finite, or `obs_operator` is not a 1-D array of
            length `n_teams * state_dim`.
        """
        if not np.isfinite(y):
            raise ValueError(f"y must be a finite number, got {y!r}")

        state_len = self.n_teams * self.state_dim
        h = np.asarray(obs_operator, dtype=float).reshape(-1)
        if h.shape != (state_len,):
            raise ValueError(
                f"obs_operator must have shape ({state_len},), got {h.shape}"
            )
        if not np.all(np.isfinite(h)):
            raise ValueError("obs_operator must contain only finite values")

        k = self.ensemble_size
        r = self.obs_noise_var

        # --- 1. Forecast/perturbation decomposition ---
        x_forecast = self.ensemble  # (state_len, k)
        x_mean = x_forecast.mean(axis=1)  # (state_len,)
        x_pert = x_forecast - x_mean[:, None]  # (state_len, k)

        # --- 2. Map to observation space, form innovation ---
        y_forecast = h @ x_forecast  # (k,) — predicted obs per member
        y_mean = float(y_forecast.mean())
        y_pert = y_forecast - y_mean  # (k,) — obs-space perturbations
        innovation = float(y) - y_mean

        # --- 3. Analysis-error covariance in ensemble coefficient space ---
        # C = Yf^T R^-1 Yf, an outer product here since the observation is
        # scalar (obs-space dimension m = 1).
        c = np.outer(y_pert, y_pert) / r  # (k, k)
        identity_k = np.eye(k)
        pa_tilde = np.linalg.inv((k - 1) * identity_k + c)  # (k, k)

        # --- 4. Symmetric square-root transform ---
        transform = sqrtm((k - 1) * pa_tilde)
        # sqrtm can return a complex-typed array with a negligible imaginary
        # part due to floating-point round-off even when the input is
        # symmetric positive semi-definite; defensively take the real part.
        transform = np.real(transform)

        x_pert_analysis = x_pert @ transform  # (state_len, k)

        # --- 5. Ensemble-mean update (Kalman-gain-weighted innovation) ---
        w_mean = pa_tilde @ (y_pert * (innovation / r))  # (k,)
        x_mean_analysis = x_mean + x_pert @ w_mean  # (state_len,)

        self.ensemble = x_mean_analysis[:, None] + x_pert_analysis

    def predict(self, home_idx: int, away_idx: int) -> float:
        """Return a win-probability-like scalar in (0, 1) for home vs. away.

        Computes the ensemble-mean state block for each team, sums the
        component-wise difference (home minus away) into a single scalar
        "net rating" logit, and squashes it through a logistic function.
        With the ensemble at its neutral initialization (before any
        `update()` calls), the mean state for every team is ~0, so this
        returns ~0.5 for any matchup — the honest "no information yet"
        output rather than a confident-looking but meaningless number.

        Parameters
        ----------
        home_idx, away_idx:
            Zero-based team indices in `[0, n_teams)`.

        Raises
        ------
        ValueError
            If either index is out of range or the two indices are equal.
        """
        if not (0 <= home_idx < self.n_teams):
            raise ValueError(f"home_idx {home_idx!r} out of range [0, {self.n_teams})")
        if not (0 <= away_idx < self.n_teams):
            raise ValueError(f"away_idx {away_idx!r} out of range [0, {self.n_teams})")
        if home_idx == away_idx:
            raise ValueError("home_idx and away_idx must refer to different teams")

        mean_state = self.ensemble.mean(axis=1).reshape(self.n_teams, self.state_dim)
        home_block = mean_state[home_idx]
        away_block = mean_state[away_idx]
        logit = float(np.sum(home_block - away_block))

        # Standard logistic squash into (0, 1).
        return 1.0 / (1.0 + np.exp(-logit))
