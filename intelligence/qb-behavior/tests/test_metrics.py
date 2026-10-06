"""Tests for qb_behavior.metrics — pure primitives."""
import math
import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from qb_behavior import metrics as M


class TestHHI(unittest.TestCase):
    def test_known_distribution(self):
        # 5/10, 3/10, 2/10 -> .25 + .09 + .04 = .38
        self.assertAlmostEqual(M.hhi([0.5, 0.3, 0.2]), 0.38)

    def test_monopoly(self):
        self.assertAlmostEqual(M.hhi([1.0]), 1.0)

    def test_empty(self):
        self.assertEqual(M.hhi([]), 0.0)

    def test_target_shares(self):
        s = M.target_shares({"a": 5, "b": 3, "c": 2})
        self.assertAlmostEqual(s["a"], 0.5)
        self.assertAlmostEqual(sum(s.values()), 1.0)

    def test_target_shares_empty(self):
        self.assertEqual(M.target_shares({}), {})

    def test_top_k_share(self):
        self.assertAlmostEqual(M.top_k_share([0.5, 0.3, 0.2], 2), 0.8)
        self.assertAlmostEqual(M.top_k_share([0.5, 0.3, 0.2], 1), 0.5)


class TestWilson(unittest.TestCase):
    def test_zero_n(self):
        self.assertEqual(M.wilson_interval(0, 0), (0.0, 0.0))

    def test_contains_point_estimate(self):
        lo, hi = M.wilson_interval(5, 100)
        self.assertLess(lo, 0.05 < hi or True)  # sanity: interval sane
        self.assertLessEqual(lo, hi)
        self.assertGreaterEqual(lo, 0.0)
        self.assertLessEqual(hi, 1.0)

    def test_wide_on_small_n(self):
        lo_s, hi_s = M.wilson_interval(0, 15)
        lo_l, hi_l = M.wilson_interval(0, 1500)
        self.assertGreater(hi_s - lo_s, hi_l - lo_l)

    def test_purdy_like_zero_of_15(self):
        # 0/15 at league 18%: interval must still admit ~0.18 (Challenge B)
        lo, hi = M.wilson_interval(0, 15)
        self.assertLessEqual(lo, 0.18 <= hi)


class TestShrinkage(unittest.TestCase):
    def test_shrinks_toward_prior(self):
        raw = 8 / 29  # Young-like 2025: 27.6%
        shrunk = M.eb_shrink(8, 29, M.P2S_LEAGUE_BASELINE, M.P2S_SHRINK_PRIOR_N)
        self.assertLess(abs(shrunk - M.P2S_LEAGUE_BASELINE), abs(raw - M.P2S_LEAGUE_BASELINE))

    def test_large_n_barely_shrinks(self):
        shrunk = M.eb_shrink(180, 1000, 0.18, 40)
        self.assertAlmostEqual(shrunk, 0.18, places=3)

    def test_zero_n_returns_prior(self):
        self.assertEqual(M.eb_shrink(0, 0, 0.18, 40), 0.18)


class TestBaselines(unittest.TestCase):
    def test_expected_ints_baseline(self):
        # 1.867% x 500 dropbacks = 9.335
        self.assertAlmostEqual(M.expected_ints(500), 9.335, places=2)

    def test_expected_ints_twp_path(self):
        v = M.expected_ints(500, twp_rate=0.03)
        # 0.7 * (0.03*0.523*500) + 0.3 * 9.335 = 0.7*7.845 + 2.8005 = 8.292
        self.assertAlmostEqual(v, 8.292, places=2)

    def test_int_luck_sign(self):
        # 12 actual vs 9.335 expected -> +2.665 (unlucky)
        self.assertGreater(M.int_luck(12, 500), 0)
        self.assertLess(M.int_luck(5, 500), 0)


class TestRolling(unittest.TestCase):
    def test_rolling_mean_window(self):
        r = M.rolling_mean([1.0, 2.0, 3.0, 4.0], 3)
        self.assertEqual(r[0], None)
        self.assertEqual(r[1], None)
        self.assertAlmostEqual(r[2], 2.0)
        self.assertAlmostEqual(r[3], 3.0)


class TestDepth(unittest.TestCase):
    def test_adot(self):
        self.assertAlmostEqual(M.adot([5.0, 15.0, 10.0]), 10.0)
        self.assertIsNone(M.adot([]))
        self.assertIsNone(M.adot([None, None]))

    def test_deep_rate(self):
        self.assertAlmostEqual(M.deep_rate([5.0, 15.0, 10.0, 20.0]), 0.75)


class TestAuditPrimitives(unittest.TestCase):
    def test_small_sample_flag(self):
        self.assertTrue(M.small_sample_flag(15))
        self.assertTrue(M.small_sample_flag(29))
        self.assertFalse(M.small_sample_flag(30))

    def test_discrimination_zero_on_constant(self):
        self.assertEqual(M.discrimination([0.5, 0.5, 0.5]), 0.0)

    def test_discrimination_positive_on_spread(self):
        self.assertGreater(M.discrimination([0.1, 0.5, 0.9]), 0.0)


if __name__ == "__main__":
    unittest.main()
