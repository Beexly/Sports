#!/usr/bin/env python3
"""
galaxy_sports_edge_bridge.py
============================
Enterprise bridge connecting Project NEXUS Frontier Intelligence with Galaxy Sports Edge (GSE)
quantitative sports systems, adhering strictly to:
  - .claude/skills/calibration-pipeline/SKILL.md (CIR, Selected-Slice ECE, CLV Deflator)
  - .claude/skills/model-promotion-gate/SKILL.md (Anti-DEC-062 invariants, Empirical-Bernstein Leg 1, CLV Leg 2)
  - .claude/skills/autonomy-kernel/SKILL.md (Founder gate, non-mutating MODEL_VERSION)
"""

import math
import numpy as np
from typing import Dict, List, Tuple, Any, Optional

from frontier.sports.sports_calibration_engine import SportsCalibrationEngine
from frontier.sports.sports_scoring_rules import SportsScoringRules
from frontier.sports.dixon_coles_simulation_engine import DixonColesGAS, RankingMetrics, V4MatchSimulator


class CenteredIsotonicCalibrator:
    """
    Centered Isotonic Regression (CIR) as specified in GSE calibration-pipeline:
    Preserves rank ordering and monotonic confidence intervals while centering knots,
    outperforming standard PAVA step functions on stakes and extreme slices.
    """

    def __init__(self):
        self.knots_x: List[float] = []
        self.knots_y: List[float] = []
        self.is_fitted: bool = False

    def fit(self, y_pred: np.ndarray, y_true: np.ndarray):
        """Fits centered isotonic curve on training predictions."""
        if len(y_pred) != len(y_true):
            raise ValueError("Dimension mismatch between predictions and ground truth")
        if len(y_pred) < 5:
            raise ValueError("Insufficient calibration sample (minimum 5 required)")

        # Sort by y_pred
        order = np.argsort(y_pred)
        x_sorted = y_pred[order]
        y_sorted = y_true[order]

        # Standard PAVA pooling
        blocks_weight = [1.0] * len(x_sorted)
        blocks_value = [float(y) for y in y_sorted]
        blocks_x = [float(x) for x in x_sorted]

        i = 0
        while i < len(blocks_value) - 1:
            if blocks_value[i] > blocks_value[i + 1]:
                # Violates monotonicity: pool adjacent blocks
                w_sum = blocks_weight[i] + blocks_weight[i + 1]
                new_val = (blocks_weight[i] * blocks_value[i] + blocks_weight[i + 1] * blocks_value[i + 1]) / w_sum
                new_x = (blocks_weight[i] * blocks_x[i] + blocks_weight[i + 1] * blocks_x[i + 1]) / w_sum
                
                blocks_weight[i] = w_sum
                blocks_value[i] = new_val
                blocks_x[i] = new_x

                del blocks_weight[i + 1]
                del blocks_value[i + 1]
                del blocks_x[i + 1]

                if i > 0:
                    i -= 1
            else:
                i += 1

        # Centered Isotonic transformation: knot centering to reduce boundary bias
        self.knots_x = blocks_x
        self.knots_y = blocks_value
        self.is_fitted = True

    def predict(self, y_pred: np.ndarray) -> np.ndarray:
        """Evaluates fitted CIR piecewise linear interpolator with boundary clamping."""
        if not self.is_fitted:
            raise RuntimeError("Calibrator must be fitted before predict()")

        x_arr = np.clip(y_pred, 0.0, 1.0)
        # Piecewise linear interpolation across centered knots
        return np.interp(x_arr, self.knots_x, self.knots_y, left=self.knots_y[0], right=self.knots_y[-1])


class GalaxySportsEdgeBridge:
    """
    Main operational bridge between NEXUS and Galaxy Sports Edge.
    """

    def __init__(self, current_model_version: str = "v2.8-nexus-2026"):
        self.current_model_version = current_model_version
        self.cir = CenteredIsotonicCalibrator()

    @staticmethod
    def compute_selected_slice_ece(
        probabilities: np.ndarray,
        implied_market_probs: np.ndarray,
        outcomes: np.ndarray,
        min_ev_edge: float = 0.02,
        num_bins: int = 5
    ) -> Dict[str, Any]:
        """
        Audits the calibration paradox on the positive expected value (+EV) slice:
        When filtering for picks where model_prob > implied_prob + edge, selection
        bias frequently introduces conditioned miscalibration.
        """
        ev_mask = (probabilities - implied_market_probs) >= min_ev_edge
        slice_count = int(np.sum(ev_mask))

        if slice_count < 10:
            return {
                "slice_sample_size": slice_count,
                "status": "insufficient_slice_sample",
                "selected_slice_ece": 0.0,
                "is_paradox_flagged": False
            }

        p_slice = probabilities[ev_mask]
        o_slice = outcomes[ev_mask]

        # Compute ECE on the selected slice
        bins = np.linspace(0.0, 1.0, num_bins + 1)
        ece = 0.0

        for b in range(num_bins):
            bin_mask = (p_slice >= bins[b]) & (p_slice < bins[b + 1]) if b < num_bins - 1 else (p_slice >= bins[b]) & (p_slice <= bins[b + 1])
            n_b = np.sum(bin_mask)
            if n_b > 0:
                conf = np.mean(p_slice[bin_mask])
                acc = np.mean(o_slice[bin_mask])
                ece += (n_b / slice_count) * abs(conf - acc)

        # Paradox flagged if selected slice ECE is significantly higher than 0.05
        is_flagged = bool(ece > 0.05)

        return {
            "slice_sample_size": slice_count,
            "min_ev_edge": min_ev_edge,
            "selected_slice_ece": float(ece),
            "is_paradox_flagged": is_flagged
        }

    @staticmethod
    def calculate_clv_deflator(clv_samples: np.ndarray, min_samples: int = 50) -> float:
        """
        Calculates CLV deflator for fractional Kelly stake sizing.
        Invariant: Returns 0.0 (strictly zeros stakes) until min_samples (50) is reached.
        """
        n = len(clv_samples)
        if n < min_samples:
            return 0.0

        mean_clv = float(np.mean(clv_samples))
        if mean_clv <= 0.0:
            return 0.0

        # Deflator smoothly scales between 0.2 and 1.0 based on mean CLV positive edge
        deflator = min(1.0, max(0.2, mean_clv / 0.03))
        return float(deflator)

    @staticmethod
    def size_portfolio_kelly_fractional(
        model_prob: float,
        decimal_odds: float,
        fraction: float = 0.25,
        clv_deflator: float = 1.0,
        max_bankroll_cap: float = 0.05
    ) -> float:
        """
        Fractional Kelly bankroll sizing modulated by CLV deflator.
        Enforces strict GSE rules: Full Kelly is FORBIDDEN (fraction <= 0.50).
        """
        if fraction > 0.50:
            raise ValueError("Violation: Full Kelly or fraction > 0.50 is strictly forbidden by GSE laws")
        if clv_deflator <= 0.0:
            return 0.0

        b = decimal_odds - 1.0
        if b <= 0.0:
            return 0.0

        q = 1.0 - model_prob
        # Full Kelly formula: f* = (b*p - q) / b
        f_star = (b * model_prob - q) / b
        if f_star <= 0.0:
            return 0.0

        # Fractional Kelly scaled by CLV deflator
        stake_pct = f_star * fraction * clv_deflator
        return float(min(max_bankroll_cap, max(0.0, stake_pct)))

    @staticmethod
    def evaluate_model_promotion_gate(
        challenger_briers: np.ndarray,
        champion_briers: np.ndarray,
        challenger_clv: np.ndarray,
        champion_clv: np.ndarray,
        delta_prac: float = 0.005,
        alpha: float = 0.05,
        clv_margin: float = 0.002
    ) -> Dict[str, Any]:
        """
        Executes formal 3-Leg Model Promotion Gate under Anti-DEC-062 invariants:
        
        Leg 1: Paired Calibration Superiority
               d_i = Brier_C(i) - Brier_K(i)
               Empirical-Bernstein LCB(d) > delta_prac.
        Leg 2: CLV Non-Inferiority
               mean(CLV_K) >= mean(CLV_C) - clv_margin.
        Leg 3: Procedural Integrity (non-mutating, founder-gated).
        """
        n_events = len(challenger_briers)
        if n_events != len(champion_briers):
            raise ValueError("Challenger and champion must be evaluated on the EXACT same events")
        if n_events < 50:
            return {
                "verdict": "INSUFFICIENT_SAMPLE",
                "sample_size": n_events,
                "leg_1_pass": False,
                "leg_2_pass": False,
                "eligible": False,
                "reason": "Minimum sample size of 50 paired events not met"
            }

        # Anti-DEC-062 Invariant 1: Identity Fixed Point
        diffs = champion_briers - challenger_briers
        if np.allclose(diffs, 0.0):
            return {
                "verdict": "NOT_ELIGIBLE",
                "sample_size": n_events,
                "leg_1_pass": False,
                "leg_2_pass": False,
                "eligible": False,
                "reason": "Anti-DEC-062: Identity fixed point (Challenger == Champion yields d_i=0)"
            }

        # Leg 1: Empirical-Bernstein Lower Confidence Bound
        d_mean = float(np.mean(diffs))
        d_var = float(np.var(diffs, ddof=1)) if n_events > 1 else 0.0
        range_r = float(np.max(diffs) - np.min(diffs))
        if range_r <= 0:
            range_r = 1.0

        log_factor = math.log(3.0 / alpha)
        penalty_var = math.sqrt((2.0 * d_var * log_factor) / n_events)
        penalty_range = (3.0 * range_r * log_factor) / n_events
        eb_lcb = d_mean - penalty_var - penalty_range

        leg_1_pass = bool(eb_lcb > delta_prac)

        # Leg 2: CLV Non-inferiority
        clv_k_mean = float(np.mean(challenger_clv))
        clv_c_mean = float(np.mean(champion_clv))
        leg_2_pass = bool(clv_k_mean >= (clv_c_mean - clv_margin))

        eligible = bool(leg_1_pass and leg_2_pass)
        verdict = "ELIGIBLE_FOR_PROMOTION" if eligible else "REJECTED_NOT_SUPERIOR"

        return {
            "verdict": verdict,
            "sample_size": n_events,
            "d_mean_brier_advantage": d_mean,
            "empirical_bernstein_lcb": eb_lcb,
            "delta_prac_required": delta_prac,
            "leg_1_pass": leg_1_pass,
            "challenger_mean_clv": clv_k_mean,
            "champion_mean_clv": clv_c_mean,
            "leg_2_pass": leg_2_pass,
            "eligible": eligible,
            "founder_action_required": "Founder must manually apply MODEL_VERSION change; automation cannot flip version."
        }
