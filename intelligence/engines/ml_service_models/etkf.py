"""Ensemble Transform Kalman Filter (ETKF) over latent team strength.

What this module IS
-------------------
A deterministic, square-root ensemble Kalman filter (Bishop, Etherton & Majumdar
2001; Wang, Bishop & Julier 2004) applied to a latent "team strength" state
vector. It is pure linear algebra on top of numpy/scipy: there is no training
loop, no gradient descent, no torch, and no learned parameters. Given a prior
ensemble and an observation, ``update`` returns the exact ETKF analysis.

What this module IS NOT
-----------------------
* It is **not** a calibrated win-probability model. ``predict`` maps a latent
  strength difference to a probability through a logistic link whose scale
  (``logistic_scale``) and home-field offset (``home_advantage``) are *inputs you
  must calibrate against settled results elsewhere*. Out of the box they are
  1.0 and 0.0, i.e. "latent units are log-odds and there is no home edge" — a
  convention, not a fitted fact.
* It does **not** define the semantics of the extra per-team components when
  ``state_dim > 1``. The built-in matchup operator reads component 0 only (the
  "leading" component = overall strength). Components 1..state_dim-1 are inert
  unless you supply your own observation operator. They exist so a caller can
  carry e.g. offense/defense splits; this class assigns them no meaning.
* There is **no forecast/dynamics model**. Consecutive ``update`` calls assimilate
  into a static state, so uncertainty only ever shrinks. Use ``inflate`` between
  assimilation windows to re-open the ensemble for drifting strengths.
* Non-linear observation operators are handled by ensemble-space linearisation
  (the operator is applied to each member and perturbations are taken about the
  ensemble mean). That is exact for linear operators and an approximation
  otherwise; see ``update``.

Conventions
-----------
State layout is flat, length ``n_teams * state_dim``; team ``t``'s components
occupy the contiguous slice ``[t * state_dim : (t + 1) * state_dim]`` and its
leading component is index ``t * state_dim``.

The ensemble is stored as an ``(n_state, ensemble_size)`` array: one column per
member.
"""

from __future__ import annotations

import math
import warnings
from typing import Callable, Optional, Sequence, Union

import numpy as np
from scipy.linalg import LinAlgError as _ScipyLinAlgError
from scipy.linalg import cho_factor, cho_solve

__all__ = ["ETKF", "ETKFNumericalError"]

ObsOperator = Union[np.ndarray, Sequence[Sequence[float]], Callable[[np.ndarray], np.ndarray]]

# Largest logit magnitude ``predict`` will emit. sigmoid(30) = 1 - 9.4e-14, which
# is strictly below 1.0 in float64 (sigmoid(37) already rounds to exactly 1.0), so
# clipping here is what guarantees the documented open interval (0, 1).
_MAX_LOGIT = 30.0

# MacKay's (1992) logistic-probit moment-matching constant: E[sigmoid(z)] for
# z ~ N(m, v) is approximated by sigmoid(m / sqrt(1 + pi*v/8)).
_MACKAY_LAMBDA = math.pi / 8.0
_SQRT_MACKAY_LAMBDA = math.sqrt(_MACKAY_LAMBDA)


class ETKFNumericalError(RuntimeError):
    """Raised when the ensemble transform cannot be formed reliably.

    Distinct from the harmless round-off we clip away: this signals that the
    symmetric matrix whose square root defines the transform has drifted far
    enough from positive semi-definite that the result would be meaningless.
    """


def _sigmoid(x: float) -> float:
    """Numerically stable logistic that is *exactly* antisymmetric in float64.

    For ``x >= 0`` we return ``p = 1 / (1 + exp(-x))``, which lies in [0.5, 1].
    For ``x < 0`` we return ``1 - 1 / (1 + exp(x))`` — the same ``p`` computed
    from the same ``exp`` call, subtracted from 1.

    Because ``p in [0.5, 1]``, Sterbenz's lemma makes ``1 - p`` exact in binary
    floating point. Hence ``_sigmoid(x) + _sigmoid(-x) == 1.0`` bit-exactly, not
    merely to within tolerance. That is what lets ``predict`` guarantee
    ``predict(a, b) + predict(b, a) == 1`` exactly and turns a silent sign
    inversion into a hard test failure.
    """
    if x >= 0.0:
        return 1.0 / (1.0 + math.exp(-x))
    return 1.0 - 1.0 / (1.0 + math.exp(x))


def _solve_spd(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Solve ``a @ x = b`` for symmetric positive semi-definite ``a``.

    Uses Cholesky when ``a`` is positive definite and falls back to the
    Hermitian pseudo-inverse when it is not. The fallback is the reason
    ``R = 0`` (a perfect, noiseless observation) does not blow up: the innovation
    covariance can then be singular, and the pseudo-inverse yields the
    minimum-norm solution, which is the correct limiting Kalman gain.
    """
    try:
        return cho_solve(cho_factor(a, lower=True, check_finite=False), b, check_finite=False)
    except (_ScipyLinAlgError, np.linalg.LinAlgError, ValueError):
        return np.linalg.pinv(a, hermitian=True) @ b


def _symmetric_sqrt(m: np.ndarray, tol_scale: float = 1e-8) -> np.ndarray:
    """Symmetric positive-semi-definite square root of a symmetric matrix.

    Why ``eigh`` and not ``scipy.linalg.sqrtm``:

    1. ``sqrtm`` is a general (Schur-based) algorithm. It does not know ``m`` is
       symmetric, so on a matrix whose true eigenvalues sit at 0 it routinely
       returns a *complex* result from round-off, which the caller then has to
       paper over with ``np.real``. That hides real failures behind a cast.
    2. ``eigh`` exploits symmetry: it is faster (and O(N^3) with a much smaller
       constant) and returns real eigenvalues we can inspect directly. Clipping
       them at 0 is the exact nearest-PSD projection in the Frobenius norm, so
       the square root is real and PSD by construction rather than by hope.
    3. The reconstructed ``T = V diag(sqrt(w)) V^T`` is *exactly* symmetric. That
       matters: the symmetric square root is the one that leaves the vector of
       ones an eigenvector of ``T``, which is precisely what keeps the analysis
       perturbations zero-mean (Wang, Bishop & Julier 2004). A non-symmetric
       square root would silently shift the ensemble mean off the Kalman mean.

    Genuine numerical failure is still an error, not something to clip: an
    eigenvalue below ``-tol`` or above ``1 + tol`` means the input was not the
    matrix the ETKF algebra says it should be.
    """
    m = 0.5 * (m + m.T)
    if not np.all(np.isfinite(m)):
        raise ETKFNumericalError("transform matrix contains non-finite entries")

    eigenvalues, eigenvectors = np.linalg.eigh(m)

    # In exact arithmetic the ETKF transform matrix has eigenvalues in [0, 1]:
    # it equals (I + A^T R^-1 A)^-1 by the Woodbury identity.
    tol = tol_scale * max(1.0, float(np.max(np.abs(eigenvalues))))
    if eigenvalues.min() < -tol or eigenvalues.max() > 1.0 + tol:
        raise ETKFNumericalError(
            "ensemble transform eigenvalues outside [0, 1] beyond tolerance "
            f"(min={eigenvalues.min():.3e}, max={eigenvalues.max():.3e}, tol={tol:.3e})"
        )

    eigenvalues = np.clip(eigenvalues, 0.0, 1.0)
    return (eigenvectors * np.sqrt(eigenvalues)) @ eigenvectors.T


class ETKF:
    """Ensemble Transform Kalman Filter over a flat latent team-strength state.

    Parameters
    ----------
    n_teams:
        Number of teams. Must be >= 1.
    state_dim:
        Latent components per team. Component 0 is the "leading" component and is
        the only one the built-in matchup operator reads. Must be >= 1.
    ensemble_size:
        Number of ensemble members (columns). ``1`` is accepted but degenerate:
        a single member carries zero sample covariance, so the Kalman gain is
        zero and ``update`` is a documented no-op (see ``update``).
    seed:
        Seed for ``numpy.random.default_rng``. Initialisation is the only place
        randomness enters; the update itself is fully deterministic. Two filters
        built with the same seed and fed the same observations are bit-identical.
    initial_spread:
        Scale of the initial ensemble perturbations. The realised sample standard
        deviation is close to, but not exactly, this value (finite ensemble, and
        the draw is mean-centred).
    initial_mean:
        Optional prior mean, shape ``(n_teams * state_dim,)``. Defaults to zeros.
    obs_var:
        Default observation-error variance used when ``update`` is called without
        an explicit ``R``.
    logistic_scale:
        Latent units per logit in ``predict``. ``1.0`` means "a latent strength
        difference of 1 is one log-odd". NOT calibrated — see module docstring.
    home_advantage:
        Constant added to the latent home-minus-away margin in ``predict``. NOT
        calibrated. Must be 0 for ``predict`` to be antisymmetric.
    """

    def __init__(
        self,
        n_teams: int,
        state_dim: int,
        ensemble_size: int = 50,
        seed: int = 0,
        initial_spread: float = 1.0,
        initial_mean: Optional[np.ndarray] = None,
        obs_var: float = 1.0,
        logistic_scale: float = 1.0,
        home_advantage: float = 0.0,
    ) -> None:
        if int(n_teams) < 1:
            raise ValueError(f"n_teams must be >= 1, got {n_teams}")
        if int(state_dim) < 1:
            raise ValueError(f"state_dim must be >= 1, got {state_dim}")
        if int(ensemble_size) < 1:
            raise ValueError(f"ensemble_size must be >= 1, got {ensemble_size}")
        if not (math.isfinite(initial_spread) and initial_spread >= 0.0):
            raise ValueError(f"initial_spread must be finite and >= 0, got {initial_spread}")
        if not (math.isfinite(obs_var) and obs_var >= 0.0):
            raise ValueError(f"obs_var must be finite and >= 0, got {obs_var}")
        if not (math.isfinite(logistic_scale) and logistic_scale > 0.0):
            raise ValueError(f"logistic_scale must be finite and > 0, got {logistic_scale}")
        if not math.isfinite(home_advantage):
            raise ValueError(f"home_advantage must be finite, got {home_advantage}")

        self.n_teams = int(n_teams)
        self.state_dim = int(state_dim)
        self.ensemble_size = int(ensemble_size)
        self.n_state = self.n_teams * self.state_dim
        self.seed = int(seed)
        self.obs_var = float(obs_var)
        self.logistic_scale = float(logistic_scale)
        self.home_advantage = float(home_advantage)

        self._rng = np.random.default_rng(self.seed)

        if initial_mean is None:
            mean = np.zeros(self.n_state, dtype=float)
        else:
            mean = np.asarray(initial_mean, dtype=float).ravel()
            if mean.shape != (self.n_state,):
                raise ValueError(
                    f"initial_mean must have shape ({self.n_state},), got {mean.shape}"
                )
            if not np.all(np.isfinite(mean)):
                raise ValueError("initial_mean must be finite")

        perturbations = self._rng.standard_normal((self.n_state, self.ensemble_size))
        # Centre so the initial ensemble mean is exactly ``mean`` rather than
        # ``mean`` plus Monte-Carlo noise.
        perturbations -= perturbations.mean(axis=1, keepdims=True)
        with np.errstate(over="ignore", invalid="ignore"):
            ensemble = mean[:, None] + float(initial_spread) * perturbations
        # ``initial_spread`` is individually finite, but the PRODUCT can still overflow
        # (1e308 times a standard-normal draw). Catching it here names the offending
        # argument; letting it through would surface much later as "the projected ensemble
        # contains non-finite values", pointing at the wrong thing.
        if not np.all(np.isfinite(ensemble)):
            raise ValueError(
                f"initial_spread={initial_spread!r} overflows float64 once scaled by the "
                "initial perturbations; use a smaller spread"
            )
        self._ensemble = ensemble

        #: Transform matrix from the most recent ``update`` (diagnostic; ``None``
        #: before the first update or after a degenerate no-op update).
        self.last_transform: Optional[np.ndarray] = None

    # ------------------------------------------------------------------
    # State accessors
    # ------------------------------------------------------------------

    @property
    def ensemble(self) -> np.ndarray:
        """Copy of the ensemble, shape ``(n_state, ensemble_size)``.

        A copy is returned deliberately: the filter's invariants (finite entries,
        column count) are enforced in ``update``, and handing out a mutable view
        would let a caller break them silently.
        """
        return self._ensemble.copy()

    def mean(self) -> np.ndarray:
        """Ensemble mean state, shape ``(n_state,)``."""
        return self._ensemble.mean(axis=1)

    def perturbations(self) -> np.ndarray:
        """Ensemble perturbations about the mean, shape ``(n_state, ensemble_size)``."""
        return self._ensemble - self._ensemble.mean(axis=1, keepdims=True)

    def covariance(self) -> np.ndarray:
        """Sample covariance of the ensemble, shape ``(n_state, n_state)``.

        Returns zeros for ``ensemble_size == 1`` (a single member carries no
        sample covariance) rather than dividing by ``N - 1 == 0``.
        """
        if self.ensemble_size < 2:
            return np.zeros((self.n_state, self.n_state), dtype=float)
        pert = self.perturbations()
        return (pert @ pert.T) / (self.ensemble_size - 1)

    def spread(self) -> np.ndarray:
        """Per-component ensemble standard deviation, shape ``(n_state,)``."""
        if self.ensemble_size < 2:
            return np.zeros(self.n_state, dtype=float)
        return self._ensemble.std(axis=1, ddof=1)

    def team_index(self, team: int) -> int:
        """Index of ``team``'s leading state component in the flat state vector."""
        return self._validate_team(team) * self.state_dim

    def team_strength(self, team: int) -> float:
        """Posterior mean of ``team``'s leading (overall strength) component."""
        return float(self.mean()[self.team_index(team)])

    def team_strength_spread(self, team: int) -> float:
        """Ensemble standard deviation of ``team``'s leading component."""
        return float(self.spread()[self.team_index(team)])

    # ------------------------------------------------------------------
    # Observation operators
    # ------------------------------------------------------------------

    def matchup_operator(self, home_team: int, away_team: int) -> np.ndarray:
        """Observation operator for a home-vs-away matchup, shape ``(1, n_state)``.

        The single row carries ``+1`` on the home team's leading component and
        ``-1`` on the away team's, so ``H @ x`` is the latent margin
        ``strength(home) - strength(away)``. Feed it to ``update`` alongside an
        observed margin to assimilate a result.
        """
        home = self._validate_team(home_team)
        away = self._validate_team(away_team)
        if home == away:
            raise ValueError(f"home_team and away_team must differ, both were {home}")

        operator = np.zeros((1, self.n_state), dtype=float)
        operator[0, home * self.state_dim] = 1.0
        operator[0, away * self.state_dim] = -1.0
        return operator

    # ------------------------------------------------------------------
    # Assimilation
    # ------------------------------------------------------------------

    def update(
        self,
        y: np.ndarray,
        obs_operator: ObsOperator,
        R: Optional[Union[float, np.ndarray]] = None,
    ) -> np.ndarray:
        """Assimilate observation ``y`` and return the analysis (posterior) mean.

        Parameters
        ----------
        y:
            Observation vector, shape ``(p,)`` (a scalar or ``(p, 1)`` is
            accepted and ravelled). Must be finite — a NaN or inf observation is
            rejected with ``ValueError`` **before** the ensemble is touched, so a
            corrupt feed cannot poison the filter.
        obs_operator:
            Either an ``(p, n_state)`` matrix, or a callable mapping a state
            vector to an observation vector. A callable is applied to every
            member and perturbations are taken about the resulting ensemble mean
            — exact for linear operators, an ensemble-space linearisation
            otherwise.
        R:
            Observation-error covariance. ``None`` uses ``obs_var * I``; a scalar
            is read as ``scalar * I``; a 1-D array as a diagonal; a 2-D array as
            the full matrix. ``R = 0`` (a perfect observation) is supported.

        Returns
        -------
        The analysis mean, shape ``(n_state,)``.

        Raises
        ------
        ValueError
            On a non-finite observation, operator or ``R``, or on a shape mismatch —
            all checked before the ensemble is touched.
        ETKFNumericalError
            If the innovation covariance or the resulting analysis is not finite. The
            ensemble is left unmodified. Refusing beats returning the forecast
            unchanged, which is what an overflowed ``S`` would silently produce.

        Algorithm
        ---------
        With ``Z = X' / sqrt(N-1)`` and ``A = (H X)' / sqrt(N-1)`` (primes denote
        perturbations about the ensemble mean), the innovation covariance is
        ``S = A A^T + R``, the mean update is ``x_a = x_f + Z A^T S^-1 (y - H x_f)``,
        and the perturbations are transformed by the symmetric square root of

            M = I - A^T S^-1 A                                   (N x N)

        which equals ``(I + A^T R^-1 A)^-1`` by the Woodbury identity but never
        needs ``R^-1``, so it stays well defined as ``R -> 0``.

        Degenerate single-member ensembles
        ----------------------------------
        With ``ensemble_size == 1`` there are no perturbations, the sample
        covariance is exactly zero, and the Kalman gain is therefore zero. The
        mathematically correct analysis equals the forecast, so ``update`` leaves
        the ensemble untouched and warns, rather than dividing by ``N - 1 == 0``.
        """
        y_arr = np.asarray(y, dtype=float).ravel()
        if y_arr.ndim != 1 or y_arr.size == 0:
            raise ValueError(
                f"y must be a non-empty 1-D observation vector, got shape {y_arr.shape}"
            )
        if not np.all(np.isfinite(y_arr)):
            raise ValueError(
                "observation y contains non-finite values (NaN/inf); refusing to assimilate"
            )

        n_obs = y_arr.size
        n_members = self.ensemble_size

        y_ensemble = self._apply_operator(obs_operator, n_obs)
        r_matrix = self._resolve_r(R, n_obs)

        if n_members < 2:
            warnings.warn(
                "ETKF.update is a no-op for ensemble_size == 1: a single member has zero "
                "sample covariance, so the Kalman gain is zero and the analysis equals the "
                "forecast. Use ensemble_size >= 2 to assimilate information.",
                RuntimeWarning,
                stacklevel=2,
            )
            self.last_transform = None
            return self.mean()

        scale = math.sqrt(n_members - 1)
        x_mean = self._ensemble.mean(axis=1)
        x_pert = self._ensemble - x_mean[:, None]
        z = x_pert / scale

        y_mean = y_ensemble.mean(axis=1)
        a = (y_ensemble - y_mean[:, None]) / scale

        # A finite ensemble can still have a sample covariance that is not: squaring
        # entries near the float64 ceiling overflows. Left unchecked, ``S = inf`` makes
        # the gain solve to exactly zero, the transform to the identity, and ``update``
        # returns the forecast unchanged — silently discarding the observation while
        # reporting success. Refusing is the honest outcome.
        with np.errstate(over="ignore", invalid="ignore"):
            s = a @ a.T + r_matrix
        if not np.all(np.isfinite(s)):
            raise ETKFNumericalError(
                "the innovation covariance overflowed float64; the ensemble is too "
                "large in magnitude to assimilate against (check inflate()/initial_spread)"
            )
        innovation = y_arr - y_mean

        # Mean update: x_a = x_f + Z A^T S^-1 (y - H x_f).
        analysis_mean = x_mean + z @ (a.T @ _solve_spd(s, innovation))

        # Perturbation update via the symmetric square root of I - A^T S^-1 A.
        transform = _symmetric_sqrt(np.eye(n_members) - a.T @ _solve_spd(s, a))

        analysis = analysis_mean[:, None] + x_pert @ transform
        if not np.all(np.isfinite(analysis)):
            raise ETKFNumericalError("analysis ensemble contains non-finite values")

        self._ensemble = analysis
        self.last_transform = transform
        return self.mean()

    def inflate(self, factor: float) -> None:
        """Multiplicatively inflate the ensemble perturbations, leaving the mean fixed.

        Deterministic covariance inflation (variance scales by ``factor ** 2``).
        This is the only way to re-open a filter that has been narrowed by many
        assimilations; there is no dynamics/forecast model in this class, so
        without inflation the spread is monotonically non-increasing forever.

        Raises
        ------
        ETKFNumericalError
            If the inflated ensemble is not finite. ``update`` enforces
            finiteness on its own result, but ``inflate`` is a public mutator
            that can break the same invariant (repeatedly inflating by a huge
            factor overflows float64), and a silently non-finite ensemble
            surfaces much later as a ``NaN`` probability. The ensemble is left
            unmodified when this raises.
        """
        if not (math.isfinite(factor) and factor >= 0.0):
            raise ValueError(f"factor must be finite and >= 0, got {factor}")
        x_mean = self._ensemble.mean(axis=1, keepdims=True)
        with np.errstate(over="ignore", invalid="ignore"):
            inflated = x_mean + float(factor) * (self._ensemble - x_mean)
        if not np.all(np.isfinite(inflated)):
            raise ETKFNumericalError(
                f"inflating by {factor!r} drove the ensemble out of float64 range; "
                "the ensemble is unchanged"
            )
        self._ensemble = inflated

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict(
        self,
        home_team: int,
        away_team: int,
        home_advantage: Optional[float] = None,
    ) -> float:
        """Probability that ``home_team`` beats ``away_team``, strictly in (0, 1).

        Mapping (documented because it is a modelling choice, not a derivation
        from the filter):

        1. Build the matchup operator ``H`` (+1 on the home team's leading state
           component, -1 on the away team's) and project every ensemble member:
           ``d_i = H x_i`` is that member's latent margin.
        2. Summarise the projected ensemble by its mean ``m`` (plus the home
           advantage offset) and its sample standard deviation ``s`` — i.e. the
           posterior over the latent margin is approximated as ``N(m, s^2)``.
        3. Map to a probability with a logistic link of scale ``k =
           logistic_scale``, **integrating over the posterior** rather than
           evaluating at the point estimate:

               P(home win) = E[sigmoid(d / k)],  d ~ N(m, s^2)
                           ~= sigmoid( (m / k) / sqrt(1 + (pi/8) * (s / k)^2) )
                            = sigmoid( m / sqrt(k^2 + (pi/8) * s^2) )

           the standard logistic-probit moment-matching approximation (MacKay
           1992). The denominator is the honest treatment of uncertainty the
           caller asked for: a wide posterior divides the logit down and pulls
           the probability toward 0.5, so a barely-observed team cannot produce a
           confident pick. A point estimate would report the same probability
           whether the margin was known to +/-0.01 or +/-10.

           The second form is what is actually evaluated, via ``math.hypot(k,
           sqrt(pi/8) * s)``. It is algebraically identical but numerically safe:
           the first form computes ``s / k`` and squares it, which raises
           ``OverflowError`` for a small ``logistic_scale`` (a plain Python
           ``float ** 2`` raises rather than saturating), and ``(m / k) / inf``
           then yields ``NaN`` — a "probability" that is not a number. ``hypot``
           never overflows or underflows to zero for finite inputs, so the logit
           is always a real number and the documented ``(0, 1)`` guarantee holds.

        Properties this guarantees:

        * Strictly in ``(0, 1)`` — the logit is clipped to +/-30 before the link.
        * Exactly ``0.5`` when the projected ensemble mean is 0 and there is no
          home advantage (identical or wholly unknown teams).
        * Monotone increasing in ``m`` and, for ``m != 0``, monotone toward 0.5
          in ``s``.
        * Antisymmetric when ``home_advantage == 0``:
          ``predict(a, b) + predict(b, a) == 1.0`` bit-exactly. Swapping the
          teams negates every ``d_i`` exactly in IEEE arithmetic, hence negates
          ``m`` and the logit exactly, and ``_sigmoid`` is exactly antisymmetric.
          A sign error anywhere in this path breaks the identity outright instead
          of degrading it quietly.

        The absolute calibration of the returned number is only as good as
        ``logistic_scale`` and ``home_advantage``, which this class does not fit.

        Raises
        ------
        ETKFNumericalError
            If the projected ensemble — or the mean/spread summarising it — is
            not finite. That happens only after the ensemble itself has been
            driven out of range (e.g. a runaway ``inflate``). Refusing is the
            honest answer: the alternative is returning ``NaN`` or a fabricated
            0.5 for a state that carries no information.
        """
        offset = self.home_advantage if home_advantage is None else float(home_advantage)
        if not math.isfinite(offset):
            raise ValueError(f"home_advantage must be finite, got {offset}")

        operator = self.matchup_operator(home_team, away_team)
        # errstate, not a warning filter: an out-of-range ensemble is reported as the
        # explicit error below, so numpy's own RuntimeWarning would be duplicate noise.
        with np.errstate(over="ignore", invalid="ignore"):
            margins = (operator @ self._ensemble).ravel()
        if not np.all(np.isfinite(margins)):
            raise ETKFNumericalError(
                "the projected ensemble contains non-finite values; no probability can "
                "be formed from it (check for a runaway inflate() factor)"
            )

        # Overflow here is possible even for a finite ensemble (summing N members
        # near the float64 ceiling), so it is detected rather than warned about.
        with np.errstate(over="ignore", invalid="ignore"):
            mean_margin = float(margins.mean()) + offset
            spread = 0.0 if self.ensemble_size < 2 else float(margins.std(ddof=1))
        if not (math.isfinite(mean_margin) and math.isfinite(spread)):
            raise ETKFNumericalError(
                "the latent margin summary overflowed float64 "
                f"(mean={mean_margin!r}, spread={spread!r}); no probability can be formed"
            )

        # sigmoid( m / sqrt(k^2 + (pi/8) s^2) ) — see the docstring for why this
        # form, and math.hypot, rather than (m/k)/sqrt(1 + (pi/8)(s/k)^2).
        denominator = math.hypot(self.logistic_scale, _SQRT_MACKAY_LAMBDA * spread)
        # denominator >= logistic_scale > 0, so this is never 0/0; an overflowing
        # quotient saturates to +/-inf and is then clipped, never to NaN.
        logit = float(np.clip(mean_margin / denominator, -_MAX_LOGIT, _MAX_LOGIT))
        return _sigmoid(logit)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _validate_team(self, team: int) -> int:
        team_int = int(team)
        if team_int != team or not 0 <= team_int < self.n_teams:
            raise ValueError(f"team index must be an integer in [0, {self.n_teams}), got {team!r}")
        return team_int

    def _apply_operator(self, obs_operator: ObsOperator, n_obs: int) -> np.ndarray:
        """Project the ensemble through ``obs_operator``; returns ``(p, N)``."""
        if callable(obs_operator):
            columns = [
                np.asarray(obs_operator(self._ensemble[:, i]), dtype=float).ravel()
                for i in range(self.ensemble_size)
            ]
            widths = {col.size for col in columns}
            if len(widths) != 1:
                raise ValueError(
                    "obs_operator returned inconsistent observation sizes across "
                    f"members: {sorted(widths)}"
                )
            projected = np.column_stack(columns)
        else:
            operator = np.asarray(obs_operator, dtype=float)
            if operator.ndim == 1:
                operator = operator[None, :]
            if operator.ndim != 2 or operator.shape[1] != self.n_state:
                raise ValueError(
                    f"obs_operator must have shape (p, {self.n_state}), got {operator.shape}"
                )
            if not np.all(np.isfinite(operator)):
                raise ValueError("obs_operator contains non-finite values")
            projected = operator @ self._ensemble

        if projected.shape[0] != n_obs:
            raise ValueError(
                f"obs_operator produces {projected.shape[0]} observation(s) but y has {n_obs}"
            )
        if not np.all(np.isfinite(projected)):
            raise ValueError("projected ensemble contains non-finite values")
        return projected

    def _resolve_r(self, r: Optional[Union[float, np.ndarray]], n_obs: int) -> np.ndarray:
        if r is None:
            r_matrix = self.obs_var * np.eye(n_obs)
        else:
            r_arr = np.asarray(r, dtype=float)
            if r_arr.ndim == 0:
                r_matrix = float(r_arr) * np.eye(n_obs)
            elif r_arr.ndim == 1:
                if r_arr.shape != (n_obs,):
                    raise ValueError(f"R diagonal must have shape ({n_obs},), got {r_arr.shape}")
                r_matrix = np.diag(r_arr)
            elif r_arr.ndim == 2:
                if r_arr.shape != (n_obs, n_obs):
                    raise ValueError(f"R must have shape ({n_obs}, {n_obs}), got {r_arr.shape}")
                r_matrix = r_arr.astype(float, copy=True)
            else:
                raise ValueError(f"R must be scalar, 1-D or 2-D, got ndim={r_arr.ndim}")

        if not np.all(np.isfinite(r_matrix)):
            raise ValueError("R contains non-finite values")
        if np.any(np.diag(r_matrix) < 0.0):
            raise ValueError(
                "R has a negative diagonal entry; observation variance cannot be negative"
            )
        return 0.5 * (r_matrix + r_matrix.T)
