"""
sports_scoring_rules.py
Strictly Proper Scoring Rules, Closing Line Value (CLV), and Market Shrinkage Auditor.
Implements:
1. Gneiting & Raftery (2007) strictly proper scoring rules:
   - Brier Score (bounded in [0, 1])
   - Logarithmic Score (with fail-closed essential pole bounds handling)
   - Spherical Score (bounded in [0, 1], robust to extreme tail events)
2. Murphy Decomposition Market Shrinkage Auditor:
   Verifies that shrinkage toward market lines does NOT degrade Resolution (discriminative power).
3. Closing Line Value (CLV) and Beat Rate Evaluator (enforcing CLV beat rate > 0.55).
"""
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

@dataclass
class ProperScoresResult:
    brier_score: float
    log_score: float
    spherical_score: float
    n_samples: int
    brier_loss: float
    mean_clv: Optional[float] = None
    clv_beat_rate: Optional[float] = None

@dataclass
class ShrinkageAuditResult:
    w: float
    raw_brier: float
    shrunk_brier: float
    raw_reliability: float
    shrunk_reliability: float
    raw_resolution: float
    shrunk_resolution: float
    resolution_retained: bool
    verdict: str

class SportsScoringRules:
    """
    Evaluator for strictly proper scoring rules and sharp market efficiency.
    """

    @staticmethod
    def calculate_strictly_proper_scores(
        predictions: Union[List[float], np.ndarray],
        outcomes: Union[List[int], np.ndarray],
        eps: float = 1e-15
    ) -> ProperScoresResult:
        """
        Computes Brier Score, Logarithmic Score, and Spherical Score under Gneiting & Raftery (2007).
        Enforces fail-closed handling on essential poles (p=0, p=1).
        """
        preds = np.asarray(predictions, dtype=np.float64)
        acts = np.asarray(outcomes, dtype=np.float64)

        if preds.shape[0] != acts.shape[0]:
            raise ValueError(f"Shape mismatch: {preds.shape[0]} vs {acts.shape[0]}")
        if preds.shape[0] == 0:
            raise ValueError("Cannot score empty dataset")
        if np.any(preds < 0.0) or np.any(preds > 1.0):
            raise ValueError("All predictions must be in [0, 1]")
        if not np.all(np.isin(acts, [0.0, 1.0])):
            raise ValueError("Outcomes must be binary in {0, 1}")

        N = preds.shape[0]

        # 1. Brier score (mean squared error)
        brier_score = float(np.mean((preds - acts) ** 2))

        # 2. Logarithmic score: S(p, y) = y*ln(p) + (1-y)*ln(1-p)
        # Essential poles: clipping at eps to guarantee fail-closed numerical stability
        p_safe = np.clip(preds, eps, 1.0 - eps)
        log_terms = acts * np.log(p_safe) + (1.0 - acts) * np.log(1.0 - p_safe)
        log_score = float(np.mean(log_terms)) # Typically negative (higher/closer to 0 is better)

        # 3. Spherical score: S(p, y) = (p*y + (1-p)*(1-y)) / sqrt(p^2 + (1-p)^2)
        norm = np.sqrt(preds ** 2 + (1.0 - preds) ** 2)
        numer = preds * acts + (1.0 - preds) * (1.0 - acts)
        spherical_terms = numer / norm
        spherical_score = float(np.mean(spherical_terms)) # In [0, 1], higher is better

        return ProperScoresResult(
            brier_score=brier_score,
            log_score=log_score,
            spherical_score=spherical_score,
            n_samples=N,
            brier_loss=brier_score
        )

    @staticmethod
    def audit_market_shrinkage(
        predictions: Union[List[float], np.ndarray],
        market_consensus: Union[List[float], np.ndarray],
        outcomes: Union[List[int], np.ndarray],
        w: float = 0.10,
        n_bins: int = 10
    ) -> ShrinkageAuditResult:
        """
        Audits whether shrinking predictions toward consensus lines:
          p_shrunk = (1 - w) * p_model + w * p_market
        artificially improves Brier error via Reliability gains while degrading Resolution.
        Rejects shrinkage (resolution_retained = False) if Resolution drops by more than 1%.
        """
        from sports.sports_calibration_engine import SportsCalibrationEngine

        preds = np.asarray(predictions, dtype=np.float64)
        market = np.asarray(market_consensus, dtype=np.float64)
        acts = np.asarray(outcomes, dtype=np.float64)

        shrunk_preds = (1.0 - w) * preds + w * market
        shrunk_preds = np.clip(shrunk_preds, 0.0, 1.0)

        raw_decomp = SportsCalibrationEngine.calculate_murphy_brier(preds, acts, n_bins=n_bins)
        shrunk_decomp = SportsCalibrationEngine.calculate_murphy_brier(shrunk_preds, acts, n_bins=n_bins)

        # Resolution is discriminative power (higher is better)
        raw_res = raw_decomp.resolution
        shrunk_res = shrunk_decomp.resolution

        # Check if resolution degraded
        resolution_retained = (shrunk_res >= raw_res * 0.99)
        if resolution_retained:
            verdict = "APPROVED: Shrinkage preserves model resolution while improving calibration."
        else:
            verdict = "REJECTED: Artificial reliability gain detected; model discriminative resolution degraded."

        return ShrinkageAuditResult(
            w=w,
            raw_brier=raw_decomp.brier_score,
            shrunk_brier=shrunk_decomp.brier_score,
            raw_reliability=raw_decomp.reliability,
            shrunk_reliability=shrunk_decomp.reliability,
            raw_resolution=raw_res,
            shrunk_resolution=shrunk_res,
            resolution_retained=resolution_retained,
            verdict=verdict
        )

    @staticmethod
    def evaluate_closing_line_value(
        bet_probs: Union[List[float], np.ndarray],
        close_probs: Union[List[float], np.ndarray]
    ) -> Tuple[float, float, bool]:
        """
        Calculates Closing Line Value (CLV) and Beat Rate:
        CLV_i = (close_prob_i / bet_prob_i) - 1.0
        Beat Rate = mean(CLV_i > 0)

        Target: Beat Rate > 0.55 and mean CLV > 0.
        """
        p_bet = np.asarray(bet_probs, dtype=np.float64)
        p_close = np.asarray(close_probs, dtype=np.float64)

        if p_bet.shape[0] != p_close.shape[0] or p_bet.shape[0] == 0:
            raise ValueError("Invalid probability arrays for CLV evaluation")

        # Zero or negative probabilities check
        if np.any(p_bet <= 0.0) or np.any(p_close <= 0.0):
            raise ValueError("Probabilities must be strictly positive for ratio evaluation")

        clv_ratios = (p_close / p_bet) - 1.0
        mean_clv = float(np.mean(clv_ratios))
        beat_rate = float(np.mean(clv_ratios > 0.0))
        passed = (beat_rate >= 0.55 and mean_clv > 0.0)

        return mean_clv, beat_rate, passed
