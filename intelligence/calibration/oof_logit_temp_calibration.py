"""OOF Logit-Temperature Calibration, 3-Class Push EV, Purged Splitter & Barber Conformal Gate (WP-2).

Drop-in Path:
    C:\\Users\\Garrett\\Sports\\intelligence\\calibration\\oof_logit_temp_calibration.py

Implements the critical blocking statistical and calibration gates from
``master_overall_plan.md`` (WP-2) and ``unified_hivemind_projection_and_membership_plan``:
1. 2-parameter Logit-Shift + Temperature calibration fitter:
      p_cal = sigmoid(a_m + b_m * logit(p_raw))
   enforcing strict monotonicity ``0 < b_m <= 1.0`` and hierarchical Ridge penalty
   ``lambda = 25.0`` pooled toward signal-path prior ``(a_0 = -0.22, b_0 = 0.78)``.
2. Explicit 3-class Push EV calculator:
      EV = p_win_nonpush * (1 - p_push) * (O_dec - 1) - (1 - p_win_nonpush) * (1 - p_push)
3. 7-day purged/embargoed chronological Out-Of-Fold (OOF) splitter preventing
   overlapping injury, weather, and closing-line horizon leakage.
4. Non-exchangeable weighted conformal lower-confidence-bound abstention gate
   (Barber, Candes, Ramdas, & Tibshirani, 2023, https://arxiv.org/abs/2202.13415):
      p_LCB - q_devig >= 0.015
5. 100-permutation shuffled-time placebo verifier asserting:
      |mean placebo CLV| <= 0.005
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import math
from typing import Callable, Iterator, List, Optional, Sequence, Tuple, Union

import numpy as np
from scipy.optimize import minimize

PRIOR_INTERCEPT_A0: float = -0.22
PRIOR_SLOPE_B0: float = 0.78
HIERARCHICAL_RIDGE_LAMBDA: float = 25.0
MIN_MONOTONIC_SLOPE: float = 1e-4
MAX_MONOTONIC_SLOPE: float = 1.0
PROB_CLIP_EPS: float = 1e-6
DEFAULT_PURGE_DAYS: float = 7.0
DEFAULT_EMBARGO_DAYS: float = 7.0
MIN_CONFORMAL_LCB_EDGE: float = 0.015
MAX_PLACEBO_ABS_MEAN_CLV: float = 0.005
SECONDS_PER_DAY: float = 86_400.0

TimestampLike = Union[float, int, datetime, np.datetime64]


def logit(p: Union[float, np.ndarray], eps: float = PROB_CLIP_EPS) -> Union[float, np.ndarray]:
    """Numerically stable log-odds transform on (0, 1)."""
    p_clipped = np.clip(p, eps, 1.0 - eps)
    res = np.log(p_clipped / (1.0 - p_clipped))
    if np.ndim(p) == 0:
        return float(res)
    return res


def sigmoid(eta: Union[float, np.ndarray]) -> Union[float, np.ndarray]:
    """Numerically stable logistic sigmoid."""
    eta_arr = np.asarray(eta, dtype=np.float64)
    out = np.where(
        eta_arr >= 0.0,
        1.0 / (1.0 + np.exp(-np.clip(eta_arr, -500.0, 500.0))),
        np.exp(np.clip(eta_arr, -500.0, 500.0))
        / (1.0 + np.exp(np.clip(eta_arr, -500.0, 500.0))),
    )
    if np.ndim(eta) == 0:
        return float(out)
    return out


@dataclass(frozen=True)
class CalibrationFitResult:
    """Fitted 2-parameter hierarchical logit-temperature calibration state."""

    a_m: float
    b_m: float
    lambda_ridge: float
    a_0: float
    b_0: float
    n_samples: int
    converged: bool
    penalized_nll: float

    def predict_proba(
        self, p_raw: Union[float, Sequence[float], np.ndarray]
    ) -> Union[float, np.ndarray]:
        """Map raw probabilities to calibrated probabilities via sigmoid(a_m + b_m * logit(p_raw))."""
        scalar_input = np.ndim(p_raw) == 0
        raw_arr = np.asarray(p_raw, dtype=np.float64)
        if np.any(~np.isfinite(raw_arr)) or np.any((raw_arr < 0.0) | (raw_arr > 1.0)):
            raise ValueError("p_raw must contain finite probabilities in [0.0, 1.0].")
        z = logit(raw_arr)
        p_cal = sigmoid(self.a_m + self.b_m * z)
        if scalar_input:
            return float(p_cal)
        return np.asarray(p_cal, dtype=np.float64)


class LogitTempCalibrator:
    """Hierarchical Ridge-shrunk 2-parameter Logit-Shift + Temperature calibrator.

    Minimizes the penalized Bernoulli negative log-likelihood:
        sum_i [-y_i * eta_i + log(1 + exp(eta_i))]
        + 0.5 * lambda * ((a_m - a_0)^2 + (b_m - b_0)^2)
    where eta_i = a_m + b_m * logit(p_raw_i), subject to strict monotonicity and
    anti-sharpening bounds ``0 < b_m <= 1.0``.
    """

    def __init__(
        self,
        lambda_ridge: float = HIERARCHICAL_RIDGE_LAMBDA,
        a_0: float = PRIOR_INTERCEPT_A0,
        b_0: float = PRIOR_SLOPE_B0,
        b_min: float = MIN_MONOTONIC_SLOPE,
        b_max: float = MAX_MONOTONIC_SLOPE,
    ) -> None:
        if lambda_ridge < 0.0 or not math.isfinite(lambda_ridge):
            raise ValueError(f"lambda_ridge must be finite and >= 0, got {lambda_ridge!r}.")
        if not (0.0 < b_min <= b_max <= 1.0):
            raise ValueError(
                f"Monotonicity bounds require 0 < b_min <= b_max <= 1.0, got ({b_min}, {b_max})."
            )
        if not (b_min <= b_0 <= b_max):
            raise ValueError(f"Prior b_0={b_0} must lie within [{b_min}, {b_max}].")
        self.lambda_ridge = float(lambda_ridge)
        self.a_0 = float(a_0)
        self.b_0 = float(b_0)
        self.b_min = float(b_min)
        self.b_max = float(b_max)
        self.result_: Optional[CalibrationFitResult] = None

    def fit(
        self,
        p_raw: Sequence[float] | np.ndarray,
        y_true: Sequence[int | float] | np.ndarray,
        sample_weight: Optional[Sequence[float] | np.ndarray] = None,
    ) -> CalibrationFitResult:
        """Fit (a_m, b_m) via exact-gradient L-BFGS-B with strict bounds 0 < b_m <= 1.0."""
        p_arr = np.asarray(p_raw, dtype=np.float64)
        y_arr = np.asarray(y_true, dtype=np.float64)
        if p_arr.ndim != 1 or y_arr.ndim != 1 or p_arr.shape[0] != y_arr.shape[0]:
            raise ValueError("p_raw and y_true must be 1D arrays of identical length.")
        if np.any(~np.isfinite(p_arr)) or np.any((p_arr < 0.0) | (p_arr > 1.0)):
            raise ValueError("p_raw must contain finite probabilities in [0.0, 1.0].")
        if np.any(~np.isfinite(y_arr)) or np.any((y_arr < 0.0) | (y_arr > 1.0)):
            raise ValueError("y_true must contain finite non-push binary outcomes in [0.0, 1.0].")

        n = int(p_arr.shape[0])
        if n == 0:
            self.result_ = CalibrationFitResult(
                a_m=self.a_0,
                b_m=self.b_0,
                lambda_ridge=self.lambda_ridge,
                a_0=self.a_0,
                b_0=self.b_0,
                n_samples=0,
                converged=True,
                penalized_nll=0.0,
            )
            return self.result_

        if sample_weight is None:
            w_arr = np.ones(n, dtype=np.float64)
        else:
            w_arr = np.asarray(sample_weight, dtype=np.float64)
            if w_arr.shape != (n,) or np.any(~np.isfinite(w_arr)) or np.any(w_arr < 0.0):
                raise ValueError("sample_weight must match p_raw shape with finite >= 0 weights.")

        z_arr = np.asarray(logit(p_arr), dtype=np.float64)
        lam = self.lambda_ridge
        a0 = self.a_0
        b0 = self.b_0

        def _obj_and_grad(params: np.ndarray) -> Tuple[float, np.ndarray]:
            a_val = float(params[0])
            b_val = float(params[1])
            eta = a_val + b_val * z_arr
            # Numerically stable softplus: log(1 + exp(eta)) = max(eta, 0) + log1p(exp(-|eta|))
            softplus = np.maximum(eta, 0.0) + np.log1p(np.exp(-np.abs(eta)))
            nll = float(np.sum(w_arr * (softplus - y_arr * eta)))
            ridge = 0.5 * lam * ((a_val - a0) ** 2 + (b_val - b0) ** 2)

            p_hat = np.asarray(sigmoid(eta), dtype=np.float64)
            diff = w_arr * (p_hat - y_arr)
            grad_a = float(np.sum(diff) + lam * (a_val - a0))
            grad_b = float(np.sum(diff * z_arr) + lam * (b_val - b0))
            return nll + ridge, np.array([grad_a, grad_b], dtype=np.float64)

        opt = minimize(
            _obj_and_grad,
            x0=np.array([a0, b0], dtype=np.float64),
            method="L-BFGS-B",
            jac=True,
            bounds=[(-10.0, 10.0), (self.b_min, self.b_max)],
            options={"ftol": 1e-12, "gtol": 1e-10, "maxiter": 500},
        )

        a_fit = float(opt.x[0])
        b_fit = float(np.clip(opt.x[1], self.b_min, self.b_max))
        if not (0.0 < b_fit <= 1.0):
            raise RuntimeError(f"Calibration slope violated (0, 1] monotonicity bound: {b_fit}")

        self.result_ = CalibrationFitResult(
            a_m=a_fit,
            b_m=b_fit,
            lambda_ridge=lam,
            a_0=a0,
            b_0=b0,
            n_samples=n,
            converged=bool(opt.success),
            penalized_nll=float(opt.fun),
        )
        return self.result_

    def predict_proba(
        self, p_raw: Union[float, Sequence[float], np.ndarray]
    ) -> Union[float, np.ndarray]:
        """Predict calibrated probability using fitted parameters (or prior if unfitted)."""
        if self.result_ is None:
            prior_state = CalibrationFitResult(
                a_m=self.a_0,
                b_m=self.b_0,
                lambda_ridge=self.lambda_ridge,
                a_0=self.a_0,
                b_0=self.b_0,
                n_samples=0,
                converged=True,
                penalized_nll=0.0,
            )
            return prior_state.predict_proba(p_raw)
        return self.result_.predict_proba(p_raw)


@dataclass(frozen=True)
class PushEVResult:
    """Explicit 3-class (Win / Loss / Push) Expected Value breakdown."""

    ev: float
    p_win_nonpush: float
    p_push: float
    p_win_unconditional: float
    p_loss_unconditional: float
    decimal_odds: float
    breakeven_win_nonpush: float


def american_to_decimal_odds(american_odds: int | float) -> float:
    """Convert American odds (e.g., -110, +125) to decimal odds O_dec > 1.0."""
    odds = float(american_odds)
    if not math.isfinite(odds) or abs(odds) < 100.0:
        raise ValueError(
            f"American odds must be finite with |odds| >= 100, got {american_odds!r}."
        )
    if odds > 0:
        return 1.0 + (odds / 100.0)
    return 1.0 + (100.0 / abs(odds))


def compute_three_class_push_ev(
    p_win_nonpush: float,
    p_push: float,
    o_dec: float,
) -> PushEVResult:
    """Compute exact 3-class Push EV per unit risked.

    Formula:
        EV = p_win_nonpush * (1 - p_push) * (O_dec - 1) - (1 - p_win_nonpush) * (1 - p_push)
    """
    for name, val in (("p_win_nonpush", p_win_nonpush), ("p_push", p_push)):
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            raise ValueError(f"{name} must be numeric, got {val!r}.")
        fval = float(val)
        if not math.isfinite(fval) or not (0.0 <= fval <= 1.0):
            raise ValueError(f"{name} must lie in [0.0, 1.0], got {val!r}.")

    if isinstance(o_dec, bool) or not isinstance(o_dec, (int, float)):
        raise ValueError(f"o_dec must be numeric > 1.0, got {o_dec!r}.")
    dec_odds = float(o_dec)
    if not math.isfinite(dec_odds) or dec_odds <= 1.0:
        raise ValueError(f"Decimal odds o_dec must be strictly > 1.0, got {o_dec!r}.")

    pw_np = float(p_win_nonpush)
    pp = float(p_push)
    non_push_mass = 1.0 - pp
    p_win_uncond = pw_np * non_push_mass
    p_loss_uncond = (1.0 - pw_np) * non_push_mass
    ev = p_win_uncond * (dec_odds - 1.0) - p_loss_uncond
    breakeven = 1.0 / dec_odds

    return PushEVResult(
        ev=ev,
        p_win_nonpush=pw_np,
        p_push=pp,
        p_win_unconditional=p_win_uncond,
        p_loss_unconditional=p_loss_uncond,
        decimal_odds=dec_odds,
        breakeven_win_nonpush=breakeven,
    )


def _to_epoch_seconds(timestamps: Sequence[TimestampLike] | np.ndarray) -> np.ndarray:
    """Normalize datetime / np.datetime64 / numeric epoch seconds into 1D float64 seconds."""
    arr = list(timestamps)
    if not arr:
        return np.empty(0, dtype=np.float64)
    out = np.empty(len(arr), dtype=np.float64)
    for idx, ts in enumerate(arr):
        if isinstance(ts, datetime):
            dt = ts if ts.tzinfo is not None else ts.replace(tzinfo=timezone.utc)
            out[idx] = dt.timestamp()
        elif isinstance(ts, np.datetime64):
            out[idx] = float(ts.astype("datetime64[ns]").astype(np.int64)) / 1e9
        elif isinstance(ts, (int, float, np.integer, np.floating)) and not isinstance(ts, bool):
            val = float(ts)
            if not math.isfinite(val):
                raise ValueError(f"Non-finite timestamp at index {idx}: {ts!r}")
            out[idx] = val
        else:
            raise TypeError(f"Unsupported timestamp type at index {idx}: {type(ts).__name__}")
    return out


class PurgedEmbargoedChronologicalSplitter:
    """7-day purged and embargoed chronological Out-Of-Fold (OOF) cross-validator.

    Supports two leakage-free regimes:
      - ``causal_past_only=True`` (default): Strictly chronological expanding-window OOF
        where test fold ``k`` only trains on strictly historical samples satisfying
        ``t_train < min(t_test) - purge_window`` (zero future lookahead + 7-day purge gap).
      - ``causal_past_only=False``: Purged & embargoed chronological K-Fold (Lopez de Prado)
        excluding both ``[min(t_test) - purge_window, min(t_test))`` before the test fold
        and ``(max(t_test), max(t_test) + embargo_window]`` after the test fold.
    """

    def __init__(
        self,
        n_splits: int = 5,
        purge_days: float = DEFAULT_PURGE_DAYS,
        embargo_days: float = DEFAULT_EMBARGO_DAYS,
        causal_past_only: bool = True,
        min_train_size: int = 1,
    ) -> None:
        if n_splits < 2:
            raise ValueError(f"n_splits must be >= 2, got {n_splits}.")
        if purge_days < 0.0 or embargo_days < 0.0:
            raise ValueError("purge_days and embargo_days must be non-negative.")
        if min_train_size < 1:
            raise ValueError("min_train_size must be >= 1.")
        self.n_splits = int(n_splits)
        self.purge_days = float(purge_days)
        self.embargo_days = float(embargo_days)
        self.causal_past_only = bool(causal_past_only)
        self.min_train_size = int(min_train_size)

    def split(
        self, timestamps: Sequence[TimestampLike] | np.ndarray
    ) -> Iterator[Tuple[np.ndarray, np.ndarray]]:
        """Yield ``(train_indices, test_indices)`` respecting 7-day purge and embargo horizons."""
        epoch_sec = _to_epoch_seconds(timestamps)
        n = epoch_sec.shape[0]
        if n < self.n_splits + 1:
            raise ValueError(
                f"Need at least {self.n_splits + 1} observations to form {self.n_splits} chronological folds."
            )

        order = np.argsort(epoch_sec, kind="mergesort")
        purge_sec = self.purge_days * SECONDS_PER_DAY
        embargo_sec = self.embargo_days * SECONDS_PER_DAY

        if self.causal_past_only:
            # Partition sorted indices into (n_splits + 1) contiguous chronological blocks;
            # block 0 seeds initial history and blocks 1..n_splits serve as OOF test folds.
            blocks = np.array_split(order, self.n_splits + 1)
            for fold_idx in range(1, len(blocks)):
                test_idx = blocks[fold_idx]
                if test_idx.size == 0:
                    continue
                t_test_start = float(np.min(epoch_sec[test_idx]))
                cutoff = t_test_start - purge_sec
                prior_candidates = np.concatenate(blocks[:fold_idx])
                train_idx = prior_candidates[epoch_sec[prior_candidates] < cutoff]
                if train_idx.size >= self.min_train_size:
                    yield train_idx, test_idx
        else:
            blocks = np.array_split(order, self.n_splits)
            for fold_idx, test_idx in enumerate(blocks):
                if test_idx.size == 0:
                    continue
                t_test_start = float(np.min(epoch_sec[test_idx]))
                t_test_end = float(np.max(epoch_sec[test_idx]))
                other_blocks = [
                    blocks[j] for j in range(len(blocks)) if j != fold_idx and blocks[j].size > 0
                ]
                if not other_blocks:
                    continue
                candidates = np.concatenate(other_blocks)
                cand_ts = epoch_sec[candidates]
                keep_mask = (cand_ts < (t_test_start - purge_sec)) | (
                    cand_ts > (t_test_end + embargo_sec)
                )
                train_idx = candidates[keep_mask]
                if train_idx.size >= self.min_train_size:
                    yield train_idx, test_idx


def generate_purged_oof_calibrated_probs(
    p_raw: Sequence[float] | np.ndarray,
    y_true: Sequence[int | float] | np.ndarray,
    timestamps: Sequence[TimestampLike] | np.ndarray,
    *,
    n_splits: int = 5,
    purge_days: float = DEFAULT_PURGE_DAYS,
    embargo_days: float = DEFAULT_EMBARGO_DAYS,
    lambda_ridge: float = HIERARCHICAL_RIDGE_LAMBDA,
    a_0: float = PRIOR_INTERCEPT_A0,
    b_0: float = PRIOR_SLOPE_B0,
) -> Tuple[np.ndarray, np.ndarray]:
    """Produce strictly purged chronological OOF calibrated probabilities.

    Warm-up observations without sufficient prior history (> 7 days before fold start)
    receive exact prior shrinkage predictions ``(a_0 = -0.22, b_0 = 0.78)`` and are
    marked ``False`` in the returned ``has_fitted_oof_mask``.
    """
    p_arr = np.asarray(p_raw, dtype=np.float64)
    y_arr = np.asarray(y_true, dtype=np.float64)
    splitter = PurgedEmbargoedChronologicalSplitter(
        n_splits=n_splits,
        purge_days=purge_days,
        embargo_days=embargo_days,
        causal_past_only=True,
        min_train_size=1,
    )
    prior_cal = LogitTempCalibrator(lambda_ridge=lambda_ridge, a_0=a_0, b_0=b_0)
    oof_preds = np.asarray(prior_cal.predict_proba(p_arr), dtype=np.float64)
    fitted_mask = np.zeros(p_arr.shape[0], dtype=bool)

    for train_idx, test_idx in splitter.split(timestamps):
        fold_cal = LogitTempCalibrator(lambda_ridge=lambda_ridge, a_0=a_0, b_0=b_0)
        fold_cal.fit(p_arr[train_idx], y_arr[train_idx])
        oof_preds[test_idx] = np.asarray(
            fold_cal.predict_proba(p_arr[test_idx]), dtype=np.float64
        )
        fitted_mask[test_idx] = True

    return oof_preds, fitted_mask


@dataclass(frozen=True)
class BarberConformalDecision:
    """Result of the Barber et al. (2023) non-exchangeable conformal LCB abstention gate."""

    p_calibrated: float
    p_lcb: float
    q_devig: float
    lcb_edge: float
    min_required_edge: float
    conformal_radius: float
    effective_sample_weight: float
    gate_passed: bool
    abstention_reason: Optional[str]


def devig_two_way_decimal_odds(odds_side: float, odds_counter: float) -> float:
    """Multiplicative two-way market devig returning fair market implied probability q_devig."""
    if odds_side <= 1.0 or odds_counter <= 1.0:
        raise ValueError("Both two-way decimal odds must be strictly > 1.0.")
    imp_side = 1.0 / float(odds_side)
    imp_counter = 1.0 / float(odds_counter)
    return imp_side / (imp_side + imp_counter)


def barber_conformal_abstention_gate(
    p_calibrated: float,
    q_devig: float,
    calibration_residuals: Sequence[float] | np.ndarray,
    *,
    alpha: float = 0.10,
    decay_rho: float = 0.99,
    min_lcb_edge: float = MIN_CONFORMAL_LCB_EDGE,
    weights: Optional[Sequence[float] | np.ndarray] = None,
) -> BarberConformalDecision:
    """Non-exchangeable weighted conformal LCB gate (Barber, Candes, Ramdas, & Tibshirani, 2023).

    Given chronological OOF calibration overprediction residuals
    ``r_b = mean(p_cal_b) - mean(y_b)`` ordered oldest -> newest with recency weights
    ``w_b = decay_rho**(B - b) in [0, 1]`` and test point weight ``w_{B+1} = 1``:

        w_tilde_b = w_b / (sum_{j=1}^B w_j + 1)
        q_{1-alpha} = inf { q : sum_{b=1}^B w_tilde_b * 1{r_b <= q} >= 1 - alpha }
        p_LCB = clip(p_calibrated - max(0.0, q_{1-alpha}), 0.0, 1.0)

    Gate passes iff ``p_LCB - q_devig >= 0.015``. If total historical weight is too small
    to achieve ``1 - alpha`` coverage, ``q_{1-alpha} = +inf`` -> ``p_LCB = 0.0`` -> ABSTAIN.
    """
    if not math.isfinite(p_calibrated) or not (0.0 <= p_calibrated <= 1.0):
        raise ValueError(f"p_calibrated must lie in [0.0, 1.0], got {p_calibrated!r}.")
    if not math.isfinite(q_devig) or not (0.0 < q_devig < 1.0):
        raise ValueError(f"q_devig must lie in (0.0, 1.0), got {q_devig!r}.")
    if not (0.0 < alpha < 1.0):
        raise ValueError(f"alpha must lie in (0.0, 1.0), got {alpha!r}.")
    if not (0.0 < decay_rho <= 1.0):
        raise ValueError(f"decay_rho must lie in (0.0, 1.0], got {decay_rho!r}.")

    res_arr = np.asarray(calibration_residuals, dtype=np.float64)
    if res_arr.ndim != 1 or np.any(~np.isfinite(res_arr)):
        raise ValueError("calibration_residuals must be a 1D array of finite floats.")

    b_count = res_arr.shape[0]
    if b_count == 0:
        edge = 0.0 - float(q_devig)
        return BarberConformalDecision(
            p_calibrated=float(p_calibrated),
            p_lcb=0.0,
            q_devig=float(q_devig),
            lcb_edge=edge,
            min_required_edge=float(min_lcb_edge),
            conformal_radius=float("inf"),
            effective_sample_weight=0.0,
            gate_passed=False,
            abstention_reason="INSUFFICIENT_CONFORMAL_HISTORY",
        )

    if weights is None:
        # Chronological oldest (index 0) -> newest (index B-1), w_b in (0, 1] per Barber et al. (2023)
        exponents = np.arange(b_count - 1, -1, -1, dtype=np.float64)
        w_arr = np.power(float(decay_rho), exponents)
    else:
        w_arr = np.asarray(weights, dtype=np.float64)
        if (
            w_arr.shape != (b_count,)
            or np.any(~np.isfinite(w_arr))
            or np.any((w_arr < 0.0) | (w_arr > 1.0))
        ):
            raise ValueError("Custom Barber conformal weights must lie in [0.0, 1.0].")

    total_hist_weight = float(np.sum(w_arr))
    denom = total_hist_weight + 1.0  # +1.0 mass at +infinity for the test point (n+1)
    target_mass = 1.0 - float(alpha)

    if (total_hist_weight / denom) < target_mass:
        edge = 0.0 - float(q_devig)
        return BarberConformalDecision(
            p_calibrated=float(p_calibrated),
            p_lcb=0.0,
            q_devig=float(q_devig),
            lcb_edge=edge,
            min_required_edge=float(min_lcb_edge),
            conformal_radius=float("inf"),
            effective_sample_weight=total_hist_weight,
            gate_passed=False,
            abstention_reason="INSUFFICIENT_CONFORMAL_HISTORY",
        )

    sort_idx = np.argsort(res_arr, kind="mergesort")
    sorted_res = res_arr[sort_idx]
    sorted_w = w_arr[sort_idx] / denom
    cum_w = np.cumsum(sorted_w)

    hit_indices = np.flatnonzero(cum_w >= target_mass - 1e-12)
    q_hat = float(sorted_res[int(hit_indices[0])])
    radius = max(0.0, q_hat)
    p_lcb = float(np.clip(float(p_calibrated) - radius, 0.0, 1.0))
    lcb_edge = p_lcb - float(q_devig)
    passed = bool(lcb_edge >= float(min_lcb_edge))

    return BarberConformalDecision(
        p_calibrated=float(p_calibrated),
        p_lcb=p_lcb,
        q_devig=float(q_devig),
        lcb_edge=lcb_edge,
        min_required_edge=float(min_lcb_edge),
        conformal_radius=radius,
        effective_sample_weight=total_hist_weight,
        gate_passed=passed,
        abstention_reason=None if passed else "BARBER_LCB_EDGE_BELOW_150BPS",
    )


def compute_rolling_oof_calibration_residuals(
    oof_probs: Sequence[float] | np.ndarray,
    oof_outcomes: Sequence[int | float] | np.ndarray,
    *,
    window_size: int = 25,
) -> np.ndarray:
    """Partition chronological OOF predictions into blocks and compute r_b = mean(p_cal) - mean(y)."""
    p_arr = np.asarray(oof_probs, dtype=np.float64)
    y_arr = np.asarray(oof_outcomes, dtype=np.float64)
    if p_arr.ndim != 1 or y_arr.ndim != 1 or p_arr.shape[0] != y_arr.shape[0]:
        raise ValueError("oof_probs and oof_outcomes must be 1D arrays of equal length.")
    if window_size < 1:
        raise ValueError("window_size must be >= 1.")
    n = p_arr.shape[0]
    if n < window_size:
        return np.empty(0, dtype=np.float64)

    n_blocks = n // window_size
    trimmed = n_blocks * window_size
    p_blocks = p_arr[:trimmed].reshape(n_blocks, window_size)
    y_blocks = y_arr[:trimmed].reshape(n_blocks, window_size)
    return np.mean(p_blocks - y_blocks, axis=1)


@dataclass(frozen=True)
class PlaceboVerificationResult:
    """Summary of the 100-permutation shuffled-time CLV placebo nullity test."""

    n_permutations: int
    mean_placebo_clv: float
    abs_mean_placebo_clv: float
    std_placebo_clv: float
    max_allowed_abs_mean_clv: float
    per_run_mean_clvs: Tuple[float, ...]
    passed: bool


def verify_shuffled_time_placebo_clv(
    signal_scores: Sequence[float] | np.ndarray,
    closing_line_deltas: Sequence[float] | np.ndarray,
    *,
    n_permutations: int = 100,
    max_abs_mean_clv: float = MAX_PLACEBO_ABS_MEAN_CLV,
    selection_threshold: float = 0.0,
    seed: int = 20261113,
    custom_evaluator: Optional[
        Callable[[np.ndarray, np.ndarray, np.random.Generator], float]
    ] = None,
) -> PlaceboVerificationResult:
    """Run a 100-permutation shuffled-time placebo check verifying ``|mean placebo CLV| <= 0.005``.

    In each permutation ``r = 1..100``, temporal alignment between pre-game signals and
    future closing-line movements (``q_close_devig - q_open_devig``) is destroyed by
    randomly permuting the time index. A leakage-free, zero-bias pipeline must yield
    expected placebo CLV centered at ``0.0`` within ``[-0.005, +0.005]``.
    """
    if n_permutations < 100:
        raise ValueError(
            f"Master plan placebo gate requires at least 100 permutations, got {n_permutations}."
        )
    sig_arr = np.asarray(signal_scores, dtype=np.float64)
    clv_arr = np.asarray(closing_line_deltas, dtype=np.float64)
    if sig_arr.ndim != 1 or clv_arr.ndim != 1 or sig_arr.shape[0] != clv_arr.shape[0]:
        raise ValueError("signal_scores and closing_line_deltas must be equal-length 1D arrays.")
    if sig_arr.shape[0] < 2:
        raise ValueError("At least 2 observations are required for permutation testing.")
    if np.any(~np.isfinite(sig_arr)) or np.any(~np.isfinite(clv_arr)):
        raise ValueError("signal_scores and closing_line_deltas must be finite.")

    rng = np.random.default_rng(seed)
    run_means: List[float] = []

    for _ in range(n_permutations):
        perm_clv = rng.permutation(clv_arr)
        if custom_evaluator is not None:
            run_clv = float(custom_evaluator(sig_arr, perm_clv, rng))
        else:
            # Orient signed bets by signal polarity where |signal| > selection_threshold
            active_mask = np.abs(sig_arr) > float(selection_threshold)
            if not np.any(active_mask):
                run_clv = 0.0
            else:
                directions = np.sign(sig_arr[active_mask])
                # Demean market drift symmetry: side +1 earns +delta, side -1 earns -delta
                run_clv = float(np.mean(directions * perm_clv[active_mask]))
        run_means.append(run_clv)

    runs_np = np.asarray(run_means, dtype=np.float64)
    mean_clv = float(np.mean(runs_np))
    abs_mean = abs(mean_clv)
    std_clv = float(np.std(runs_np, ddof=1)) if n_permutations > 1 else 0.0
    passed = bool(abs_mean <= float(max_abs_mean_clv))

    return PlaceboVerificationResult(
        n_permutations=int(n_permutations),
        mean_placebo_clv=mean_clv,
        abs_mean_placebo_clv=abs_mean,
        std_placebo_clv=std_clv,
        max_allowed_abs_mean_clv=float(max_abs_mean_clv),
        per_run_mean_clvs=tuple(run_means),
        passed=passed,
    )
