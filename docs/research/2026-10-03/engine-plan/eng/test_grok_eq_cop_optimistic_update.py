import unittest
from grok_eq_cop_optimistic_update import cop_optimistic_update

class TestCOPOptimistic(unittest.TestCase):
    def test_valid(self):
        result = cop_optimistic_update(0.5, 1.0, 0.1, 0.01, 0.0, 0.1)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result, 0.5 + 0.1*1.0 + 0.01*(0.0 - 0.1))

    def test_fail_closed_nan(self):
        self.assertIsNone(cop_optimistic_update(float('nan'), 1.0, 0.1, 0.01, 0, 0.1))

    def test_fail_closed_bad_alpha(self):
        self.assertIsNone(cop_optimistic_update(0.5, 1.0, 0.1, 0.01, 0, 1.5))

    def test_fail_closed_negative_sigma(self):
        self.assertIsNone(cop_optimistic_update(0.5, 1.0, -0.1, 0.01, 0, 0.1))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(cop_optimistic_update("bad", 1.0, 0.1, 0.01, 0, 0.1))

if __name__ == '__main__':
    unittest.main()
