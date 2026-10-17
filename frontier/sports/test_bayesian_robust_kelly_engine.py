"""
test_bayesian_robust_kelly_engine.py
====================================
Deterministic unit tests for Bayesian Distributionally Robust Kelly Engine.
Tests:
1. Standard approved allocation under substantial sample size.
2. Strict fail-closed zero-stake rejection when Lower Credible Bound (LCB) edge <= 0.
3. Coefficient of variation (CV) uncertainty discount scaling.
4. Maximum bankroll exposure cap enforcement (anti-ruin defense).
5. Multi-asset portfolio Kelly covariance decoupling.
6. Finite boundary and probability guarantees.
"""

import unittest
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sports.bayesian_robust_kelly_engine import (
    BayesianRobustKellyEngine,
    RobustKellyAllocation
)

class TestBayesianRobustKellyEngine(unittest.TestCase):

    def test_approved_allocation_large_sample(self):
        """Verifies approved stake under large sample size and positive LCB edge."""
        res = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="Dak Prescott Over 265.5",
            decimal_odds=1.909,  # -110
            model_mean_p=0.65,
            sample_hits=34,
            sample_trials=48,
            bankroll=10000.0
        )

        self.assertEqual(res.status, "APPROVED")
        self.assertGreater(res.recommended_stake_dollars, 0.0)
        self.assertGreater(res.lcb_edge_pct, 0.0)
        self.assertLess(res.uncertainty_discount_pct, 10.0)
        self.assertLessEqual(res.robust_fraction_pct, 5.0)

    def test_fail_closed_small_sample_uncertainty(self):
        """Verifies strict fail-closed rejection when small sample drops LCB edge below zero."""
        # 1 hit in 2 trials (50% nominal hit rate, but huge uncertainty)
        res = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="Backup RB Under 35.5",
            decimal_odds=1.909,
            model_mean_p=0.55,
            sample_hits=1,
            sample_trials=2,
            bankroll=10000.0
        )

        self.assertEqual(res.status, "REJECTED_NO_LCB_EDGE")
        self.assertEqual(res.recommended_stake_dollars, 0.0)
        self.assertEqual(res.robust_fraction_pct, 0.0)
        self.assertLessEqual(res.lcb_edge_pct, 0.0)

    def test_uncertainty_discount_monotonicity(self):
        """Verifies uncertainty discount shrinks as sample size increases."""
        # Small sample
        res_small = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="Player", decimal_odds=1.909, model_mean_p=0.60, sample_hits=4, sample_trials=6, bankroll=10000.0
        )
        # Large sample with same proportion
        res_large = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="Player", decimal_odds=1.909, model_mean_p=0.60, sample_hits=40, sample_trials=60, bankroll=10000.0
        )

        self.assertGreater(res_small.uncertainty_discount_pct, res_large.uncertainty_discount_pct)
        self.assertGreater(res_large.posterior_mean_p, 0.50)

    def test_anti_ruin_bankroll_cap(self):
        """Verifies that an enormous model edge never exceeds the hard 5% bankroll cap."""
        res = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="Extreme Edge Prop",
            decimal_odds=2.50,
            model_mean_p=0.85,
            sample_hits=30,
            sample_trials=32,
            bankroll=50000.0,
            max_bankroll_cap_pct=0.05
        )

        self.assertLessEqual(res.robust_fraction_pct, 5.0)
        self.assertLessEqual(res.recommended_stake_dollars, 2500.0)

    def test_portfolio_covariance_decoupling(self):
        """Verifies multi-asset portfolio Kelly prevents covariance overexposure."""
        alloc1 = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("QB Pass", 1.909, 0.58, 20, 30, 10000.0)
        alloc2 = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly("WR1 Rec", 1.909, 0.58, 20, 30, 10000.0)

        # Strongly positively correlated (rho = 0.70)
        corr_matrix = np.array([
            [1.0, 0.70],
            [0.70, 1.0]
        ])

        portfolio = BayesianRobustKellyEngine.evaluate_portfolio_kelly(
            allocations=[alloc1, alloc2],
            correlation_matrix=corr_matrix,
            bankroll=10000.0,
            portfolio_max_exposure_pct=0.08
        )

        self.assertEqual(len(portfolio), 2)
        total_stake = sum(item["allocated_stake"] for item in portfolio)
        self.assertLessEqual(total_stake, 800.01)  # <= 8% of 10,000

    def test_invalid_inputs_fail_closed(self):
        """Verifies invalid inputs fail closed safely without crashing."""
        res = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name="Invalid",
            decimal_odds=0.5,  # Invalid odds
            model_mean_p=1.2,  # Invalid prob
            sample_hits=0,
            sample_trials=0,
            bankroll=-100.0
        )
        self.assertEqual(res.status, "REJECTED_INVALID_INPUTS")
        self.assertEqual(res.recommended_stake_dollars, 0.0)

if __name__ == "__main__":
    unittest.main()
