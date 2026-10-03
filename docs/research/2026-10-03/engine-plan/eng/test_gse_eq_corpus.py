"""Identity checks for gse_eq_corpus.py. No game rows."""
import unittest

from gse_eq_corpus import air_yard_share, effective_targets, target_hhi, top_two_share


class CorpusTrustTests(unittest.TestCase):
    def test_target_hhi(self):
        equal = [5.0, 5.0, 5.0, 5.0, 5.0]
        self.assertAlmostEqual(target_hhi(equal), 0.20)
        self.assertIsNone(target_hhi([5.0, 5.0, 5.0, 5.0]))
        self.assertIsNone(target_hhi([]))
        self.assertIsNone(target_hhi([25.0, None]))
        self.assertAlmostEqual(target_hhi([25.0]), 1.0)

    def test_effective_targets(self):
        self.assertAlmostEqual(effective_targets(0.20), 5.0)
        self.assertAlmostEqual(effective_targets(target_hhi([5, 5, 5, 5, 5])), 5.0)
        self.assertIsNone(effective_targets(None))
        self.assertIsNone(effective_targets(0.0))
        self.assertIsNone(effective_targets(float("nan")))

    def test_top_two_share(self):
        self.assertAlmostEqual(top_two_share([15.0, 10.0, 5.0]), 25.0 / 30.0)
        self.assertIsNone(top_two_share([20.0, 4.0]))
        self.assertIsNone(top_two_share([30.0]))
        self.assertIsNone(top_two_share([30.0, 0.0]))
        self.assertEqual(top_two_share([15.0, 10.0]), 1.0)
        self.assertEqual(top_two_share([20.0, 10.0]), 1.0)
        self.assertIsNone(top_two_share([10.0, None, 20.0]))

    def test_air_yard_share(self):
        self.assertAlmostEqual(air_yard_share(35.0, 100.0), 0.35)
        self.assertEqual(air_yard_share(80.0, 80.0), 1.0)
        self.assertIsNone(air_yard_share(35.0, 0.0))
        self.assertIsNone(air_yard_share(35.0, None))
        self.assertIsNone(air_yard_share(None, 100.0))


if __name__ == "__main__":
    unittest.main()


from gse_eq_corpus import (
    aggressiveness_proxy_deep,
    down_distance_cell,
    garbage_time,
    int_danger_volume,
    score_bucket,
    sensitivity_epa_floor,
)


class CorpusSituationTests(unittest.TestCase):
    def test_int_danger_volume(self):
        self.assertAlmostEqual(int_danger_volume(27.0, 17 / 464), 27.0 * (17 / 464) * 0.523)
        self.assertAlmostEqual(int_danger_volume(34.2, 8 / 554), 34.2 * (8 / 554) * 0.523)
        self.assertIsNone(int_danger_volume(None, 0.03))
        self.assertIsNone(int_danger_volume(27.0, None))

    def test_sensitivity_epa_floor(self):
        self.assertAlmostEqual(sensitivity_epa_floor(0.20, -0.10, 100), 0.30)
        self.assertIsNone(sensitivity_epa_floor(0.20, -0.10, 99))
        self.assertIsNone(sensitivity_epa_floor(None, -0.10, 100))
        self.assertIsNone(sensitivity_epa_floor(0.20, None, 120))

    def test_garbage_time(self):
        self.assertTrue(garbage_time(4, 0.96))
        self.assertTrue(garbage_time(4, 0.04))
        self.assertFalse(garbage_time(4, 0.95))
        self.assertFalse(garbage_time(3, 0.99))
        self.assertIsNone(garbage_time(4, None))
        self.assertIsNone(garbage_time(None, 0.99))

    def test_score_bucket(self):
        self.assertEqual(score_bucket(-8), "trail_8+")
        self.assertEqual(score_bucket(-7), "trail_1_7")
        self.assertEqual(score_bucket(-1), "trail_1_7")
        self.assertEqual(score_bucket(0), "tied")
        self.assertEqual(score_bucket(7), "lead_1_7")
        self.assertEqual(score_bucket(8), "lead_8+")
        self.assertIsNone(score_bucket(-7.5))
        self.assertIsNone(score_bucket(None))

    def test_down_distance_cell(self):
        self.assertEqual(down_distance_cell(1, 3), "early_short")
        self.assertEqual(down_distance_cell(2, 4), "early_mid")
        self.assertEqual(down_distance_cell(2, 7), "early_mid")
        self.assertEqual(down_distance_cell(3, 8), "late_long")
        self.assertEqual(down_distance_cell(4, 1), "late_short")
        self.assertIsNone(down_distance_cell(0, 10))
        self.assertIsNone(down_distance_cell(1, None))

    def test_aggressiveness_proxy_deep(self):
        self.assertEqual(aggressiveness_proxy_deep(20), 1)
        self.assertEqual(aggressiveness_proxy_deep(19), 0)
        self.assertEqual(aggressiveness_proxy_deep(15), 0)
        self.assertIsNone(aggressiveness_proxy_deep(None))
        self.assertIsNone(aggressiveness_proxy_deep(float("nan")))


from gse_eq_corpus import (
    binomial_cell_se,
    epa_success,
    era_aggregate_weight,
    neutral_wp,
    red_zone,
    shrunk_proe,
    two_minute,
)


class CorpusCoachingTests(unittest.TestCase):
    def test_neutral_wp(self):
        self.assertTrue(neutral_wp(0.35))
        self.assertTrue(neutral_wp(0.65))
        self.assertFalse(neutral_wp(0.349))
        self.assertFalse(neutral_wp(0.66))
        self.assertIsNone(neutral_wp(None))

    def test_shrunk_proe(self):
        self.assertAlmostEqual(shrunk_proe(0.10, 20, 20), 0.05)
        self.assertIsNone(shrunk_proe(0.10, None, 20))
        self.assertIsNone(shrunk_proe(0.10, 0, 0))

    def test_binomial_cell_se(self):
        self.assertAlmostEqual(binomial_cell_se(0.5, 100), (0.25 / 100) ** 0.5)
        self.assertEqual(binomial_cell_se(0, 30), 0.0)
        self.assertEqual(binomial_cell_se(1, 30), 0.0)
        self.assertIsNone(binomial_cell_se(0.5, 0))
        self.assertIsNone(binomial_cell_se(None, 100))

    def test_epa_success(self):
        self.assertTrue(epa_success(0.01))
        self.assertFalse(epa_success(0.0))
        self.assertFalse(epa_success(-1))
        self.assertIsNone(epa_success(None))

    def test_red_zone(self):
        self.assertTrue(red_zone(20))
        self.assertTrue(red_zone(1))
        self.assertFalse(red_zone(21))
        self.assertIsNone(red_zone(None))

    def test_two_minute(self):
        self.assertTrue(two_minute(120))
        self.assertTrue(two_minute(0))
        self.assertFalse(two_minute(121))
        self.assertIsNone(two_minute(None))

    def test_era_aggregate_weight(self):
        self.assertEqual(era_aggregate_weight(1), 1.0)
        self.assertEqual(era_aggregate_weight(2), 0.5)
        self.assertIsNone(era_aggregate_weight(3))
        self.assertIsNone(era_aggregate_weight(None))
        self.assertIsNone(era_aggregate_weight(0))
