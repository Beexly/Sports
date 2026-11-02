import unittest
from grok_eq_weighted_randomized_conformal_inclusion import weighted_randomized_conformal_inclusion

class TestWeightedRandomizedConformalInclusion(unittest.TestCase):
    def test_inclusion_true(self):
        self.assertTrue(weighted_randomized_conformal_inclusion(1.0, 1.0, 2.0, 0.5, 0.5))

    def test_inclusion_false(self):
        self.assertFalse(weighted_randomized_conformal_inclusion(0.1, 0.1, 2.0, 0.5, 0.5))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(weighted_randomized_conformal_inclusion("bad", 1.0, 2.0, 0.5, 0.5))

    def test_fail_closed_negative_W(self):
        self.assertIsNone(weighted_randomized_conformal_inclusion(1.0, 1.0, -1.0, 0.5, 0.5))

    def test_fail_closed_alpha_out_of_range(self):
        self.assertIsNone(weighted_randomized_conformal_inclusion(1.0, 1.0, 2.0, 1.5, 0.5))

    def test_fail_closed_inf(self):
        self.assertIsNone(weighted_randomized_conformal_inclusion(float("inf"), 1.0, 2.0, 0.5, 0.5))

if __name__ == "__main__":
    unittest.main()
