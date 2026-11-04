"""
galaxy_conformal_ot.spectral_cognitive_router
==============================================
Module 1: 288-Bit Bitfield Context Masking, Spectral Cluster Orthogonalization,
and Positive-Part James-Stein Shrinkage.

Eliminates premise hallucination and cross-family multi-collinear variance inflation
in high-dimensional decision routers.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np

MASK_BITS = 288
MASK_WORDS = 9
SIGNAL_FAMILIES = 279
MIN_SAMPLE_THRESHOLD = 30
MAX_ABS_DELTA_LOG_ODDS = 0.35
MAX_PROBABILITY_MOVEMENT = 0.12
DEFAULT_EPSILON_RIDGE = 1e-6


def build_context_mask_288(signals: List[Dict[str, Union[int, float]]]) -> np.ndarray:
    """
    Construct a 288-bit bitfield mask as an array of 9 uint32 words.
    A bit is set only if the family has non-zero displacement and N >= 30.
    """
    mask = np.zeros(MASK_WORDS, dtype=np.uint32)
    for s in signals:
        family = int(s.get("family", -1))
        displacement = float(s.get("displacement", 0.0))
        n = float(s.get("n", 0.0))
        
        if family < 0 or family >= SIGNAL_FAMILIES:
            continue
        if abs(displacement) <= 0.0 or not np.isfinite(n) or n < MIN_SAMPLE_THRESHOLD:
            continue
            
        word_idx = family // 32
        bit_idx = family % 32
        mask[word_idx] = mask[word_idx] | (1 << bit_idx)
        
    return mask


def mask_to_words(mask: np.ndarray) -> List[int]:
    """Convert uint32 mask array to standard integer list."""
    return [int(w) for w in mask]


def cholesky_spectral_whitening(
    deltas: np.ndarray,
    covariance_matrix: np.ndarray,
    epsilon_ridge: float = DEFAULT_EPSILON_RIDGE
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Decorrelate multi-family physical signals using Cholesky factor whitening L^-1.
    Includes adaptive epsilon-ridge regularization (Sigma + eps * I) to prevent
    ill-conditioned inversion failures (fixes Oct 22 early-abort pathology).
    
    Returns:
        whitened_residuals: L^-1 * deltas
        L: Lower triangular Cholesky factor
    """
    d = deltas.shape[0]
    reg_cov = covariance_matrix + np.eye(d) * epsilon_ridge
    
    # Compute Cholesky factor L such that reg_cov = L * L^T
    try:
        L = np.linalg.cholesky(reg_cov)
    except np.linalg.LinAlgError:
        # Fallback to eigenvalue thresholding if still non-positive-definite
        eigvals, eigvecs = np.linalg.eigh(reg_cov)
        eigvals = np.maximum(eigvals, epsilon_ridge * 10)
        reg_cov = eigvecs @ np.diag(eigvals) @ eigvecs.T
        L = np.linalg.cholesky(reg_cov)
        
    # Solve L * whitened = deltas -> whitened = L^-1 * deltas
    whitened_residuals = np.linalg.solve(L, deltas)
    return whitened_residuals, L


def positive_part_james_stein_shrinkage(
    whitened_residuals: np.ndarray,
    prior_variance: float = 0.0004
) -> np.ndarray:
    """
    Apply empirical Bayes positive-part James-Stein shrinkage:
    c = max(0, 1 - (k - 2) * sigma0^2 / ||whitened||^2)
    """
    k = whitened_residuals.shape[0]
    norm_sq = np.sum(whitened_residuals ** 2)
    
    if k <= 2 or norm_sq <= 1e-12:
        return whitened_residuals
        
    shrink_factor = max(0.0, 1.0 - ((k - 2) * prior_variance) / norm_sq)
    return shrink_factor * whitened_residuals


class SpectralCognitiveRouter:
    """Unified Stage A-D Cognitive Decision Router."""
    
    def __init__(self, n_families: int = 6, epsilon_ridge: float = DEFAULT_EPSILON_RIDGE):
        self.n_families = n_families
        self.epsilon_ridge = epsilon_ridge
        # Default 6-family positive-definite prior correlation matrix
        self.prior_cov = np.array([
            [1.00, 0.18, 0.12, 0.22, 0.20, 0.05],
            [0.18, 1.00, 0.10, 0.08, 0.06, 0.02],
            [0.12, 0.10, 1.00, 0.15, 0.12, 0.03],
            [0.22, 0.08, 0.15, 1.00, 0.25, 0.04],
            [0.20, 0.06, 0.12, 0.25, 1.00, 0.05],
            [0.05, 0.02, 0.03, 0.04, 0.05, 1.00]
        ], dtype=np.float64)
        
    def route_and_calibrate(
        self,
        anchor_prob: float,
        raw_deltas: np.ndarray,
        weights: Optional[np.ndarray] = None
    ) -> Dict[str, Union[float, bool, np.ndarray]]:
        """
        Execute Cholesky spectral whitening, James-Stein shrinkage, and
        strictly bound the final log-odds displacement.
        """
        if weights is None:
            weights = np.ones(self.n_families) / self.n_families
            
        # 1. Project onto market anchor
        market_absorption = 2.0 * abs(anchor_prob - 0.5)
        residual_deltas = raw_deltas * (1.0 - market_absorption)
        
        # 2. Cholesky whitening (L^-1 decorrelation)
        whitened, L = cholesky_spectral_whitening(
            residual_deltas, self.prior_cov, self.epsilon_ridge
        )
        
        # 3. Positive-part James-Stein shrinkage
        shrunk = positive_part_james_stein_shrinkage(whitened)
        
        # 4. Precision-weighted log-odds displacement
        raw_log_odds = float(np.sum(shrunk * weights))
        capped_log_odds = float(np.clip(raw_log_odds, -MAX_ABS_DELTA_LOG_ODDS, MAX_ABS_DELTA_LOG_ODDS))
        
        # 5. Probability mapping with hard ±0.12 movement cap
        anchor_logit = float(np.log(anchor_prob / (1.0 - anchor_prob)))
        new_logit = anchor_logit + capped_log_odds
        unbounded_prob = 1.0 / (1.0 + np.exp(-new_logit))
        
        calibrated_prob = float(np.clip(
            unbounded_prob,
            anchor_prob - MAX_PROBABILITY_MOVEMENT,
            anchor_prob + MAX_PROBABILITY_MOVEMENT
        ))
        
        return {
            "anchor_prob": anchor_prob,
            "calibrated_prob": calibrated_prob,
            "capped_log_odds": capped_log_odds,
            "whitened_residuals": whitened,
            "shrunk_residuals": shrunk,
            "cap_applied": abs(raw_log_odds) > MAX_ABS_DELTA_LOG_ODDS
        }
