import unittest
from grok_eq_celr_expected_local_radius import celr_expected_local_radius

class TestCelrExpectedLocalRadius(unittest.TestCase):
    def test_constant_quantile(self):
        # Q = 2.0 everywhere, R = 2.0
        self.assertAlmostEqual(celr_expected_local_radius(0.5, [2.0, 2.0, 2.0]), 2.0)

    def test_increasing(self):
        # samples 1,2,3 average 2
        self.assertAlmostEqual(celr_expected_local_radius(1.0, [1.0, 2.0, 3.0]), 2.0)

    def test_fail_closed_bad_beta(self):
        self.assertIsNone(celr_expected_local_radius(0.0, [1.0]))
        self.assertIsNone(celr_expected_local_radius(1.5, [1.0]))
        self.assertIsNone(celr_expected_local_radius(None, [1.0]))

    def test_fail_closed_bad_samples(self):
        self.assertIsNone(celr_expected_local_radius(0.5, []))
        self.assertIsNone(celr_expected_local_radius(0.5, [1.0, float("inf")]))
        self.assertIsNone(celr_expected_local_radius(0.5, "bad"))
        self.assertIsNone(celr_expected_local_radius(0.5, None))

if __name__ == "__main__":
    unittest.main()
