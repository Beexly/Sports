"""
sports_calibration_engine.py
Frontier Sports Calibration, Murphy Brier Decomposition, and Conformal Kelly Engine.
Implements:
1. Exact Murphy (1973) 3-Component Brier Score Decomposition (Reliability, Resolution, Uncertainty, Within-Bin Variance).
2. Expected Calibration Error (ECE) and Maximum Calibration Error (MCE) with fail-closed bounds checking.
3. Conformal Kelly Allocation with Uncertainty Half-Width Lower Bounds for Bankroll Protection.
4. Non-parametric Monotonic Isotonic Regression (PAVA) and Parametric Platt Scaling Calibrators.
"""
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

@dataclass
class MurphyBrierResult:
    brier_score: float
    brier_score_binned: float
    reliability: float
    resolution: float
    uncertainty: float
    within_bin_var: float
    within_bin_cov: float
    decomposition_error: float # abs(brier - (reliability - resolution + uncertainty + within_bin_var - 2*within_bin_cov))
    binned_decomposition_error: float # abs(brier_score_binned - (reliability - resolution + uncertainty))
    n_samples: int
    n_bins: int
    bin_counts: List[int]
    bin_pred_means: List[float]
    bin_outcome_means: List[float]

@dataclass
class CalibrationErrorResult:
    ece: float
    mce: float
    n_samples: int
    n_bins: int
    bin_edges: List[float]
    bin_counts: List[int]
    bin_pred_means: List[float]
    bin_outcome_means: List[float]

@dataclass
class ConformalKellyResult:
    allocated_fraction: float
    unconstrained_fraction: float
    p_lower: float
    p_est: float
    half_width: float
    decimal_odds: float
    net_edge: float
    is_positive_edge: bool
    reason: str

class SportsCalibrationEngine:
    """
    Mathematical calibration suite for quantitative sports betting & probabilistic forecasts.
    """

    @staticmethod
    def calculate_murphy_brier(
        predictions: Union[List[float], np.ndarray],
        outcomes: Union[List[int], np.ndarray],
        n_bins: int = 10
    ) -> MurphyBrierResult:
        """
        Calculates Murphy (1973) Brier score decomposition:
        Continuous identity:
          BS = Reliability - Resolution + Uncertainty + WithinBinVar - 2 * WithinBinCov
        Binned identity:
          BS_binned = Reliability - Resolution + Uncertainty

        Reliability: sum_k (n_k / N) * (f_bar_k - o_bar_k)^2 (lower is better, 0 is perfect)
        Resolution:  sum_k (n_k / N) * (o_bar_k - o_bar)^2   (higher is better, discriminative power)
        Uncertainty: o_bar * (1 - o_bar)                     (inherent variance of base rate)
        """
        preds = np.asarray(predictions, dtype=np.float64)
        acts = np.asarray(outcomes, dtype=np.float64)

        if preds.shape[0] != acts.shape[0]:
            raise ValueError(f"Shape mismatch: predictions {preds.shape[0]} vs outcomes {acts.shape[0]}")
        if preds.shape[0] == 0:
            raise ValueError("Cannot compute Brier decomposition on empty dataset")
        if np.any(preds < 0.0) or np.any(preds > 1.0):
            raise ValueError("All predictions must be in the closed interval [0, 1]")
        if not np.all(np.isin(acts, [0.0, 1.0])):
            raise ValueError("All outcomes must be strictly binary {0, 1}")

        N = preds.shape[0]
        o_bar = float(np.mean(acts))
        brier_score = float(np.mean((preds - acts) ** 2))
        uncertainty = float(o_bar * (1.0 - o_bar))

        bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
        bin_indices = np.digitize(preds, bin_edges) - 1
        bin_indices = np.clip(bin_indices, 0, n_bins - 1)

        reliability = 0.0
        resolution = 0.0
        within_bin_var = 0.0
        within_bin_cov = 0.0
        brier_score_binned = 0.0

        bin_counts = []
        bin_pred_means = []
        bin_outcome_means = []

        for k in range(n_bins):
            mask = (bin_indices == k)
            n_k = int(np.sum(mask))
            bin_counts.append(n_k)

            if n_k > 0:
                f_bar_k = float(np.mean(preds[mask]))
                o_bar_k = float(np.mean(acts[mask]))
                bin_pred_means.append(f_bar_k)
                bin_outcome_means.append(o_bar_k)

                weight = n_k / N
                reliability += weight * ((f_bar_k - o_bar_k) ** 2)
                resolution += weight * ((o_bar_k - o_bar) ** 2)
                within_bin_var += float(np.sum((preds[mask] - f_bar_k) ** 2)) / N
                within_bin_cov += float(np.sum((preds[mask] - f_bar_k) * (acts[mask] - o_bar_k))) / N
                brier_score_binned += float(np.sum((f_bar_k - acts[mask]) ** 2)) / N
            else:
                bin_pred_means.append(float(0.5 * (bin_edges[k] + bin_edges[k+1])))
                bin_outcome_means.append(0.0)

        decomp_total = reliability - resolution + uncertainty + within_bin_var - 2.0 * within_bin_cov
        decomp_error = float(abs(brier_score - decomp_total))
        binned_decomp_error = float(abs(brier_score_binned - (reliability - resolution + uncertainty)))

        return MurphyBrierResult(
            brier_score=brier_score,
            brier_score_binned=brier_score_binned,
            reliability=reliability,
            resolution=resolution,
            uncertainty=uncertainty,
            within_bin_var=within_bin_var,
            within_bin_cov=within_bin_cov,
            decomposition_error=decomp_error,
            binned_decomposition_error=binned_decomp_error,
            n_samples=N,
            n_bins=n_bins,
            bin_counts=bin_counts,
            bin_pred_means=bin_pred_means,
            bin_outcome_means=bin_outcome_means
        )

    @staticmethod
    def calculate_calibration_error(
        predictions: Union[List[float], np.ndarray],
        outcomes: Union[List[int], np.ndarray],
        n_bins: int = 10
    ) -> CalibrationErrorResult:
        """
        Computes Expected Calibration Error (ECE) and Maximum Calibration Error (MCE)
        with equal-width binning on [0, 1].
        """
        preds = np.asarray(predictions, dtype=np.float64)
        acts = np.asarray(outcomes, dtype=np.float64)

        if preds.shape[0] != acts.shape[0]:
            raise ValueError(f"Shape mismatch: {preds.shape[0]} vs {acts.shape[0]}")
        if preds.shape[0] == 0:
            raise ValueError("Empty predictions/outcomes array")

        N = preds.shape[0]
        bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
        bin_indices = np.digitize(preds, bin_edges) - 1
        bin_indices = np.clip(bin_indices, 0, n_bins - 1)

        ece = 0.0
        mce = 0.0
        bin_counts = []
        bin_pred_means = []
        bin_outcome_means = []

        for k in range(n_bins):
            mask = (bin_indices == k)
            n_k = int(np.sum(mask))
            bin_counts.append(n_k)

            if n_k > 0:
                f_bar_k = float(np.mean(preds[mask]))
                o_bar_k = float(np.mean(acts[mask]))
                bin_pred_means.append(f_bar_k)
                bin_outcome_means.append(o_bar_k)

                gap = abs(f_bar_k - o_bar_k)
                ece += (n_k / N) * gap
                if gap > mce:
                    mce = gap
            else:
                bin_pred_means.append(float(0.5 * (bin_edges[k] + bin_edges[k+1])))
                bin_outcome_means.append(0.0)

        return CalibrationErrorResult(
            ece=float(ece),
            mce=float(mce),
            n_samples=N,
            n_bins=n_bins,
            bin_edges=bin_edges.tolist(),
            bin_counts=bin_counts,
            bin_pred_means=bin_pred_means,
            bin_outcome_means=bin_outcome_means
        )

    @staticmethod
    def conformal_kelly_fraction(
        p_est: float,
        decimal_odds: float,
        half_width: float = 0.0,
        fraction_multiplier: float = 0.5,
        max_fraction: float = 0.05,
        min_edge: float = 0.01
    ) -> ConformalKellyResult:
        """
        Calculates risk-controlled Conformal Kelly capital allocation:
        1. Shrinks probability by conformal uncertainty: p_lower = max(0.0, p_est - half_width)
        2. Computes net edge: edge = p_lower * decimal_odds - 1.0
        3. If edge < min_edge, allocates 0.0 (fail-safe capital preservation)
        4. Bounds allocation by fraction_multiplier (e.g. 0.5 for Half-Kelly) and max_fraction.
        """
        if decimal_odds <= 1.0:
            return ConformalKellyResult(
                allocated_fraction=0.0,
                unconstrained_fraction=0.0,
                p_lower=max(0.0, p_est - half_width),
                p_est=p_est,
                half_width=half_width,
                decimal_odds=decimal_odds,
                net_edge=-1.0,
                is_positive_edge=False,
                reason="Invalid decimal odds (<= 1.0)"
            )

        p_lower = float(max(0.0, min(1.0, p_est - half_width)))
        b_net = decimal_odds - 1.0
        q_lower = 1.0 - p_lower

        net_edge = p_lower * decimal_odds - 1.0

        if net_edge < min_edge or p_lower <= 0.0:
            return ConformalKellyResult(
                allocated_fraction=0.0,
                unconstrained_fraction=0.0,
                p_lower=p_lower,
                p_est=p_est,
                half_width=half_width,
                decimal_odds=decimal_odds,
                net_edge=net_edge,
                is_positive_edge=False,
                reason=f"Insufficient net edge ({net_edge:.4f} < {min_edge:.4f})"
            )

        # Standard unconstrained Kelly: f* = (b_net * p - q) / b_net = p - q / b_net
        f_raw = (b_net * p_lower - q_lower) / b_net
        f_unconstrained = float(max(0.0, f_raw))

        # Apply fraction multiplier (half-Kelly / quarter-Kelly) and portfolio cap
        f_scaled = f_unconstrained * fraction_multiplier
        f_allocated = float(min(max_fraction, f_scaled))

        return ConformalKellyResult(
            allocated_fraction=f_allocated,
            unconstrained_fraction=f_unconstrained,
            p_lower=p_lower,
            p_est=p_est,
            half_width=half_width,
            decimal_odds=decimal_odds,
            net_edge=net_edge,
            is_positive_edge=True,
            reason="Positive edge verified under conformal bound"
        )

class PoolAdjacentViolatorsCalibrator:
    """
    Non-parametric Monotonic Isotonic Regression via canonical Pool Adjacent Violators Algorithm (PAVA).
    Guarantees monotonicity without imposing parametric form.
    """
    def __init__(self):
        self.x_thresholds: Optional[np.ndarray] = None
        self.y_calibrated: Optional[np.ndarray] = None

    def fit(self, x: Union[List[float], np.ndarray], y: Union[List[int], np.ndarray]) -> "PoolAdjacentViolatorsCalibrator":
        x_arr = np.asarray(x, dtype=np.float64)
        y_arr = np.asarray(y, dtype=np.float64)

        sort_idx = np.argsort(x_arr)
        x_sorted = x_arr[sort_idx]
        y_sorted = y_arr[sort_idx]

        # PAVA block representation: (sum_y, count, x_max)
        blocks = [[float(y_sorted[i]), 1.0, float(x_sorted[i])] for i in range(len(y_sorted))]
        
        i = 0
        while i < len(blocks) - 1:
            mean_curr = blocks[i][0] / blocks[i][1]
            mean_next = blocks[i+1][0] / blocks[i+1][1]
            if mean_curr > mean_next:
                # Merge blocks
                blocks[i][0] += blocks[i+1][0]
                blocks[i][1] += blocks[i+1][1]
                blocks[i][2] = blocks[i+1][2] # Update max x
                del blocks[i+1]
                if i > 0:
                    i -= 1 # Step back to verify monotonicity
            else:
                i += 1

        self.x_thresholds = np.array([b[2] for b in blocks])
        self.y_calibrated = np.array([b[0] / b[1] for b in blocks])
        return self

    def predict(self, x: Union[List[float], np.ndarray]) -> np.ndarray:
        if self.x_thresholds is None or self.y_calibrated is None:
            raise RuntimeError("Calibrator is not fitted yet.")
        x_arr = np.asarray(x, dtype=np.float64)
        # Interpolate monotonically
        idx = np.searchsorted(self.x_thresholds, x_arr, side="left")
        idx = np.clip(idx, 0, len(self.y_calibrated) - 1)
        return self.y_calibrated[idx]

class PlattScalingCalibrator:
    """
    Parametric Platt Scaling (logistic calibration) mapping raw decision scores/logits to calibrated probabilities.
    P(Y=1 | z) = 1 / (1 + exp(-(a * z + b)))
    Fits parameters (a, b) via Newton-Raphson maximum likelihood.
    """
    def __init__(self, max_iter: int = 50, tol: float = 1e-6):
        self.a: float = 1.0
        self.b: float = 0.0
        self.max_iter = max_iter
        self.tol = tol

    def fit(self, logits: Union[List[float], np.ndarray], y: Union[List[int], np.ndarray]) -> "PlattScalingCalibrator":
        z = np.asarray(logits, dtype=np.float64)
        t = np.asarray(y, dtype=np.float64)

        # Target smoothing to prevent overfitting on boundary values (Platt 1999)
        n_pos = np.sum(t == 1.0)
        n_neg = np.sum(t == 0.0)
        t_smooth = np.where(t == 1.0, (n_pos + 1.0) / (n_pos + 2.0), 1.0 / (n_neg + 2.0))

        # Initial parameter estimates
        a = 1.0
        b = 0.0

        for _ in range(self.max_iter):
            # Compute probabilities
            val = a * z + b
            # Safe sigmoid
            p = 1.0 / (1.0 + np.exp(-np.clip(val, -30.0, 30.0)))
            w = p * (1.0 - p)
            w = np.maximum(w, 1e-12)

            grad_a = np.sum(z * (t_smooth - p))
            grad_b = np.sum(t_smooth - p)

            h_aa = -np.sum((z ** 2) * w)
            h_bb = -np.sum(w)
            h_ab = -np.sum(z * w)

            det = h_aa * h_bb - (h_ab ** 2)
            if abs(det) < 1e-12:
                break

            inv_aa = h_bb / det
            inv_bb = h_aa / det
            inv_ab = -h_ab / det

            delta_a = -(inv_aa * grad_a + inv_ab * grad_b)
            delta_b = -(inv_ab * grad_a + inv_bb * grad_b)

            a += delta_a
            b += delta_b

            if abs(delta_a) < self.tol and abs(delta_b) < self.tol:
                break

        self.a = float(a)
        self.b = float(b)
        return self

    def predict(self, logits: Union[List[float], np.ndarray]) -> np.ndarray:
        z = np.asarray(logits, dtype=np.float64)
        val = self.a * z + self.b
        return 1.0 / (1.0 + np.exp(-np.clip(val, -30.0, 30.0)))
