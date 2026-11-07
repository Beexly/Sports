import unittest
from grok_eq_cocp_radius_partial_m import cocp_radius_partial_m

class TestCocpRadiusPartialM(unittest.TestCase):
    def test_balanced(self):
        # equal densities -> 0
        self.assertAlmostEqual(cocp_radius_partial_m(1.0, 1.0), 0.0)

    def test_imbalance(self):
        # f_plus > f_minus -> negative partial
        res = cocp_radius_partial_m(2.0, 1.0)
        self.assertAlmostEqual(res, - (2-1)/(2+1))

    def test_fail_closed_negative(self):
        self.assertIsNone(cocp_radius_partial_m(-1.0, 1.0))

    def test_fail_closed_zero(self):
        self.assertIsNone(cocp_radius_partial_m(0.0, 1.0))

    def test_fail_closed_inf(self):
        self.assertIsNone(cocp_radius_partial_m(float("inf"), 1.0))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(cocp_radius_partial_m(None, 1.0))

if __name__ == "__main__":
    unittest.main()
