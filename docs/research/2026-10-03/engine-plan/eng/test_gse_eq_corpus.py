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
        self.assertIsNone(top_two_share([10.0, None, 20.0]))

    def test_air_yard_share(self):
        self.assertAlmostEqual(air_yard_share(35.0, 100.0), 0.35)
        self.assertIsNone(air_yard_share(35.0, 0.0))
        self.assertIsNone(air_yard_share(35.0, None))
        self.assertIsNone(air_yard_share(None, 100.0))


if __name__ == "__main__":
    unittest.main()
