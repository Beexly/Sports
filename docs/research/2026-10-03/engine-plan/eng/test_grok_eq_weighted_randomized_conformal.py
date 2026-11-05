import unittest
from grok_eq_weighted_randomized_conformal import weighted_randomized_conformal_membership

class TestWeightedRandomizedConformal(unittest.TestCase):
    def test_basic_true(self):
        self.assertTrue(weighted_randomized_conformal_membership(1.0, 1.0, 2.0, 0.5, 0.6))

    def test_basic_false(self):
        self.assertFalse(weighted_randomized_conformal_membership(0.1, 0.1, 2.0, 0.5, 0.0))

    def test_boundary(self):
        self.assertFalse(weighted_randomized_conformal_membership(1.0, 0.0, 2.0, 0.5, 0.0))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(weighted_randomized_conformal_membership("bad", 1.0, 2.0, 0.5, 0.5))

    def test_fail_closed_inf(self):
        self.assertIsNone(weighted_randomized_conformal_membership(1.0, float("inf"), 2.0, 0.5, 0.5))

    def test_fail_closed_zero_W(self):
        self.assertIsNone(weighted_randomized_conformal_membership(1.0, 1.0, 0.0, 0.5, 0.5))

    def test_fail_closed_bad_alpha(self):
        self.assertIsNone(weighted_randomized_conformal_membership(1.0, 1.0, 2.0, 1.5, 0.5))
        self.assertIsNone(weighted_randomized_conformal_membership(1.0, 1.0, 2.0, -0.1, 0.5))

    def test_fail_closed_bad_U(self):
        self.assertIsNone(weighted_randomized_conformal_membership(1.0, 1.0, 2.0, 0.5, 1.1))

if __name__ == "__main__":
    unittest.main()
