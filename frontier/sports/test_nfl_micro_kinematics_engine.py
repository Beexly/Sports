"""
test_nfl_micro_kinematics_engine.py
===================================
Deterministic unit tests for NFL Next-Gen Tracking Micro-Kinematics & Scheme Conditioning Engine.
Tests:
1. Pocket survival exponential decay under pass rush time to pressure.
2. Catch point separation delta logistic probability and YAC acceleration.
3. Coverage shell conditioning across positions (Cover-1, Cover-2, Cover-3, Cover-4, Blitz).
4. Pass rush pressure strain decay on passing yards.
5. Boundary and parameter limits.
"""

import unittest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sports.nfl_micro_kinematics_engine import (
    NFLMicroKinematicsEngine,
    DefensiveCoverageShell,
    SchemeAdjustedPlayerProp
)

class TestNFLMicroKinematicsEngine(unittest.TestCase):

    def test_pocket_survival_exponential_decay(self):
        """Verifies clean pocket survival probability obeys physical decay dynamics."""
        # Baseline TTP = 2.50s gives 50% survival at 2.50s
        s_base = NFLMicroKinematicsEngine.compute_pocket_survival(2.50, 2.50)
        self.assertAlmostEqual(s_base, 0.50, places=2)

        # Faster pressure (e.g. 2.0s half life) drops survival at 2.50s
        s_fast = NFLMicroKinematicsEngine.compute_pocket_survival(2.00, 2.50)
        self.assertLess(s_fast, s_base)

        # Slower pressure (e.g. 3.0s half life) increases survival at 2.50s
        s_slow = NFLMicroKinematicsEngine.compute_pocket_survival(3.00, 2.50)
        self.assertGreater(s_slow, s_base)

    def test_catch_probability_separation(self):
        """Verifies catch probability increases with defender separation."""
        tight = NFLMicroKinematicsEngine.compute_catch_probability_by_separation(separation_yards=0.8, target_adot=8.0)
        open_wr = NFLMicroKinematicsEngine.compute_catch_probability_by_separation(separation_yards=3.5, target_adot=8.0)

        self.assertLess(tight["effective_catch_p"], open_wr["effective_catch_p"])
        self.assertGreater(open_wr["expected_yac"], tight["expected_yac"])
        self.assertGreaterEqual(tight["effective_catch_p"], 0.15)
        self.assertLessEqual(open_wr["effective_catch_p"], 0.95)

    def test_scheme_adjustment_cover1_man_wr1(self):
        """Verifies WR1 gets target boost and increased volatility against Cover-1 man-free."""
        adj = NFLMicroKinematicsEngine.adjust_prop_for_defensive_scheme(
            player="CeeDee Lamb",
            position="WR1",
            base_projection=80.0,
            opponent_primary_coverage=DefensiveCoverageShell.COVER_1_MAN,
            opponent_pass_rush_ttp=2.50
        )
        self.assertGreater(adj.adjusted_projection, 80.0)
        self.assertGreater(adj.volatility_scale_factor, 1.0)
        self.assertIn("cover_1_man", adj.scheme_driver)

    def test_scheme_adjustment_cover2_tampa_te(self):
        """Verifies TE gets middle seam boost against Cover-2 Tampa."""
        adj = NFLMicroKinematicsEngine.adjust_prop_for_defensive_scheme(
            player="Jake Ferguson",
            position="TE",
            base_projection=40.0,
            opponent_primary_coverage=DefensiveCoverageShell.COVER_2_TAMPA,
            opponent_pass_rush_ttp=2.50
        )
        self.assertGreater(adj.adjusted_projection, 40.0)
        self.assertIn("Cover-2 opens middle seam", adj.scheme_driver)

    def test_scheme_adjustment_cover4_quarters_rb(self):
        """Verifies RB gets rushing boost against 2-high light boxes in Cover-4."""
        adj = NFLMicroKinematicsEngine.adjust_prop_for_defensive_scheme(
            player="Rico Dowdle",
            position="RB",
            base_projection=50.0,
            opponent_primary_coverage=DefensiveCoverageShell.COVER_4_QUARTERS,
            opponent_pass_rush_ttp=2.50
        )
        self.assertGreater(adj.adjusted_projection, 50.0)
        self.assertIn("light boxes", adj.scheme_driver)

    def test_pass_rush_pressure_strain_decay(self):
        """Verifies elite pass rush (TTP < 2.30s) decays QB passing projection."""
        adj_normal = NFLMicroKinematicsEngine.adjust_prop_for_defensive_scheme(
            player="Dak Prescott",
            position="QB",
            base_projection=270.0,
            opponent_primary_coverage=DefensiveCoverageShell.COVER_3_ZONE,
            opponent_pass_rush_ttp=2.50
        )
        adj_blitz = NFLMicroKinematicsEngine.adjust_prop_for_defensive_scheme(
            player="Dak Prescott",
            position="QB",
            base_projection=270.0,
            opponent_primary_coverage=DefensiveCoverageShell.COVER_3_ZONE,
            opponent_pass_rush_ttp=2.10  # Severe pass rush strain
        )
        self.assertLess(adj_blitz.adjusted_projection, adj_normal.adjusted_projection)
        self.assertIn("pressure strain decay", adj_blitz.scheme_driver)

if __name__ == "__main__":
    unittest.main()
