"""
test_player_props_intelligence_engine.py
Deterministic unit test suite for PlayerPropsIntelligenceEngine.
Verifies:
1. Continuous Yardage Props (Lognormal, Romano CQR 90%, Abstention Gates)
2. Discrete Count Props (Poisson, Negative Binomial, Simplex Parity)
3. Correlated Same Game Parlays (SGP) via Archimedean Copulas
4. Input Boundary & Fail-Closed Validation
"""
import math
import unittest
import numpy as np

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sports.player_props_intelligence_engine import (
    PlayerPropsIntelligenceEngine,
    YardagePropEvaluation,
    CountPropEvaluation,
    PropCategory
)

class TestPlayerPropsIntelligenceEngine(unittest.TestCase):
    def test_continuous_yardage_evaluation(self):
        # Dak Prescott scenario: line 265.5, projected 278.0
        actuals = [240.0, 295.0, 270.0, 310.0, 260.0, 285.0]
        eval_dak = PlayerPropsIntelligenceEngine.evaluate_continuous_yardage_prop(
            player="Dak Prescott",
            category="passing_yards",
            line=265.5,
            projected_median=278.0,
            historical_actuals=actuals,
            market_over_odds=-110,
            market_under_odds=-110
        )

        self.assertEqual(eval_dak.player, "Dak Prescott")
        self.assertAlmostEqual(eval_dak.over_prob + eval_dak.under_prob, 1.0, places=5)
        self.assertTrue(eval_dak.over_prob > 0.50) # Projected 278 > 265.5
        
        # Abstention gate test: max_tolerated_width is max(40.0, 265.5 * 0.25) = 66.375
        self.assertAlmostEqual(eval_dak.max_tolerated_width, 66.375, places=3)
        self.assertFalse(eval_dak.is_abstain)
        self.assertIn("OVER", eval_dak.recommendation)

    def test_continuous_yardage_abstention_trigger(self):
        # Scenario where nonconformity uncertainty is extreme -> must ABSTAIN
        actuals_noisy = [110.0, 390.0, 140.0, 420.0, 100.0, 450.0]
        eval_noisy = PlayerPropsIntelligenceEngine.evaluate_continuous_yardage_prop(
            player="Wild Variance Player",
            category="passing_yards",
            line=220.5,
            projected_median=220.0,
            historical_actuals=actuals_noisy
        )
        self.assertTrue(eval_noisy.is_abstain)
        self.assertEqual(eval_noisy.recommendation, "ABSTAIN")
        self.assertEqual(eval_noisy.confidence, 0.50)

    def test_yardage_input_validation(self):
        with self.assertRaises(ValueError):
            PlayerPropsIntelligenceEngine.evaluate_continuous_yardage_prop(
                player="Test", category="rushing_yards", line=-10.0, projected_median=50.0, historical_actuals=[]
            )
        with self.assertRaises(ValueError):
            PlayerPropsIntelligenceEngine.evaluate_continuous_yardage_prop(
                player="Test", category="rushing_yards", line=50.0, projected_median=-5.0, historical_actuals=[]
            )

    def test_discrete_count_prop_poisson(self):
        # Passing TDs line 1.5 with lambda = 1.8
        eval_td = PlayerPropsIntelligenceEngine.evaluate_discrete_count_prop(
            player="Patrick Mahomes",
            category="passing_tds",
            line=1.5,
            lambda_rate=1.8,
            dispersion_phi=1.0 # Poisson
        )

        # Expected Poisson P(0) = exp(-1.8) = 0.1653, P(1) = 1.8 * exp(-1.8) = 0.2975
        # P(Under 1.5) = P(0) + P(1) = 0.4628, P(Over 1.5) = 0.5372
        p0 = math.exp(-1.8)
        p1 = 1.8 * math.exp(-1.8)
        expected_under = p0 + p1
        expected_over = 1.0 - expected_under

        self.assertAlmostEqual(eval_td.under_prob, expected_under, places=3)
        self.assertAlmostEqual(eval_td.over_prob, expected_over, places=3)
        self.assertAlmostEqual(eval_td.over_prob + eval_td.under_prob, 1.0, places=4)
        self.assertAlmostEqual(eval_td.fair_odds_over, 1.0 / expected_over, places=2)

    def test_discrete_count_prop_negbin_dispersion(self):
        # Anytime TD or Receptions with variance inflation
        eval_rec = PlayerPropsIntelligenceEngine.evaluate_discrete_count_prop(
            player="Amon-Ra St. Brown",
            category="receptions",
            line=6.5,
            lambda_rate=7.2,
            dispersion_phi=1.30 # Overdispersed Negative Binomial
        )
        self.assertTrue(0.0 < eval_rec.over_prob < 1.0)
        self.assertTrue(0.0 < eval_rec.under_prob < 1.0)
        self.assertAlmostEqual(eval_rec.over_prob + eval_rec.under_prob, 1.0, places=4)

    def test_count_prop_input_validation(self):
        with self.assertRaises(ValueError):
            PlayerPropsIntelligenceEngine.evaluate_discrete_count_prop(
                player="Test", category="anytime_td", line=0.5, lambda_rate=-0.5
            )

    def test_correlated_sgp_props_gumbel(self):
        # QB Passing Yards (P=0.62) + WR Receiving Yards (P=0.58) -> Positive correlation
        sgp = PlayerPropsIntelligenceEngine.price_correlated_sgp_props(
            leg1_player="Josh Allen",
            leg1_prob=0.62,
            leg2_player="Stefon Diggs",
            leg2_prob=0.58,
            relationship="qb_wr_pass_rec",
            copula_theta=1.65
        )

        self.assertTrue(sgp["frechet_compliant"])
        self.assertTrue(sgp["joint_probability"] > sgp["naive_independent_prob"])
        self.assertTrue(sgp["correlation_alpha_pct"] > 0.0)
        self.assertTrue(sgp["frechet_lower"] <= sgp["joint_probability"] <= sgp["frechet_upper"])

    def test_correlated_sgp_props_frank_negative(self):
        # RB Rushing Yards + QB Passing Yards in clock-killing script -> Negative correlation
        sgp_neg = PlayerPropsIntelligenceEngine.price_correlated_sgp_props(
            leg1_player="Derrick Henry",
            leg1_prob=0.65,
            leg2_player="Will Levis",
            leg2_prob=0.55,
            relationship="rb_rush_qb_pass",
            copula_theta=-2.0
        )

        self.assertTrue(sgp_neg["frechet_compliant"])
        self.assertTrue(sgp_neg["joint_probability"] < sgp_neg["naive_independent_prob"])
        self.assertTrue(sgp_neg["correlation_alpha_pct"] < 0.0)

    def test_scheme_conditioned_prop_evaluation(self):
        # CeeDee Lamb vs Cover-1 man with pass rush
        res = PlayerPropsIntelligenceEngine.evaluate_scheme_conditioned_prop(
            player="CeeDee Lamb",
            position="WR1",
            category="receiving_yards",
            line=78.5,
            base_projection=80.0,
            opponent_coverage="cover_1_man",
            opponent_pass_rush_ttp=2.45
        )
        self.assertEqual(res["player"], "CeeDee Lamb")
        self.assertGreater(res["scheme_adjusted_projection"], 80.0)
        self.assertFalse(res["is_abstain"])
        self.assertIn("OVER", res["recommendation"])

    def test_canonical_vine_sgp_three_legs(self):
        from sports.vine_copula_parlay_engine import SGPLeg
        legs = [
            SGPLeg("Dak", "Dak Prescott", "passing_yards", 265.5, "OVER", 0.58),
            SGPLeg("Lamb", "CeeDee Lamb", "receiving_yards", 78.5, "OVER", 0.55),
            SGPLeg("Ferguson", "Jake Ferguson", "receiving_yards", 42.5, "OVER", 0.52)
        ]
        sgp = PlayerPropsIntelligenceEngine.price_canonical_vine_sgp(legs=legs)
        self.assertEqual(sgp.num_legs, 3)
        self.assertTrue(sgp.frechet_compliant)
        self.assertGreater(sgp.joint_probability, sgp.naive_independent_prob)

    def test_robust_prop_allocation_approval(self):
        alloc = PlayerPropsIntelligenceEngine.evaluate_robust_prop_allocation(
            player_or_asset="Dak Prescott Over 265.5",
            decimal_odds=1.909,
            model_mean_p=0.65,
            sample_hits=34,
            sample_trials=48,
            bankroll=10000.0
        )
        self.assertEqual(alloc.status, "APPROVED")
        self.assertGreater(alloc.recommended_stake_dollars, 0.0)
        self.assertGreater(alloc.lcb_edge_pct, 0.0)

    def test_portfolio_props_kelly_allocation(self):
        alloc1 = PlayerPropsIntelligenceEngine.evaluate_robust_prop_allocation("QB", 1.909, 0.65, 34, 48, 10000.0)
        alloc2 = PlayerPropsIntelligenceEngine.evaluate_robust_prop_allocation("WR", 1.909, 0.65, 34, 48, 10000.0)
        corr = np.array([[1.0, 0.65], [0.65, 1.0]])
        port = PlayerPropsIntelligenceEngine.allocate_portfolio_props_kelly([alloc1, alloc2], corr, 10000.0)
        self.assertEqual(len(port), 2)
        self.assertTrue(all(item["allocated_stake"] >= 0.0 for item in port))

if __name__ == '__main__':
    unittest.main()
