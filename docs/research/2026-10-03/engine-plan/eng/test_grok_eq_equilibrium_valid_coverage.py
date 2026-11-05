import unittest
from grok_eq_equilibrium_valid_coverage import equilibrium_valid_coverage

class TestEquilibriumValidCoverage(unittest.TestCase):
    def test_exact_threshold(self):
        self.assertTrue(equilibrium_valid_coverage(0.9, 0.1))

    def test_above_threshold(self):
        self.assertTrue(equilibrium_valid_coverage(0.95, 0.1))

    def test_below_threshold(self):
        self.assertFalse(equilibrium_valid_coverage(0.85, 0.1))

    def test_fail_closed_alpha_invalid(self):
        self.assertIsNone(equilibrium_valid_coverage(0.9, 0.0))
        self.assertIsNone(equilibrium_valid_coverage(0.9, 1.0))
        self.assertIsNone(equilibrium_valid_coverage(0.9, 1.5))

    def test_fail_closed_prob_out_of_range(self):
        self.assertIsNone(equilibrium_valid_coverage(-0.1, 0.1))
        self.assertIsNone(equilibrium_valid_coverage(1.1, 0.1))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(equilibrium_valid_coverage("bad", 0.1))
        self.assertIsNone(equilibrium_valid_coverage(0.9, "bad"))

    def test_fail_closed_inf(self):
        self.assertIsNone(equilibrium_valid_coverage(float("inf"), 0.1))

if __name__ == "__main__":
    unittest.main()
