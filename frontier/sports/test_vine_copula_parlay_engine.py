"""
test_vine_copula_parlay_engine.py
=================================
Deterministic unit tests for Vine Copula SGP Engine.
Tests:
1. Bivariate Copula Fréchet-Hoeffding bounds enforcement.
2. Conditional distribution (h-function) bounds and monotonicity.
3. Inversion (h_inv) reconstruction accuracy.
4. Canonical Vine (C-Vine) 3-leg and 4-leg SGP joint probability pricing.
5. Correlation alpha and tail regime verification.
6. Fail-closed exceptions on invalid inputs.
"""

import math
import unittest
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sports.vine_copula_parlay_engine import (
    VineCopulaParlayEngine,
    PairCopulaType,
    VineType,
    SGPLeg,
    MultiLegParlayResult
)

class TestVineCopulaParlayEngine(unittest.TestCase):

    def test_frechet_hoeffding_bounds_bivariate(self):
        """Verifies all copula families satisfy Fréchet-Hoeffding bounds."""
        u_vals = [0.1, 0.3, 0.5, 0.7, 0.9]
        v_vals = [0.2, 0.4, 0.6, 0.8]

        for u in u_vals:
            for v in v_vals:
                f_lower = max(0.0, u + v - 1.0)
                f_upper = min(u, v)

                for fam, theta in [
                    (PairCopulaType.CLAYTON, 1.8),
                    (PairCopulaType.GUMBEL, 1.6),
                    (PairCopulaType.FRANK, 2.5),
                    (PairCopulaType.GAUSSIAN, 0.5),
                    (PairCopulaType.INDEPENDENT, 0.0)
                ]:
                    c_val = VineCopulaParlayEngine.copula_cdf(u, v, fam, theta)
                    self.assertGreaterEqual(c_val, f_lower - 1e-9, f"Failed lower bound for {fam}")
                    self.assertLessEqual(c_val, f_upper + 1e-9, f"Failed upper bound for {fam}")

    def test_h_function_bounds_and_monotonicity(self):
        """Verifies conditional distribution h(u | v) lies in [0, 1] and is non-decreasing in u."""
        v = 0.5
        thetas = {
            PairCopulaType.CLAYTON: 1.5,
            PairCopulaType.GUMBEL: 1.7,
            PairCopulaType.FRANK: 2.0,
            PairCopulaType.GAUSSIAN: 0.45
        }

        for fam, th in thetas.items():
            prev_h = -1.0
            for u in np.linspace(0.05, 0.95, 10):
                h = VineCopulaParlayEngine.h_function(u, v, fam, th)
                self.assertGreaterEqual(h, 0.0, f"h < 0 for {fam}")
                self.assertLessEqual(h, 1.0, f"h > 1 for {fam}")
                self.assertGreaterEqual(h, prev_h - 1e-6, f"Monotonicity violation for {fam}")
                prev_h = h

    def test_h_inv_reconstruction_accuracy(self):
        """Verifies that h(h_inv(p | v) | v) recovers p within numerical tolerance."""
        v = 0.45
        p_targets = [0.15, 0.35, 0.60, 0.85]

        for fam, th in [
            (PairCopulaType.CLAYTON, 1.4),
            (PairCopulaType.GAUSSIAN, 0.5),
            (PairCopulaType.FRANK, 1.8),
            (PairCopulaType.GUMBEL, 1.5)
        ]:
            for p in p_targets:
                u_rec = VineCopulaParlayEngine.h_inv_function(p, v, fam, th)
                recovered_p = VineCopulaParlayEngine.h_function(u_rec, v, fam, th)
                self.assertAlmostEqual(p, recovered_p, places=2, msg=f"h_inv failed for {fam} at p={p}")

    def test_c_vine_three_leg_sgp_upper_tail(self):
        """Tests 3-leg QB-WR-WR Same Game Parlay exhibits upper tail correlation alpha > 0."""
        legs = [
            SGPLeg(name="Dak", player="Dak Prescott", prop_type="passing_yards", target_line=265.5, bet_type="OVER", marginal_prob=0.56),
            SGPLeg(name="Lamb", player="CeeDee Lamb", prop_type="receiving_yards", target_line=78.5, bet_type="OVER", marginal_prob=0.54),
            SGPLeg(name="Cooks", player="Brandin Cooks", prop_type="receiving_yards", target_line=38.5, bet_type="OVER", marginal_prob=0.52)
        ]

        res = VineCopulaParlayEngine.price_multi_leg_sgp(
            legs=legs,
            root_index=0,
            pair_families=[PairCopulaType.GUMBEL, PairCopulaType.GUMBEL],
            copula_thetas=[1.65, 1.45],
            monte_carlo_samples=30000
        )

        self.assertEqual(res.num_legs, 3)
        self.assertTrue(res.frechet_compliant)
        self.assertEqual(res.tail_regime, "UPPER_TAIL_REINFORCED")
        # Joint probability must exceed naive independent probability under positive Gumbel coupling
        self.assertGreater(res.joint_probability, res.naive_independent_prob)
        self.assertGreater(res.correlation_alpha_pct, 20.0)
        self.assertLess(res.fair_decimal_odds, res.naive_decimal_odds)

    def test_c_vine_four_leg_sgp_frechet_compliance(self):
        """Tests 4-leg SGP obeys multi-dimensional Fréchet bounds."""
        legs = [
            SGPLeg(name="L1", player="QB", prop_type="passing_yards", target_line=250.5, bet_type="OVER", marginal_prob=0.55),
            SGPLeg(name="L2", player="WR1", prop_type="receiving_yards", target_line=70.5, bet_type="OVER", marginal_prob=0.52),
            SGPLeg(name="L3", player="RB", prop_type="rushing_yards", target_line=65.5, bet_type="OVER", marginal_prob=0.50),
            SGPLeg(name="L4", player="K", prop_type="kicking_points", target_line=7.5, bet_type="OVER", marginal_prob=0.53)
        ]

        res = VineCopulaParlayEngine.price_multi_leg_sgp(legs=legs, monte_carlo_samples=25000)
        self.assertEqual(res.num_legs, 4)
        self.assertTrue(res.frechet_compliant)
        self.assertGreaterEqual(res.joint_probability, res.frechet_lower)
        self.assertLessEqual(res.joint_probability, res.frechet_upper)

    def test_fail_closed_on_invalid_inputs(self):
        """Verifies fail-closed ValueError on invalid legs or out-of-range probabilities."""
        with self.assertRaises(ValueError):
            # Less than 2 legs
            VineCopulaParlayEngine.price_multi_leg_sgp(legs=[
                SGPLeg("L1", "P1", "pass", 200.5, "OVER", 0.5)
            ])

        with self.assertRaises(ValueError):
            # Invalid probability > 1.0
            VineCopulaParlayEngine.price_multi_leg_sgp(legs=[
                SGPLeg("L1", "P1", "pass", 200.5, "OVER", 1.5),
                SGPLeg("L2", "P2", "rec", 50.5, "OVER", 0.5)
            ])

if __name__ == "__main__":
    unittest.main()
