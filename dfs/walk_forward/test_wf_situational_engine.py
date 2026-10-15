import math
import unittest
from datetime import datetime, timezone
import wf_situational_engine as eng


class TestSituationalEngineLocks(unittest.TestCase):
    def test_cvi_terminal_refusal_enforced(self):
        with self.assertRaises(RuntimeError):
            eng.evaluate_feature_walk_forward("CVI", [])

    def test_bqp_fails_closed_on_future_or_missing_stamp(self):
        kickoff = datetime(2026, 10, 15, 17, 0, tzinfo=timezone.utc)
        future_row = [{
            "observed_at": "2026-10-15T18:00:00Z",
            "report_status": "Out",
            "epa_starter_prior": 0.18,
            "epa_backup_prior_snap_adj": -0.05,
            "starter_snap_share_prior_3w": 0.95,
            "position": "QB",
        }]
        self.assertIsNone(eng.compute_bqp(future_row, kickoff))
        unstamped_row = [{
            "observed_at": None,
            "report_status": "Out",
            "epa_starter_prior": 0.18,
            "epa_backup_prior_snap_adj": -0.05,
            "starter_snap_share_prior_3w": 0.95,
            "position": "QB",
        }]
        self.assertIsNone(eng.compute_bqp(unstamped_row, kickoff))

    def test_swcc_omits_missing_travel(self):
        kickoff = datetime(2026, 10, 15, 17, 0, tzinfo=timezone.utc)
        obs = datetime(2026, 9, 1, 0, 0, tzinfo=timezone.utc)
        self.assertIsNone(eng.compute_swcc(4.0, 7.0, None, 1100.0, 1050.0, obs, kickoff))
        val = eng.compute_swcc(4.0, 7.0, 1500.0, 1100.0, 1050.0, obs, kickoff)
        self.assertIsNotNone(val)
        self.assertAlmostEqual(val, 3.0 * math.log(1501.0) * 1.1)

    def test_ril_fails_closed_on_2025_unstamped_injuries(self):
        kickoff = datetime(2025, 10, 12, 17, 0, tzinfo=timezone.utc)
        inj = [{"date_modified": "NA", "report_status": "Out", "position": "QB", "snap_share_prior_3w": 1.0}]
        self.assertIsNone(eng.compute_ril_team(inj, 7.0, kickoff))

    def test_hybrid_crps_preserves_locked_mean_and_convex_gradient(self):
        grad, hess = eng.crps_gaussian_grad_sigma(-3.5, 13.45, 7.0)
        self.assertGreater(hess, 0.0)
        hyb = eng.crps_hybrid_key_numbers(-3.0, 9.5, {-3: 0.09, 3: 0.11, -7: 0.04, 7: 0.06}, 3.0)
        self.assertTrue(math.isfinite(hyb) and hyb > 0.0)


if __name__ == "__main__":
    unittest.main()
