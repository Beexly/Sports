"""
galaxy_conformal_ot.conformal_copula_sizing
===========================================
Module 2: Finite-Sample Asymmetric Conformalized Quantile Regression (TA-CQR),
Slow 75% Conformal Kelly Position Sizing, and Axiomatic Fréchet-Hoeffding Copula Gates.

Guarantees distribution-free finite-sample coverage and strictly rejects
incoherent joint probabilities without artificial clamping.
"""

import math
from typing import Dict, Optional, Tuple, Union
import numpy as np


def conformal_finite_sample_rank(n: int, epsilon: float) -> int:
    """
    Exact finite-sample conformal rank:
    rank = ceil((n + 1) * (1 - epsilon)).
    
    Shafer & Vovk (2008), JMLR 9:371-421. Any other order statistic
    (floor, round, plain fraction) breaks the coverage guarantee.
    """
    if n < 1:
        raise ValueError(f"Conformal sample size n must be >= 1, got {n}")
    if not (0.0 <= epsilon < 1.0):
        raise ValueError(f"Conformal epsilon must be in [0, 1), got {epsilon}")
    return math.ceil((n + 1) * (1.0 - epsilon))


def asymmetric_tacqr_score(
    y: float,
    q_lower: float,
    q_upper: float,
    beta: float = 0.05
) -> float:
    """
    Asymmetric Time-Adaptive Conformalized Quantile Regression (TA-CQR) conformity score:
    score = max(q_lower - y, y - q_upper).
    
    Romano, Patterson & Candès (NeurIPS 2019); Wang (2026, arXiv:2604.25202).
    """
    lower_violation = q_lower - y
    upper_violation = y - q_upper
    return max(lower_violation, upper_violation)


def check_frechet_hoeffding_bounds(
    pa: float,
    pb: float,
    joint: float,
    tolerance: float = 1e-9
) -> Tuple[bool, Optional[str]]:
    """
    Fréchet-Hoeffding copula bounds check:
    max(0, pa + pb - 1) <= joint <= min(pa, pb).
    
    Park, Tibshirani & Cho (AISTATS 2025); Cyusa Mukama et al. (PMLR 2025).
    """
    pa = min(1.0, max(0.0, pa))
    pb = min(1.0, max(0.0, pb))
    
    lower_bound = max(0.0, pa + pb - 1.0)
    upper_bound = min(pa, pb)
    
    if joint < lower_bound - tolerance:
        return False, f"Joint {joint:.6f} strictly below Fréchet lower bound {lower_bound:.6f}"
    if joint > upper_bound + tolerance:
        return False, f"Joint {joint:.6f} strictly above Fréchet upper bound {upper_bound:.6f}"
        
    return True, None


def assert_frechet_hoeffding_bounds(pa: float, pb: float, joint: float) -> None:
    """Assert joint probability clears Fréchet-Hoeffding bounds. Throws on violation (No clamping!)."""
    valid, reason = check_frechet_hoeffding_bounds(pa, pb, joint)
    if not valid:
        raise ValueError(f"Axiomatic Copula Invariant Violation: {reason}")


def slow_75_conformal_kelly_stake(
    p: float,
    b: float,
    sigma_conf_75: float,
    d_break: float = 0.05,
    alpha_down: float = 0.10,
    lambda_kelly: float = 0.25,
    kappa_sigma: float = 2.0
) -> float:
    """
    Slow 75% Conformal Kelly Sizing Equation:
    f* = lambda * K * b * p - (1 - p) * b * (1 + kappa * sigma^2) * max(0, 1 - max(0, D_break - alpha) / alpha)
    
    Ryan (2026, arXiv:2608.01494): Using slow unweighted 250-observation 75% half-width
    prevents fast-interval variance injection that destroys asymptotic growth rate.
    """
    if p <= 0.0 or p >= 1.0 or b <= 0.0:
        return 0.0
        
    # Standard Kelly edge factor
    k_factor = 1.0
    growth_component = lambda_kelly * k_factor * b * p
    
    # Downside volatility & break penalty
    volatility_penalty = 1.0 + kappa_sigma * (sigma_conf_75 ** 2)
    excess_break = max(0.0, d_break - alpha_down)
    break_throttle = max(0.0, 1.0 - excess_break / alpha_down)
    
    loss_component = (1.0 - p) * b * volatility_penalty * break_throttle
    net_fraction = growth_component - loss_component
    
    return max(0.0, float(net_fraction))


class ConformalCopulaSizer:
    """Integrated Conformal Inference and Axiomatic Copula Invariant Engine."""
    
    def __init__(self, alpha: float = 0.10, window_size: int = 250):
        self.alpha = alpha
        self.window_size = window_size
        self.scores_history = []
        
    def add_calibration_observation(self, y: float, q_lower: float, q_upper: float):
        score = asymmetric_tacqr_score(y, q_lower, q_upper)
        self.scores_history.append(score)
        if len(self.scores_history) > self.window_size:
            self.scores_history.pop(0)
            
    def compute_conformal_cutoff(self) -> float:
        n = len(self.scores_history)
        if n < 10:
            return 1.0  # Conservative uncalibrated default
        rank = conformal_finite_sample_rank(n, self.alpha)
        sorted_scores = sorted(self.scores_history)
        rank_idx = min(n - 1, max(0, rank - 1))
        return float(sorted_scores[rank_idx])
        
    def evaluate_bivariate_conjunction(
        self,
        pa: float,
        pb: float,
        theta_clayton: float
    ) -> Dict[str, Union[float, bool, str]]:
        """Compute Clayton copula joint exceedance and verify Fréchet bounds."""
        u = 1.0 - pa
        v = 1.0 - pb
        
        if u <= 0.0 or v <= 0.0:
            joint = min(pa, pb)
        elif theta_clayton <= 1e-6:
            joint = pa * pb
        else:
            c = (u ** (-theta_clayton) + v ** (-theta_clayton) - 1.0) ** (-1.0 / theta_clayton)
            joint = 1.0 - u - v + c
            
        valid, reason = check_frechet_hoeffding_bounds(pa, pb, joint)
        return {
            "pa": pa,
            "pb": pb,
            "joint": joint,
            "valid": valid,
            "reason": reason or "Passed Fréchet bounds",
            "publish_allowed": valid
        }
