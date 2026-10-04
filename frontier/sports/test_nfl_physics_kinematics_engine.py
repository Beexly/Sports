import unittest
import numpy as np
import math
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from frontier.sports.nfl_physics_kinematics_engine import (
        STRAINPassRushModel,
        OpponentAdjustedBradleyTerry,
        HiddenMarkovPassBlocking,
        StepAndTurnKinematics,
        PreSnapGammaTiming,
        RestAndHomeAdvantageEngine,
        ProfitBiasMicrostructure,
        BlownLeadPathwiseMonitor
    )
except ImportError:
    from sports.nfl_physics_kinematics_engine import (
        STRAINPassRushModel,
        OpponentAdjustedBradleyTerry,
        HiddenMarkovPassBlocking,
        StepAndTurnKinematics,
        PreSnapGammaTiming,
        RestAndHomeAdvantageEngine,
        ProfitBiasMicrostructure,
        BlownLeadPathwiseMonitor
    )


class TestNFLPhysicsKinematicsEngine(unittest.TestCase):

    def test_strain_calculation(self):
        # Rusher at 2.0 yards closing at 4.0 yd/s
        strain = STRAINPassRushModel.compute_strain(distance=2.0, closure_velocity=4.0)
        self.assertAlmostEqual(strain, 2.0, places=4)

        # Rusher moving away (negative closure) -> 0.0
        strain_neg = STRAINPassRushModel.compute_strain(distance=2.0, closure_velocity=-1.0)
        self.assertEqual(strain_neg, 0.0)

        # Sack hazard under high strain
        hazard = STRAINPassRushModel.sack_hazard_at_frame(strain=3.0, is_double_team=False, rusher_rating=1.5, blocker_rating=0.0)
        self.assertTrue(hazard > 0.60)

        # Double team drops hazard
        hazard_dt = STRAINPassRushModel.sack_hazard_at_frame(strain=3.0, is_double_team=True, rusher_rating=1.5, blocker_rating=0.0)
        self.assertTrue(hazard_dt < hazard)

    def test_opponent_adjusted_bradley_terry(self):
        bt = OpponentAdjustedBradleyTerry()
        
        # Elite edge rusher (+1.8) vs weak tackle (-1.0)
        p_win = bt.win_probability(rusher_beta=1.8, blocker_beta=-1.0, is_double=False)
        self.assertTrue(p_win > 0.90)

        # 4-class severity breakdown
        severity = bt.severity_probabilities(rusher_beta=1.8, blocker_beta=-1.0, is_double=False)
        self.assertIn("loss", severity)
        self.assertIn("win", severity)
        self.assertIn("hit", severity)
        self.assertIn("sack", severity)
        self.assertAlmostEqual(sum([severity["loss"], severity["win"], severity["hit"], severity["sack"]]), 1.0, places=4)
        self.assertTrue(severity["pressure_total"] > 0.85)

    def test_hidden_markov_pass_blocking(self):
        # 5 OLs, 4 DLs
        ols = [(25.0, 10.0), (25.0, 11.5), (25.0, 13.0), (25.0, 14.5), (25.0, 16.0)]
        dls = [(26.0, 10.0), (26.0, 12.0), (26.0, 14.0), (26.0, 16.0)]
        
        assign = HiddenMarkovPassBlocking.assign_blockers_to_rushers(ols, dls)
        self.assertEqual(assign.shape, (5, 4))
        # Each OL's probabilities sum to 1.0
        row_sums = np.sum(assign, axis=1)
        for s in row_sums:
            self.assertAlmostEqual(s, 1.0, places=4)

        # Rusher attention sums to 5.0 total OLs
        attention = HiddenMarkovPassBlocking.compute_rusher_attention(assign)
        self.assertAlmostEqual(float(np.sum(attention)), 5.0, places=4)

    def test_step_and_turn_kinematics(self):
        # Check von Mises PDF normalization & symmetry
        pdf_0 = StepAndTurnKinematics.von_mises_pdf(theta=0.0, mu=0.0, kappa=3.0)
        pdf_pi = StepAndTurnKinematics.von_mises_pdf(theta=math.pi, mu=0.0, kappa=3.0)
        self.assertTrue(pdf_0 > pdf_pi)

        # Simulate hypothetical paths
        paths = StepAndTurnKinematics.simulate_hypothetical_paths(
            start_pos=(20.0, 30.0),
            initial_velocity=(3.0, 0.0),
            num_steps=10,
            num_paths=25,
            kappa=3.0,
            seed=42
        )
        self.assertEqual(paths.shape, (25, 10, 2))

        # EYAR computation
        eyar = StepAndTurnKinematics.compute_eyar(observed_gain=8.5, simulated_gains=np.array([4.2, 5.1, 4.8, 6.0]))
        self.assertAlmostEqual(eyar, 3.475, places=3)

    def test_presnap_gamma_timing(self):
        mahomes = PreSnapGammaTiming.evaluate_cadence_advantage("Patrick Mahomes")
        mariota = PreSnapGammaTiming.evaluate_cadence_advantage("Marcus Mariota")
        
        self.assertTrue(mahomes["timing_variance"] > mariota["timing_variance"])
        self.assertTrue(mahomes["havoc_reduction_pct"] > mariota["havoc_reduction_pct"])
        self.assertTrue(mahomes["sack_hazard_multiplier"] < mariota["sack_hazard_multiplier"])

    def test_rest_and_home_advantage(self):
        # Post-2011 rest differential should be minimal
        rest_pts_modern = RestAndHomeAdvantageEngine.compute_rest_advantage_points(rest_days_diff=7, season_year=2026)
        self.assertTrue(rest_pts_modern <= 0.25)

        # Pre-2011 was significant
        rest_pts_pre = RestAndHomeAdvantageEngine.compute_rest_advantage_points(rest_days_diff=7, season_year=2008)
        self.assertTrue(rest_pts_pre >= 2.0)

        # Neutral site HFA is zero
        hfa_london = RestAndHomeAdvantageEngine.compute_home_field_advantage(is_neutral_site=True)
        self.assertEqual(hfa_london, 0.0)

        # Standard home field is ~1.35
        hfa_std = RestAndHomeAdvantageEngine.compute_home_field_advantage(is_neutral_site=False)
        self.assertEqual(hfa_std, 1.35)

    def test_profit_bias_microstructure(self):
        # Bookmaker offers 2.10 (+110) on underdog with fair probability 0.52 and 25% public betting
        analysis = ProfitBiasMicrostructure.analyze_public_shading(
            bookmaker_decimal_odds=2.10,
            model_fair_probability=0.52,
            public_bet_percentage=0.25,
            vig_hold=0.045
        )
        self.assertTrue(analysis["edge_raw"] > 0.04)
        self.assertTrue(analysis["expected_roi"] > 0.08)
        self.assertTrue(analysis["goldilocks_flag"])

    def test_blown_lead_pathwise(self):
        # Win probability trajectory of team that leads big then loses
        wp_path = [0.50, 0.65, 0.85, 0.94, 0.80, 0.55, 0.20, 0.00]
        # Team 0 lost, so winner_index = 1
        pit = BlownLeadPathwiseMonitor.calculate_pathwise_pit(wp_trajectory=wp_path, winner_index=1)
        self.assertEqual(pit["max_loser_wp"], 0.94)
        self.assertEqual(pit["is_blown_lead_anomaly"], 1.0)


if __name__ == '__main__':
    unittest.main()
