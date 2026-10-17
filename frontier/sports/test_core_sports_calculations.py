"""
test_core_sports_calculations.py
Deterministic unit test suite for core calculation functions:
1. Strictly Proper Scoring Rules (Brier, Log, Spherical) & Murphy Decomposition
2. ECE, MCE, and PAVA Monotonic Calibration
3. Archimedean Copulas (Clayton, Frank, Gumbel) & Fréchet-Hoeffding Bounds
4. Ben Baldwin 4th-Down Expected Value Engine
5. Glicko-2 Dynamic Rating & Volatility Updates
"""
import math
import unittest
import numpy as np

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sports.sports_scoring_rules import SportsScoringRules, ProperScoresResult
from sports.sports_calibration_engine import SportsCalibrationEngine, PoolAdjacentViolatorsCalibrator
from sports.copula_parlay_engine import CopulaParlayEngine, CopulaFamily
from sports.nfl_fourth_down_engine import NFLFourthDownEngine
from sports.glicko2_trueskill_engine import GlickoPlayer, CanonicalGlicko2Engine

class TestSportsScoringRules(unittest.TestCase):
    def test_brier_score_known_cases(self):
        # Perfect predictions
        res_perf = SportsScoringRules.calculate_strictly_proper_scores(
            predictions=[1.0, 0.0, 1.0], outcomes=[1, 0, 1]
        )
        self.assertAlmostEqual(res_perf.brier_score, 0.0, places=7)

        # Constant 0.5 prediction
        res_half = SportsScoringRules.calculate_strictly_proper_scores(
            predictions=[0.5, 0.5, 0.5, 0.5], outcomes=[1, 0, 1, 0]
        )
        self.assertAlmostEqual(res_half.brier_score, 0.25, places=7)

        # Worst possible prediction
        res_worst = SportsScoringRules.calculate_strictly_proper_scores(
            predictions=[0.0, 1.0], outcomes=[1, 0]
        )
        self.assertAlmostEqual(res_worst.brier_score, 1.0, places=7)

    def test_input_validation(self):
        # Shape mismatch
        with self.assertRaises(ValueError):
            SportsScoringRules.calculate_strictly_proper_scores([0.5, 0.6], [1])

        # Prediction outside [0, 1]
        with self.assertRaises(ValueError):
            SportsScoringRules.calculate_strictly_proper_scores([1.1, 0.5], [1, 0])
        with self.assertRaises(ValueError):
            SportsScoringRules.calculate_strictly_proper_scores([-0.1, 0.5], [0, 0])

        # Non-binary outcome
        with self.assertRaises(ValueError):
            SportsScoringRules.calculate_strictly_proper_scores([0.5, 0.5], [1, 2])

        # Empty dataset
        with self.assertRaises(ValueError):
            SportsScoringRules.calculate_strictly_proper_scores([], [])

    def test_spherical_score_bounds(self):
        res = SportsScoringRules.calculate_strictly_proper_scores(
            predictions=[0.8, 0.2, 0.6, 0.4], outcomes=[1, 0, 1, 0]
        )
        self.assertTrue(0.0 <= res.spherical_score <= 1.0)
        self.assertTrue(res.spherical_score > 0.70)

class TestSportsCalibrationEngine(unittest.TestCase):
    def test_murphy_decomposition_exact_identity(self):
        # Murphy (1973) continuous identity
        rng = np.random.RandomState(42)
        preds = rng.uniform(0.1, 0.9, size=200)
        outcomes = (rng.rand(200) < preds).astype(int)

        decomp = SportsCalibrationEngine.calculate_murphy_brier(preds, outcomes, n_bins=10)
        
        # Brier binned must equal Reliability - Resolution + Uncertainty within precision
        reconstructed_binned = decomp.reliability - decomp.resolution + decomp.uncertainty
        self.assertAlmostEqual(decomp.brier_score_binned, reconstructed_binned, places=5)
        self.assertAlmostEqual(decomp.binned_decomposition_error, 0.0, places=5)

    def test_pava_isotonic_monotonicity(self):
        pava = PoolAdjacentViolatorsCalibrator()
        # Non-monotone input
        x_raw = np.array([0.1, 0.4, 0.35, 0.7, 0.65, 0.9])
        y = np.array([0, 0, 1, 0, 1, 1])

        pava.fit(x_raw, y)
        x_test = np.linspace(0.05, 0.95, 15)
        y_cal = pava.predict(x_test)

        # Monotonically non-decreasing assertion
        for i in range(len(y_cal) - 1):
            self.assertTrue(y_cal[i] <= y_cal[i+1] + 1e-9, f"PAVA inversion at {i}: {y_cal[i]} > {y_cal[i+1]}")

class TestCopulaParlayEngine(unittest.TestCase):
    def test_frechet_bounds_enforcement(self):
        u, v = 0.60, 0.70
        lower = max(0.0, u + v - 1.0) # 0.30
        upper = min(u, v)             # 0.60

        for theta in [0.5, 1.0, 2.0, 5.0]:
            c_clayton = CopulaParlayEngine.clayton_copula(u, v, theta)
            self.assertTrue(lower <= c_clayton <= upper)

            c_frank = CopulaParlayEngine.frank_copula(u, v, theta)
            self.assertTrue(lower <= c_frank <= upper)

            c_gumbel = CopulaParlayEngine.gumbel_copula(u, v, 1.0 + theta)
            self.assertTrue(lower <= c_gumbel <= upper)

    def test_copula_parameter_validation(self):
        # Clayton requires theta > 0
        with self.assertRaises(ValueError):
            CopulaParlayEngine.clayton_copula(0.5, 0.5, -0.5)
        with self.assertRaises(ValueError):
            CopulaParlayEngine.clayton_copula(0.5, 0.5, 0.0)

        # Gumbel requires theta >= 1.0
        with self.assertRaises(ValueError):
            CopulaParlayEngine.gumbel_copula(0.5, 0.5, 0.8)

    def test_frank_independent_limit(self):
        # As theta -> 0, Frank copula approaches independent product u * v
        u, v = 0.40, 0.50
        c_ind = CopulaParlayEngine.frank_copula(u, v, theta=1e-10)
        self.assertAlmostEqual(c_ind, u * v, places=6)

class TestNFLFourthDownEngine(unittest.TestCase):
    def setUp(self):
        self.engine = NFLFourthDownEngine()

    def test_conversion_probability_monotonicity(self):
        p1 = self.engine.estimate_conversion_probability(ydstogo=1.0)
        p2 = self.engine.estimate_conversion_probability(ydstogo=2.0)
        p5 = self.engine.estimate_conversion_probability(ydstogo=5.0)
        p10 = self.engine.estimate_conversion_probability(ydstogo=10.0)

        self.assertTrue(p1 > p2 > p5 > p10)
        self.assertTrue(0.60 < p1 < 0.75) # 4th & 1 is ~67%
        self.assertTrue(p10 < 0.15)       # 4th & 10 is < 15%

    def test_field_goal_probability_monotonicity(self):
        fg_chip = self.engine.estimate_fg_make_probability(yardline_100=2.0) # 19 yard kick (< 20 yd cutoff)
        fg30 = self.engine.estimate_fg_make_probability(yardline_100=15.0)  # 32 yard kick
        fg50 = self.engine.estimate_fg_make_probability(yardline_100=35.0)  # 52 yard kick
        fg60 = self.engine.estimate_fg_make_probability(yardline_100=45.0)  # 62 yard kick

        self.assertTrue(fg_chip >= fg30 > fg50 > fg60)
        self.assertTrue(fg_chip >= 0.95)

    def test_tactical_decision_output(self):
        # 4th and 1 at opponent 35 (in field goal / go territory)
        dec = self.engine.evaluate_decision(yardline_100=35.0, ydstogo=1.0, half_seconds=900.0)
        self.assertIn(dec.recommendation, ['GO_FOR_IT', 'FIELD_GOAL', 'PUNT'])
        self.assertTrue(isinstance(dec.ev_go, float))
        self.assertTrue(isinstance(dec.ev_fg, float))
        self.assertTrue(isinstance(dec.ev_punt, float))

class TestGlicko2Engine(unittest.TestCase):
    def test_glicko_rating_update(self):
        player = GlickoPlayer(rating=1500.0, rd=200.0, volatility=0.06)
        engine = CanonicalGlicko2Engine(tau=0.5)

        # Win against a 1400 opponent
        opp = GlickoPlayer(rating=1400.0, rd=100.0, volatility=0.06)
        updated = engine.update_rating(player, matches=[(opp, 1.0)])

        # Rating must increase, RD must decrease after match
        self.assertTrue(updated.rating > 1500.0)
        self.assertTrue(updated.rd < 200.0)
        self.assertTrue(updated.volatility > 0.0)

if __name__ == '__main__':
    unittest.main()
