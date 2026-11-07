import unittest
from grok_eq_performative_equilibrium_coverage import performative_equilibrium_coverage

class TestPerformativeEquilibriumCoverage(unittest.TestCase):
    def test_basic_bound(self):
        # alpha=0.1, L=0.5, eps=0.1 -> 1-0.1-0.05=0.85
        b = performative_equilibrium_coverage(0.1, 0.5, 0.1)
        self.assertAlmostEqual(b, 0.85)

    def test_zero_eps(self):
        b = performative_equilibrium_coverage(0.05, 0.0, 0.0)
        self.assertAlmostEqual(b, 0.95)

    def test_fail_closed_bad_alpha(self):
        self.assertIsNone(performative_equilibrium_coverage(1.5, 0.1, 0.0))

    def test_fail_closed_neg_L(self):
        self.assertIsNone(performative_equilibrium_coverage(0.1, -0.1, 0.0))

    def test_fail_closed_inf(self):
        self.assertIsNone(performative_equilibrium_coverage(0.1, float("inf"), 0.0))

    def test_fail_closed_none(self):
        self.assertIsNone(performative_equilibrium_coverage(None, 0.1, 0.0))

if __name__ == "__main__":
    unittest.main()
